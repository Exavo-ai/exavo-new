import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.1";
import { corsHeaders, successResponse, errors, handleCors } from "../_shared/response.ts";
import { z, validateBody, formatZodError, uuidSchema } from "../_shared/validation.ts";
import { checkRateLimit, createRateLimitKey, RateLimitPresets } from "../_shared/rate-limit.ts";

const deleteUserSchema = z.object({
  userId: uuidSchema,
});

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    // Rate limiting check
    const rateLimitKey = createRateLimitKey(req, "admin-delete");
    const rateCheck = checkRateLimit(rateLimitKey, RateLimitPresets.ADMIN);
    
    if (!rateCheck.allowed) {
      console.log("[ADMIN-DELETE-USER] Rate limit exceeded for:", rateLimitKey);
      return errors.tooManyRequests(rateCheck.retryAfter);
    }
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
      console.error("[ADMIN-DELETE-USER] Missing environment variables");
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
      console.error("[ADMIN-DELETE-USER] Auth error:", userError?.message);
      return errors.unauthorized("Invalid or expired token");
    }

    const { data: isAdmin, error: roleError } = await supabaseAnon.rpc("has_role", {
      _user_id: user.id,
      _role: "admin",
    });

    if (roleError || !isAdmin) {
      console.error("[ADMIN-DELETE-USER] Role check failed:", roleError?.message);
      return errors.forbidden("Admin access required");
    }

    const { data: validatedData, error: validationError } = await validateBody(req, deleteUserSchema);
    if (validationError) {
      const formatted = formatZodError(validationError);
      return errors.validationError(formatted.message, formatted.details);
    }

    const { userId } = validatedData;

    // Prevent self-deletion
    if (userId === user.id) {
      return errors.badRequest("Cannot delete your own account");
    }

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

    console.log(`[ADMIN-DELETE-USER] Deleting user: ${userId} (${existingProfile.email})`);

    // Delete related data in order (respecting foreign keys)
    const deletionSteps = [
      { table: "team_members", condition: { email: existingProfile.email } },
      { table: "team_members", condition: { organization_id: userId } },
      { table: "workspace_permissions", condition: { organization_id: userId } },
      { table: "workspaces", condition: { owner_id: userId } },
      { table: "notifications", condition: { user_id: userId } },
      { table: "chat_messages", condition: { user_id: userId } },
      { table: "activity_logs", condition: { user_id: userId } },
      { table: "user_files", condition: { user_id: userId } },
      { table: "ticket_replies", condition: { user_id: userId } },
      { table: "tickets", condition: { user_id: userId } },
      { table: "appointments", condition: { user_id: userId } },
      { table: "orders", condition: { user_id: userId } },
      { table: "payments", condition: { user_id: userId } },
      { table: "payment_methods", condition: { user_id: userId } },
      { table: "projects", condition: { user_id: userId } },
      { table: "user_roles", condition: { user_id: userId } },
      { table: "profiles", condition: { id: userId } },
    ];

    for (const step of deletionSteps) {
      const [[key, value]] = Object.entries(step.condition);
      const { error } = await supabaseAdmin.from(step.table).delete().eq(key, value);
      if (error) {
        console.warn(`[ADMIN-DELETE-USER] Warning deleting from ${step.table}:`, error.message);
        // Continue with other deletions
      }
    }

    // Finally delete from Auth
    const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (deleteAuthError) {
      console.error("[ADMIN-DELETE-USER] Auth deletion error:", deleteAuthError);
      return errors.internal("Failed to delete user from authentication system");
    }

    console.log(`[ADMIN-DELETE-USER] User completely deleted: ${userId}`);

    return successResponse({ message: "User deleted successfully" });
  } catch (error) {
    console.error("[ADMIN-DELETE-USER] Unexpected error:", error);
    return errors.internal("An unexpected error occurred");
  }
});
