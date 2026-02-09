import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { corsHeaders, handleCors } from "../_shared/response.ts";

const MAKE_WEBHOOK_URL = "https://hook.eu1.make.com/sry3zejmtwptrwe9t6ilu7vughlgs1vt";

serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const { title } = await req.json();

    if (!title || typeof title !== "string" || !title.trim()) {
      return new Response(JSON.stringify({ error: "Title is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[ai-generate-blog] Generating content for: "${title.trim()}"`);

    const webhookRes = await fetch(MAKE_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: title.trim() }),
    });

    if (!webhookRes.ok) {
      console.error(`[ai-generate-blog] Webhook error: ${webhookRes.status}`);
      return new Response(
        JSON.stringify({ error: `Content generation failed (${webhookRes.status})` }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await webhookRes.json();
    const content = data?.content;

    if (!content || typeof content !== "string") {
      console.error("[ai-generate-blog] No content in webhook response");
      return new Response(
        JSON.stringify({ error: "No content returned from generation service" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ content }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[ai-generate-blog] Error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
