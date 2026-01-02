import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "X-Frame-Options": "DENY",
  "X-Content-Type-Options": "nosniff",
  "X-XSS-Protection": "1; mode=block",
  "Referrer-Policy": "no-referrer-when-downgrade",
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload",
  "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
  Pragma: "no-cache",
};

// Validation schemas
const paymentSchema = z.object({
  appointmentId: z.string().uuid("Invalid appointment ID"),
  amount: z.number().positive("Amount must be positive"),
  currency: z.string().length(3, "Currency must be 3 characters").default("EGP"),
  mode: z.literal("payment").default("payment"),
});

const subscriptionSchema = z.object({
  priceId: z.string().min(1, "Price ID is required"),
  mode: z.literal("subscription"),
});

const checkoutSchema = z.union([paymentSchema, subscriptionSchema]);

function successResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify({ success: true, data }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function errorResponse(code: string, message: string, status: number, details?: unknown): Response {
  const errorObj: { code: string; message: string; details?: unknown } = { code, message };
  if (details !== undefined) errorObj.details = details;
  return new Response(JSON.stringify({ success: false, error: errorObj }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Check authorization
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return errorResponse("UNAUTHORIZED", "Authorization header is required", 401);
    }

    // Authenticate user
    const supabaseClient = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_ANON_KEY") ?? "", {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return errorResponse("UNAUTHORIZED", "Invalid or expired authentication token", 401);
    }

    // Parse and validate request body
    let body;
    try {
      body = await req.json();
    } catch {
      return errorResponse("BAD_REQUEST", "Invalid JSON in request body", 400);
    }

    // Determine mode and validate
    const mode = body.mode || (body.priceId ? "subscription" : "payment");
    body.mode = mode;

    const validation = checkoutSchema.safeParse(body);
    if (!validation.success) {
      const firstError = validation.error.errors[0];
      return errorResponse(
        "VALIDATION_ERROR",
        firstError?.message || "Validation failed",
        422,
        validation.error.errors.map((e) => ({ field: e.path.join("."), message: e.message })),
      );
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    console.log(`Creating ${mode} checkout for user ${user.email}`);

    // Check for existing customer
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    const customerId = customers.data.length > 0 ? customers.data[0].id : undefined;

    if (mode === "subscription") {
      const { priceId } = validation.data as z.infer<typeof subscriptionSchema>;

      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        customer_email: customerId ? undefined : user.email,
        client_reference_id: user.id,
        line_items: [{ price: priceId, quantity: 1 }],
        mode: "subscription",
        allow_promotion_codes: true,
        success_url: `${req.headers.get("origin")}/client/subscriptions?checkout=success`,
        cancel_url: `${req.headers.get("origin")}/client/subscriptions`,
        metadata: {
          lovable_user_id: user.id,
          lovable_email: user.email,
        },
      });

      console.log(`Subscription checkout session created: ${session.id}`);
      return successResponse({ sessionId: session.id, url: session.url });
    }

    // Payment mode
    const { appointmentId, amount, currency } = validation.data as z.infer<typeof paymentSchema>;

    // Get appointment
    const { data: appointment, error: appointmentError } = await supabaseClient
      .from("appointments")
      .select("*, services(name, name_ar)")
      .eq("id", appointmentId)
      .single();

    if (appointmentError || !appointment) {
      return errorResponse("NOT_FOUND", "Appointment not found", 404);
    }

    // Verify appointment belongs to user
    if (appointment.user_id !== user.id) {
      return errorResponse("FORBIDDEN", "You can only pay for your own appointments", 403);
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      client_reference_id: user.id,
      line_items: [
        {
          price_data: {
            currency: currency.toLowerCase(),
            product_data: {
              name: appointment.services?.name || "Service Booking",
              description: `Appointment on ${appointment.appointment_date} at ${appointment.appointment_time}`,
            },
            unit_amount: Math.round(amount * 100),
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      allow_promotion_codes: true,
      success_url: `${req.headers.get("origin")}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.get("origin")}/client`,
      customer_email: user.email,
      metadata: {
        lovable_user_id: user.id,
        appointment_id: appointmentId,
      },
    });

    // Create payment record
    const supabase = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");

    await supabase.from("payments").insert({
      user_id: user.id,
      appointment_id: appointmentId,
      amount,
      currency,
      status: "pending",
      stripe_session_id: session.id,
    });

    return successResponse({ sessionId: session.id, url: session.url });
  } catch (error) {
    console.error("Unexpected error:", error);
    return errorResponse("INTERNAL_ERROR", "An unexpected error occurred", 500);
  }
});
