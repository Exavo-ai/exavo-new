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
    const { token, fullName, password, createAccount } = await req.json();

    if (!token) {
      console.log("[ACCEPT-INVITE] No token provided");
      return new Response(
        JSON.stringify({ success: false, error: "Token is required" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    console.log("[ACCEPT-INVITE] Accepting invitation with token:", token);

    // Create service role client to bypass RLS
    const supabaseServiceClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // First, validate that the token is still valid
    const { data: member, error: fetchError } = await supabaseServiceClient
      .from("team_members")
      .select("id, email, status, token_expires_at, role, organization_id")
      .eq("invite_token", token)
      .maybeSingle();

    console.log("[ACCEPT-INVITE] Member lookup result:", {
      found: !!member,
      status: member?.status,
      email: member?.email,
      error: fetchError?.message,
    });

    if (fetchError) {
      console.error("[ACCEPT-INVITE] Database error:", fetchError);
      return new Response(
        JSON.stringify({ success: false, error: "Database error", details: fetchError.message }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    if (!member) {
      console.log("[ACCEPT-INVITE] No invitation found for token");
      return new Response(
        JSON.stringify({ success: false, error: "Invalid invitation token" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Check if already activated
    if (member.status === "active") {
      console.log("[ACCEPT-INVITE] Already activated, returning success");
      // Return success since the invitation is already accepted (idempotent)
      return new Response(
        JSON.stringify({ success: true, message: "This invitation has already been accepted" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Check if expired
    if (member.token_expires_at && new Date(member.token_expires_at) < new Date()) {
      console.log("[ACCEPT-INVITE] Token expired");
      return new Response(
        JSON.stringify({ success: false, error: "This invitation has expired" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // If createAccount flag is set, create the user account
    if (createAccount && password) {
      console.log("[ACCEPT-INVITE] Creating user account with email confirmed");
      
      const supabaseAdmin = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false
          }
        }
      );

      // Create user with email already confirmed
      const { data: userData, error: userError } = await supabaseAdmin.auth.admin.createUser({
        email: member.email,
        password: password,
        email_confirm: true, // Skip email verification
        user_metadata: {
          full_name: fullName || "",
        },
      });

      if (userError) {
        console.error("[ACCEPT-INVITE] User creation error:", userError);
        return new Response(
          JSON.stringify({ success: false, error: `Failed to create account: ${userError.message}` }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
        );
      }

      console.log("[ACCEPT-INVITE] ✓ User account created:", userData.user?.id);
    }

    // Update team member to active
    const updateData: any = {
      status: "active",
      activated_at: new Date().toISOString(),
      invite_token: null,
    };

    if (fullName) {
      updateData.full_name = fullName;
    }

    console.log("[ACCEPT-INVITE] Updating team member to active:", member.id);

    const { error: updateError } = await supabaseServiceClient
      .from("team_members")
      .update(updateData)
      .eq("id", member.id);

    if (updateError) {
      console.error("[ACCEPT-INVITE] Update error:", updateError);
      return new Response(
        JSON.stringify({ success: false, error: "Failed to activate invitation", details: updateError.message }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    console.log("[ACCEPT-INVITE] ✓ Invitation activated successfully for:", member.email);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Invitation accepted successfully",
        data: {
          email: member.email,
          role: member.role,
          organization_id: member.organization_id,
        }
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    console.error("[ACCEPT-INVITE] Error:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown error" 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
