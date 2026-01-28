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
  paused_at: string;
  resume_at: string | null;
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
    `[PAUSE-SUBSCRIPTION] ${step}`,
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
  const resumeAt = body?.resume_at as string | undefined; // Optional: ISO date string for when to resume
  const pauseBehavior = body?.behavior || "void"; // void, keep_as_draft, or mark_uncollectible

  log(requestId, "request", { projectId, resumeAt, pauseBehavior });

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

  // Fetch subscription
  const { data: projectSub, error: subError } = await supabaseAdmin
    .from("project_subscriptions")
    .select("id, stripe_subscription_id, status")
    .eq("project_id", projectId)
    .in("status", ["active", "trialing"])
    .maybeSingle();

  if (subError || !projectSub) {
    return json(
      { ok: false, code: "NO_ACTIVE_SUBSCRIPTION", message: "No active subscription for this project", requestId },
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

  // Pause the subscription using Stripe's pause_collection
  try {
    const pauseCollection: Stripe.SubscriptionUpdateParams.PauseCollection = {
      behavior: pauseBehavior as "void" | "keep_as_draft" | "mark_uncollectible",
    };

    // If resume_at is provided, set the resumes_at date
    if (resumeAt) {
      pauseCollection.resumes_at = Math.floor(new Date(resumeAt).getTime() / 1000);
    }

    const updated = await stripe.subscriptions.update(projectSub.stripe_subscription_id, {
      pause_collection: pauseCollection,
    });

    log(requestId, "stripe_pause_ok", { 
      status: updated.status, 
      pause_collection: updated.pause_collection 
    });

    const nowIso = new Date().toISOString();
    const resumeAtIso = updated.pause_collection?.resumes_at 
      ? new Date(updated.pause_collection.resumes_at * 1000).toISOString() 
      : null;

    // Update local database
    await supabaseAdmin
      .from("project_subscriptions")
      .update({
        status: "paused",
        paused_at: nowIso,
        resume_at: resumeAtIso,
        pause_behavior: pauseBehavior,
      })
      .eq("id", projectSub.id);

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

    // Send email notification for subscription paused
    sendEventEmail({
      event_type: "SUBSCRIPTION_PAUSED",
      entity_type: "project",
      entity_id: projectId,
      metadata: {
        project_name: projectData?.title || projectData?.name || "Your project",
        service_name: serviceName,
        client_email: clientProfile?.email,
        client_name: clientProfile?.full_name,
        resume_at: resumeAtIso,
      },
    });

    log(requestId, "email_sent", { event_type: "SUBSCRIPTION_PAUSED" });

    return json({
      ok: true,
      status: "paused",
      subscription_id: updated.id,
      paused_at: nowIso,
      resume_at: resumeAtIso,
      requestId,
    });
  } catch (e: any) {
    log(requestId, "stripe_error", { message: e.message, code: e.code });
    return json(
      { ok: false, code: "STRIPE_ERROR", message: e.message || "Failed to pause subscription", requestId },
      502
    );
  }
});
