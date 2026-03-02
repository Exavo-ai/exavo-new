import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { corsHeaders, handleCors } from "../_shared/response.ts";

const MAKE_WEBHOOK_URL = "https://hook.eu1.make.com/jbt8dq78argmvlpe3gj3kojgb34v83wp";
const DAILY_LIMIT = 3;

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    // Auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sbUrl = Deno.env.get("SUPABASE_URL")!;
    const sbAnon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const sbService = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(sbUrl, sbAnon, {
      global: { headers: { Authorization: authHeader } },
    });
    const serviceClient = createClient(sbUrl, sbService);

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: authErr } = await userClient.auth.getUser(token);
    if (authErr || !userData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userData.user.id;

    // Parse & validate input
    let title: string;
    try {
      const body = await req.json();
      title = body?.title;
    } catch {
      return new Response(JSON.stringify({ error: "Invalid request body" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!title || typeof title !== "string" || !title.trim()) {
      return new Response(JSON.stringify({ error: "Title is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sanitizedTitle = title.trim().slice(0, 200);

    // Rate limit check with atomic upsert
    const today = new Date().toISOString().split("T")[0];

    // Try to get existing usage
    const { data: existing } = await serviceClient
      .from("user_daily_blog_usage")
      .select("id, generation_count")
      .eq("user_id", userId)
      .eq("usage_date", today)
      .maybeSingle();

    if (existing && existing.generation_count >= DAILY_LIMIT) {
      return new Response(
        JSON.stringify({
          error: "Daily limit reached",
          remaining: 0,
          limit: DAILY_LIMIT,
        }),
        {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Call Make webhook (same as admin ai-generate-blog)
    console.log(`[playground-blog-generate] Generating for user ${userId}: "${sanitizedTitle}"`);

    let webhookRes: Response;
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 120000); // 2 min timeout
      webhookRes = await fetch(MAKE_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: sanitizedTitle }),
        signal: controller.signal,
      });
      clearTimeout(timeout);
    } catch (fetchErr) {
      console.error("[playground-blog-generate] Webhook fetch failed:", fetchErr);
      return new Response(
        JSON.stringify({ error: "Content generation failed. Please try again." }),
        {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!webhookRes.ok) {
      console.error(`[playground-blog-generate] Webhook returned ${webhookRes.status}`);
      return new Response(
        JSON.stringify({ error: "Content generation failed. Please try again." }),
        {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Parse response (same multi-format handling as ai-generate-blog)
    let content: string | undefined;
    try {
      const rawText = await webhookRes.text();

      let data: unknown;
      try {
        data = JSON.parse(rawText);
      } catch {
        if (rawText && rawText.trim().length > 50) {
          content = rawText.trim();
        }
      }

      if (!content && data) {
        if (typeof (data as Record<string, unknown>).content === "string" && ((data as Record<string, unknown>).content as string).trim()) {
          content = ((data as Record<string, unknown>).content as string).trim();
        } else if (typeof data === "string") {
          try {
            const nested = JSON.parse(data);
            if (typeof nested.content === "string" && nested.content.trim()) {
              content = nested.content.trim();
            }
          } catch { /* not nested */ }
          if (!content && data.trim().length > 50) {
            content = data.trim();
          }
        }
      }
    } catch (parseErr) {
      console.error("[playground-blog-generate] Parse failed:", parseErr);
      return new Response(
        JSON.stringify({ error: "Content generation failed. Please try again." }),
        {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!content) {
      return new Response(
        JSON.stringify({ error: "AI returned no content. Please try again." }),
        {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Increment usage AFTER successful generation
    if (existing) {
      await serviceClient
        .from("user_daily_blog_usage")
        .update({ generation_count: existing.generation_count + 1 })
        .eq("id", existing.id);
    } else {
      await serviceClient
        .from("user_daily_blog_usage")
        .insert({ user_id: userId, usage_date: today, generation_count: 1 });
    }

    const remaining = existing
      ? DAILY_LIMIT - existing.generation_count - 1
      : DAILY_LIMIT - 1;

    return new Response(
      JSON.stringify({ content, remaining, limit: DAILY_LIMIT }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("[playground-blog-generate] Unhandled error:", err);
    return new Response(
      JSON.stringify({ error: "An unexpected error occurred. Please try again." }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
