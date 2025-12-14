import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { corsHeaders, successResponse, errors, handleCors } from "../_shared/response.ts";
import { z, validateBody, formatZodError } from "../_shared/validation.ts";
import { checkRateLimit, createRateLimitKey, RateLimitPresets } from "../_shared/rate-limit.ts";

// Request validation schema
const acceptInviteSchema = z.object({
  token: z.string().min(1, "Token is required").max(500, "Token too long"),
  fullName: z.string().trim().max(100, "Name must be less than 100 characters").optional(),
  password: z.string().optional(),
  createAccount: z.boolean().optional(),
}).refine(
  (data) => !data.createAccount || (data.createAccount && data.password),
  { message: "Password is required when creating account", path: ["password"] }
);

// Password validation matching frontend registerSchema requirements
function validatePassword(password: string): { valid: boolean; error?: string } {
  if (!password || password.length < 8) {
    return { valid: false, error: "Password must be at least 8 characters long" };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, error: "Password must contain at least one uppercase letter" };
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, error: "Password must contain at least one lowercase letter" };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, error: "Password must contain at least one number" };
  }
  return { valid: true };
}

serve(async (req) => {
  // Handle CORS
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  // Only allow POST
  if (req.method !== "POST") {
    console.log("[ACCEPT-INVITE] Invalid method:", req.method);
    return errors.badRequest(`Method ${req.method} not allowed. Use POST.`);
  }

  try {
    // Validate request body
    const { data: body, error: validationError } = await validateBody(req, acceptInviteSchema);
    if (validationError) {
      console.log("[ACCEPT-INVITE] Validation error:", validationError.errors);
      const formatted = formatZodError(validationError);
      return errors.validationError(formatted.message, formatted.details);
    }

    const { token, fullName, password, createAccount } = body;

    // Rate limiting check - use shared module
    const rateLimitKey = createRateLimitKey(req, token.substring(0, 8));
    const rateCheck = checkRateLimit(rateLimitKey, RateLimitPresets.SENSITIVE);
    
    if (!rateCheck.allowed) {
      console.log("[ACCEPT-INVITE] Rate limit exceeded for:", rateLimitKey);
      return errors.tooManyRequests(rateCheck.retryAfter);
    }

    console.log("[ACCEPT-INVITE] Accepting invitation with token:", token.substring(0, 8) + "...");

    // Create service role client to bypass RLS
    const supabaseServiceClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Validate token exists
    const { data: member, error: fetchError } = await supabaseServiceClient
      .from("team_members")
      .select("id, email, status, token_expires_at, role, organization_id")
      .eq("invite_token", token)
      .maybeSingle();

    console.log("[ACCEPT-INVITE] Member lookup result:", {
      found: !!member,
      status: member?.status,
      error: fetchError?.message,
    });

    if (fetchError) {
      console.error("[ACCEPT-INVITE] Database error:", fetchError);
      return errors.internal("Database error occurred");
    }

    if (!member) {
      console.log("[ACCEPT-INVITE] No invitation found for token");
      return errors.notFound("Invitation");
    }

    // Check if already activated
    if (member.status === "active") {
      console.log("[ACCEPT-INVITE] Already activated, returning success");
      return successResponse({
        message: "This invitation has already been accepted",
        alreadyActivated: true,
      });
    }

    // Check if expired
    if (member.token_expires_at && new Date(member.token_expires_at) < new Date()) {
      console.log("[ACCEPT-INVITE] Token expired");
      return errors.badRequest("This invitation has expired");
    }

    // If createAccount flag is set, create the user account
    if (createAccount && password) {
      // Validate password strength server-side
      const passwordValidation = validatePassword(password);
      if (!passwordValidation.valid) {
        console.log("[ACCEPT-INVITE] Password validation failed:", passwordValidation.error);
        return errors.validationError(passwordValidation.error || "Invalid password");
      }

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
        email_confirm: true,
        user_metadata: {
          full_name: fullName || "",
        },
      });

      if (userError) {
        console.error("[ACCEPT-INVITE] User creation error:", userError);
        if (userError.message.includes("already registered") || userError.message.includes("already exists")) {
          console.log("[ACCEPT-INVITE] User already exists, proceeding with activation");
        } else {
          return errors.badRequest("Failed to create account: " + userError.message);
        }
      } else {
        console.log("[ACCEPT-INVITE] ✓ User account created:", userData.user?.id);
      }
    }

    // Update team member to active
    const updateData: Record<string, unknown> = {
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
      return errors.internal("Failed to activate invitation");
    }

    console.log("[ACCEPT-INVITE] ✓ Invitation activated successfully");

    return successResponse({
      message: "Invitation accepted successfully",
      email: member.email,
      role: member.role,
      organization_id: member.organization_id,
    });
  } catch (error) {
    console.error("[ACCEPT-INVITE] Unexpected error:", error);
    return errors.internal("An error occurred processing your request");
  }
});
