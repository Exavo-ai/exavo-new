import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: unknown) => {
  console.log(`[CANCEL-SUBSCRIPTION] ${step}`, details ? JSON.stringify(details) : "");
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      logStep("ERROR", { message: "Stripe secret key not configured" });
      return new Response(
        JSON.stringify({ ok: false, error: "Stripe secret key not configured" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user) throw new Error("User not authenticated");
    logStep("User authenticated", { userId: user.id });

    const { project_id } = await req.json();
    if (!project_id) throw new Error("project_id is required");
    logStep("Request body", { project_id });

    // Verify user owns this project
    const { data: project, error: projectError } = await supabaseClient
      .from("projects")
      .select("id, user_id, client_id, workspace_id")
      .eq("id", project_id)
      .single();

    if (projectError || !project) {
      throw new Error("Project not found");
    }

    const isOwner = 
      project.user_id === user.id || 
      project.client_id === user.id || 
      project.workspace_id === user.id;

    if (!isOwner) {
      throw new Error("Not authorized to cancel this subscription");
    }
    logStep("Project ownership verified");

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Get subscription from project_subscriptions
    const { data: projectSub, error: subError } = await supabaseClient
      .from("project_subscriptions")
      .select("*")
      .eq("project_id", project_id)
      .single();

    if (subError || !projectSub) {
      throw new Error("No subscription found for this project");
    }

    let stripeSubscriptionId = projectSub.stripe_subscription_id;

    // If stripe_subscription_id is missing, try to recover it from Stripe via session ID
    if (!stripeSubscriptionId) {
      logStep("stripe_subscription_id missing, attempting recovery from Stripe");

      // Get the payment record to find the stripe_session_id
      const { data: payment } = await supabaseClient
        .from("payments")
        .select("stripe_session_id")
        .eq("user_id", user.id)
        .not("stripe_session_id", "is", null)
        .order("created_at", { ascending: false })
        .limit(10);

      let recoveredSubId: string | null = null;

      if (payment && payment.length > 0) {
        for (const p of payment) {
          if (p.stripe_session_id) {
            try {
              const session = await stripe.checkout.sessions.retrieve(p.stripe_session_id);
              if (session.subscription && session.mode === "subscription") {
                recoveredSubId = typeof session.subscription === "string" 
                  ? session.subscription 
                  : session.subscription.id;
                logStep("Recovered subscription ID from checkout session", { 
                  sessionId: p.stripe_session_id, 
                  subscriptionId: recoveredSubId 
                });

                // Update the project_subscriptions record with the recovered ID
                const customerId = typeof session.customer === "string" 
                  ? session.customer 
                  : session.customer?.id || null;

                await supabaseClient
                  .from("project_subscriptions")
                  .update({ 
                    stripe_subscription_id: recoveredSubId,
                    stripe_customer_id: customerId,
                  })
                  .eq("id", projectSub.id);

                stripeSubscriptionId = recoveredSubId;
                break;
              }
            } catch (e) {
              logStep("Could not retrieve session", { sessionId: p.stripe_session_id, error: e });
            }
          }
        }
      }

      if (!stripeSubscriptionId) {
        logStep("ERROR", { message: "Could not recover stripe_subscription_id" });
        return new Response(
          JSON.stringify({ ok: false, error: "No active Stripe subscription found for this project. Please contact support." }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
        );
      }
    }

    if (projectSub.status === "canceled") {
      throw new Error("Subscription is already canceled");
    }

    logStep("Found subscription", { 
      subscriptionId: stripeSubscriptionId,
      status: projectSub.status 
    });

    // Cancel at period end via Stripe
    const updatedSubscription = await stripe.subscriptions.update(
      stripeSubscriptionId,
      { cancel_at_period_end: true }
    );

    logStep("Stripe subscription updated", { 
      id: updatedSubscription.id,
      cancel_at_period_end: updatedSubscription.cancel_at_period_end,
      current_period_end: updatedSubscription.current_period_end
    });

    // Update local record
    const { error: updateError } = await supabaseClient
      .from("project_subscriptions")
      .update({
        status: "canceled",
        next_renewal_date: new Date(updatedSubscription.current_period_end * 1000).toISOString(),
      })
      .eq("id", projectSub.id);

    if (updateError) {
      logStep("ERROR updating local subscription", { error: updateError });
    } else {
      logStep("Local subscription updated to canceled");
    }

    return new Response(
      JSON.stringify({ 
        ok: true, 
        status: "canceled",
        cancel_at_period_end: true,
        message: "Subscription will be canceled at period end",
        access_until: new Date(updatedSubscription.current_period_end * 1000).toISOString()
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
    );
  }
});
