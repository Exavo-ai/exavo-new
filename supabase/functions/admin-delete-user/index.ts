import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.1";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("=== Admin Delete User Request ===");
    
    // Get JWT from authorization header
    const authHeader = req.headers.get("Authorization") || req.headers.get("authorization");
    
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Extract JWT token and decode to get user ID
    const token = authHeader.replace("Bearer ", "");
    const payload = JSON.parse(atob(token.split('.')[1]));
    const currentUserId = payload.sub;
    
    if (!currentUserId) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log("Admin user ID:", currentUserId);

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    // Verify admin role
    const { data: isAdmin } = await supabaseClient.rpc('has_role', {
      _user_id: currentUserId,
      _role: 'admin'
    });

    if (!isAdmin) {
      console.error("User is not admin");
      return new Response(JSON.stringify({ error: 'Forbidden: Admin access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate input
    const deleteUserSchema = z.object({
      userId: z.string().uuid('Invalid user ID format')
    });

    let validated;
    try {
      const input = await req.json();
      validated = deleteUserSchema.parse(input);
    } catch (error: any) {
      return new Response(JSON.stringify({ error: error.errors?.[0]?.message || 'Invalid input data' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { userId } = validated;
    console.log("Deleting user ID:", userId);

    // Prevent admin from deleting themselves
    if (userId === currentUserId) {
      return new Response(JSON.stringify({ error: 'Cannot delete your own account' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Use service role for deletion
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Delete related data first (order matters for foreign keys)
    console.log("Deleting related data...");

    // Delete team members where user is a member
    await supabaseAdmin.from("team_members").delete().eq("email", (await supabaseAdmin.from("profiles").select("email").eq("id", userId).single()).data?.email || "");
    console.log("- Deleted team member records");

    // Delete team members where user is the organization owner
    await supabaseAdmin.from("team_members").delete().eq("organization_id", userId);
    console.log("- Deleted organization team members");

    // Delete workspace if user owns one
    await supabaseAdmin.from("workspaces").delete().eq("owner_id", userId);
    console.log("- Deleted workspace");

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

    // Delete user roles
    await supabaseAdmin.from("user_roles").delete().eq("user_id", userId);
    console.log("- Deleted user roles");

    // Delete profile
    await supabaseAdmin.from("profiles").delete().eq("id", userId);
    console.log("- Deleted profile");

    // Finally, delete from Auth (this cascades to any remaining references)
    const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (deleteAuthError) {
      console.error("Delete auth user error:", deleteAuthError);
      throw new Error(`Failed to delete user from auth: ${deleteAuthError.message}`);
    }

    console.log("✓ User completely deleted from auth system");
    console.log("✓ Admin user deletion completed successfully");

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('ERROR in admin-delete-user:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
