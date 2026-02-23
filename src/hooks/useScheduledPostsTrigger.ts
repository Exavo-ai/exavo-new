import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

const FEATURE_FLAG = import.meta.env.VITE_ENABLE_SCHEDULED_POSTS !== "false";
const POLL_INTERVAL_MS = 60_000;

/**
 * Polls run-scheduled-posts every 60s while the admin dashboard is mounted.
 * Fires immediately on mount, then every POLL_INTERVAL_MS.
 * Cleans up on unmount. Skips if feature flag is disabled.
 */
export function useScheduledPostsTrigger() {
  const running = useRef(false);

  useEffect(() => {
    if (!FEATURE_FLAG) return;

    const invoke = async () => {
      if (running.current) return; // prevent overlapping calls
      running.current = true;
      const start = Date.now();
      try {
        const { data, error } = await supabase.functions.invoke("run-scheduled-posts", {
          method: "POST",
          body: {},
        });
        const duration = Date.now() - start;
        if (error) {
          console.warn(`[scheduled-posts-poll] failed (${duration}ms):`, error.message);
        } else {
          console.info(`[scheduled-posts-poll] ok (${duration}ms)`, data);
        }
      } catch {
        // Silent — do not interrupt admin experience
      } finally {
        running.current = false;
      }
    };

    invoke(); // immediate first call
    const id = setInterval(invoke, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, []);
}
