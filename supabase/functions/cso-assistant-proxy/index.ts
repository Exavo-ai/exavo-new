import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const TEST_WEBHOOK =
  "https://n8n.exavo.app/webhook-test/1748c4f4-677d-42b1-9ae0-275028a1aa29";
const PROD_WEBHOOK =
  "https://n8n.exavo.app/webhook/1748c4f4-677d-42b1-9ae0-275028a1aa29";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const input = body?.input;
    if (!input || typeof input !== "string" || input.trim().length === 0) {
      return new Response(JSON.stringify({ error: "Input is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const trimmedInput = input.trim();
    let aiResponse = "";

    // Try test webhook first
    for (const [label, webhook] of [
      ["test", TEST_WEBHOOK],
      ["production", PROD_WEBHOOK],
    ] as const) {
      try {
        console.log(`Trying ${label} webhook...`);
        const url = `${webhook}?input=${encodeURIComponent(trimmedInput)}`;
        const res = await fetch(url, { method: "GET" });

        if (!res.ok) {
          console.error(`${label} webhook responded with: ${res.status}`);
          continue;
        }

        const rawText = await res.text();
        console.log(`${label} raw response:`, rawText?.substring(0, 500));

        if (!rawText || rawText.trim().length === 0) {
          console.error(`${label} webhook returned empty response`);
          continue;
        }

        try {
          const json = JSON.parse(rawText);
          aiResponse =
            json.output ||
            json.text ||
            json.response ||
            json.message ||
            json.result ||
            JSON.stringify(json);
        } catch {
          aiResponse = rawText;
        }

        if (aiResponse.trim().length > 0) {
          console.log(`Fallback to ${label} webhook... success`);
          break;
        }
      } catch (e) {
        console.error(`${label} webhook error:`, e);
        continue;
      }
    }

    if (!aiResponse || aiResponse.trim().length === 0) {
      return new Response(
        JSON.stringify({
          error: "Sales assistant is temporarily unavailable. Please try again.",
        }),
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
    console.error("CSO assistant proxy error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
