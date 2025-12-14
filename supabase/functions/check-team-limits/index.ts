import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import Stripe from "https://esm.sh/stripe@18.5.0";

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

const PLAN_LIMITS: Record<string, { name: string; maxTeamMembers: number; teamEnabled: boolean }> = {
  "prod_TTapRptmEkLouu": { name: "Starter", maxTeamMembers: 5, teamEnabled: true },
  "prod_TTapq8rgy3dmHT": { name: "Pro", maxTeamMembers: 10, teamEnabled: true },
  "prod_TTapwaC6qD21xi": { name: "Enterprise", maxTeamMembers: 20, teamEnabled: true },
  "default": { name: "Free", maxTeamMembers: 1, teamEnabled: false },
};

function successResponse(data: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify({ success: true, ...data }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function errorResponse(code: string, message: string, status: number): Response {
  return new Response(JSON.stringify({ success: false, error: { code, message } }), {
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
    const supabaseAuth = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser(token);

    if (userError || !user) {
      return errorResponse("UNAUTHORIZED", "Invalid or expired authentication token", 401);
    }

    // Create service client
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    console.log(`Checking team limits for user: ${user.email}`);

    // Get workspace
    const { data: workspace } = await supabaseClient
      .from('workspaces')
      .select('current_plan_product_id, subscription_status, stripe_customer_id')
      .eq('owner_id', user.id)
      .maybeSingle();

    let productId = workspace?.current_plan_product_id || "default";
    console.log(`Workspace data:`, workspace);

    // Check Stripe if needed
    if (!workspace || productId === "default") {
      console.log("No workspace or default plan, checking Stripe...");
      
      const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
        apiVersion: "2025-08-27.basil",
      });

      const customers = await stripe.customers.list({ email: user.email, limit: 1 });

      if (customers.data.length > 0) {
        const customerId = customers.data[0].id;
        console.log(`Found Stripe customer: ${customerId}`);

        const subscriptions = await stripe.subscriptions.list({
          customer: customerId,
          status: "active",
          limit: 1,
        });

        if (subscriptions.data.length > 0) {
          const subscription = subscriptions.data[0];
          productId = typeof subscription.items.data[0].price.product === 'string'
            ? subscription.items.data[0].price.product
            : subscription.items.data[0].price.product.id;
          
          console.log(`Active subscription found, product: ${productId}`);

          await supabaseClient
            .from('workspaces')
            .upsert({
              owner_id: user.id,
              current_plan_product_id: productId,
              subscription_status: subscription.status,
              stripe_customer_id: customerId,
              stripe_subscription_id: subscription.id,
              updated_at: new Date().toISOString()
            }, { onConflict: 'owner_id' });
        } else {
          console.log("No active subscription found in Stripe");
        }
      } else {
        console.log("No Stripe customer found");
      }
    }

    const planLimits = PLAN_LIMITS[productId] || PLAN_LIMITS.default;
    console.log(`Final plan: ${planLimits.name}, Product ID: ${productId}`);

    // Get team member count
    const { data: teamMembers, error: countError } = await supabaseClient
      .from("team_members")
      .select("id", { count: "exact" })
      .eq("organization_id", user.id);

    if (countError) {
      console.error("Error counting team members:", countError);
      return errorResponse("INTERNAL_ERROR", "Failed to count team members", 500);
    }

    const currentCount = teamMembers?.length || 0;
    console.log(`Current team member count: ${currentCount}`);

    const canInvite = planLimits.teamEnabled && currentCount < planLimits.maxTeamMembers;
    const limitReached = currentCount >= planLimits.maxTeamMembers;

    return successResponse({
      currentCount,
      maxTeamMembers: planLimits.maxTeamMembers,
      teamEnabled: planLimits.teamEnabled,
      canInvite,
      limitReached,
      planName: planLimits.name,
      productId,
    });

  } catch (error) {
    console.error("Unexpected error:", error);
    return errorResponse("INTERNAL_ERROR", "An unexpected error occurred", 500);
  }
});
