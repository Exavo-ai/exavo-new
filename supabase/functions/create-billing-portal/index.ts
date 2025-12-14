import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { corsHeaders, successResponse, errors, handleCors } from "../_shared/response.ts";

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error("[CREATE-BILLING-PORTAL] Missing Supabase environment variables");
      return errors.internal("Server configuration error");
    }

    if (!stripeSecretKey) {
      console.error("[CREATE-BILLING-PORTAL] Missing Stripe secret key");
      return errors.internal("Payment system not configured");
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return errors.unauthorized("No authorization header");
    }

    const token = authHeader.replace("Bearer ", "");
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);

    if (userError || !user?.email) {
      console.error("[CREATE-BILLING-PORTAL] Auth error:", userError?.message);
      return errors.unauthorized("Invalid or expired token");
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2025-08-27.basil",
    });

    // Find Stripe customer by email
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });

    if (customers.data.length === 0) {
      console.log(`[CREATE-BILLING-PORTAL] No Stripe customer found for: ${user.email}`);
      return errors.notFound("No billing account found. Please make a purchase first.");
    }

    const customerId = customers.data[0].id;
    const origin = req.headers.get("origin") || "http://localhost:3000";

    // Create billing portal session
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${origin}/client/subscriptions`,
    });

    console.log(`[CREATE-BILLING-PORTAL] Portal session created for user: ${user.id}`);

    return successResponse({ url: session.url });
  } catch (error: unknown) {
    console.error("[CREATE-BILLING-PORTAL] Unexpected error:", error);

    if (error instanceof Stripe.errors.StripeError) {
      if ((error as Stripe.errors.StripeError).code === "resource_missing") {
        return errors.notFound("No billing account found");
      }
      return errors.internal("Payment service error");
    }

    return errors.internal("An unexpected error occurred");
  }
});
