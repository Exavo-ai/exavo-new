import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const WEBHOOK_URL = "https://hook.eu1.make.com/1vt6i76tin9t20d18hrz9xkri9ixwqqb";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { message } = await req.json();

    if (!message || typeof message !== "string" || message.trim().length === 0) {
      return new Response(JSON.stringify({ error: "Message is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Proxying to Make.com webhook, message:", message);

    const webhookRes = await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: message.trim() }),
    });

    console.log("Webhook response status:", webhookRes.status);

    const text = await webhookRes.text();
    console.log("Webhook response body:", text);

    if (!webhookRes.ok) {
      return new Response(JSON.stringify({ error: "Webhook returned an error", status: webhookRes.status }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Try to parse as JSON and extract reply
    let reply = text;
    try {
      const json = JSON.parse(text);
      reply = json.reply || json.response || json.message || json.output || text;
    } catch {
      // plain text response, use as-is
    }

    return new Response(JSON.stringify({ reply }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Brain proxy error:", error);
    return new Response(JSON.stringify({ error: "Something went wrong, please try again." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
