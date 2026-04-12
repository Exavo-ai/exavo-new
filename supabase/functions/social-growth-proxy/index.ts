import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const FLOWISE_URL =
  "https://cloud.flowiseai.com/api/v1/prediction/0f65f3df-3bf6-4e69-a20a-bc97ade11d0d";

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

    console.log("Calling Flowise API...");
    console.log("Question:", input.trim());

    const flowiseRes = await fetch(FLOWISE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question: input.trim() }),
    });

    const rawText = await flowiseRes.text();
    console.log("Flowise status:", flowiseRes.status);
    console.log("Flowise response:", rawText?.substring(0, 500));

    if (!flowiseRes.ok) {
      console.error("Flowise error:", rawText);
      return new Response(
        JSON.stringify({ error: "AI service unavailable" }),
        {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    let aiText = rawText;
    try {
      const json = JSON.parse(rawText);
      aiText = json.text || json.output || json.response || json.message || rawText;
    } catch {
      // plain text response — use as-is
    }

    return new Response(aiText, {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "text/plain" },
    });
  } catch (err) {
    console.error("Social growth proxy error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
