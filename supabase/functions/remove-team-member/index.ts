import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

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

const removeSchema = z.object({
  memberId: z.string().uuid("Invalid member ID format"),
});

function successResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify({ success: true, data }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function errorResponse(code: string, message: string, status: number, details?: unknown): Response {
  const errorObj: { code: string; message: string; details?: unknown } = { code, message };
  if (details !== undefined) errorObj.details = details;
  return new Response(JSON.stringify({ success: false, error: errorObj }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("=== Remove Team Member Request ===");
    
    // Check authorization
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return errorResponse("UNAUTHORIZED", "Authorization header is required", 401);
    }

    // Authenticate user
    const supabaseAuth = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser(token);

    if (userError || !user) {
      return errorResponse("UNAUTHORIZED", "Invalid or expired authentication token", 401);
    }

    console.log("Request by user:", user.id, user.email);

    // Parse and validate request body
    let body;
    try {
      body = await req.json();
    } catch {
      return errorResponse("BAD_REQUEST", "Invalid JSON in request body", 400);
    }

    const validation = removeSchema.safeParse(body);
    if (!validation.success) {
      const firstError = validation.error.errors[0];
      return errorResponse("VALIDATION_ERROR", firstError?.message || "Validation failed", 422);
    }

    const { memberId } = validation.data;
    console.log("Removing member ID:", memberId);

    // Create admin client
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get the team member details
    const { data: member, error: fetchError } = await supabaseAdmin
      .from("team_members")
      .select("organization_id, email")
      .eq("id", memberId)
      .single();

    if (fetchError) {
      if (fetchError.code === "PGRST116") {
        return errorResponse("NOT_FOUND", "Team member not found", 404);
      }
      console.error("Fetch member error:", fetchError);
      return errorResponse("INTERNAL_ERROR", "Failed to fetch team member", 500);
    }

    console.log("Member found:", member.email);

    // Verify workspace ownership
    const { data: workspace, error: workspaceError } = await supabaseAdmin
      .from("workspaces")
      .select("owner_id")
      .eq("owner_id", user.id)
      .single();

    if (workspaceError || !workspace || workspace.owner_id !== user.id) {
      return errorResponse("FORBIDDEN", "Only workspace owners can remove team members", 403);
    }

    if (member.organization_id !== user.id) {
      return errorResponse("FORBIDDEN", "You can only remove members from your own organization", 403);
    }

    // Find the user ID from auth by email
    const { data: authUsers, error: authSearchError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (authSearchError) {
      console.error("Error searching auth users:", authSearchError);
      return errorResponse("INTERNAL_ERROR", "Failed to find user in auth system", 500);
    }

    const authUser = authUsers.users.find(u => u.email === member.email);
    
    if (!authUser) {
      console.log("User not found in auth, only removing from team_members");
      const { error: deleteError } = await supabaseAdmin
        .from("team_members")
        .delete()
        .eq("id", memberId);

      if (deleteError) {
        console.error("Delete error:", deleteError);
        return errorResponse("INTERNAL_ERROR", "Failed to remove team member", 500);
      }

      return successResponse({ removed: true, authUserDeleted: false });
    }

    const userId = authUser.id;
    console.log("Found auth user ID:", userId);

    // Delete related data
    console.log("Deleting related data...");

    await supabaseAdmin.from("notifications").delete().eq("user_id", userId);
    await supabaseAdmin.from("chat_messages").delete().eq("user_id", userId);
    await supabaseAdmin.from("activity_logs").delete().eq("user_id", userId);
    await supabaseAdmin.from("user_files").delete().eq("user_id", userId);
    await supabaseAdmin.from("tickets").delete().eq("user_id", userId);
    await supabaseAdmin.from("appointments").delete().eq("user_id", userId);
    await supabaseAdmin.from("orders").delete().eq("user_id", userId);
    await supabaseAdmin.from("payments").delete().eq("user_id", userId);
    await supabaseAdmin.from("payment_methods").delete().eq("user_id", userId);
    await supabaseAdmin.from("projects").delete().eq("user_id", userId);

    const { error: deleteTeamError } = await supabaseAdmin
      .from("team_members")
      .delete()
      .eq("id", memberId);

    if (deleteTeamError) {
      console.error("Delete team member error:", deleteTeamError);
      return errorResponse("INTERNAL_ERROR", "Failed to remove team member", 500);
    }

    await supabaseAdmin.from("user_roles").delete().eq("user_id", userId);
    await supabaseAdmin.from("profiles").delete().eq("id", userId);

    const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (deleteAuthError) {
      console.error("Delete auth user error:", deleteAuthError);
      return errorResponse("INTERNAL_ERROR", "Failed to delete user from auth", 500);
    }

    console.log("✓ Team member removed successfully");
    return successResponse({ removed: true, authUserDeleted: true });

  } catch (error) {
    console.error("Unexpected error:", error);
    return errorResponse("INTERNAL_ERROR", "An unexpected error occurred", 500);
  }
});
