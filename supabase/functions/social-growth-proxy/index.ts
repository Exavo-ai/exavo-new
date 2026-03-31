import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const TEST_WEBHOOK =
  "https://n8n.exavo.app/webhook-test/245c2879-4f14-402f-93be-5dd8a61e2318";
const PROD_WEBHOOK =
  "https://n8n.exavo.app/webhook/245c2879-4f14-402f-93be-5dd8a61e2318";

const QUERY_KEYS = ["message", "input"] as const;

const extractDisplayText = (rawText: string): string => {
  const text = rawText.trim();
  if (!text) return "";

  try {
    const parsed = JSON.parse(text);
    if (typeof parsed === "string") return parsed.trim();
    if (parsed && typeof parsed === "object") {
      const record = parsed as Record<string, unknown>;
      const candidate =
        record.output ??
        record.text ??
        record.response ??
        record.message ??
        record.result;
      if (typeof candidate === "string" && candidate.trim()) {
        return candidate.trim();
      }
    }
  } catch {
    // plain text — use as-is
  }

  return text;
};

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

    const attemptWebhook = async (
      label: string,
      webhookURL: string
    ): Promise<
      | { success: true; text: string }
      | { success: false; failure: { status?: number; body: string } }
    > => {
      for (const key of QUERY_KEYS) {
        const url = `${webhookURL}?${key}=${encodeURIComponent(trimmedInput)}`;
        try {
          console.log(`Trying ${label} webhook...`);
          console.log("Method: GET");
          console.log("Webhook:", url);

          const response = await fetch(url, { method: "GET" });
          const rawText = await response.text();

          console.log("Status:", response.status);
          console.log("Response:", rawText);

          if (rawText.includes("Error in workflow")) {
            console.log(`${label} ?${key} returned workflow error, trying next key...`);
            continue;
          }

          if (response.status === 200 && rawText.trim().length > 0) {
            const displayText = extractDisplayText(rawText);
            if (displayText.trim().length > 0) {
              return { success: true, text: displayText };
            }
          }
        } catch (error) {
          console.error(`${label} GET ?${key} error:`, error);
        }
      }

      return {
        success: false,
        failure: { body: `All query keys failed for ${label}` },
      };
    };

    // Try test first (will 404 unless actively listening — skip fast)
    const testResult = await attemptWebhook("test", TEST_WEBHOOK);
    if (testResult.success) {
      return new Response(testResult.text, {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "text/plain" },
      });
    }

    console.log("Fallback to production webhook...");
    const prodResult = await attemptWebhook("production", PROD_WEBHOOK);
    if (prodResult.success) {
      return new Response(prodResult.text, {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "text/plain" },
      });
    }

    console.error("Both webhooks failed");
    return new Response(
      JSON.stringify({
        error:
          "Content generation is temporarily unavailable. Please try again.",
      }),
      {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("Social growth proxy error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
