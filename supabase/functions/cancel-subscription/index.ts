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
  cancel_at_period_end: boolean;
  canceled_at: string;
  access_until: string;
  stripe_status: string;
  current_period_end: string;
  requestId: string;
  details?: unknown;
};

type ErrResponse = {
  ok: false;
  code: string;
  message: string;
  requestId: string;
  details?: unknown;
};

const json = (body: OkResponse | ErrResponse, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const log = (requestId: string, step: string, details?: unknown) => {
  console.log(
    `[CANCEL-SUBSCRIPTION] ${step}`,
    JSON.stringify({ requestId, ...(details ? { details } : {}) })
  );
};

const safeStripeError = (err: unknown) => {
  if (!err || typeof err !== "object") return { message: String(err) };
  const anyErr = err as any;
  return {
    type: anyErr?.type,
    code: anyErr?.code,
    statusCode: anyErr?.statusCode,
    message: anyErr?.message,
    requestId: anyErr?.requestId,
  };
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

  // Stripe config
  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  if (!stripeKey) {
    return json(
      {
        ok: false,
        code: "STRIPE_NOT_CONFIGURED",
        message: "Stripe secret key not configured",
        requestId,
      },
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

  // Parse body
  let body: any = {};
  try {
    body = await req.json();
  } catch {
    // ignore
  }

  const projectId = body?.project_id as string | undefined;
  const cancelAtPeriodEnd =
    typeof body?.cancel_at_period_end === "boolean" ? body.cancel_at_period_end : true;
  const cancelReason = typeof body?.cancel_reason === "string" ? body.cancel_reason : null;
  const debugRequested = body?.debug === true;

  log(requestId, "request", { projectId, cancelAtPeriodEnd, debugRequested });

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

  // Debug only for admins
  let isAdmin = false;
  if (debugRequested) {
    try {
      const { data: isAdminData } = await supabaseAdmin.rpc("has_role", {
        _user_id: user.id,
        _role: "admin",
      });
      isAdmin = Boolean(isAdminData);
    } catch {
      isAdmin = false;
    }

    if (!isAdmin) {
      return json(
        {
          ok: false,
          code: "FORBIDDEN",
          message: "Debug diagnostics are only available to admins",
          requestId,
        },
        403
      );
    }
  }

  // Verify project ownership (authorization check uses the user JWT identity)
  const { data: project, error: projectError } = await supabaseAdmin
    .from("projects")
    .select("id, user_id, client_id, workspace_id, appointment_id")
    .eq("id", projectId)
    .maybeSingle();

  if (projectError || !project) {
    return json(
      { ok: false, code: "NOT_FOUND", message: "Project not found", requestId },
      404
    );
  }

  const isOwner =
    project.user_id === user.id || project.client_id === user.id || project.workspace_id === user.id;
  if (!isOwner) {
    return json(
      { ok: false, code: "FORBIDDEN", message: "Not authorized for this project", requestId },
      403
    );
  }

  log(requestId, "authorization_ok", { projectId });

  // Fetch active subscription row
  const { data: projectSub, error: subError } = await supabaseAdmin
    .from("project_subscriptions")
    .select(
      "id, project_id, status, stripe_subscription_id, stripe_customer_id, stripe_checkout_session_id, next_renewal_date"
    )
    .eq("project_id", projectId)
    .in("status", ["active", "trialing"])
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  log(requestId, "db_subscription_lookup", {
    found: Boolean(projectSub),
    status: projectSub?.status,
    stripe_subscription_id: projectSub?.stripe_subscription_id,
    stripe_customer_id: projectSub?.stripe_customer_id,
    stripe_checkout_session_id: projectSub?.stripe_checkout_session_id,
  });

  if (subError) {
    return json(
      {
        ok: false,
        code: "DB_ERROR",
        message: "Failed to load subscription record",
        requestId,
        ...(isAdmin ? { details: { subError } } : {}),
      },
      500
    );
  }

  if (!projectSub) {
    return json(
      {
        ok: false,
        code: "NO_ACTIVE_SUBSCRIPTION",
        message: "No active subscription for this project",
        requestId,
      },
      400
    );
  }

  // Stripe ID recovery
  let stripeSubscriptionId: string | null = projectSub.stripe_subscription_id ?? null;
  let stripeCustomerId: string | null = projectSub.stripe_customer_id ?? null;
  let checkoutSessionId: string | null = projectSub.stripe_checkout_session_id ?? null;

  // 1) Prefer saved checkout session id; otherwise infer from payments for this project
  if (!checkoutSessionId && project.appointment_id) {
    const { data: payment } = await supabaseAdmin
      .from("payments")
      .select("stripe_session_id")
      .eq("appointment_id", project.appointment_id)
      .not("stripe_session_id", "is", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    checkoutSessionId = (payment?.stripe_session_id as string | null) ?? null;

    if (checkoutSessionId) {
      log(requestId, "inferred_checkout_session", { checkoutSessionId });
      await supabaseAdmin
        .from("project_subscriptions")
        .update({ stripe_checkout_session_id: checkoutSessionId })
        .eq("id", projectSub.id);
    }
  }

  // 2) If subscription_id missing and we have checkout_session_id, recover from Stripe session
  if (!stripeSubscriptionId && checkoutSessionId) {
    try {
      log(requestId, "stripe_checkout_session_retrieve", { checkoutSessionId });
      const session = await stripe.checkout.sessions.retrieve(checkoutSessionId, {
        expand: ["subscription", "customer"],
      });

      const recoveredSubId = session.subscription
        ? typeof session.subscription === "string"
          ? session.subscription
          : session.subscription.id
        : null;

      const recoveredCustomerId = session.customer
        ? typeof session.customer === "string"
          ? session.customer
          : session.customer.id
        : null;

      log(requestId, "stripe_checkout_session_retrieve_ok", {
        recoveredSubId,
        recoveredCustomerId,
      });

      if (recoveredSubId) {
        stripeSubscriptionId = recoveredSubId;
      }
      if (recoveredCustomerId) {
        stripeCustomerId = recoveredCustomerId;
      }

      await supabaseAdmin
        .from("project_subscriptions")
        .update({
          stripe_subscription_id: stripeSubscriptionId,
          stripe_customer_id: stripeCustomerId,
          stripe_checkout_session_id: checkoutSessionId,
        })
        .eq("id", projectSub.id);
    } catch (e) {
      log(requestId, "stripe_checkout_session_retrieve_error", safeStripeError(e));
    }
  }

  // 3) If still missing subscription_id, try listing subscriptions by customer_id
  if (!stripeSubscriptionId) {
    // Try workspace customer id as an additional fallback ("users.stripe_customer_id" equivalent)
    if (!stripeCustomerId) {
      const { data: workspace } = await supabaseAdmin
        .from("workspaces")
        .select("stripe_customer_id")
        .eq("owner_id", user.id)
        .maybeSingle();
      stripeCustomerId = (workspace?.stripe_customer_id as string | null) ?? null;
      if (stripeCustomerId) {
        log(requestId, "stripe_customer_from_workspace", { stripeCustomerId });
      }
    }

    // Try searching Stripe by email
    if (!stripeCustomerId && user.email) {
      try {
        const customers = await stripe.customers.list({ email: user.email, limit: 1 });
        if (customers.data.length > 0) {
          stripeCustomerId = customers.data[0].id;
          log(requestId, "stripe_customer_from_email", { stripeCustomerId });
          await supabaseAdmin
            .from("project_subscriptions")
            .update({ stripe_customer_id: stripeCustomerId })
            .eq("id", projectSub.id);
        }
      } catch (e) {
        log(requestId, "stripe_customer_search_error", safeStripeError(e));
      }
    }

    if (stripeCustomerId) {
      try {
        log(requestId, "stripe_list_subscriptions", { stripeCustomerId });
        const subs = await stripe.subscriptions.list({
          customer: stripeCustomerId,
          status: "all",
          limit: 10,
        });

        const active = subs.data
          .filter((s: Stripe.Subscription) => s.status === "active" || s.status === "trialing")
          .sort((a: Stripe.Subscription, b: Stripe.Subscription) => (b.created ?? 0) - (a.created ?? 0))[0];

        if (active) {
          stripeSubscriptionId = active.id;
          log(requestId, "stripe_subscription_recovered_from_customer", {
            stripeSubscriptionId,
            status: active.status,
          });

          await supabaseAdmin
            .from("project_subscriptions")
            .update({
              stripe_subscription_id: stripeSubscriptionId,
              stripe_customer_id: stripeCustomerId,
            })
            .eq("id", projectSub.id);
        }
      } catch (e) {
        log(requestId, "stripe_list_subscriptions_error", safeStripeError(e));
      }
    }
  }

  log(requestId, "stripe_ids_final", {
    stripeCustomerId,
    stripeSubscriptionId,
    checkoutSessionId,
  });

  if (!stripeSubscriptionId) {
    return json(
      {
        ok: false,
        code: "MISSING_STRIPE_SUBSCRIPTION_ID",
        message: "Missing Stripe subscription id and cannot recover",
        requestId,
        ...(isAdmin
          ? {
              details: {
                projectSub,
                stripeCustomerId,
                checkoutSessionId,
              },
            }
          : {}),
      },
      400
    );
  }

  // Stripe cancel behavior
  let updated: Stripe.Subscription;
  try {
    // First, retrieve the current subscription state from Stripe
    log(requestId, "stripe_subscription_retrieve", { stripeSubscriptionId });
    const currentSub = await stripe.subscriptions.retrieve(stripeSubscriptionId);
    
    // Check if already canceled - if so, just sync and return success
    if (currentSub.status === "canceled") {
      log(requestId, "stripe_subscription_already_canceled", { 
        stripeSubscriptionId, 
        status: currentSub.status,
        canceled_at: currentSub.canceled_at 
      });
      updated = currentSub;
    } else if (currentSub.cancel_at_period_end && cancelAtPeriodEnd) {
      // Already set to cancel at period end
      log(requestId, "stripe_subscription_already_canceling", { 
        stripeSubscriptionId,
        cancel_at_period_end: currentSub.cancel_at_period_end
      });
      updated = currentSub;
    } else if (cancelAtPeriodEnd) {
      log(requestId, "stripe_subscriptions_update_cancel_at_period_end", { stripeSubscriptionId });
      updated = await stripe.subscriptions.update(stripeSubscriptionId, {
        cancel_at_period_end: true,
      });
    } else {
      // Immediate cancel
      log(requestId, "stripe_subscriptions_cancel_immediate", { stripeSubscriptionId });
      updated = await stripe.subscriptions.cancel(stripeSubscriptionId);
    }
  } catch (e) {
    const stripeErr = safeStripeError(e);
    log(requestId, "stripe_cancel_error", stripeErr);
    return json(
      {
        ok: false,
        code: "STRIPE_ERROR",
        message: "Stripe cancellation failed",
        requestId,
        ...(isAdmin ? { details: stripeErr } : {}),
      },
      502
    );
  }

  log(requestId, "stripe_cancel_ok", {
    subscription_id: updated.id,
    status: updated.status,
    cancel_at_period_end: updated.cancel_at_period_end,
    current_period_end: updated.current_period_end,
  });

  const nowIso = new Date().toISOString();
  
  // Safely convert current_period_end to ISO string
  let accessUntilIso: string | null = null;
  if (updated.current_period_end && typeof updated.current_period_end === 'number') {
    try {
      accessUntilIso = new Date(updated.current_period_end * 1000).toISOString();
    } catch {
      log(requestId, "date_conversion_warning", { current_period_end: updated.current_period_end });
    }
  }

  // DB consistency update
  const { error: updateError } = await supabaseAdmin
    .from("project_subscriptions")
    .update({
      status: "canceled",
      cancel_at_period_end: Boolean(updated.cancel_at_period_end),
      canceled_at: nowIso,
      cancel_reason: cancelReason,
      stripe_subscription_id: updated.id,
      stripe_customer_id: stripeCustomerId,
      stripe_checkout_session_id: checkoutSessionId,
      next_renewal_date: accessUntilIso,
      updated_at: nowIso,
    })
    .eq("id", projectSub.id);

  if (updateError) {
    log(requestId, "db_update_error", { message: updateError.message, code: updateError.code });
    return json(
      {
        ok: false,
        code: "DB_UPDATE_FAILED",
        message: "Subscription canceled in Stripe but failed to update local record",
        requestId,
        ...(isAdmin ? { details: { updateError } } : {}),
      },
      500
    );
  }

  // Send email notification for subscription canceled
  sendEventEmail({
    event_type: "SUBSCRIPTION_CANCELED",
    actor_id: user.id,
    entity_type: "project",
    entity_id: projectId,
    metadata: {
      cancel_reason: cancelReason,
      is_scheduled: Boolean(updated.cancel_at_period_end),
      stripe_subscription_id: stripeSubscriptionId,
    },
  });

  log(requestId, "email_triggered", { event_type: "SUBSCRIPTION_CANCELED" });

  const response: OkResponse = {
    ok: true,
    status: "canceled",
    subscription_id: updated.id,
    cancel_at_period_end: Boolean(updated.cancel_at_period_end),
    canceled_at: nowIso,
    access_until: accessUntilIso || nowIso,
    stripe_status: updated.status,
    current_period_end: accessUntilIso || nowIso,
    requestId,
    ...(isAdmin
      ? {
          details: {
            projectId,
            stripeCustomerId,
            checkoutSessionId,
          },
        }
      : {}),
  };

  return json(response, 200);
});
