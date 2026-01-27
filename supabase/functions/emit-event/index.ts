import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EventPayload {
  event_type: string;
  actor_id?: string;
  entity_type?: string;
  entity_id?: string;
  metadata?: Record<string, unknown>;
  target_user_id?: string; // Optional: specific user to notify
  target_role?: "admin" | "client" | "all";
}

// Event type configurations
const EVENT_CONFIG: Record<string, {
  title: string;
  getMessage: (meta: Record<string, unknown>) => string;
  priority: "low" | "normal" | "high";
  role: "admin" | "client" | "all";
  getLink?: (meta: Record<string, unknown>) => string;
}> = {
  // Project Events
  PROJECT_CREATED: {
    title: "New Project Created",
    getMessage: (m) => `Project "${m.project_name || 'Unknown'}" has been created`,
    priority: "normal",
    role: "all",
    getLink: (m) => m.is_admin ? `/admin/projects/${m.entity_id}` : `/portal/projects/${m.entity_id}`,
  },
  PROJECT_STATUS_CHANGED: {
    title: "Project Status Updated",
    getMessage: (m) => `Project "${m.project_name}" is now ${m.new_status}`,
    priority: "normal",
    role: "client",
    getLink: (m) => `/portal/projects/${m.entity_id}`,
  },
  PROJECT_COMPLETED: {
    title: "Project Completed!",
    getMessage: (m) => `Your project "${m.project_name}" has been completed`,
    priority: "high",
    role: "client",
    getLink: (m) => `/portal/projects/${m.entity_id}`,
  },
  PROJECT_STUCK: {
    title: "⚠️ Project Stuck",
    getMessage: (m) => `Project "${m.project_name}" has had no progress for ${m.days || 7} days`,
    priority: "high",
    role: "admin",
    getLink: (m) => `/admin/projects/${m.entity_id}`,
  },

  // Billing Events
  SUBSCRIPTION_ACTIVATED: {
    title: "Subscription Activated",
    getMessage: (m) => `Subscription for "${m.project_name}" is now active`,
    priority: "normal",
    role: "client",
    getLink: (m) => `/portal/projects/${m.entity_id}`,
  },
  SUBSCRIPTION_PAUSED: {
    title: "Subscription Paused",
    getMessage: (m) => `Subscription for "${m.project_name}" has been paused`,
    priority: "normal",
    role: "client",
    getLink: (m) => `/portal/projects/${m.entity_id}`,
  },
  SUBSCRIPTION_RESUMED: {
    title: "Subscription Resumed",
    getMessage: (m) => `Subscription for "${m.project_name}" has been resumed`,
    priority: "normal",
    role: "client",
    getLink: (m) => `/portal/projects/${m.entity_id}`,
  },
  SUBSCRIPTION_CANCELED: {
    title: "Subscription Canceled",
    getMessage: (m) => `Subscription for "${m.project_name}" has been canceled`,
    priority: "high",
    role: "all",
    getLink: (m) => m.is_admin ? `/admin/projects/${m.entity_id}` : `/portal/projects/${m.entity_id}`,
  },
  PAYMENT_FAILED: {
    title: "⚠️ Payment Failed",
    getMessage: (m) => `Payment failed for "${m.project_name}". Please update your payment method.`,
    priority: "high",
    role: "all",
    getLink: (m) => m.is_admin ? `/admin/projects/${m.entity_id}` : `/portal/projects/${m.entity_id}`,
  },
  PAYMENT_REQUIRES_ATTENTION: {
    title: "⚠️ Payment Requires Attention",
    getMessage: (m) => `Payment for "${m.project_name}" requires your attention`,
    priority: "high",
    role: "client",
    getLink: (m) => `/portal/projects/${m.entity_id}`,
  },

  // Delivery Events
  DELIVERY_CREATED: {
    title: "New Delivery Available",
    getMessage: (m) => `A new delivery is ready for project "${m.project_name}"`,
    priority: "high",
    role: "client",
    getLink: (m) => `/portal/projects/${m.entity_id}`,
  },
  DELIVERY_APPROVED: {
    title: "Delivery Approved",
    getMessage: (m) => `Client approved delivery for "${m.project_name}"`,
    priority: "normal",
    role: "admin",
    getLink: (m) => `/admin/projects/${m.entity_id}`,
  },
  DELIVERY_REJECTED: {
    title: "Delivery Rejected",
    getMessage: (m) => `Delivery for "${m.project_name}" was rejected`,
    priority: "high",
    role: "admin",
    getLink: (m) => `/admin/projects/${m.entity_id}`,
  },
  REVISION_REQUESTED: {
    title: "Revision Requested",
    getMessage: (m) => `Client requested revision for "${m.project_name}"${m.notes ? `: ${m.notes}` : ''}`,
    priority: "high",
    role: "admin",
    getLink: (m) => `/admin/projects/${m.entity_id}`,
  },

  // Communication Events
  COMMENT_ADDED: {
    title: "New Comment",
    getMessage: (m) => `New comment on "${m.project_name}"`,
    priority: "normal",
    role: "all",
    getLink: (m) => m.is_admin ? `/admin/projects/${m.entity_id}` : `/portal/projects/${m.entity_id}`,
  },
  TICKET_CREATED: {
    title: "New Support Ticket",
    getMessage: (m) => `New ticket: ${m.subject}`,
    priority: "normal",
    role: "admin",
    getLink: (m) => `/admin/tickets?id=${m.entity_id}`,
  },
  TICKET_REPLIED: {
    title: "New Reply on Ticket",
    getMessage: (m) => `New reply on: ${m.subject}`,
    priority: "normal",
    role: "all",
    getLink: (m) => m.is_admin ? `/admin/tickets?id=${m.entity_id}` : `/portal/tickets/${m.entity_id}`,
  },
  CLIENT_WAITING_TOO_LONG: {
    title: "⚠️ Client Waiting",
    getMessage: (m) => `Client has been waiting ${m.hours || 24}+ hours for a response`,
    priority: "high",
    role: "admin",
    getLink: (m) => `/admin/tickets?id=${m.entity_id}`,
  },

  // System Events
  IMPORTANT_SYSTEM_NOTICE: {
    title: "System Notice",
    getMessage: (m) => m.message as string || "Important system notification",
    priority: "high",
    role: "admin",
  },
  DATA_INCONSISTENCY_DETECTED: {
    title: "⚠️ Data Inconsistency",
    getMessage: (m) => `Data mismatch detected: ${m.description || 'Unknown'}`,
    priority: "high",
    role: "admin",
  },
  WEBHOOK_FAILURE: {
    title: "⚠️ Webhook Failed",
    getMessage: (m) => `Webhook "${m.webhook_name || 'Unknown'}" failed: ${m.error || 'Unknown error'}`,
    priority: "high",
    role: "admin",
  },
  AUTOMATION_FAILED: {
    title: "⚠️ Automation Failed",
    getMessage: (m) => `Automation "${m.automation_name || 'Unknown'}" failed`,
    priority: "high",
    role: "admin",
  },
  MANUAL_INTERVENTION_REQUIRED: {
    title: "🚨 Manual Intervention Required",
    getMessage: (m) => m.reason as string || "Manual action is required",
    priority: "high",
    role: "admin",
  },
};

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

    const payload: EventPayload = await req.json();
    log(requestId, "event_received", payload);

    const { event_type, actor_id, entity_type, entity_id, metadata = {}, target_user_id, target_role } = payload;

    if (!event_type) {
      return new Response(
        JSON.stringify({ error: "event_type is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const config = EVENT_CONFIG[event_type];
    if (!config) {
      log(requestId, "unknown_event_type", { event_type });
      return new Response(
        JSON.stringify({ error: `Unknown event type: ${event_type}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const enrichedMeta = { ...metadata, entity_id };
    const title = config.title;
    const message = config.getMessage(enrichedMeta);
    const priority = config.priority;
    const link = config.getLink ? config.getLink({ ...enrichedMeta, is_admin: false }) : null;
    const adminLink = config.getLink ? config.getLink({ ...enrichedMeta, is_admin: true }) : null;
    const role = target_role || config.role;

    const notifications: Array<{
      user_id: string;
      title: string;
      message: string;
      event_type: string;
      priority: string;
      link: string | null;
      role: string;
      actor_id: string | null;
      entity_type: string | null;
      entity_id: string | null;
      metadata: Record<string, unknown>;
      read: boolean;
    }> = [];

    // Notify specific user
    if (target_user_id) {
      // Skip self-notification
      if (actor_id !== target_user_id) {
        notifications.push({
          user_id: target_user_id,
          title,
          message,
          event_type,
          priority,
          link,
          role: "client",
          actor_id: actor_id || null,
          entity_type: entity_type || null,
          entity_id: entity_id || null,
          metadata: enrichedMeta,
          read: false,
        });
      }
    }

    // Notify admins if role is admin or all
    if (role === "admin" || role === "all") {
      const { data: adminRoles } = await supabaseAdmin
        .from("user_roles")
        .select("user_id")
        .eq("role", "admin");

      if (adminRoles) {
        for (const admin of adminRoles) {
          // Skip self-notification
          if (actor_id === admin.user_id) continue;

          // Check for duplicates in last 5 mins
          const { data: existing } = await supabaseAdmin
            .from("notifications")
            .select("id")
            .eq("user_id", admin.user_id)
            .eq("event_type", event_type)
            .eq("entity_id", entity_id)
            .gte("created_at", new Date(Date.now() - 5 * 60 * 1000).toISOString())
            .limit(1);

          if (existing && existing.length > 0) continue;

          notifications.push({
            user_id: admin.user_id,
            title,
            message,
            event_type,
            priority,
            link: adminLink,
            role: "admin",
            actor_id: actor_id || null,
            entity_type: entity_type || null,
            entity_id: entity_id || null,
            metadata: enrichedMeta,
            read: false,
          });
        }
      }
    }

    // Insert all notifications
    if (notifications.length > 0) {
      const { error: insertError } = await supabaseAdmin
        .from("notifications")
        .insert(notifications);

      if (insertError) {
        log(requestId, "insert_error", insertError);
        throw insertError;
      }
    }

    log(requestId, "notifications_created", { count: notifications.length });

    return new Response(
      JSON.stringify({ 
        success: true, 
        notifications_created: notifications.length 
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
