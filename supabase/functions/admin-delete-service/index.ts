import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.1";
import { corsHeaders, successResponse, errors, handleCors } from "../_shared/response.ts";
import { z, validateBody, formatZodError, uuidSchema } from "../_shared/validation.ts";

const deleteServiceSchema = z.object({
  serviceId: uuidSchema,
});

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
      console.error("[ADMIN-DELETE-SERVICE] Missing environment variables");
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
      console.error("[ADMIN-DELETE-SERVICE] Auth error:", userError?.message);
      return errors.unauthorized("Invalid or expired token");
    }

    const { data: isAdmin, error: roleError } = await supabaseAnon.rpc("has_role", {
      _user_id: user.id,
      _role: "admin",
    });

    if (roleError || !isAdmin) {
      console.error("[ADMIN-DELETE-SERVICE] Role check failed:", roleError?.message);
      return errors.forbidden("Admin access required");
    }

    const { data: validatedData, error: validationError } = await validateBody(req, deleteServiceSchema);
    if (validationError) {
      const formatted = formatZodError(validationError);
      return errors.validationError(formatted.message, formatted.details);
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

    // Check if service exists
    const { data: existingService, error: fetchError } = await supabaseAdmin
      .from("services")
      .select("id, name")
      .eq("id", validatedData.serviceId)
      .maybeSingle();

    if (fetchError || !existingService) {
      return errors.notFound("Service");
    }

    // Delete service (packages will be cascade deleted via foreign key)
    const { error: deleteError } = await supabaseAdmin
      .from("services")
      .delete()
      .eq("id", validatedData.serviceId);

    if (deleteError) {
      console.error("[ADMIN-DELETE-SERVICE] Delete error:", deleteError);
      return errors.internal("Failed to delete service");
    }

    console.log(`[ADMIN-DELETE-SERVICE] Service deleted: ${validatedData.serviceId} (${existingService.name})`);

    return successResponse({ message: "Service deleted successfully" });
  } catch (error) {
    console.error("[ADMIN-DELETE-SERVICE] Unexpected error:", error);
    return errors.internal("An unexpected error occurred");
  }
});
