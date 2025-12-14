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

const validateSchema = z.object({
  token: z.string().min(1, "Token is required").uuid("Invalid token format"),
  checkUserExists: z.boolean().optional().default(false),
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
    // Parse and validate request body
    let body;
    try {
      body = await req.json();
    } catch {
      return errorResponse("BAD_REQUEST", "Invalid JSON in request body", 400);
    }

    const validation = validateSchema.safeParse(body);
    if (!validation.success) {
      const firstError = validation.error.errors[0];
      return errorResponse("VALIDATION_ERROR", firstError?.message || "Validation failed", 422);
    }

    const { token, checkUserExists } = validation.data;
    console.log("[VALIDATE-INVITE] Validating token:", token.substring(0, 8) + "...");

    // Create service role client
    const supabaseServiceClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Look up the invitation
    const { data: member, error: fetchError } = await supabaseServiceClient
      .from("team_members")
      .select("id, email, role, organization_id, status, token_expires_at, invite_token")
      .eq("invite_token", token)
      .maybeSingle();

    if (fetchError) {
      console.error("[VALIDATE-INVITE] Database error:", fetchError);
      return errorResponse("INTERNAL_ERROR", "Database error", 500);
    }

    if (!member) {
      return errorResponse("NOT_FOUND", "Invalid or expired invitation link", 404);
    }

    // Check if expired
    if (member.token_expires_at && new Date(member.token_expires_at) < new Date()) {
      return errorResponse("GONE", "This invitation link has expired. Please request a new invitation.", 410);
    }

    // Check if already activated
    if (member.status === "active") {
      return errorResponse("CONFLICT", "This invitation has already been accepted", 409);
    }

    // Check if pending
    if (member.status !== "pending") {
      return errorResponse("GONE", "This invitation is no longer valid", 410);
    }

    console.log("[VALIDATE-INVITE] ✓ Valid invitation for:", member.email);
    
    // Check if user exists
    let userExists = false;
    if (checkUserExists) {
      const { data: users } = await supabaseServiceClient.auth.admin.listUsers();
      userExists = users?.users?.some((u: { email?: string }) => u.email === member.email) || false;
      console.log("[VALIDATE-INVITE] User exists:", userExists);
    }
    
    return successResponse({
      valid: true,
      userExists,
      invitation: {
        id: member.id,
        email: member.email,
        role: member.role,
        organization_id: member.organization_id,
      },
    });

  } catch (error) {
    console.error("[VALIDATE-INVITE] Unexpected error:", error);
    return errorResponse("INTERNAL_ERROR", "An unexpected error occurred", 500);
  }
});
