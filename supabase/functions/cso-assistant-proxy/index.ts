import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const TEST_WEBHOOK =
  "https://n8n.exavo.app/webhook-test/1748c4f4-677d-42b1-9ae0-275028a1aa29";
const PROD_WEBHOOK =
  "https://n8n.exavo.app/webhook/1748c4f4-677d-42b1-9ae0-275028a1aa29";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const input = body?.input;
    if (!input || typeof input !== "string" || input.trim().length === 0) {
      return new Response(JSON.stringify({ error: "Input is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const trimmedInput = input.trim();

    const extractDisplayText = (rawText: string): string => {
      const text = rawText.trim();
      if (!text) return "";

      try {
        const parsed = JSON.parse(text);
        if (typeof parsed === "string") return parsed.trim();
        if (parsed && typeof parsed === "object") {
          const record = parsed as Record<string, unknown>;
          const candidate = record.output ?? record.text ?? record.response ?? record.message ?? record.result;
          if (typeof candidate === "string" && candidate.trim()) {
            return candidate.trim();
          }
        }
      } catch {
        // n8n may already return plain text; keep it as-is
      }

      return text;
    };

    const attemptWebhook = async (label: "test" | "production", webhookURL: string) => {
      const attempts = [
        {
          method: "GET",
          url: `${webhookURL}?input=${encodeURIComponent(trimmedInput)}`,
          init: { method: "GET" },
        },
        {
          method: "POST",
          url: webhookURL,
          init: {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ input: trimmedInput }),
          },
        },
      ] as const;

      let lastFailure: { method: string; status?: number; body: string } | null = null;

      for (const attempt of attempts) {
        try {
          console.log(`Trying ${label} webhook...`);
          console.log("Using webhook:", attempt.url);

          const response = await fetch(attempt.url, attempt.init);
          const rawText = await response.text();

          console.log("Status:", response.status);
          console.log("Response:", rawText);

          const displayText = extractDisplayText(rawText);
          const hasInvalidFormat = !displayText || !displayText.trim();

          if (response.status === 200 && !hasInvalidFormat) {
            return { success: true as const, text: displayText };
          }

          lastFailure = {
            method: attempt.method,
            status: response.status,
            body: rawText || "<empty response>",
          };
        } catch (error) {
          console.error(`${label} ${attempt.method} webhook error:`, error);
          lastFailure = {
            method: attempt.method,
            body: error instanceof Error ? error.message : String(error),
          };
        }
      }

      return { success: false as const, failure: lastFailure };
    };

    const testResult = await attemptWebhook("test", TEST_WEBHOOK);
    if (testResult.success) {
      return new Response(testResult.text, {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "text/plain" },
      });
    }

    console.log("Fallback to production webhook...");
    const productionResult = await attemptWebhook("production", PROD_WEBHOOK);
    if (productionResult.success) {
      return new Response(productionResult.text, {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "text/plain" },
      });
    }

    console.error("Both webhooks failed", {
      test: testResult.failure,
      production: productionResult.failure,
    });

    return new Response(
      JSON.stringify({
        error: "Sales assistant is temporarily unavailable. Please try again.",
        debug: {
          test: testResult.failure,
          production: productionResult.failure,
        },
      }),
      {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("CSO assistant proxy error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
