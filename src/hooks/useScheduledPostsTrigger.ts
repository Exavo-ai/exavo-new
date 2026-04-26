import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const FEATURE_FLAG = import.meta.env.VITE_ENABLE_SCHEDULED_POSTS !== "false";
const POLL_INTERVAL_MS = 60_000;

/**
 * Polls run-scheduled-posts every 60s while the admin dashboard is mounted.
 * Only runs for authenticated admin users with a valid session.
 * Fails silently — never surfaces errors to the UI.
 */
export function useScheduledPostsTrigger() {
  const running = useRef(false);
  const { userRole, session, loading } = useAuth();

  useEffect(() => {
    if (!FEATURE_FLAG) return;
    if (loading) return;
    if (userRole !== "admin") return;
    if (!session?.access_token) return;

    const invoke = async () => {
      if (running.current) return;
      running.current = true;
      try {
        // Re-check session is still valid before invoking
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        if (!currentSession?.access_token) return;

        const { data, error } = await supabase.functions.invoke("run-scheduled-posts", {
          method: "POST",
          body: {},
        });
        if (error) {
          // Silent — non-critical background poll
          console.debug("[scheduled-posts-poll] skipped:", error.message);
        } else {
          console.debug("[scheduled-posts-poll] ok", data);
        }
      } catch {
        // Silent — do not interrupt admin experience
      } finally {
        running.current = false;
      }
    };

    // Small delay on first call to ensure auth is fully propagated
    const initialTimeout = setTimeout(invoke, 2000);
    const id = setInterval(invoke, POLL_INTERVAL_MS);
    return () => {
      clearTimeout(initialTimeout);
      clearInterval(id);
    };
  }, [userRole, session?.access_token, loading]);
}
