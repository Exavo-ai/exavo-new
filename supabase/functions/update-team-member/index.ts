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

    const { memberId, role, status } = await req.json();

    if (!memberId) {
      throw new Error("Member ID is required");
    }

    const updates: any = {};
    if (role) {
      if (!["Admin", "Member", "Viewer"].includes(role)) {
        throw new Error("Invalid role");
      }
      updates.role = role;
    }
    if (status) {
      if (!["active", "pending", "inactive"].includes(status)) {
        throw new Error("Invalid status");
      }
      updates.status = status;
    }

    // Update team member
    const { data: member, error: updateError } = await supabaseClient
      .from("team_members")
      .update(updates)
      .eq("id", memberId)
      .eq("organization_id", user.id)
      .select()
      .single();

    if (updateError) {
      throw new Error(`Failed to update team member: ${updateError.message}`);
    }

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