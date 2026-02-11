import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { corsHeaders, handleCors } from "../_shared/response.ts";

const MAKE_WEBHOOK_URL = "https://hook.eu1.make.com/jbt8dq78argmvlpe3gj3kojgb34v83wp";

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

    let content: string | undefined;
    try {
      const rawText = await webhookRes.text();
      console.log("[ai-generate-blog] Raw webhook response (first 500 chars):", rawText.substring(0, 500));

      // Try parsing as JSON first
      let data: any;
      try {
        data = JSON.parse(rawText);
      } catch {
        // Not valid JSON — maybe it's the content itself as plain text
        if (rawText && rawText.trim().length > 50) {
          console.log("[ai-generate-blog] Response is plain text, using as content directly");
          content = rawText.trim();
        }
      }

      if (!content && data) {
        // Handle: { "content": "..." }
        if (typeof data.content === "string" && data.content.trim()) {
          content = data.content.trim();
        }
        // Handle: stringified JSON inside a string, e.g. "{\"content\":\"...\"}"
        else if (typeof data === "string") {
          try {
            const nested = JSON.parse(data);
            if (typeof nested.content === "string" && nested.content.trim()) {
              content = nested.content.trim();
            }
          } catch { /* not nested JSON */ }
          // If it's just a plain string with enough length, use it
          if (!content && data.trim().length > 50) {
            content = data.trim();
          }
        }
      }
    } catch (parseErr) {
      console.error("[ai-generate-blog] Failed to read webhook response:", parseErr);
      return new Response(
        JSON.stringify({ error: "AI generation service returned an unexpected response. Please try again later." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!content) {
      console.error("[ai-generate-blog] No usable content extracted from webhook response");
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
