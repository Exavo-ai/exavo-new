import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * emit-system-alert
 * 
 * This function acts like a senior engineer escalating an issue.
 * It should be called when:
 * - A process fails silently
 * - Data inconsistency is detected
 * - External integration stops responding
 * - Manual intervention is required
 * - Subscription state mismatch between Stripe and DB
 */

interface SystemAlertPayload {
  reason: string;
  context: {
    source?: string;
    error?: string;
    affected_entity_type?: string;
    affected_entity_id?: string;
    severity?: "warning" | "critical";
    suggested_action?: string;
    metadata?: Record<string, unknown>;
  };
}

const log = (requestId: string, step: string, details?: unknown) => {
  console.log(JSON.stringify({
    requestId,
    timestamp: new Date().toISOString(),
    step,
    details,
  }));
};

Deno.serve(async (req) => {
  const requestId = crypto.randomUUID();
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const payload: SystemAlertPayload = await req.json();
    log(requestId, "alert_received", payload);

    const { reason, context = {} } = payload;

    if (!reason) {
      return new Response(
        JSON.stringify({ error: "reason is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const severity = context.severity || "warning";
    const priority = severity === "critical" ? "high" : "normal";
    
    // Build a detailed message like a senior dev would write
    let title = severity === "critical" 
      ? "🚨 CRITICAL: Manual Intervention Required" 
      : "⚠️ System Alert";
    
    let message = reason;
    
    if (context.source) {
      message = `[${context.source}] ${message}`;
    }
    
    if (context.error) {
      message += `\nError: ${context.error}`;
    }
    
    if (context.suggested_action) {
      message += `\nSuggested action: ${context.suggested_action}`;
    }

    // Determine the event type based on the context
    let eventType = "IMPORTANT_SYSTEM_NOTICE";
    if (context.source?.includes("webhook")) {
      eventType = "WEBHOOK_FAILURE";
    } else if (context.source?.includes("automation")) {
      eventType = "AUTOMATION_FAILED";
    } else if (reason.toLowerCase().includes("inconsistency") || reason.toLowerCase().includes("mismatch")) {
      eventType = "DATA_INCONSISTENCY_DETECTED";
    } else if (severity === "critical") {
      eventType = "MANUAL_INTERVENTION_REQUIRED";
    }

    // Get all admins
    const { data: adminRoles, error: rolesError } = await supabaseAdmin
      .from("user_roles")
      .select("user_id")
      .eq("role", "admin");

    if (rolesError) {
      log(requestId, "roles_error", rolesError);
      throw rolesError;
    }

    if (!adminRoles || adminRoles.length === 0) {
      log(requestId, "no_admins_found");
      return new Response(
        JSON.stringify({ success: true, message: "No admins to notify" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build link based on entity type
    let link: string | null = null;
    if (context.affected_entity_type && context.affected_entity_id) {
      const entityLinks: Record<string, string> = {
        project: `/admin/projects/${context.affected_entity_id}`,
        subscription: `/admin/payments`,
        ticket: `/admin/tickets?id=${context.affected_entity_id}`,
        booking: `/admin/bookings`,
        user: `/admin/users/${context.affected_entity_id}`,
      };
      link = entityLinks[context.affected_entity_type] || null;
    }

    const notifications = adminRoles.map(admin => ({
      user_id: admin.user_id,
      title,
      message,
      event_type: eventType,
      priority,
      link,
      role: "admin",
      entity_type: context.affected_entity_type || null,
      entity_id: context.affected_entity_id || null,
      metadata: {
        ...context.metadata,
        source: context.source,
        severity,
        suggested_action: context.suggested_action,
        error: context.error,
        alert_id: requestId,
      },
      read: false,
    }));

    // Check for duplicates (same reason in last 15 minutes to avoid alert fatigue)
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    
    const deduplicatedNotifications = [];
    for (const notification of notifications) {
      const { data: existing } = await supabaseAdmin
        .from("notifications")
        .select("id")
        .eq("user_id", notification.user_id)
        .eq("event_type", eventType)
        .ilike("message", `%${reason.substring(0, 50)}%`)
        .gte("created_at", fifteenMinutesAgo)
        .limit(1);

      if (!existing || existing.length === 0) {
        deduplicatedNotifications.push(notification);
      }
    }

    if (deduplicatedNotifications.length > 0) {
      const { error: insertError } = await supabaseAdmin
        .from("notifications")
        .insert(deduplicatedNotifications);

      if (insertError) {
        log(requestId, "insert_error", insertError);
        throw insertError;
      }
    }

    log(requestId, "alerts_created", { 
      total: notifications.length, 
      deduplicated: deduplicatedNotifications.length 
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        alerts_created: deduplicatedNotifications.length,
        deduplicated: notifications.length - deduplicatedNotifications.length,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    log(requestId, "error", { message: err.message, stack: err.stack });
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
