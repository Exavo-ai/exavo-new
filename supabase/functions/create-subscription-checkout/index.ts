import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Feature flag: set to false to disable client notes collection
const ENABLE_CLIENT_NOTES = true;

const logStep = (step: string, details?: unknown) => {
  console.log(`[CREATE-SUBSCRIPTION-CHECKOUT] ${step}`, details ? JSON.stringify(details) : "");
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { packageId, priceId, successUrl, cancelUrl } = await req.json();

    // Support both package-based and legacy priceId-based subscriptions
    if (!packageId && !priceId) {
      return new Response(
        JSON.stringify({ error: "Package ID or Price ID is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    logStep("Request received", { packageId, priceId });

    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authentication required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);

    if (userError || !user?.email) {
      logStep("Authentication failed", { error: userError?.message });
      return new Response(
        JSON.stringify({ error: "User not authenticated" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    logStep("User authenticated", { userId: user.id, email: user.email });

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Check for existing customer
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId: string | undefined;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      logStep("Found existing customer", { customerId });
    }

    const origin = req.headers.get("origin") || "https://exavo.ai";

    // If packageId is provided, fetch package details and build line items
    if (packageId) {
      const supabaseAdmin = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
      );

      const { data: packageData, error: packageError } = await supabaseAdmin
        .from('service_packages')
        .select('*, services(id, name, payment_model)')
        .eq('id', packageId)
        .single();

      if (packageError || !packageData) {
        logStep("Package not found", { error: packageError?.message });
        return new Response(
          JSON.stringify({ error: "Package not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const service = packageData.services as { id: string; name: string; payment_model: string } | null;
      const buildCost = packageData.build_cost || 0;
      const monthlyFee = packageData.monthly_fee || 0;

      if (monthlyFee <= 0) {
        return new Response(
          JSON.stringify({ error: "This package has no monthly fee configured" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [];

      // Add build cost as one-time line item if > 0
      if (buildCost > 0) {
        lineItems.push({
          price_data: {
            currency: packageData.currency?.toLowerCase() || 'usd',
            product_data: {
              name: `${service?.name || 'Service'} - ${packageData.package_name} (Build Cost)`,
              description: 'One-time setup and build fee',
            },
            unit_amount: Math.round(buildCost * 100),
          },
          quantity: 1,
        });
      }

      // Add monthly subscription
      lineItems.push({
        price_data: {
          currency: packageData.currency?.toLowerCase() || 'usd',
          product_data: {
            name: `${service?.name || 'Service'} - ${packageData.package_name} (Monthly)`,
            description: 'Monthly subscription fee including hosting & support',
          },
          unit_amount: Math.round(monthlyFee * 100),
          recurring: {
            interval: 'month',
          },
        },
        quantity: 1,
      });

      logStep("Creating package-based subscription checkout", { buildCost, monthlyFee });

      // Build session options with comprehensive metadata for reliable webhook processing
      const sessionOptions: Stripe.Checkout.SessionCreateParams = {
        customer: customerId,
        customer_email: customerId ? undefined : user.email,
        client_reference_id: user.id,
        line_items: lineItems,
        mode: "subscription",
        allow_promotion_codes: true,
        success_url: successUrl || `${origin}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: cancelUrl || `${origin}/client/billing`,
        metadata: {
          lovable_user_id: user.id,
          package_id: packageId,
          service_id: service?.id || '',
          service_name: service?.name || 'Service',
          payment_model: 'subscription',
          type: "subscription",
          service_type: "subscription", // Explicit marker for webhook
          build_cost: buildCost.toString(),
          monthly_fee: monthlyFee.toString(),
        },
        subscription_data: {
          metadata: {
            lovable_user_id: user.id,
            service_id: service?.id || '',
            package_id: packageId,
            service_type: "subscription",
          },
        },
      };

      // Add optional client notes field (feature-flagged)
      if (ENABLE_CLIENT_NOTES) {
        try {
          sessionOptions.custom_fields = [
            {
              key: 'notes',
              label: { type: 'custom', custom: 'Notes / Requirements (optional)' },
              type: 'text',
              optional: true,
              text: { maximum_length: 255 },
            },
          ];
        } catch (e) {
          logStep("Could not add custom_fields (feature not supported)", { error: e });
        }
      }

      const session = await stripe.checkout.sessions.create(sessionOptions);

      logStep("Package subscription checkout session created", { sessionId: session.id });

      return new Response(
        JSON.stringify({ sessionId: session.id, url: session.url }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Legacy: Use priceId directly with comprehensive metadata
    const legacySessionOptions: Stripe.Checkout.SessionCreateParams = {
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      client_reference_id: user.id,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: "subscription",
      allow_promotion_codes: true,
      success_url: successUrl || `${origin}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl || `${origin}/client/billing`,
      metadata: {
        lovable_user_id: user.id,
        type: "subscription",
        service_type: "subscription",
        payment_model: "subscription",
      },
      subscription_data: {
        metadata: {
          lovable_user_id: user.id,
          service_type: "subscription",
        },
      },
    };

    // Add optional client notes field (feature-flagged)
    if (ENABLE_CLIENT_NOTES) {
      try {
        legacySessionOptions.custom_fields = [
          {
            key: 'notes',
            label: { type: 'custom', custom: 'Notes / Requirements (optional)' },
            type: 'text',
            optional: true,
            text: { maximum_length: 255 },
          },
        ];
      } catch (e) {
        logStep("Could not add custom_fields for legacy subscription (feature not supported)", { error: e });
      }
    }

    const session = await stripe.checkout.sessions.create(legacySessionOptions);

    logStep("Subscription checkout session created", { sessionId: session.id });

    return new Response(
      JSON.stringify({ sessionId: session.id, url: session.url }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logStep("ERROR", { message });
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
