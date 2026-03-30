import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const N8N_WEBHOOK_URLS = [
  "https://n8n.exavo.app/webhook-test/245c2879-4f14-402f-93be-5dd8a61e2318",
  "https://n8n.exavo.app/webhook/245c2879-4f14-402f-93be-5dd8a61e2318",
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate auth
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse and validate input
    const body = await req.json();
    const input = body?.input;
    if (!input || typeof input !== "string" || input.trim().length === 0) {
      return new Response(JSON.stringify({ error: "Input is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Forward to n8n (try test webhook first, then production)
    let aiResponse = "";
    let hasSuccessfulResponse = false;

    for (const webhook of N8N_WEBHOOK_URLS) {
      const url = `${webhook}?input=${encodeURIComponent(input.trim())}`;
      console.log("Webhook URL:", url);

      // n8n webhook is configured for GET, not POST
      const n8nRes = await fetch(url, {
        method: "GET",
      });

      if (!n8nRes.ok) {
        console.error(`n8n responded with: ${n8nRes.status} for ${webhook}`);
        continue;
      }

      const rawText = await n8nRes.text();
      console.log("n8n raw response:", rawText?.substring(0, 500));

      if (!rawText || rawText.trim().length === 0) {
        console.error(`n8n returned empty response for ${webhook}`);
        continue;
      }

      // n8n returns "First Entry JSON" — extract text content
      try {
        const json = JSON.parse(rawText);
        // Try common n8n output field names
        aiResponse = json.output || json.text || json.response || json.message || json.result || JSON.stringify(json);
      } catch {
        // If not JSON, use raw text
        aiResponse = rawText;
      }

      hasSuccessfulResponse = true;
      break;
    }

    if (!hasSuccessfulResponse) {
      return new Response(
        JSON.stringify({ error: "AI service unavailable" }),
        {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(aiResponse, {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "text/plain" },
    });
  } catch (err) {
    console.error("Revenue architect proxy error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
