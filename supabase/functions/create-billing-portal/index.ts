import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { corsHeaders, handleCors } from "../_shared/response.ts";

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("[CREATE-BILLING-PORTAL] Missing Supabase environment variables");
      return new Response(JSON.stringify({ error: "Server configuration error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!stripeSecretKey) {
      console.error("[CREATE-BILLING-PORTAL] Missing Stripe secret key");
      return new Response(JSON.stringify({ error: "Payment system not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);

    if (userError || !user?.email) {
      console.error("[CREATE-BILLING-PORTAL] Auth error:", userError?.message);
      return new Response(JSON.stringify({ error: "Invalid or expired token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2025-08-27.basil",
    });

    let customerId: string | null = null;

    // 1. Try project_subscriptions first
    const { data: subData } = await supabaseClient
      .from("project_subscriptions")
      .select("stripe_customer_id")
      .not("stripe_customer_id", "is", null)
      .limit(1);
    
    if (subData && subData.length > 0 && subData[0].stripe_customer_id) {
      customerId = subData[0].stripe_customer_id;
      console.log(`[CREATE-BILLING-PORTAL] Found customer in project_subscriptions: ${customerId}`);
    }

    // 2. Try workspaces table
    if (!customerId) {
      const { data: wsData } = await supabaseClient
        .from("workspaces")
        .select("stripe_customer_id")
        .eq("owner_id", user.id)
        .maybeSingle();
      
      if (wsData?.stripe_customer_id) {
        customerId = wsData.stripe_customer_id;
        console.log(`[CREATE-BILLING-PORTAL] Found customer in workspaces: ${customerId}`);
      }
    }

    // 3. Try subscriptions table
    if (!customerId) {
      const { data: subTableData } = await supabaseClient
        .from("subscriptions")
        .select("stripe_customer_id")
        .eq("user_id", user.id)
        .limit(1);
      
      if (subTableData && subTableData.length > 0 && subTableData[0].stripe_customer_id) {
        customerId = subTableData[0].stripe_customer_id;
        console.log(`[CREATE-BILLING-PORTAL] Found customer in subscriptions: ${customerId}`);
      }
    }

    // 4. Search Stripe by email
    if (!customerId) {
      const customers = await stripe.customers.list({ email: user.email, limit: 1 });
      if (customers.data.length > 0) {
        customerId = customers.data[0].id;
        console.log(`[CREATE-BILLING-PORTAL] Found customer in Stripe by email: ${customerId}`);
      }
    }

    // 5. Create new Stripe customer if none found
    if (!customerId) {
      console.log(`[CREATE-BILLING-PORTAL] No customer found, creating new for: ${user.email}`);
      const newCustomer = await stripe.customers.create({
        email: user.email,
        metadata: { lovable_user_id: user.id },
      });
      customerId = newCustomer.id;
      console.log(`[CREATE-BILLING-PORTAL] Created new customer: ${customerId}`);

      // Save to workspaces if exists
      await supabaseClient
        .from("workspaces")
        .update({ stripe_customer_id: customerId })
        .eq("owner_id", user.id);
    }

    const origin = req.headers.get("origin") || "https://exavo.ai";

    // Create billing portal session
    try {
      const session = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: `${origin}/portal/projects`,
      });

      console.log(`[CREATE-BILLING-PORTAL] Portal session created for user: ${user.id}`);

      return new Response(JSON.stringify({ url: session.url }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (portalError) {
      console.error("[CREATE-BILLING-PORTAL] Portal creation error:", portalError);
      
      // Check if it's a portal not configured error
      const stripeError = portalError as Stripe.errors.StripeError;
      if (stripeError.code === "resource_missing" || 
          stripeError.message?.includes("portal") ||
          stripeError.message?.includes("configuration")) {
        return new Response(JSON.stringify({ 
          error: "Stripe Customer Portal is not configured. Please set it up in your Stripe Dashboard." 
        }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw portalError;
    }
  } catch (error: unknown) {
    console.error("[CREATE-BILLING-PORTAL] Unexpected error:", error);
    const message = error instanceof Error ? error.message : "An unexpected error occurred";

    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
