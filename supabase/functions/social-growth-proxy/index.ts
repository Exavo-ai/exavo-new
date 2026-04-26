import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type BotpressResult = {
  ok: boolean;
  status: number;
  statusText: string;
  text: string;
  json: any | null;
};

type ChatSession = {
  conversationId?: string;
  userKey?: string;
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

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

function toPublicBotpressError(result: BotpressResult, fallback: string) {
  const botpressMessage =
    result.json?.message ?? result.json?.error?.message ?? result.json?.error ?? result.text;

  if (result.status === 401 || result.status === 403) {
    return "Botpress rejected the request. Check the Chat integration webhook ID and API configuration.";
  }
  if (result.status === 429) {
    return "Botpress rate limit reached. Please wait a moment and try again.";
  }
  if (result.status >= 500) {
    return "Botpress is currently returning a server error. Please try again shortly.";
  }

  return typeof botpressMessage === "string" && botpressMessage.trim()
    ? botpressMessage
    : fallback;
}

async function bpFetch(
  url: string,
  init: RequestInit,
  label: string,
  retries = 1,
): Promise<BotpressResult> {
  const safeHeaders = Object.fromEntries(
    Object.entries(init.headers ?? {}).map(([key, value]) => [
      key,
      key.toLowerCase() === "x-user-key" ? "[redacted]" : value,
    ]),
  );
  console.log(`[Botpress] ${label} request`, {
    method: init.method ?? "GET",
    url,
    headers: safeHeaders,
    body: init.body ? String(init.body) : undefined,
  });

  let lastResult: BotpressResult | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, init);
      const text = await res.text();
      const result: BotpressResult = {
        ok: res.ok,
        status: res.status,
        statusText: res.statusText,
        text,
        json: safeJsonParse(text),
      };
      lastResult = result;

      const logPayload = {
        status: result.status,
        statusText: result.statusText,
        body: result.text,
        attempt: attempt + 1,
      };
      if (result.ok) {
        console.log(`[Botpress] ${label} response`, logPayload);
      } else {
        console.error(`[Botpress] ${label} failed`, logPayload);
      }

      if (result.ok || ![429, 500, 502, 503, 504].includes(result.status) || attempt === retries) {
        return result;
      }
    } catch (error) {
      console.error(`[Botpress] ${label} network error`, {
        attempt: attempt + 1,
        error: String(error),
      });
      if (attempt === retries) {
        return {
          ok: false,
          status: 0,
          statusText: "Network Error",
          text: String(error),
          json: null,
        };
      }
    }

    await sleep(650 * (attempt + 1));
  }

  return lastResult ?? {
    ok: false,
    status: 0,
    statusText: "Unknown Error",
    text: "No Botpress response returned",
    json: null,
  };
}

function extractConversationId(body: any): string | undefined {
  const value = body?.conversation?.id ?? body?.id;
  return typeof value === "string" && value.trim() ? value : undefined;
}

function extractUserKey(body: any): string | undefined {
  const value = body?.key ?? body?.user?.key;
  return typeof value === "string" && value.trim() ? value : undefined;
}

function extractMessages(body: any): any[] {
  const messages = body?.messages ?? body?.data ?? body?.records ?? body;
  return Array.isArray(messages) ? messages : [];
}

function extractMessageText(message: any): string {
  const payload = message?.payload;
  const text =
    payload?.type === "text" ? payload?.text : payload?.text ?? payload?.body ?? message?.text;
  return typeof text === "string" ? text.trim() : "";
}

function isBotMessage(message: any, sentMessage: any, sentAtMs: number) {
  if (message?.id && sentMessage?.id && message.id === sentMessage.id) return false;
  if (message?.direction === "incoming") return false;
  if (message?.direction === "outgoing") return true;

  const sameUser =
    message?.userId && sentMessage?.userId && message.userId === sentMessage.userId;
  if (sameUser) return false;

  const createdAt = Date.parse(message?.createdAt ?? "");
  return Number.isFinite(createdAt) ? createdAt > sentAtMs : true;
}

async function ensureChatUser(bpBase: string, session: ChatSession, displayName: string) {
  if (session.userKey) return { ok: true as const, userKey: session.userKey };

  const createUser = await bpFetch(
    `${bpBase}/users`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: displayName }),
    },
    "create user",
    1,
  );

  if (!createUser.ok) {
    return {
      ok: false as const,
      status: createUser.status || 502,
      error: toPublicBotpressError(createUser, "Failed to create Botpress chat user"),
      details: createUser.text,
    };
  }

  const userKey = extractUserKey(createUser.json);
  if (!userKey) {
    console.error("[Botpress] create user response missing key", createUser.text);
    return {
      ok: false as const,
      status: 502,
      error: "Botpress did not return a chat user key.",
      details: createUser.text,
    };
  }

  return { ok: true as const, userKey };
}

async function ensureConversation(bpBase: string, session: ChatSession) {
  if (session.conversationId) {
    return { ok: true as const, conversationId: session.conversationId };
  }

  const createConversation = await bpFetch(
    `${bpBase}/conversations`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-user-key": session.userKey!,
      },
      body: JSON.stringify({}),
    },
    "create conversation",
    1,
  );

  if (!createConversation.ok) {
    return {
      ok: false as const,
      status: createConversation.status || 502,
      error: toPublicBotpressError(createConversation, "Failed to create Botpress conversation"),
      details: createConversation.text,
    };
  }

  const conversationId = extractConversationId(createConversation.json);
  if (!conversationId) {
    console.error("[Botpress] create conversation response missing id", createConversation.text);
    return {
      ok: false as const,
      status: 502,
      error: "Botpress did not return a conversation id.",
      details: createConversation.text,
    };
  }

  return { ok: true as const, conversationId };
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

    const webhookId = Deno.env.get("BOTPRESS_INTEGRATION_ID")?.trim();
    if (!webhookId) {
      console.error("BOTPRESS_INTEGRATION_ID webhook id not configured");
      return jsonResponse({ error: "Botpress webhook id is not configured" }, 500);
    }

    const body = await req.json().catch(() => ({}));
    const input = typeof body?.input === "string" ? body.input.trim() : "";
    if (!input) return jsonResponse({ error: "Input is required" }, 400);

    const session: ChatSession = {
      conversationId:
        typeof body?.conversationId === "string" && body.conversationId.trim()
          ? body.conversationId.trim()
          : undefined,
      userKey:
        typeof body?.userKey === "string" && body.userKey.trim()
          ? body.userKey.trim()
          : undefined,
    };

    const bpBase = `https://chat.botpress.cloud/${webhookId}`;
    const userResult = await ensureChatUser(bpBase, session, user.email ?? user.id);
    if (!userResult.ok) {
      return jsonResponse(
        { error: userResult.error, details: userResult.details },
        userResult.status,
      );
    }
    session.userKey = userResult.userKey;

    const conversationResult = await ensureConversation(bpBase, session);
    if (!conversationResult.ok) {
      return jsonResponse(
        {
          error: conversationResult.error,
          userKey: session.userKey,
          details: conversationResult.details,
        },
        conversationResult.status,
      );
    }
    session.conversationId = conversationResult.conversationId;

    const messagePayload = {
      conversationId: session.conversationId,
      payload: { type: "text", text: input },
    };

    const sendMessage = await bpFetch(
      `${bpBase}/messages`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-key": session.userKey,
        },
        body: JSON.stringify(messagePayload),
      },
      "send message",
      1,
    );

    if (!sendMessage.ok) {
      return jsonResponse(
        {
          error: toPublicBotpressError(sendMessage, "Failed to send Botpress message"),
          conversationId: session.conversationId,
          userKey: session.userKey,
          details: sendMessage.text,
        },
        sendMessage.status || 502,
      );
    }

    const sentMessage = sendMessage.json?.message ?? sendMessage.json;
    const sentAtMs = Date.parse(sentMessage?.createdAt ?? new Date().toISOString());
    const maxAttempts = 12;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      await sleep(attempt < 2 ? 600 : 1200);

      const fetchMessages = await bpFetch(
        `${bpBase}/conversations/${encodeURIComponent(session.conversationId)}/messages`,
        {
          method: "GET",
          headers: { "x-user-key": session.userKey },
        },
        `fetch messages attempt ${attempt + 1}`,
        0,
      );

      if (!fetchMessages.ok) {
        if ([401, 403, 429].includes(fetchMessages.status)) {
          return jsonResponse(
            {
              error: toPublicBotpressError(fetchMessages, "Failed to fetch Botpress messages"),
              conversationId: session.conversationId,
              userKey: session.userKey,
              details: fetchMessages.text,
            },
            fetchMessages.status,
          );
        }
        continue;
      }

      const botMessages = extractMessages(fetchMessages.json)
        .filter((message) => isBotMessage(message, sentMessage, sentAtMs))
        .map((message) => ({ message, text: extractMessageText(message) }))
        .filter(({ text }) => text.length > 0)
        .sort((a, b) =>
          Date.parse(a.message?.createdAt ?? "0") - Date.parse(b.message?.createdAt ?? "0"),
        );

      const latest = botMessages.at(-1);
      if (latest) {
        return jsonResponse(
          {
            conversationId: session.conversationId,
            userKey: session.userKey,
            output: latest.text,
          },
          200,
        );
      }
    }

    console.error("[Botpress] no bot reply returned before polling timeout", {
      conversationId: session.conversationId,
    });
    return jsonResponse(
      {
        conversationId: session.conversationId,
        userKey: session.userKey,
        output: "The assistant is still thinking. Please send another message in a moment.",
      },
      200,
    );
  } catch (err) {
    console.error("Botpress proxy error:", err);
    return jsonResponse(
      { error: "Botpress proxy failed", details: String(err) },
      500,
    );
  }
});
