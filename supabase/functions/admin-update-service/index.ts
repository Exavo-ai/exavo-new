import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.1";
import { corsHeaders, successResponse, errors, handleCors } from "../_shared/response.ts";
import { z, validateBody, formatZodError, uuidSchema } from "../_shared/validation.ts";
import { checkRateLimit, createRateLimitKey, RateLimitPresets } from "../_shared/rate-limit.ts";

// Allowlist of updatable fields
const ALLOWED_UPDATE_FIELDS = [
  "name",
  "name_ar", 
  "description",
  "description_ar",
  "price",
  "currency",
  "category",
  "active",
  "image_url",
  "build_cost",
  "monthly_fee",
  "media",
] as const;

// Forbidden fields that should never be updated
const FORBIDDEN_FIELDS = [
  "id",
  "created_at",
  "payment_model",
  "stripe_price_id",
  "stripe_product_id",
] as const;

const packageSchema = z.object({
  id: uuidSchema.optional(),
  package_name: z.string().trim().min(1, "Package name is required").max(100, "Package name too long"),
  description: z.string().trim().max(2000, "Description too long").optional(),
  price: z.number().min(0, "Price must be non-negative").max(1000000, "Price exceeds maximum"),
  currency: z.string().length(3, "Currency must be 3 characters").default("USD"),
  features: z.array(z.string().trim().max(500, "Feature text too long")).max(50, "Too many features"),
  delivery_time: z.string().trim().max(100, "Delivery time too long").optional(),
  notes: z.string().trim().max(2000, "Notes too long").optional(),
  package_order: z.number().int().min(0).max(100).default(0),
  images: z.array(z.string().url("Invalid image URL")).max(20, "Too many images").optional(),
  videos: z.array(z.string().url("Invalid video URL")).max(10, "Too many videos").optional(),
  build_cost: z.number().min(0).max(1000000).default(0),
  monthly_fee: z.number().min(0).max(1000000).default(0),
});

// Partial update schema - all fields optional
const updateServiceSchema = z.object({
  serviceId: uuidSchema,
  updates: z.object({
    name: z.string().trim().min(1, "Service name is required").max(200, "Service name too long").optional(),
    name_ar: z.string().trim().min(1, "Arabic name is required").max(200, "Arabic name too long").optional(),
    description: z.string().trim().min(1, "Description is required").max(5000, "Description too long").optional(),
    description_ar: z.string().trim().min(1, "Arabic description is required").max(5000, "Arabic description too long").optional(),
    price: z.number().min(0, "Price must be non-negative").max(1000000, "Price exceeds maximum").optional(),
    currency: z.string().length(3, "Currency must be 3 characters").optional(),
    category: uuidSchema.optional(),
    active: z.boolean().optional(),
    image_url: z.string().url("Invalid image URL").nullable().optional(),
    build_cost: z.number().min(0).max(1000000).optional(),
    monthly_fee: z.number().min(0).max(1000000).optional(),
    media: z.any().optional(),
  }).partial(),
  packages: z.array(packageSchema).max(10, "Too many packages").optional(),
});

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    // Rate limiting check
    const rateLimitKey = createRateLimitKey(req, "admin-service");
    const rateCheck = checkRateLimit(rateLimitKey, RateLimitPresets.ADMIN);
    
    if (!rateCheck.allowed) {
      console.log("[ADMIN-UPDATE-SERVICE] Rate limit exceeded for:", rateLimitKey);
      return errors.tooManyRequests(rateCheck.retryAfter);
    }
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
      console.error("[ADMIN-UPDATE-SERVICE] Missing environment variables");
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
      console.error("[ADMIN-UPDATE-SERVICE] Auth error:", userError?.message);
      return errors.unauthorized("Invalid or expired token");
    }

    const { data: isAdmin, error: roleError } = await supabaseAnon.rpc("has_role", {
      _user_id: user.id,
      _role: "admin",
    });

    if (roleError || !isAdmin) {
      console.error("[ADMIN-UPDATE-SERVICE] Role check failed:", roleError?.message);
      return errors.forbidden("Admin access required");
    }

    const { data: validatedData, error: validationError } = await validateBody(req, updateServiceSchema);
    if (validationError) {
      const formatted = formatZodError(validationError);
      return errors.validationError(formatted.message, formatted.details);
    }

    // Check for forbidden fields
    const forbiddenFound = FORBIDDEN_FIELDS.filter(field => field in validatedData.updates);
    if (forbiddenFound.length > 0) {
      console.log("[ADMIN-UPDATE-SERVICE] Rejected forbidden fields:", forbiddenFound);
      return errors.badRequest(`Cannot update protected fields: ${forbiddenFound.join(", ")}`);
    }

    // Filter to only allowed fields
    const filteredUpdates: Record<string, unknown> = {};
    for (const field of ALLOWED_UPDATE_FIELDS) {
      if (field in validatedData.updates) {
        filteredUpdates[field] = validatedData.updates[field as keyof typeof validatedData.updates];
      }
    }

    // Check if there's anything to update
    if (Object.keys(filteredUpdates).length === 0 && !validatedData.packages) {
      return errors.badRequest("No valid fields to update");
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

    // Check for duplicate name only if name is being updated
    if (filteredUpdates.name) {
      const { data: duplicateService } = await supabaseAdmin
        .from("services")
        .select("id")
        .eq("name", filteredUpdates.name as string)
        .neq("id", validatedData.serviceId)
        .maybeSingle();

      if (duplicateService) {
        return errors.conflict("A service with this name already exists");
      }
    }

    // Only update if there are fields to update
    if (Object.keys(filteredUpdates).length > 0) {
      const { error: serviceError } = await supabaseAdmin
        .from("services")
        .update(filteredUpdates)
        .eq("id", validatedData.serviceId);

      if (serviceError) {
        console.error("[ADMIN-UPDATE-SERVICE] Update error:", serviceError);
        return errors.internal("Failed to update service");
      }
    }

    if (validatedData.packages) {
      // Delete existing packages
      const { error: deleteError } = await supabaseAdmin
        .from("service_packages")
        .delete()
        .eq("service_id", validatedData.serviceId);

      if (deleteError) {
        console.error("[ADMIN-UPDATE-SERVICE] Delete packages error:", deleteError);
        return errors.internal("Failed to update service packages");
      }

      if (validatedData.packages.length > 0) {
        const packagesToInsert = validatedData.packages.map((pkg) => ({
          service_id: validatedData.serviceId,
          package_name: pkg.package_name,
          description: pkg.description,
          price: pkg.price,
          currency: pkg.currency,
          features: pkg.features,
          delivery_time: pkg.delivery_time,
          notes: pkg.notes,
          package_order: pkg.package_order,
          images: pkg.images || [],
          videos: pkg.videos || [],
          build_cost: pkg.build_cost || 0,
          monthly_fee: pkg.monthly_fee || 0,
        }));

        const { error: packagesError } = await supabaseAdmin
          .from("service_packages")
          .insert(packagesToInsert);

        if (packagesError) {
          console.error("[ADMIN-UPDATE-SERVICE] Insert packages error:", packagesError);
          return errors.internal("Failed to create service packages");
        }
      }
    }

    console.log(`[ADMIN-UPDATE-SERVICE] Service updated: ${validatedData.serviceId}`);

    return successResponse({ message: "Service updated successfully" });
  } catch (error) {
    console.error("[ADMIN-UPDATE-SERVICE] Unexpected error:", error);
    return errors.internal("An unexpected error occurred");
  }
});
