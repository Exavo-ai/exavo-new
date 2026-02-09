import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { corsHeaders, handleCors } from "../_shared/response.ts";

const MAKE_WEBHOOK_URL = "https://hook.eu1.make.com/sry3zejmtwptrwe9t6ilu7vughlgs1vt";

serve(async (req) => {
  try {
    const corsResponse = handleCors(req);
    if (corsResponse) return corsResponse;

    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "Method not allowed" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let title: string;
    try {
      const body = await req.json();
      title = body?.title;
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid request body" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!title || typeof title !== "string" || !title.trim()) {
      return new Response(
        JSON.stringify({ error: "Title is required" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[ai-generate-blog] Generating content for: "${title.trim()}"`);

    let webhookRes: Response;
    try {
      webhookRes = await fetch(MAKE_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim() }),
      });
    } catch (fetchErr) {
      console.error("[ai-generate-blog] Webhook fetch failed:", fetchErr);
      return new Response(
        JSON.stringify({ error: "AI generation service is temporarily unavailable. Please try again later." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!webhookRes.ok) {
      console.error(`[ai-generate-blog] Webhook returned status ${webhookRes.status}`);
      return new Response(
        JSON.stringify({ error: "AI generation service is temporarily unavailable. Please try again later." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let data: any;
    try {
      const text = await webhookRes.text();
      data = JSON.parse(text);
    } catch {
      console.error("[ai-generate-blog] Webhook returned non-JSON response");
      return new Response(
        JSON.stringify({ error: "AI generation service returned an unexpected response. Please try again later." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const content = data?.content;
    if (!content || typeof content !== "string") {
      console.error("[ai-generate-blog] No content field in webhook response");
      return new Response(
        JSON.stringify({ error: "AI generation service returned no content. Please try again later." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ content }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[ai-generate-blog] Unhandled error:", err);
    return new Response(
      JSON.stringify({ error: "An unexpected error occurred. Please try again later." }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
