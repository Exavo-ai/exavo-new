import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

const FEATURE_FLAG = import.meta.env.VITE_ENABLE_SCHEDULED_POSTS !== "false";

/**
 * Passive trigger: on admin dashboard load, silently calls
 * run-scheduled-posts to process any due posts.
 * Only fires once per mount and only if feature flag is enabled.
 */
export function useScheduledPostsTrigger() {
  const triggered = useRef(false);

  useEffect(() => {
    if (!FEATURE_FLAG) return;
    if (triggered.current) return;
    triggered.current = true;

    (async () => {
      try {
        const { error } = await supabase.functions.invoke("run-scheduled-posts", {
          method: "POST",
          body: {},
        });
        if (error) {
          console.warn("[scheduled-posts-trigger] Silent trigger failed:", error.message);
        }
      } catch {
        // Silent — do not interrupt admin experience
      }
    })();
  }, []);
}
