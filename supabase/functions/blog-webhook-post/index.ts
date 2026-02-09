import { corsHeaders } from "../_shared/response.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { webhookUrl, payload } = body;

    // Validate payload
    if (!payload.title || typeof payload.title !== "string" || payload.title.length < 10) {
      return new Response(JSON.stringify({ success: false, error: "Invalid title" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!payload.slug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(payload.slug)) {
      return new Response(JSON.stringify({ success: false, error: "Invalid slug" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!payload.content || typeof payload.content !== "string" || payload.content.split(/\s+/).length < 300) {
      return new Response(JSON.stringify({ success: false, error: "Content must be at least 300 words" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (payload.status !== "draft") {
      return new Response(JSON.stringify({ success: false, error: "Status must be draft" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (payload.featuredImage !== null && payload.featuredImage !== undefined) {
      try {
        new URL(payload.featuredImage);
      } catch {
        return new Response(JSON.stringify({ success: false, error: "Invalid featuredImage URL" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (res.status !== 200 && res.status !== 201) {
      const text = await res.text();
      return new Response(JSON.stringify({ success: false, error: `Webhook returned ${res.status}`, details: text }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const responseText = await res.text();
    return new Response(JSON.stringify({ success: true, webhookStatus: res.status, response: responseText }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
