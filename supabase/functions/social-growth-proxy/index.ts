import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const BOTPRESS_BASE = "https://api.botpress.cloud/v1/chat";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
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

    const BOTPRESS_API_KEY = Deno.env.get("BOTPRESS_API_KEY");
    const BOTPRESS_INTEGRATION_ID = Deno.env.get("BOTPRESS_INTEGRATION_ID");
    if (!BOTPRESS_API_KEY || !BOTPRESS_INTEGRATION_ID) {
      console.error("Botpress env not configured");
      return jsonResponse({ error: "AI service not configured" }, 500);
    }

    const body = await req.json().catch(() => ({}));
    const input: string | undefined = body?.input;
    let conversationId: string | undefined = body?.conversationId;

    if (!input || typeof input !== "string" || input.trim().length === 0) {
      return jsonResponse({ error: "Input is required" }, 400);
    }

    const bpHeaders = {
      Authorization: `Bearer ${BOTPRESS_API_KEY}`,
      "Content-Type": "application/json",
    };

    // 1. Create conversation if not provided
    if (!conversationId) {
      const convRes = await fetch(`${BOTPRESS_BASE}/conversations`, {
        method: "POST",
        headers: bpHeaders,
        body: JSON.stringify({
          channel: "channel",
          tags: { "user:id": user.id },
        }),
      });
      const convText = await convRes.text();
      if (!convRes.ok) {
        console.error("Botpress create conversation failed:", convRes.status, convText);
        return jsonResponse({ error: "Failed to create conversation" }, 502);
      }
      try {
        const convJson = JSON.parse(convText);
        conversationId = convJson?.conversation?.id ?? convJson?.id;
      } catch {
        console.error("Invalid conversation JSON:", convText);
        return jsonResponse({ error: "Invalid Botpress response" }, 502);
      }
      if (!conversationId) {
        return jsonResponse({ error: "No conversation id returned" }, 502);
      }
    }

    // 2. Send user message
    const sendRes = await fetch(`${BOTPRESS_BASE}/messages`, {
      method: "POST",
      headers: bpHeaders,
      body: JSON.stringify({
        conversationId,
        payload: { type: "text", text: input.trim() },
      }),
    });
    const sendText = await sendRes.text();
    if (!sendRes.ok) {
      console.error("Botpress send message failed:", sendRes.status, sendText);
      return jsonResponse({ error: "Failed to send message", conversationId }, 502);
    }

    let sentMessageCreatedAt: string | null = null;
    try {
      const sentJson = JSON.parse(sendText);
      sentMessageCreatedAt =
        sentJson?.message?.createdAt ?? sentJson?.createdAt ?? null;
    } catch {
      // ignore
    }

    // 3. Poll for bot reply (up to ~10s)
    const maxAttempts = 8;
    const delayMs = 1200;
    let botReply = "";

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      await new Promise((r) => setTimeout(r, delayMs));

      const fetchRes = await fetch(
        `${BOTPRESS_BASE}/conversations/${conversationId}/messages`,
        { method: "GET", headers: bpHeaders },
      );
      const fetchText = await fetchRes.text();
      if (!fetchRes.ok) {
        console.error("Botpress fetch messages failed:", fetchRes.status, fetchText);
        continue;
      }

      let messages: any[] = [];
      try {
        const parsed = JSON.parse(fetchText);
        messages = parsed?.messages ?? parsed?.data ?? (Array.isArray(parsed) ? parsed : []);
      } catch {
        continue;
      }

      // Find latest bot/assistant message after our sent message
      const botMessages = messages.filter((m: any) => {
        const isBot =
          m?.direction === "outgoing" ||
          m?.userId === undefined ||
          m?.isBot === true ||
          m?.author === "bot";
        if (!isBot) return false;
        if (sentMessageCreatedAt && m?.createdAt) {
          return new Date(m.createdAt).getTime() > new Date(sentMessageCreatedAt).getTime();
        }
        return true;
      });

      if (botMessages.length > 0) {
        const latest = botMessages[botMessages.length - 1];
        const text =
          latest?.payload?.text ??
          latest?.payload?.body ??
          latest?.text ??
          "";
        if (typeof text === "string" && text.trim().length > 0) {
          botReply = text;
          break;
        }
      }
    }

    if (!botReply) {
      return jsonResponse(
        {
          conversationId,
          output: "The assistant is taking longer than usual. Please try again.",
        },
        200,
      );
    }

    return jsonResponse({ conversationId, output: botReply }, 200);
  } catch (err) {
    console.error("Botpress proxy error:", err);
    return jsonResponse({ error: "Internal server error" }, 500);
  }
});
