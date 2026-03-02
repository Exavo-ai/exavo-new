import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { generateBlogContent } from "../_shared/blog-webhook.ts";

const DAILY_LIMIT = 3;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    console.log("[playground-blog-generate] Request received");

    // Auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      console.log("[playground-blog-generate] No auth header");
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sbUrl = Deno.env.get("SUPABASE_URL");
    const sbAnon = Deno.env.get("SUPABASE_ANON_KEY");
    const sbService = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    console.log("[playground-blog-generate] Env vars present:", {
      sbUrl: !!sbUrl,
      sbAnon: !!sbAnon,
      sbService: !!sbService,
    });

    if (!sbUrl || !sbAnon || !sbService) {
      console.error("[playground-blog-generate] Missing env vars");
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userClient = createClient(sbUrl, sbAnon, {
      global: { headers: { Authorization: authHeader } },
    });
    const serviceClient = createClient(sbUrl, sbService);

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: authErr } = await userClient.auth.getUser(token);
    if (authErr || !userData.user) {
      console.log("[playground-blog-generate] Auth failed:", authErr?.message);
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userData.user.id;
    console.log("[playground-blog-generate] Authenticated user:", userId);

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

    // Rate limit check
    const today = new Date().toISOString().split("T")[0];

    const { data: existing, error: usageErr } = await serviceClient
      .from("user_daily_blog_usage")
      .select("id, generation_count")
      .eq("user_id", userId)
      .eq("usage_date", today)
      .maybeSingle();

    console.log("[playground-blog-generate] Usage check:", { existing, usageErr: usageErr?.message });

    if (existing && existing.generation_count >= DAILY_LIMIT) {
      return new Response(
        JSON.stringify({ error: "Daily limit reached", remaining: 0, limit: DAILY_LIMIT }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate content using shared webhook module
    console.log(`[playground-blog-generate] Calling webhook for: "${sanitizedTitle}"`);
    const result = await generateBlogContent(sanitizedTitle);

    if ("error" in result) {
      console.error("[playground-blog-generate] Webhook failed:", result.error);
      return new Response(
        JSON.stringify({ error: "Content generation failed. Please try again." }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[playground-blog-generate] Webhook success, content length:", result.content.length);

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
      JSON.stringify({ content: result.content, remaining, limit: DAILY_LIMIT }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[playground-blog-generate] Unhandled error:", err);
    return new Response(
      JSON.stringify({ error: "An unexpected error occurred. Please try again." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
