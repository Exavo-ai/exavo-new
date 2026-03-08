import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const DAILY_LIMIT = 3;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { topic } = await req.json();
    if (!topic || typeof topic !== "string" || !topic.trim()) {
      return new Response(JSON.stringify({ error: "Topic is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check daily usage
    const today = new Date().toISOString().split("T")[0];
    const { data: usage } = await supabase
      .from("user_daily_linkedin_usage")
      .select("id, generation_count")
      .eq("user_id", user.id)
      .eq("usage_date", today)
      .maybeSingle();

    const currentCount = usage?.generation_count ?? 0;
    if (currentCount >= DAILY_LIMIT) {
      return new Response(
        JSON.stringify({ error: "You have reached your daily generation limit.", remaining: 0 }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Call external API
    const apiResponse = await fetch("https://agentic-content-engine.vercel.app/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topic: topic.trim() }),
    });

    if (!apiResponse.ok) {
      const errText = await apiResponse.text();
      console.error("External API error:", apiResponse.status, errText);
      return new Response(JSON.stringify({ error: "Generation failed. Please try again." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = await apiResponse.json();
    const content = result.post || result.content || result.output || result.result || JSON.stringify(result, null, 2);

    // Increment usage only after success
    if (usage) {
      await supabase
        .from("user_daily_linkedin_usage")
        .update({ generation_count: currentCount + 1, updated_at: new Date().toISOString() })
        .eq("id", usage.id);
    } else {
      await supabase
        .from("user_daily_linkedin_usage")
        .insert({ user_id: user.id, usage_date: today, generation_count: 1 });
    }

    const remaining = DAILY_LIMIT - (currentCount + 1);

    return new Response(
      JSON.stringify({ content, remaining }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("linkedin-generate error:", e);
    return new Response(JSON.stringify({ error: "Generation failed. Please try again." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
