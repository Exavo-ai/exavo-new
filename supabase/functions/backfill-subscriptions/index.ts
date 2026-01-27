import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: unknown) => {
  const timestamp = new Date().toISOString();
  console.log(`[BACKFILL-SUBSCRIPTIONS][${timestamp}] ${step}`, details ? JSON.stringify(details) : "");
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    // Authenticate admin user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authentication required" }),
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
        JSON.stringify({ error: "User not authenticated" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user is admin
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: roleData } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      return new Response(
        JSON.stringify({ error: "Admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    logStep("Admin authenticated", { userId: user.id });

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const body = await req.json().catch(() => ({}));
    const dryRun = body.dryRun !== false; // Default to dry run for safety
    const projectId = body.projectId; // Optional: backfill specific project

    logStep("Backfill mode", { dryRun, specificProject: projectId || "all" });

    const results = {
      processed: 0,
      linked: 0,
      skipped: 0,
      errors: [] as string[],
      details: [] as any[],
    };

    // Find subscription projects missing project_subscriptions records
    let query = supabaseAdmin
      .from("projects")
      .select(`
        id,
        user_id,
        service_id,
        payment_model,
        appointment_id,
        name,
        status,
        created_at
      `)
      .eq("payment_model", "subscription");

    if (projectId) {
      query = query.eq("id", projectId);
    }

    const { data: projects, error: projectsError } = await query;

    if (projectsError) {
      logStep("ERROR: Failed to fetch projects", { error: projectsError });
      return new Response(
        JSON.stringify({ error: "Failed to fetch projects" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    logStep("Found subscription projects", { count: projects?.length || 0 });

    for (const project of projects || []) {
      results.processed++;

      // Check if project_subscription already exists
      const { data: existingSub } = await supabaseAdmin
        .from("project_subscriptions")
        .select("id, stripe_subscription_id, status")
        .eq("project_id", project.id)
        .maybeSingle();

      if (existingSub?.stripe_subscription_id) {
        logStep("Project already has subscription record", { 
          projectId: project.id, 
          subscriptionId: existingSub.stripe_subscription_id 
        });
        results.skipped++;
        results.details.push({
          projectId: project.id,
          action: "skipped",
          reason: "already_linked",
          existingSubscriptionId: existingSub.stripe_subscription_id,
        });
        continue;
      }

      // Get user email to find Stripe customer
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("email")
        .eq("id", project.user_id)
        .maybeSingle();

      if (!profile?.email) {
        logStep("WARN: No email found for user", { projectId: project.id, userId: project.user_id });
        results.errors.push(`Project ${project.id}: No user email found`);
        results.details.push({
          projectId: project.id,
          action: "error",
          reason: "no_user_email",
        });
        continue;
      }

      // Find Stripe customer by email
      const customers = await stripe.customers.list({ email: profile.email, limit: 1 });
      
      if (customers.data.length === 0) {
        logStep("No Stripe customer found", { projectId: project.id, email: profile.email });
        results.skipped++;
        results.details.push({
          projectId: project.id,
          action: "skipped",
          reason: "no_stripe_customer",
        });
        continue;
      }

      const customerId = customers.data[0].id;

      // Find active subscriptions for this customer
      const subscriptions = await stripe.subscriptions.list({
        customer: customerId,
        status: "all", // Get all to handle various states
        limit: 100,
      });

      // Filter to active/trialing/past_due subscriptions (not canceled)
      const activeSubscriptions = subscriptions.data.filter(
        (s: Stripe.Subscription) => ["active", "trialing", "past_due", "paused"].includes(s.status)
      );

      if (activeSubscriptions.length === 0) {
        logStep("No active subscriptions found", { projectId: project.id, customerId });
        results.skipped++;
        results.details.push({
          projectId: project.id,
          action: "skipped",
          reason: "no_active_subscriptions",
        });
        continue;
      }

      // Try to match subscription by metadata or creation date proximity
      let matchedSubscription: Stripe.Subscription | null = null;

      // First: try exact metadata match
      for (const sub of activeSubscriptions) {
        if (sub.metadata?.service_id === project.service_id) {
          matchedSubscription = sub;
          logStep("Matched by service_id metadata", { subscriptionId: sub.id });
          break;
        }
      }

      // Second: if only one active subscription, use it
      if (!matchedSubscription && activeSubscriptions.length === 1) {
        matchedSubscription = activeSubscriptions[0];
        logStep("Using only active subscription", { subscriptionId: matchedSubscription.id });
      }

      // Third: try matching by creation date (within 24 hours of project creation)
      if (!matchedSubscription) {
        const projectCreatedAt = new Date(project.created_at).getTime();
        for (const sub of activeSubscriptions) {
          const subCreatedAt = sub.created * 1000;
          const diffHours = Math.abs(projectCreatedAt - subCreatedAt) / (1000 * 60 * 60);
          if (diffHours <= 24) {
            matchedSubscription = sub;
            logStep("Matched by creation date proximity", { 
              subscriptionId: sub.id, 
              diffHours: diffHours.toFixed(2) 
            });
            break;
          }
        }
      }

      if (!matchedSubscription) {
        logStep("WARN: Could not match subscription to project", { 
          projectId: project.id, 
          activeSubscriptions: activeSubscriptions.map((s: Stripe.Subscription) => s.id) 
        });
        results.errors.push(`Project ${project.id}: Could not match to any subscription`);
        results.details.push({
          projectId: project.id,
          action: "error",
          reason: "no_match",
          candidateSubscriptions: activeSubscriptions.map((s: Stripe.Subscription) => ({ id: s.id, created: new Date(s.created * 1000).toISOString() })),
        });
        continue;
      }

      // Create or update project_subscription record
      const subscriptionData = {
        project_id: project.id,
        stripe_subscription_id: matchedSubscription.id,
        stripe_customer_id: customerId,
        status: matchedSubscription.status,
        next_renewal_date: new Date(matchedSubscription.current_period_end * 1000).toISOString(),
        cancel_at_period_end: matchedSubscription.cancel_at_period_end,
        paused_at: matchedSubscription.pause_collection ? new Date().toISOString() : null,
        resume_at: matchedSubscription.pause_collection?.resumes_at 
          ? new Date(matchedSubscription.pause_collection.resumes_at * 1000).toISOString() 
          : null,
        updated_at: new Date().toISOString(),
      };

      if (dryRun) {
        logStep("DRY RUN: Would upsert subscription", subscriptionData);
        results.linked++;
        results.details.push({
          projectId: project.id,
          action: "would_link",
          subscriptionId: matchedSubscription.id,
          status: matchedSubscription.status,
        });
      } else {
        const { error: upsertError } = await supabaseAdmin
          .from("project_subscriptions")
          .upsert(subscriptionData, { onConflict: "project_id" });

        if (upsertError) {
          logStep("ERROR: Failed to upsert subscription", { error: upsertError, projectId: project.id });
          results.errors.push(`Project ${project.id}: ${upsertError.message}`);
          results.details.push({
            projectId: project.id,
            action: "error",
            reason: "upsert_failed",
            error: upsertError.message,
          });
        } else {
          logStep("Successfully linked subscription", { 
            projectId: project.id, 
            subscriptionId: matchedSubscription.id 
          });
          results.linked++;
          results.details.push({
            projectId: project.id,
            action: "linked",
            subscriptionId: matchedSubscription.id,
            status: matchedSubscription.status,
          });
        }
      }
    }

    logStep("Backfill complete", { 
      processed: results.processed, 
      linked: results.linked, 
      skipped: results.skipped, 
      errors: results.errors.length,
      dryRun 
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        dryRun,
        summary: {
          processed: results.processed,
          linked: results.linked,
          skipped: results.skipped,
          errors: results.errors.length,
        },
        details: results.details,
        errors: results.errors,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logStep("ERROR", { message });
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
