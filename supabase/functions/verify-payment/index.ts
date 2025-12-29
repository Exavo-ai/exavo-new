import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: unknown) => {
  console.log(`[VERIFY-PAYMENT] ${step}`, details ? JSON.stringify(details) : "");
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Only allow POST
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ success: false, error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const { session_id } = await req.json();
    
    if (!session_id) {
      return new Response(
        JSON.stringify({ success: false, error: "session_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    logStep("Verifying session", { session_id });

    // Initialize Stripe
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      return new Response(
        JSON.stringify({ success: false, error: "Stripe not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Retrieve the checkout session from Stripe
    const session = await stripe.checkout.sessions.retrieve(session_id);
    logStep("Session retrieved", { payment_status: session.payment_status, mode: session.mode });

    // Check if payment already recorded in our database
    const { data: existingPayment } = await supabaseAdmin
      .from("payments")
      .select("id, amount, currency, description, status")
      .eq("stripe_session_id", session_id)
      .maybeSingle();

    if (existingPayment) {
      logStep("Payment already recorded", { paymentId: existingPayment.id });
      return new Response(
        JSON.stringify({ 
          success: true, 
          payment: existingPayment,
          message: "Payment verified" 
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Payment not in database yet, check Stripe status
    if (session.payment_status !== "paid") {
      return new Response(
        JSON.stringify({ success: false, error: "Payment not completed" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get user from metadata or try to authenticate
    let userId = session.metadata?.lovable_user_id;
    
    if (!userId) {
      // Try to get from auth header
      const authHeader = req.headers.get("Authorization");
      if (authHeader) {
        const supabaseClient = createClient(
          Deno.env.get("SUPABASE_URL") ?? "",
          Deno.env.get("SUPABASE_ANON_KEY") ?? ""
        );
        const token = authHeader.replace("Bearer ", "");
        const { data: userData } = await supabaseClient.auth.getUser(token);
        userId = userData.user?.id;
      }
    }

    if (!userId) {
      logStep("No user ID available");
      return new Response(
        JSON.stringify({ success: false, error: "User not identified" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Prepare description
    let description = session.metadata?.service_name || session.metadata?.package_name || "Payment";
    if (session.mode === "subscription") {
      description = `Subscription: ${description}`;
    }

    // Get receipt URL
    let receiptUrl: string | null = null;
    if (session.payment_intent && typeof session.payment_intent === "string") {
      try {
        const paymentIntent = await stripe.paymentIntents.retrieve(session.payment_intent);
        if (paymentIntent.latest_charge && typeof paymentIntent.latest_charge === "string") {
          const charge = await stripe.charges.retrieve(paymentIntent.latest_charge);
          receiptUrl = charge.receipt_url || null;
        }
      } catch (e) {
        logStep("Could not get receipt URL", { error: e });
      }
    }

    // Insert payment record
    const paymentData = {
      user_id: userId,
      stripe_session_id: session_id,
      amount: (session.amount_total ?? 0) / 100,
      currency: (session.currency || "usd").toUpperCase(),
      status: "paid",
      description,
      customer_email: session.customer_email || session.customer_details?.email,
      customer_name: session.customer_details?.name || null,
      service_id: session.metadata?.service_id || null,
      package_id: session.metadata?.package_id || null,
      stripe_receipt_url: receiptUrl,
      payment_method: session.payment_method_types?.[0] || "card",
    };

    const { data: newPayment, error: insertError } = await supabaseAdmin
      .from("payments")
      .insert(paymentData)
      .select("id, amount, currency, description, status")
      .single();

    if (insertError) {
      logStep("Insert error", { error: insertError });
      return new Response(
        JSON.stringify({ success: false, error: "Failed to record payment" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    logStep("Payment recorded successfully", { paymentId: newPayment.id });

    // Create a booking (appointment) AND project immediately for service purchases
    if (session.mode === "payment" && session.metadata?.service_id) {
      const customerName = session.customer_details?.name || session.metadata?.customer_name || "Customer";
      const customerEmail = session.customer_email || session.customer_details?.email || "";
      const serviceName = session.metadata?.service_name || "Service Project";

      // Check if booking already exists for this session (using stripe_session_id stored in notes)
      const { data: existingBooking } = await supabaseAdmin
        .from("appointments")
        .select("id")
        .ilike("notes", `%stripe_session:${session_id}%`)
        .maybeSingle();

      let bookingId: string | null = null;

      if (!existingBooking) {
        // Create booking with status = pending
        const { data: newBooking, error: bookingError } = await supabaseAdmin
          .from("appointments")
          .insert({
            user_id: userId,
            service_id: session.metadata.service_id,
            package_id: session.metadata.package_id || null,
            full_name: customerName,
            email: customerEmail,
            phone: "",
            appointment_date: new Date().toISOString().split("T")[0],
            appointment_time: "TBD",
            status: "pending",
            project_status: "not_started",
            notes: `stripe_session:${session_id}\nService: ${serviceName}\nPackage: ${session.metadata?.package_name || "Unknown"}\nPayment: $${(session.amount_total || 0) / 100}`,
          })
          .select("id")
          .single();

        if (bookingError) {
          logStep("ERROR: Failed to create booking", { error: bookingError });
        } else {
          bookingId = newBooking.id;
          logStep("Booking created for service purchase", { userId, bookingId });
        }
      } else {
        bookingId = existingBooking.id;
        logStep("Booking already exists for session", { bookingId });
      }

      // Create project immediately (client sees it right away with status "pending")
      if (bookingId) {
        // Check if project already exists for this booking (using unique constraint)
        const { data: existingProject } = await supabaseAdmin
          .from("projects")
          .select("id")
          .eq("appointment_id", bookingId)
          .maybeSingle();

        if (!existingProject) {
          const { error: projectError } = await supabaseAdmin
            .from("projects")
            .insert({
              user_id: userId,
              client_id: userId,
              workspace_id: userId,
              service_id: session.metadata.service_id,
              appointment_id: bookingId,
              name: serviceName,
              title: serviceName,
              description: `Project for ${customerName}`,
              status: "pending", // Client sees it immediately with pending status
              progress: 0,
              start_date: new Date().toISOString().split("T")[0],
            });

          if (projectError) {
            // Ignore duplicate key errors (project already exists)
            if (projectError.code !== "23505") {
              logStep("ERROR: Failed to create project", { error: projectError });
            } else {
              logStep("Project already exists (duplicate key)", { bookingId });
            }
          } else {
            logStep("Project created for client", { userId, bookingId });
          }
        } else {
          logStep("Project already exists for booking", { bookingId, projectId: existingProject.id });
        }
      }
    }
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        payment: newPayment,
        message: "Payment verified and recorded" 
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
