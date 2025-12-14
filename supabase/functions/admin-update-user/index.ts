import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.1";
import { corsHeaders, successResponse, errors, handleCors } from "../_shared/response.ts";
import { z, validateBody, formatZodError, uuidSchema, fullNameSchema, phoneSchema, appRoleSchema } from "../_shared/validation.ts";
import { checkRateLimit, createRateLimitKey, RateLimitPresets } from "../_shared/rate-limit.ts";

const updateUserSchema = z.object({
  userId: uuidSchema,
  full_name: fullNameSchema.optional(),
  phone: phoneSchema,
  role: appRoleSchema.optional(),
});

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    // Rate limiting check
    const rateLimitKey = createRateLimitKey(req, "admin-update");
    const rateCheck = checkRateLimit(rateLimitKey, RateLimitPresets.ADMIN);
    
    if (!rateCheck.allowed) {
      console.log("[ADMIN-UPDATE-USER] Rate limit exceeded for:", rateLimitKey);
      return errors.tooManyRequests(rateCheck.retryAfter);
    }
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
      console.error("[ADMIN-UPDATE-USER] Missing environment variables");
      return errors.internal("Server configuration error");
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return errors.unauthorized("No authorization header");
    }

    const token = authHeader.replace("Bearer ", "");
    const supabaseAnon = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    const { data: { user }, error: userError } = await supabaseAnon.auth.getUser();
    if (userError || !user) {
      console.error("[ADMIN-UPDATE-USER] Auth error:", userError?.message);
      return errors.unauthorized("Invalid or expired token");
    }

    const { data: isAdmin, error: roleError } = await supabaseAnon.rpc("has_role", {
      _user_id: user.id,
      _role: "admin",
    });

    if (roleError || !isAdmin) {
      console.error("[ADMIN-UPDATE-USER] Role check failed:", roleError?.message);
      return errors.forbidden("Admin access required");
    }

    const { data: validatedData, error: validationError } = await validateBody(req, updateUserSchema);
    if (validationError) {
      const formatted = formatZodError(validationError);
      return errors.validationError(formatted.message, formatted.details);
    }

    const { userId, full_name, phone, role } = validatedData;

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

    // Check if user exists
    const { data: existingProfile, error: fetchError } = await supabaseAdmin
      .from("profiles")
      .select("id, email")
      .eq("id", userId)
      .maybeSingle();

    if (fetchError || !existingProfile) {
      return errors.notFound("User");
    }

    // Update profile
    const profileUpdates: Record<string, string | null | undefined> = {};
    if (full_name !== undefined) profileUpdates.full_name = full_name;
    if (phone !== undefined) profileUpdates.phone = phone;

    if (Object.keys(profileUpdates).length > 0) {
      const { error: profileError } = await supabaseAdmin
        .from("profiles")
        .update(profileUpdates)
        .eq("id", userId);

      if (profileError) {
        console.error("[ADMIN-UPDATE-USER] Profile update error:", profileError);
        return errors.internal("Failed to update user profile");
      }
    }

    // Update role if provided
    if (role) {
      const { error: roleUpdateError } = await supabaseAdmin
        .from("user_roles")
        .update({ role })
        .eq("user_id", userId);

      if (roleUpdateError) {
        console.error("[ADMIN-UPDATE-USER] Role update error:", roleUpdateError);
        return errors.internal("Failed to update user role");
      }
    }

    // Update auth metadata for consistency
    if (full_name !== undefined) {
      const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        user_metadata: { full_name },
      });

      if (authError) {
        console.error("[ADMIN-UPDATE-USER] Auth metadata update error:", authError);
        // Non-fatal, continue
      }
    }

    console.log(`[ADMIN-UPDATE-USER] User updated: ${userId}`);

    return successResponse({ message: "User updated successfully" });
  } catch (error) {
    console.error("[ADMIN-UPDATE-USER] Unexpected error:", error);
    return errors.internal("An unexpected error occurred");
  }
});
