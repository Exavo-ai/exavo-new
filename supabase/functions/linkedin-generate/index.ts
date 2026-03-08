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

    // Use Lovable AI Gateway with multi-agent prompt
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI service not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const systemPrompt = `You are a LinkedIn post generation system that simulates a multi-agent workflow. For the given topic, execute these three steps internally and return ONLY the final polished LinkedIn post:

STEP 1 - Writer Agent: Draft a LinkedIn post about the topic. Use a professional but engaging tone. Include relevant insights, a hook opening, and a call-to-action.

STEP 2 - Improvement Agent: Take the draft and improve clarity, engagement, and flow. Add relevant emojis sparingly. Ensure the post follows LinkedIn best practices (short paragraphs, line breaks for readability, hashtags at the end).

STEP 3 - Reviewer Agent: Do a final review. Polish the language, ensure professional tone, verify the post is between 150-300 words, and make final improvements.

Return ONLY the final polished LinkedIn post text. No explanations, no step labels, no meta-commentary. Just the ready-to-post LinkedIn content.`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Generate a LinkedIn post about: ${topic.trim()}` },
        ],
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "AI service is busy. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "AI service quota exceeded. Please try again later." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errText);
      return new Response(JSON.stringify({ error: "Generation failed. Please try again." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiResult = await aiResponse.json();
    const content = aiResult.choices?.[0]?.message?.content;

    if (!content) {
      return new Response(JSON.stringify({ error: "No content generated. Please try again." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Increment usage only after success
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    if (usage) {
      await serviceClient
        .from("user_daily_linkedin_usage")
        .update({ generation_count: currentCount + 1, updated_at: new Date().toISOString() })
        .eq("id", usage.id);
    } else {
      await serviceClient
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
