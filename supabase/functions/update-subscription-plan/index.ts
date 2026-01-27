import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const safeUnixToIso = (unixSeconds: unknown) => {
  if (typeof unixSeconds !== "number" || !Number.isFinite(unixSeconds) || unixSeconds <= 0) return null;
  try {
    return new Date(unixSeconds * 1000).toISOString();
  } catch {
    return null;
  }
};

const logStep = (step: string, details?: unknown) => {
  const requestId = crypto.randomUUID().slice(0, 8);
  console.log(`[UPDATE-SUBSCRIPTION-PLAN][${requestId}] ${step}`, details ? JSON.stringify(details) : "");
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { project_id, new_package_id, proration_behavior = "create_prorations" } = await req.json();

    if (!project_id) {
      return new Response(
        JSON.stringify({ ok: false, message: "project_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!new_package_id) {
      return new Response(
        JSON.stringify({ ok: false, message: "new_package_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    logStep("Request received", { project_id, new_package_id, proration_behavior });

    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ ok: false, message: "Authentication required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);

    if (userError || !user) {
      logStep("Authentication failed", { error: userError?.message });
      return new Response(
        JSON.stringify({ ok: false, message: "User not authenticated" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    logStep("User authenticated", { userId: user.id, email: user.email });

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // 1. Get the project and verify ownership
    const { data: project, error: projectError } = await supabaseAdmin
      .from("projects")
      .select("id, user_id, client_id, service_id, payment_model, appointment_id")
      .eq("id", project_id)
      .single();

    if (projectError || !project) {
      logStep("Project not found", { error: projectError?.message });
      return new Response(
        JSON.stringify({ ok: false, message: "Project not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify user owns this project
    if (project.user_id !== user.id && project.client_id !== user.id) {
      logStep("Unauthorized access attempt", { projectUserId: project.user_id, userId: user.id });
      return new Response(
        JSON.stringify({ ok: false, message: "You do not have permission to modify this subscription" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Get the subscription
    const { data: subscription, error: subError } = await supabaseAdmin
      .from("project_subscriptions")
      .select("*")
      .eq("project_id", project_id)
      .single();

    if (subError || !subscription) {
      logStep("Subscription not found", { error: subError?.message });
      return new Response(
        JSON.stringify({ ok: false, message: "No active subscription found for this project" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!subscription.stripe_subscription_id) {
      logStep("No Stripe subscription ID");
      return new Response(
        JSON.stringify({ ok: false, message: "Subscription is not linked to Stripe" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check subscription is active
    if (!["active", "trialing"].includes(subscription.status)) {
      logStep("Subscription not active", { status: subscription.status });
      return new Response(
        JSON.stringify({ ok: false, message: `Cannot change plan while subscription is ${subscription.status}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Get current package from appointment
    let currentPackageId: string | null = null;
    if (project.appointment_id) {
      const { data: appointment } = await supabaseAdmin
        .from("appointments")
        .select("package_id")
        .eq("id", project.appointment_id)
        .single();
      currentPackageId = appointment?.package_id || null;
    }

    // 4. Get the new package details
    const { data: newPackage, error: packageError } = await supabaseAdmin
      .from("service_packages")
      .select("*, services(id, name, payment_model)")
      .eq("id", new_package_id)
      .single();

    if (packageError || !newPackage) {
      logStep("New package not found", { error: packageError?.message });
      return new Response(
        JSON.stringify({ ok: false, message: "Package not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify new package is from the same service
    if (newPackage.service_id !== project.service_id) {
      logStep("Package service mismatch", { newServiceId: newPackage.service_id, projectServiceId: project.service_id });
      return new Response(
        JSON.stringify({ ok: false, message: "Cannot switch to a package from a different service" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify it's a subscription package
    if (!newPackage.monthly_fee || newPackage.monthly_fee <= 0) {
      logStep("Package has no monthly fee", { monthlyFee: newPackage.monthly_fee });
      return new Response(
        JSON.stringify({ ok: false, message: "Selected package does not have a monthly subscription" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if same package
    if (currentPackageId === new_package_id) {
      logStep("Same package selected");
      return new Response(
        JSON.stringify({ ok: false, message: "You are already subscribed to this plan" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    logStep("Switching plan", { 
      from: currentPackageId, 
      to: new_package_id, 
      newMonthlyFee: newPackage.monthly_fee 
    });

    // 5. Update the subscription in Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Get current subscription to find the subscription item
    const stripeSubscription = await stripe.subscriptions.retrieve(subscription.stripe_subscription_id);
    
    if (!stripeSubscription || stripeSubscription.status === "canceled") {
      logStep("Stripe subscription not found or canceled");
      return new Response(
        JSON.stringify({ ok: false, message: "Stripe subscription not found or already canceled" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Find the recurring subscription item (not the one-time build cost)
    const recurringItem = stripeSubscription.items.data.find(
      (item: Stripe.SubscriptionItem) => item.price.recurring !== null
    );

    if (!recurringItem) {
      logStep("No recurring item found in subscription");
      return new Response(
        JSON.stringify({ ok: false, message: "No recurring subscription item found" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create a new price for the new package (or use existing if we had stripe_price_id)
    // For now, create an ad-hoc price
    const service = newPackage.services as { id: string; name: string } | null;
    const newPrice = await stripe.prices.create({
      currency: (newPackage.currency || "usd").toLowerCase(),
      unit_amount: Math.round(newPackage.monthly_fee * 100),
      recurring: { interval: "month" },
      product_data: {
        name: `${service?.name || "Service"} - ${newPackage.package_name} (Monthly)`,
      },
    });

    logStep("Created new Stripe price", { priceId: newPrice.id });

    // Update the subscription with the new price
    const updatedSubscription = await stripe.subscriptions.update(subscription.stripe_subscription_id, {
      items: [
        {
          id: recurringItem.id,
          price: newPrice.id,
        },
      ],
      proration_behavior: proration_behavior as Stripe.SubscriptionUpdateParams.ProrationBehavior,
      metadata: {
        ...stripeSubscription.metadata,
        package_id: new_package_id,
        package_name: newPackage.package_name,
        monthly_fee: newPackage.monthly_fee.toString(),
      },
    });

    logStep("Stripe subscription updated", { 
      subscriptionId: updatedSubscription.id,
      status: updatedSubscription.status,
      currentPeriodEnd: updatedSubscription.current_period_end
    });

    const nextRenewalIso = safeUnixToIso(updatedSubscription.current_period_end);
    if (!nextRenewalIso) {
      logStep("date_conversion_warning", { current_period_end: updatedSubscription.current_period_end });
    }

    // 6. Update the appointment to reference the new package
    if (project.appointment_id) {
      await supabaseAdmin
        .from("appointments")
        .update({ package_id: new_package_id })
        .eq("id", project.appointment_id);
      
      logStep("Updated appointment package reference");
    }

    // 7. Update the project_subscriptions record with new renewal date
    await supabaseAdmin
      .from("project_subscriptions")
      .update({
        ...(nextRenewalIso ? { next_renewal_date: nextRenewalIso } : {}),
        updated_at: new Date().toISOString(),
      })
      .eq("id", subscription.id);

    logStep("Updated project_subscriptions record");

    // Get current package name for response
    let currentPackageName: string | null = null;
    if (currentPackageId) {
      const { data: currentPkg } = await supabaseAdmin
        .from("service_packages")
        .select("package_name")
        .eq("id", currentPackageId)
        .single();
      currentPackageName = currentPkg?.package_name || null;
    }

    const isUpgrade = newPackage.monthly_fee > (recurringItem.price.unit_amount || 0) / 100;

    return new Response(
      JSON.stringify({
        ok: true,
        message: `Successfully ${isUpgrade ? "upgraded" : "downgraded"} to ${newPackage.package_name}`,
        from_plan: currentPackageName,
        to_plan: newPackage.package_name,
        new_monthly_fee: newPackage.monthly_fee,
        proration_applied: proration_behavior === "create_prorations",
        next_billing_date: nextRenewalIso,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logStep("ERROR", { message });
    return new Response(
      JSON.stringify({ ok: false, message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
