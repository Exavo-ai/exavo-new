import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "X-Frame-Options": "DENY",
  "X-Content-Type-Options": "nosniff",
  "X-XSS-Protection": "1; mode=block",
  "Referrer-Policy": "no-referrer-when-downgrade",
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload",
  "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
  "Pragma": "no-cache",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create client for auth verification
    const supabaseAuth = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser(token);

    if (userError || !user) {
      console.error("Auth error:", userError);
      throw new Error("Unauthorized");
    }

    // Create client with service role for database operations (bypasses RLS)
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { memberId, role, status } = await req.json();

    if (!memberId) {
      throw new Error("Member ID is required");
    }

    console.log(`Updating team member ${memberId} by user ${user.id}`);

    // Verify the member belongs to the user's organization before updating
    const { data: member, error: fetchError } = await supabaseClient
      .from("team_members")
      .select("organization_id, email, role, status")
      .eq("id", memberId)
      .single();

    if (fetchError || !member) {
      console.error("Fetch error:", fetchError);
      throw new Error("Team member not found");
    }

    if (member.organization_id !== user.id) {
      console.error(`Unauthorized: Member belongs to ${member.organization_id}, user is ${user.id}`);
      throw new Error("Unauthorized: You can only update members from your own organization");
    }

    const updates: any = {};
    if (role) {
      if (!["Admin", "Member", "Viewer"].includes(role)) {
        throw new Error("Invalid role. Must be Admin, Member, or Viewer");
      }
      updates.role = role;
    }
    if (status) {
      if (!["active", "pending", "inactive"].includes(status)) {
        throw new Error("Invalid status. Must be active, pending, or inactive");
      }
      updates.status = status;
    }

    if (Object.keys(updates).length === 0) {
      throw new Error("No updates provided");
    }

    // Update team member
    const { data: updatedMember, error: updateError } = await supabaseClient
      .from("team_members")
      .update(updates)
      .eq("id", memberId)
      .select()
      .single();

    if (updateError) {
      console.error("Update error:", updateError);
      throw new Error(`Failed to update team member: ${updateError.message}`);
    }

    console.log(`Team member ${memberId} updated successfully by user ${user.id}`);

    return new Response(JSON.stringify({ success: true, member: updatedMember }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in update-team-member:", errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});