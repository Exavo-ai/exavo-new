import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { corsHeaders, successResponse, errors, handleCors } from "../_shared/response.ts";

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      console.error("[GET-SUBSCRIPTIONS] Missing Supabase environment variables");
      return errors.internal("Server configuration error");
    }

    if (!stripeSecretKey) {
      console.error("[GET-SUBSCRIPTIONS] Missing Stripe secret key");
      return errors.internal("Payment system not configured");
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return errors.unauthorized("No authorization header");
    }

    const token = authHeader.replace("Bearer ", "");
    const supabaseClient = createClient(supabaseUrl, supabaseServiceRoleKey);

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);

    if (userError || !user?.id) {
      console.error("[GET-SUBSCRIPTIONS] Auth error:", userError?.message);
      return errors.unauthorized("Invalid or expired token");
    }

    // Get workspace to find current subscription
    const { data: workspace, error: workspaceError } = await supabaseClient
      .from("workspaces")
      .select("stripe_subscription_id, subscription_status")
      .eq("owner_id", user.id)
      .maybeSingle();

    if (workspaceError) {
      console.error("[GET-SUBSCRIPTIONS] Workspace fetch error:", workspaceError);
      return errors.internal("Failed to fetch workspace");
    }

    // No workspace or no active subscription
    if (!workspace?.stripe_subscription_id) {
      console.log(`[GET-SUBSCRIPTIONS] No active subscription for user: ${user.id}`);
      return successResponse({ subscriptions: [] });
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2025-08-27.basil",
    });

    // Fetch the current subscription from workspace
    let subscription: Stripe.Subscription;
    try {
      subscription = await stripe.subscriptions.retrieve(
        workspace.stripe_subscription_id,
        { expand: ["items.data"] }
      );
    } catch (stripeError) {
      console.error("[GET-SUBSCRIPTIONS] Stripe retrieval error:", stripeError);
      // Subscription might have been deleted
      return successResponse({ subscriptions: [] });
    }

    // Only return if subscription is active
    if (subscription.status !== "active" && subscription.status !== "trialing") {
      console.log(`[GET-SUBSCRIPTIONS] Subscription ${subscription.id} not active (status: ${subscription.status})`);
      return successResponse({ subscriptions: [] });
    }

    const price = subscription.items.data[0].price;
    const productId = typeof price.product === "string" ? price.product : price.product.id;
    const product = await stripe.products.retrieve(productId);

    const formattedSubscription = {
      id: subscription.id,
      productName: product.name,
      planName: price.nickname || "Standard",
      price: `$${((price.unit_amount || 0) / 100).toFixed(2)}/${price.recurring?.interval || "month"}`,
      status: subscription.status === "active" ? "Active" : subscription.status === "canceled" ? "Canceled" : "Expiring Soon",
      nextBilling: subscription.current_period_end
        ? new Date(subscription.current_period_end * 1000).toISOString().split("T")[0]
        : "N/A",
      currency: price.currency.toUpperCase(),
    };

    console.log(`[GET-SUBSCRIPTIONS] Returning subscription: ${product.name} for user: ${user.id}`);

    return successResponse({ subscriptions: [formattedSubscription] });
  } catch (error) {
    console.error("[GET-SUBSCRIPTIONS] Unexpected error:", error);

    if (error instanceof Stripe.errors.StripeError) {
      return errors.internal("Payment service error");
    }

    return errors.internal("An unexpected error occurred");
  }
});
