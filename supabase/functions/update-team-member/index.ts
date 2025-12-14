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

// Validation schema
const updateMemberSchema = z.object({
  memberId: z.string().uuid("Invalid member ID format"),
  role: z.enum(["Admin", "Member", "Viewer"], {
    errorMap: () => ({ message: "Role must be Admin, Member, or Viewer" }),
  }).optional(),
  status: z.enum(["active", "pending", "inactive"], {
    errorMap: () => ({ message: "Status must be active, pending, or inactive" }),
  }).optional(),
}).refine(data => data.role !== undefined || data.status !== undefined, {
  message: "At least one of role or status must be provided",
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

    // Parse and validate request body
    let body;
    try {
      body = await req.json();
    } catch {
      return errorResponse("BAD_REQUEST", "Invalid JSON in request body", 400);
    }

    const validation = updateMemberSchema.safeParse(body);
    if (!validation.success) {
      const firstError = validation.error.errors[0];
      return errorResponse("VALIDATION_ERROR", firstError?.message || "Validation failed", 422,
        validation.error.errors.map(e => ({ field: e.path.join("."), message: e.message }))
      );
    }

    const { memberId, role, status } = validation.data;

    // Create service client
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Verify the member exists and belongs to user's organization
    const { data: member, error: fetchError } = await supabaseClient
      .from("team_members")
      .select("organization_id, email, role, status")
      .eq("id", memberId)
      .single();

    if (fetchError) {
      if (fetchError.code === "PGRST116") {
        return errorResponse("NOT_FOUND", "Team member not found", 404);
      }
      console.error("Fetch error:", fetchError);
      return errorResponse("INTERNAL_ERROR", "Failed to fetch team member", 500);
    }

    if (member.organization_id !== user.id) {
      return errorResponse("FORBIDDEN", "You can only update members from your own organization", 403);
    }

    // Build updates
    const updates: Record<string, string> = {};
    if (role) updates.role = role;
    if (status) updates.status = status;

    // Update team member
    const { data: updatedMember, error: updateError } = await supabaseClient
      .from("team_members")
      .update(updates)
      .eq("id", memberId)
      .select()
      .single();

    if (updateError) {
      console.error("Update error:", updateError);
      return errorResponse("INTERNAL_ERROR", "Failed to update team member", 500);
    }

    console.log(`Team member ${memberId} updated by ${user.id}`);
    return successResponse({ member: updatedMember });

  } catch (error) {
    console.error("Unexpected error:", error);
    return errorResponse("INTERNAL_ERROR", "An unexpected error occurred", 500);
  }
});
