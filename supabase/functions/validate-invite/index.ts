import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { token } = await req.json();

    if (!token) {
      console.log("[VALIDATE-INVITE] No token provided in request");
      return new Response(
        JSON.stringify({ valid: false, error: "Token is required" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    console.log("[VALIDATE-INVITE] Validating token:", token);

    // Create service role client to bypass RLS
    const supabaseServiceClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Look up the invitation by token
    const { data: member, error: fetchError } = await supabaseServiceClient
      .from("team_members")
      .select("id, email, role, organization_id, status, token_expires_at, invite_token")
      .eq("invite_token", token)
      .maybeSingle();

    console.log("[VALIDATE-INVITE] Database query result:", {
      found: !!member,
      error: fetchError?.message,
      status: member?.status,
      expires: member?.token_expires_at,
    });

    if (fetchError) {
      console.error("[VALIDATE-INVITE] Database error:", fetchError);
      return new Response(
        JSON.stringify({ valid: false, error: "Database error", details: fetchError.message }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    if (!member) {
      console.log("[VALIDATE-INVITE] No invitation found for token");
      return new Response(
        JSON.stringify({ valid: false, error: "Invalid or expired invitation link." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Check if token is expired
    if (member.token_expires_at && new Date(member.token_expires_at) < new Date()) {
      console.log("[VALIDATE-INVITE] Token expired:", member.token_expires_at);
      return new Response(
        JSON.stringify({ valid: false, error: "This invitation link has expired. Please request a new invitation." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Check if already activated
    if (member.status === "active") {
      console.log("[VALIDATE-INVITE] Already activated");
      return new Response(
        JSON.stringify({ valid: false, error: "This invitation has already been accepted." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Check if status is pending
    if (member.status !== "pending") {
      console.log("[VALIDATE-INVITE] Invalid status:", member.status);
      return new Response(
        JSON.stringify({ valid: false, error: "This invitation is no longer valid." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    console.log("[VALIDATE-INVITE] ✓ Valid invitation for:", member.email);
    
    // Return valid invitation data
    return new Response(
      JSON.stringify({
        valid: true,
        data: {
          id: member.id,
          email: member.email,
          role: member.role,
          organization_id: member.organization_id,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    console.error("[VALIDATE-INVITE] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
