import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BOTPRESS_BOT_ID = "a2a82bd6-01aa-4560-a3ea-7799bc51a435";
const BOTPRESS_CHAT_URL = "https://api.botpress.cloud/v1/chat";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function safeJsonParse(text: string) {
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return null;
  }
}

function extractAssistantText(payload: any): string {
  if (!payload) return "";
  if (typeof payload === "string") return payload;

  const direct =
    payload.message ??
    payload.response ??
    payload.text ??
    payload.output ??
    payload.reply ??
    payload.answer ??
    payload.result;
  if (typeof direct === "string" && direct.trim()) return direct.trim();

  // Botpress sometimes returns an array of messages
  const messages = payload.messages ?? payload.responses ?? payload.data;
  if (Array.isArray(messages)) {
    const texts = messages
      .map((m: any) => {
        if (typeof m === "string") return m;
        return (
          m?.payload?.text ??
          m?.text ??
          m?.message ??
          m?.content ??
          ""
        );
      })
      .filter((t: any) => typeof t === "string" && t.trim().length > 0);
    if (texts.length > 0) return texts.join("\n\n");
  }

  return "";
}

function publicErrorMessage(status: number, body: any, fallback: string) {
  if (status === 401 || status === 403) {
    return "Botpress rejected the request. Please verify the API key.";
  }
  if (status === 429) {
    return "Botpress rate limit reached. Please wait a moment and try again.";
  }
  if (status >= 500) {
    return "Botpress is currently returning a server error. Please try again shortly.";
  }
  const msg =
    body?.message ?? body?.error?.message ?? body?.error ?? body?.details;
  return typeof msg === "string" && msg.trim() ? msg : fallback;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) return jsonResponse({ error: "Unauthorized" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return jsonResponse({ error: "Unauthorized" }, 401);

    const apiKey = Deno.env.get("BOTPRESS_API_KEY")?.trim();
    if (!apiKey) {
      console.error("BOTPRESS_API_KEY not configured");
      return jsonResponse({ error: "Botpress API key is not configured" }, 500);
    }

    const body = await req.json().catch(() => ({}));
    const input = typeof body?.input === "string" ? body.input.trim() : "";
    if (!input) return jsonResponse({ error: "Input is required" }, 400);

    const requestBody = {
      botId: BOTPRESS_BOT_ID,
      userId: `user_${user.id}`,
      message: input,
    };

    console.log("[Botpress] /v1/chat request", {
      url: BOTPRESS_CHAT_URL,
      body: requestBody,
    });

    let lastResponse: { status: number; text: string; json: any } | null = null;
    const maxRetries = 2;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const res = await fetch(BOTPRESS_CHAT_URL, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
        });
        const text = await res.text();
        const json = safeJsonParse(text);

        console.log(`[Botpress] /v1/chat response (attempt ${attempt + 1})`, {
          status: res.status,
          statusText: res.statusText,
          body: text,
        });

        lastResponse = { status: res.status, text, json };

        if (res.ok) {
          const output = extractAssistantText(json);
          if (!output) {
            console.error("[Botpress] empty assistant text", json);
            return jsonResponse(
              {
                error: "Botpress returned an empty response.",
                details: text,
              },
              502,
            );
          }
          return jsonResponse({ output }, 200);
        }

        // Don't retry on auth/client errors
        if (![429, 500, 502, 503, 504].includes(res.status)) break;
      } catch (err) {
        console.error(`[Botpress] network error attempt ${attempt + 1}`, err);
        lastResponse = {
          status: 0,
          text: String(err),
          json: null,
        };
      }
      if (attempt < maxRetries) {
        await new Promise((r) => setTimeout(r, 600 * (attempt + 1)));
      }
    }

    const status = lastResponse?.status || 502;
    return jsonResponse(
      {
        error: publicErrorMessage(
          status,
          lastResponse?.json,
          "Failed to reach Botpress.",
        ),
        details: lastResponse?.text,
      },
      status >= 400 && status < 600 ? status : 502,
    );
  } catch (err) {
    console.error("Botpress proxy error:", err);
    return jsonResponse(
      { error: "Botpress proxy failed", details: String(err) },
      500,
    );
  }
});
