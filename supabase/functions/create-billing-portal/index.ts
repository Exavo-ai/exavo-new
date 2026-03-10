import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { corsHeaders, handleCors } from "../_shared/response.ts";

const logStep = (step: string, details?: unknown) => {
  console.log(`[CREATE-BILLING-PORTAL] ${step}`, details ? JSON.stringify(details) : "");
};

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

    logStep("User authenticated", { userId: user.id, email: user.email });

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2025-08-27.basil",
    });

    let customerId: string | null = null;

    // ============================================
    // SECURITY: All lookups MUST be scoped to the authenticated user
    // ============================================

    // 1. Try project_subscriptions — scoped to user's projects
    const { data: userProjects } = await supabaseClient
      .from("projects")
      .select("id")
      .or(`user_id.eq.${user.id},client_id.eq.${user.id}`);

    if (userProjects && userProjects.length > 0) {
      const projectIds = userProjects.map((p: { id: string }) => p.id);
      const { data: subData } = await supabaseClient
        .from("project_subscriptions")
        .select("stripe_customer_id")
        .in("project_id", projectIds)
        .not("stripe_customer_id", "is", null)
        .limit(1);

      if (subData && subData.length > 0 && subData[0].stripe_customer_id) {
        customerId = subData[0].stripe_customer_id;
        logStep("Found customer in user's project_subscriptions", { customerId });
      }
    }

    // 2. Try workspaces table — scoped to user's workspace
    if (!customerId) {
      const { data: wsData } = await supabaseClient
        .from("workspaces")
        .select("stripe_customer_id")
        .eq("owner_id", user.id)
        .maybeSingle();
      
      if (wsData?.stripe_customer_id) {
        customerId = wsData.stripe_customer_id;
        logStep("Found customer in workspaces", { customerId });
      }
    }

    // 3. Try subscriptions table — scoped to user
    if (!customerId) {
      const { data: subTableData } = await supabaseClient
        .from("subscriptions")
        .select("stripe_customer_id")
        .eq("user_id", user.id)
        .limit(1);
      
      if (subTableData && subTableData.length > 0 && subTableData[0].stripe_customer_id) {
        customerId = subTableData[0].stripe_customer_id;
        logStep("Found customer in subscriptions", { customerId });
      }
    }

    // 4. Search Stripe by authenticated user's email
    if (!customerId) {
      const customers = await stripe.customers.list({ email: user.email, limit: 1 });
      if (customers.data.length > 0) {
        customerId = customers.data[0].id;
        logStep("Found customer in Stripe by email", { customerId });
      }
    }

    // 5. Create new Stripe customer if none found
    if (!customerId) {
      logStep("No customer found, creating new", { email: user.email });
      const newCustomer = await stripe.customers.create({
        email: user.email,
        metadata: { lovable_user_id: user.id },
      });
      customerId = newCustomer.id;
      logStep("Created new customer", { customerId });

      // Save to workspaces if exists
      await supabaseClient
        .from("workspaces")
        .update({ stripe_customer_id: customerId })
        .eq("owner_id", user.id);
    }

    // ============================================
    // SECURITY: Verify the Stripe customer email matches the authenticated user
    // This prevents any edge case where a wrong customer ID was stored
    // ============================================
    try {
      const stripeCustomer = await stripe.customers.retrieve(customerId) as Stripe.Customer;
      if (stripeCustomer && !stripeCustomer.deleted && stripeCustomer.email) {
        if (stripeCustomer.email.toLowerCase() !== user.email!.toLowerCase()) {
          logStep("SECURITY: Stripe customer email mismatch!", {
            stripeEmail: stripeCustomer.email,
            userEmail: user.email,
            customerId,
          });
          // Do NOT use this customer — fall back to creating a new one for this user
          const newCustomer = await stripe.customers.create({
            email: user.email,
            metadata: { lovable_user_id: user.id },
          });
          customerId = newCustomer.id;
          logStep("SECURITY: Created corrected customer", { customerId, email: user.email });

          // Update workspace with corrected customer ID
          await supabaseClient
            .from("workspaces")
            .update({ stripe_customer_id: customerId })
            .eq("owner_id", user.id);
        }
      }
    } catch (verifyError) {
      logStep("Could not verify customer email (non-blocking)", { error: verifyError });
    }

    const origin = req.headers.get("origin") || "https://exavo.ai";

    // Create billing portal session
    try {
      const session = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: `${origin}/portal/projects`,
      });

      logStep("Portal session created", { userId: user.id, customerId, email: user.email });

      return new Response(JSON.stringify({ url: session.url }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (portalError) {
      console.error("[CREATE-BILLING-PORTAL] Portal creation error:", portalError);
      
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
