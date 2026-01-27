import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

/**
 * Emit a system alert to notify admins of issues requiring attention.
 * This behaves like a senior engineer escalating an issue.
 */
export async function emitSystemAlert(
  reason: string,
  context: {
    source?: string;
    error?: string;
    affected_entity_type?: string;
    affected_entity_id?: string;
    severity?: "warning" | "critical";
    suggested_action?: string;
    metadata?: Record<string, unknown>;
  }
): Promise<void> {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!supabaseUrl || !serviceRoleKey) {
      console.error("[SYSTEM_ALERT] Missing Supabase credentials");
      return;
    }

    // Call the emit-system-alert function
    const response = await fetch(`${supabaseUrl}/functions/v1/emit-system-alert`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify({ reason, context }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[SYSTEM_ALERT] Failed to emit alert:", errorText);
    }
  } catch (error) {
    console.error("[SYSTEM_ALERT] Error emitting alert:", error);
  }
}

/**
 * Emit an event notification to relevant users.
 */
export async function emitEvent(
  eventType: string,
  payload: {
    actor_id?: string;
    entity_type?: string;
    entity_id?: string;
    metadata?: Record<string, unknown>;
    target_user_id?: string;
    target_role?: "admin" | "client" | "all";
  }
): Promise<void> {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!supabaseUrl || !serviceRoleKey) {
      console.error("[EMIT_EVENT] Missing Supabase credentials");
      return;
    }

    const response = await fetch(`${supabaseUrl}/functions/v1/emit-event`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify({
        event_type: eventType,
        ...payload,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[EMIT_EVENT] Failed to emit event:", errorText);
    }
  } catch (error) {
    console.error("[EMIT_EVENT] Error emitting event:", error);
  }
}

/**
 * Check for data inconsistencies and emit alerts if found.
 */
export async function checkDataConsistency(
  supabaseAdmin: ReturnType<typeof createClient>,
  checks: Array<{
    name: string;
    query: () => Promise<{ inconsistent: boolean; details?: string }>;
  }>
): Promise<void> {
  for (const check of checks) {
    try {
      const result = await check.query();
      if (result.inconsistent) {
        await emitSystemAlert(
          `Data inconsistency: ${check.name}`,
          {
            source: "data_consistency_check",
            severity: "warning",
            suggested_action: result.details || "Review the data manually",
            metadata: { check_name: check.name },
          }
        );
      }
    } catch (error) {
      console.error(`[DATA_CHECK] Error running check "${check.name}":`, error);
    }
  }
}
