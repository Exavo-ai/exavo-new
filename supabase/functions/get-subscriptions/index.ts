import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "X-Frame-Options": "DENY",
  "X-Content-Type-Options": "nosniff",
  "X-XSS-Protection": "1; mode=block",
  "Referrer-Policy": "no-referrer-when-downgrade",
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload",
  "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
  "Pragma": "no-cache",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);

    if (userError || !user?.id) {
      throw new Error("Unauthorized");
    }

    // Get workspace to find current subscription
    const { data: workspace, error: workspaceError } = await supabaseClient
      .from('workspaces')
      .select('stripe_subscription_id, subscription_status')
      .eq('owner_id', user.id)
      .single();

    // If no workspace or no active subscription, return empty
    if (workspaceError || !workspace?.stripe_subscription_id) {
      console.log("[GET-SUBSCRIPTIONS] No active subscription found for user");
      return new Response(JSON.stringify({ subscriptions: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Fetch ONLY the current subscription from workspace
    const subscription = await stripe.subscriptions.retrieve(
      workspace.stripe_subscription_id,
      { expand: ["items.data"] }
    );

    // Only return if subscription is active
    if (subscription.status !== "active" && subscription.status !== "trialing") {
      console.log(`[GET-SUBSCRIPTIONS] Subscription ${subscription.id} is not active (status: ${subscription.status})`);
      return new Response(JSON.stringify({ subscriptions: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const price = subscription.items.data[0].price;
    const productId = typeof price.product === 'string' ? price.product : price.product.id;
    const product = await stripe.products.retrieve(productId);
    
    const formattedSubscription = {
      id: subscription.id,
      productName: product.name,
      planName: price.nickname || "Standard",
      price: `$${(price.unit_amount! / 100).toFixed(2)}/${price.recurring?.interval || "month"}`,
      status: subscription.status === "active" ? "Active" : subscription.status === "canceled" ? "Canceled" : "Expiring Soon",
      nextBilling: subscription.current_period_end 
        ? new Date(subscription.current_period_end * 1000).toISOString().split("T")[0]
        : "N/A",
      currency: price.currency.toUpperCase(),
    };

    console.log(`[GET-SUBSCRIPTIONS] Returning current subscription: ${product.name}`);

    return new Response(JSON.stringify({ subscriptions: [formattedSubscription] }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});