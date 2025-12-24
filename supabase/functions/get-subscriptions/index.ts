import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { corsHeaders, successResponse, errors, handleCors } from "../_shared/response.ts";

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");

    if (!supabaseUrl || !serviceRoleKey || !stripeSecretKey) {
      return errors.internal("Server configuration error");
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return errors.unauthorized("Missing authorization header");
    }

    const token = authHeader.replace("Bearer ", "");

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return errors.unauthorized("Invalid or expired token");
    }

    // Get workspace subscription
    const { data: workspace } = await supabase
      .from("workspaces")
      .select("stripe_subscription_id")
      .eq("owner_id", user.id)
      .maybeSingle();

    if (!workspace?.stripe_subscription_id) {
      return successResponse({ subscriptions: [] });
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2025-08-27.basil",
    });

    let subscription: Stripe.Subscription;
    try {
      subscription = await stripe.subscriptions.retrieve(workspace.stripe_subscription_id, {
        expand: ["items.data.price.product"],
      });
    } catch {
      return successResponse({ subscriptions: [] });
    }

    if (!["active", "trialing"].includes(subscription.status)) {
      return successResponse({ subscriptions: [] });
    }

    const item = subscription.items.data[0];
    const price = item.price;
    const product = typeof price.product === "string" ? await stripe.products.retrieve(price.product) : price.product;

    const formattedSubscription = {
      id: subscription.id,
      status: subscription.status,
      plan_name: product.name,
      amount: (price.unit_amount || 0) / 100,
      currency: price.currency.toUpperCase(),
      interval: price.recurring?.interval || "month",
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
    };

    return successResponse({
      subscriptions: [formattedSubscription],
    });
  } catch (error) {
    console.error("[GET-SUBSCRIPTIONS]", error);
    return errors.internal("Unexpected error");
  }
});
