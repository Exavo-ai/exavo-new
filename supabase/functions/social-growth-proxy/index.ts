import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Botpress Chat API base. BOTPRESS_INTEGRATION_ID acts as the chat instance id.
// Docs: https://botpress.com/docs/api-documentation/chat-api
function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function bpFetch(
  url: string,
  init: RequestInit,
  label: string,
): Promise<{ ok: boolean; status: number; text: string; json: any | null }> {
  const res = await fetch(url, init);
  const text = await res.text();
  let json: any = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    // ignore
  }
  if (!res.ok) {
    console.error(`[Botpress] ${label} failed:`, res.status, text);
  } else {
    console.log(`[Botpress] ${label} ok:`, res.status);
  }
  return { ok: res.ok, status: res.status, text, json };
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

    const BOTPRESS_INTEGRATION_ID = Deno.env.get("BOTPRESS_INTEGRATION_ID");
    if (!BOTPRESS_INTEGRATION_ID) {
      console.error("BOTPRESS_INTEGRATION_ID not configured");
      return jsonResponse({ error: "AI service not configured" }, 500);
    }

    // Chat API base: integration ID acts as the chat instance segment.
    const BP_BASE = `https://chat.botpress.cloud/${BOTPRESS_INTEGRATION_ID}`;

    const body = await req.json().catch(() => ({}));
    const input: string | undefined = body?.input;
    let conversationId: string | undefined = body?.conversationId;
    let userKey: string | undefined = body?.userKey;

    if (!input || typeof input !== "string" || input.trim().length === 0) {
      return jsonResponse({ error: "Input is required" }, 400);
    }

    // 1. Create chat user (gets user key) if not provided
    if (!userKey) {
      const userRes = await bpFetch(
        `${BP_BASE}/users`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: user.email ?? user.id }),
        },
        "create user",
      );
      if (!userRes.ok) {
        return jsonResponse(
          { error: "Failed to create chat user", details: userRes.text },
          502,
        );
      }
      userKey = userRes.json?.key ?? userRes.json?.user?.key;
      if (!userKey) {
        return jsonResponse({ error: "No user key returned from Botpress" }, 502);
      }
    }

    const bpHeaders = {
      "x-user-key": userKey,
      "Content-Type": "application/json",
    };

    // 2. Create conversation if not provided
    if (!conversationId) {
      const convRes = await bpFetch(
        `${BP_BASE}/conversations`,
        {
          method: "POST",
          headers: bpHeaders,
          body: JSON.stringify({}),
        },
        "create conversation",
      );
      if (!convRes.ok) {
        return jsonResponse(
          { error: "Failed to create conversation", details: convRes.text },
          502,
        );
      }
      conversationId = convRes.json?.conversation?.id ?? convRes.json?.id;
      if (!conversationId) {
        return jsonResponse({ error: "No conversation id returned" }, 502);
      }
    }

    // 3. Send user message
    const sendRes = await bpFetch(
      `${BP_BASE}/messages`,
      {
        method: "POST",
        headers: bpHeaders,
        body: JSON.stringify({
          conversationId,
          payload: { type: "text", text: input.trim() },
        }),
      },
      "send message",
    );
    if (!sendRes.ok) {
      return jsonResponse(
        {
          error: "Failed to send message",
          conversationId,
          userKey,
          details: sendRes.text,
        },
        502,
      );
    }

    const sentMessage = sendRes.json?.message ?? sendRes.json;
    const sentMessageId: string | null = sentMessage?.id ?? null;
    const sentMessageCreatedAt: string | null =
      sentMessage?.createdAt ?? null;

    // 4. Poll for bot reply (up to ~12s)
    const maxAttempts = 10;
    const delayMs = 1200;
    let botReply = "";

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      await new Promise((r) => setTimeout(r, delayMs));

      const fetchRes = await bpFetch(
        `${BP_BASE}/conversations/${conversationId}/messages`,
        { method: "GET", headers: bpHeaders },
        `fetch messages (attempt ${attempt + 1})`,
      );
      if (!fetchRes.ok) continue;

      const messages: any[] =
        fetchRes.json?.messages ??
        fetchRes.json?.data ??
        (Array.isArray(fetchRes.json) ? fetchRes.json : []);

      // Bot messages are those NOT sent by our user (different userId / id)
      const botMessages = messages.filter((m: any) => {
        if (m?.id && sentMessageId && m.id === sentMessageId) return false;
        // Heuristic: outgoing/bot direction or no userId match
        const sameUser = m?.userId && sentMessage?.userId && m.userId === sentMessage.userId;
        if (sameUser) return false;
        if (sentMessageCreatedAt && m?.createdAt) {
          return new Date(m.createdAt).getTime() > new Date(sentMessageCreatedAt).getTime();
        }
        return true;
      });

      if (botMessages.length > 0) {
        // Sort by createdAt asc, take latest
        botMessages.sort((a, b) =>
          new Date(a.createdAt ?? 0).getTime() - new Date(b.createdAt ?? 0).getTime()
        );
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
          userKey,
          output: "The assistant is taking longer than usual. Please try again.",
        },
        200,
      );
    }

    return jsonResponse({ conversationId, userKey, output: botReply }, 200);
  } catch (err) {
    console.error("Botpress proxy error:", err);
    return jsonResponse(
      { error: "Internal server error", details: String(err) },
      500,
    );
  }
});
