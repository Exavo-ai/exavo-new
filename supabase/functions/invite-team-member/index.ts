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
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);

    if (userError || !user) {
      throw new Error("Unauthorized");
    }

    const { email, role } = await req.json();

    if (!email || !role) {
      throw new Error("Email and role are required");
    }

    // Validate role
    if (!["Admin", "Member", "Viewer"].includes(role)) {
      throw new Error("Invalid role");
    }

    // Check if member already exists
    const { data: existing } = await supabaseClient
      .from("team_members")
      .select("id")
      .eq("organization_id", user.id)
      .eq("email", email)
      .single();

    if (existing) {
      throw new Error("Team member with this email already exists");
    }

    // Create team member
    const { data: member, error: insertError } = await supabaseClient
      .from("team_members")
      .insert({
        organization_id: user.id,
        email,
        role,
        status: "pending",
        invited_by: user.id,
      })
      .select()
      .single();

    if (insertError) {
      throw new Error(`Failed to create team member: ${insertError.message}`);
    }

    // TODO: Send invitation email (integrate with send-welcome-email or create new function)
    console.log(`Team member invited: ${email} with role ${role}`);

    return new Response(JSON.stringify({ success: true, member }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});