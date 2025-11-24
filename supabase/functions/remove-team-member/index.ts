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
    console.log("=== Remove Team Member Request ===");
    
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

    console.log("Request by user:", user.id, user.email);

    // Create admin client with service role
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { memberId } = await req.json();

    if (!memberId) {
      throw new Error("Member ID is required");
    }

    console.log("Removing member ID:", memberId);

    // Get the team member details
    const { data: member, error: fetchError } = await supabaseAdmin
      .from("team_members")
      .select("organization_id, email")
      .eq("id", memberId)
      .single();

    if (fetchError || !member) {
      console.error("Fetch member error:", fetchError);
      throw new Error("Team member not found");
    }

    console.log("Member found:", member.email, "org:", member.organization_id);

    // Verify workspace ownership - only workspace owner can delete team members
    const { data: workspace, error: workspaceError } = await supabaseAdmin
      .from("workspaces")
      .select("owner_id")
      .eq("owner_id", user.id)
      .single();

    if (workspaceError || !workspace || workspace.owner_id !== user.id) {
      console.error("Not workspace owner");
      throw new Error("Unauthorized: Only workspace owners can remove team members");
    }

    if (member.organization_id !== user.id) {
      console.error("Member not in user's organization");
      throw new Error("Unauthorized: You can only remove members from your own organization");
    }

    // Find the user ID from auth by email
    const { data: authUsers, error: authSearchError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (authSearchError) {
      console.error("Error searching auth users:", authSearchError);
      throw new Error("Failed to find user in auth system");
    }

    const authUser = authUsers.users.find(u => u.email === member.email);
    
    if (!authUser) {
      console.log("User not found in auth, only removing from team_members");
      // Just remove from team_members if auth user doesn't exist
      const { error: deleteError } = await supabaseAdmin
        .from("team_members")
        .delete()
        .eq("id", memberId);

      if (deleteError) {
        console.error("Delete error:", deleteError);
        throw new Error(`Failed to remove team member: ${deleteError.message}`);
      }

      console.log("Team member removed (auth user not found)");
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const userId = authUser.id;
    console.log("Found auth user ID:", userId);

    // Delete related data first (order matters for foreign keys)
    console.log("Deleting related data...");

    // Delete notifications
    await supabaseAdmin.from("notifications").delete().eq("user_id", userId);
    console.log("- Deleted notifications");

    // Delete chat messages
    await supabaseAdmin.from("chat_messages").delete().eq("user_id", userId);
    console.log("- Deleted chat messages");

    // Delete activity logs
    await supabaseAdmin.from("activity_logs").delete().eq("user_id", userId);
    console.log("- Deleted activity logs");

    // Delete user files
    await supabaseAdmin.from("user_files").delete().eq("user_id", userId);
    console.log("- Deleted user files");

    // Delete tickets
    await supabaseAdmin.from("tickets").delete().eq("user_id", userId);
    console.log("- Deleted tickets");

    // Delete appointments
    await supabaseAdmin.from("appointments").delete().eq("user_id", userId);
    console.log("- Deleted appointments");

    // Delete orders
    await supabaseAdmin.from("orders").delete().eq("user_id", userId);
    console.log("- Deleted orders");

    // Delete payments
    await supabaseAdmin.from("payments").delete().eq("user_id", userId);
    console.log("- Deleted payments");

    // Delete payment methods
    await supabaseAdmin.from("payment_methods").delete().eq("user_id", userId);
    console.log("- Deleted payment methods");

    // Delete projects
    await supabaseAdmin.from("projects").delete().eq("user_id", userId);
    console.log("- Deleted projects");

    // Delete team member record
    const { error: deleteTeamError } = await supabaseAdmin
      .from("team_members")
      .delete()
      .eq("id", memberId);

    if (deleteTeamError) {
      console.error("Delete team member error:", deleteTeamError);
      throw new Error(`Failed to remove team member: ${deleteTeamError.message}`);
    }
    console.log("- Deleted team member record");

    // Delete user roles
    await supabaseAdmin.from("user_roles").delete().eq("user_id", userId);
    console.log("- Deleted user roles");

    // Delete profile
    await supabaseAdmin.from("profiles").delete().eq("id", userId);
    console.log("- Deleted profile");

    // Finally, delete from Auth (this cascades to remaining tables)
    const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (deleteAuthError) {
      console.error("Delete auth user error:", deleteAuthError);
      throw new Error(`Failed to delete user from auth: ${deleteAuthError.message}`);
    }

    console.log("✓ User completely deleted from auth system");
    console.log("✓ Team member removed successfully");

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("ERROR in remove-team-member:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
