import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Server-side price to credits mapping - NEVER trust client values
const PRICE_CREDITS_MAP: Record<string, { credits: number; kind: "credit_pack" | "subscription" }> = {
  // Credit Packs (one-time)
  "price_1SjKxLBcggXTMoM3EqEMUlMR": { credits: 10, kind: "credit_pack" },
  "price_1SjKxYBcggXTMoM3Vfo4WZ8i": { credits: 50, kind: "credit_pack" },
  "price_1SjKy0BcggXTMoM3dmx5Y4tK": { credits: 150, kind: "credit_pack" },
  // Subscriptions (monthly credits)
  "price_1SjKy6BcggXTMoM3GnREMyak": { credits: 25, kind: "subscription" },
  "price_1SjKy7BcggXTMoM3BuHnFJph": { credits: 100, kind: "subscription" },
  "price_1SjKy9BcggXTMoM3pPSS37h1": { credits: 300, kind: "subscription" },
};

const logStep = (step: string, details?: unknown) => {
  console.log(`[CREATE-CREDITS-CHECKOUT] ${step}`, details ? JSON.stringify(details) : "");
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    // Get user from auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header provided");
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !userData.user) {
      throw new Error("User not authenticated");
    }

    const user = userData.user;
    logStep("User authenticated", { userId: user.id, email: user.email });

    // Parse request body
    const { priceId, mode } = await req.json();
    
    if (!priceId || !mode) {
      throw new Error("Missing priceId or mode");
    }

    if (mode !== "payment" && mode !== "subscription") {
      throw new Error("Invalid mode. Must be 'payment' or 'subscription'");
    }

    // Validate price exists in our mapping
    const priceConfig = PRICE_CREDITS_MAP[priceId];
    if (!priceConfig) {
      throw new Error("Invalid priceId");
    }

    // Validate mode matches price type
    if (mode === "payment" && priceConfig.kind !== "credit_pack") {
      throw new Error("This price is not for one-time payment");
    }
    if (mode === "subscription" && priceConfig.kind !== "subscription") {
      throw new Error("This price is not for subscription");
    }

    logStep("Price validated", { priceId, mode, credits: priceConfig.credits });

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Check for existing customer
    const customers = await stripe.customers.list({ email: user.email!, limit: 1 });
    let customerId: string | undefined;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      logStep("Found existing customer", { customerId });
    }

    const origin = req.headers.get("origin") || Deno.env.get("APP_URL") || "http://localhost:5173";

    // Build metadata - server-validated credits
    const metadata: Record<string, string> = {
      lovable_user_id: user.id,
      kind: priceConfig.kind,
      credits: String(priceConfig.credits),
      price_id: priceId,
    };

    // Create checkout session
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      customer: customerId,
      customer_email: customerId ? undefined : user.email!,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: mode,
      success_url: `${origin}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/billing/cancel`,
      metadata,
    };

    // For subscriptions, add subscription data with metadata
    if (mode === "subscription") {
      sessionParams.subscription_data = {
        metadata,
      };
    }

    const session = await stripe.checkout.sessions.create(sessionParams);
    logStep("Checkout session created", { sessionId: session.id, url: session.url });

    return new Response(JSON.stringify({ url: session.url, sessionId: session.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
