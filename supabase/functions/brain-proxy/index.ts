import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const WEBHOOK_URL = "https://hook.eu1.make.com/1vt6i76tin9t20d18hrz9xkri9ixwqqb";
const FALLBACK_REPLY = "Something went wrong, please try again.";

const extractReply = (payload: unknown): string | null => {
  if (typeof payload === "string") {
    const trimmed = payload.trim();

    if (!trimmed) return null;

    try {
      return extractReply(JSON.parse(trimmed)) ?? trimmed;
    } catch {
      return trimmed;
    }
  }

  if (payload && typeof payload === "object") {
    const record = payload as Record<string, unknown>;

    for (const key of ["reply", "response", "message", "output", "text"]) {
      const value = extractReply(record[key]);
      if (value) return value;
    }
  }

  return null;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => null);
    const message = typeof body?.message === "string" ? body.message.trim() : "";

    if (!message) {
      return new Response(JSON.stringify({ error: "Message is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Proxying to Make.com webhook, message:", message);

    const webhookRes = await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
    });

    const text = await webhookRes.text();
    console.log("Webhook response status:", webhookRes.status);
    console.log("Webhook response body:", text);

    const reply = extractReply(text);

    if (!webhookRes.ok) {
      return new Response(
        JSON.stringify({
          reply: reply ?? FALLBACK_REPLY,
          error: "Webhook returned an error",
          status: webhookRes.status,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    return new Response(JSON.stringify({ reply: reply ?? FALLBACK_REPLY }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Brain proxy error:", error);
    return new Response(JSON.stringify({ reply: FALLBACK_REPLY, error: FALLBACK_REPLY }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
