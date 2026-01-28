import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { sendEventEmail } from "../_shared/email-events.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type OkResponse = {
  ok: true;
  status: string;
  subscription_id: string;
  resumed_at: string;
  next_renewal_date: string;
  requestId: string;
};

type ErrResponse = {
  ok: false;
  code: string;
  message: string;
  requestId: string;
};

const json = (body: OkResponse | ErrResponse, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const log = (requestId: string, step: string, details?: unknown) => {
  console.log(
    `[RESUME-SUBSCRIPTION] ${step}`,
    JSON.stringify({ requestId, ...(details ? { details } : {}) })
  );
};

serve(async (req) => {
  const requestId = crypto.randomUUID();

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json(
      { ok: false, code: "METHOD_NOT_ALLOWED", message: "Method not allowed", requestId },
      405
    );
  }

  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  if (!stripeKey) {
    return json(
      { ok: false, code: "STRIPE_NOT_CONFIGURED", message: "Stripe secret key not configured", requestId },
      500
    );
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return json(
      { ok: false, code: "UNAUTHORIZED", message: "Missing Authorization header", requestId },
      401
    );
  }

  const token = authHeader.replace("Bearer ", "");
  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    // ignore
  }

  const projectId = body?.project_id as string | undefined;

  log(requestId, "request", { projectId });

  if (!projectId) {
    return json(
      { ok: false, code: "VALIDATION_ERROR", message: "project_id is required", requestId },
      400
    );
  }

  // Auth user
  const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
  if (userError || !userData?.user) {
    return json(
      { ok: false, code: "UNAUTHORIZED", message: "User not authenticated", requestId },
      401
    );
  }
  const user = userData.user;
  log(requestId, "auth", { userId: user.id });

  // Verify project ownership
  const { data: project, error: projectError } = await supabaseAdmin
    .from("projects")
    .select("id, user_id, client_id, workspace_id")
    .eq("id", projectId)
    .maybeSingle();

  if (projectError || !project) {
    return json({ ok: false, code: "NOT_FOUND", message: "Project not found", requestId }, 404);
  }

  const isOwner = project.user_id === user.id || project.client_id === user.id || project.workspace_id === user.id;
  if (!isOwner) {
    return json({ ok: false, code: "FORBIDDEN", message: "Not authorized for this project", requestId }, 403);
  }

  // Fetch paused subscription
  const { data: projectSub, error: subError } = await supabaseAdmin
    .from("project_subscriptions")
    .select("id, stripe_subscription_id, status")
    .eq("project_id", projectId)
    .eq("status", "paused")
    .maybeSingle();

  if (subError || !projectSub) {
    return json(
      { ok: false, code: "NO_PAUSED_SUBSCRIPTION", message: "No paused subscription found for this project", requestId },
      400
    );
  }

  if (!projectSub.stripe_subscription_id) {
    return json(
      { ok: false, code: "MISSING_STRIPE_SUBSCRIPTION_ID", message: "Missing Stripe subscription ID", requestId },
      400
    );
  }

  log(requestId, "subscription_found", { subscriptionId: projectSub.stripe_subscription_id });

  // Resume the subscription by clearing pause_collection
  try {
    const updated = await stripe.subscriptions.update(projectSub.stripe_subscription_id, {
      pause_collection: "", // Empty string clears the pause
    });

    log(requestId, "stripe_resume_ok", { status: updated.status });

    const nowIso = new Date().toISOString();
    
    // Safely convert current_period_end to ISO string
    let nextRenewalDate: string | null = null;
    if (updated.current_period_end && typeof updated.current_period_end === 'number') {
      try {
        nextRenewalDate = new Date(updated.current_period_end * 1000).toISOString();
      } catch {
        log(requestId, "date_conversion_warning", { current_period_end: updated.current_period_end });
      }
    }

    // Update local database
    const { error: updateError } = await supabaseAdmin
      .from("project_subscriptions")
      .update({
        status: updated.status,
        paused_at: null,
        resume_at: null,
        pause_behavior: null,
        next_renewal_date: nextRenewalDate,
        updated_at: nowIso,
      })
      .eq("id", projectSub.id);

    if (updateError) {
      log(requestId, "db_update_error", { error: updateError.message });
      // Still return success since Stripe was updated
    }

    // Get project and service info for email
    const { data: projectData } = await supabaseAdmin
      .from("projects")
      .select("name, title, service_id")
      .eq("id", projectId)
      .maybeSingle();

    let serviceName: string | null = null;
    if (projectData?.service_id) {
      const { data: serviceData } = await supabaseAdmin
        .from("services")
        .select("name")
        .eq("id", projectData.service_id)
        .maybeSingle();
      serviceName = serviceData?.name || null;
    }

    // Get client email
    const { data: clientProfile } = await supabaseAdmin
      .from("profiles")
      .select("email, full_name")
      .eq("id", user.id)
      .maybeSingle();

    // Send email notification for subscription resumed
    sendEventEmail({
      event_type: "SUBSCRIPTION_RESUMED",
      entity_type: "project",
      entity_id: projectId,
      metadata: {
        project_name: projectData?.title || projectData?.name || "Your project",
        service_name: serviceName,
        client_email: clientProfile?.email,
        client_name: clientProfile?.full_name,
        next_renewal_date: nextRenewalDate,
      },
    });

    log(requestId, "resume_complete", { status: updated.status, nextRenewalDate });

    return json({
      ok: true,
      status: updated.status,
      subscription_id: updated.id,
      resumed_at: nowIso,
      next_renewal_date: nextRenewalDate || nowIso,
      requestId,
    });
  } catch (e: any) {
    log(requestId, "stripe_error", { message: e.message, code: e.code });
    return json(
      { ok: false, code: "STRIPE_ERROR", message: e.message || "Failed to resume subscription", requestId },
      502
    );
  }
});
