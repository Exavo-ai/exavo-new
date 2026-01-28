/**
 * Helper to trigger event-based email notifications.
 * This is a fire-and-forget call that will never throw or block.
 */
export async function sendEventEmail(payload: {
  event_type: string;
  actor_id?: string;
  entity_type?: string;
  entity_id?: string;
  metadata?: Record<string, unknown>;
  target_user_id?: string;
  client_email?: string;
}): Promise<void> {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      console.error("[SEND_EVENT_EMAIL] Missing Supabase credentials");
      return;
    }

    // Fire-and-forget - don't await the response in production
    fetch(`${supabaseUrl}/functions/v1/send-event-email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify(payload),
    }).catch((error) => {
      console.error("[SEND_EVENT_EMAIL] Failed to trigger email:", error);
    });
  } catch (error) {
    console.error("[SEND_EVENT_EMAIL] Error:", error);
  }
}

/**
 * Email event types that are supported.
 * Use these constants to ensure type safety.
 */
export const EMAIL_EVENTS = {
  // Admin-only events
  SERVICE_PURCHASED: "SERVICE_PURCHASED",
  SUBSCRIPTION_PAUSED: "SUBSCRIPTION_PAUSED",
  SUBSCRIPTION_RESUMED: "SUBSCRIPTION_RESUMED",
  DELIVERY_APPROVED: "DELIVERY_APPROVED",
  MANUAL_INTERVENTION_REQUIRED: "MANUAL_INTERVENTION_REQUIRED",
  WEBHOOK_FAILURE: "WEBHOOK_FAILURE",
  AUTOMATION_FAILED: "AUTOMATION_FAILED",
  REVISION_REQUESTED: "REVISION_REQUESTED",

  // Client-only events
  DELIVERY_CREATED: "DELIVERY_CREATED",
  SUBSCRIPTION_RENEWED: "SUBSCRIPTION_RENEWED",
  SERVICE_APPROVED: "SERVICE_APPROVED",
  PROJECT_STATUS_CHANGED: "PROJECT_STATUS_CHANGED",
  PROJECT_COMPLETED: "PROJECT_COMPLETED",

  // Both admin and client
  SUBSCRIPTION_ACTIVATED: "SUBSCRIPTION_ACTIVATED",
  SUBSCRIPTION_CANCELED: "SUBSCRIPTION_CANCELED",
  PAYMENT_FAILED: "PAYMENT_FAILED",
} as const;
