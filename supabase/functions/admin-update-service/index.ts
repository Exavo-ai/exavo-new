import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.1";
import { corsHeaders, successResponse, errors, handleCors } from "../_shared/response.ts";
import { z, validateBody, formatZodError, uuidSchema } from "../_shared/validation.ts";
import { checkRateLimit, createRateLimitKey, RateLimitPresets } from "../_shared/rate-limit.ts";

// Allowlist of updatable fields (strict)
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
  "images",
  "build_cost",
  "monthly_fee",
  "media",
] as const;

type AllowedUpdateField = (typeof ALLOWED_UPDATE_FIELDS)[number];

// Explicitly forbidden fields and identifier-like fields.
// NOTE: We also reject patterns (see `findForbiddenUpdateKeys`).
const FORBIDDEN_FIELDS = [
  "id",
  "created_at",
  "updated_at",
  "payment_model",
  "stripe_price_id",
  "stripe_product_id",
  "owner_id",
  "user_id",
  "created_by",
  "updated_by",
] as const;

type ForbiddenField = (typeof FORBIDDEN_FIELDS)[number];

const emptyStringToNull = (v: unknown) => (typeof v === "string" && v.trim() === "" ? null : v);
const emptyStringToUndefined = (v: unknown) => (typeof v === "string" && v.trim() === "" ? undefined : v);

function normalizeStringArray(value: unknown): string[] | undefined {
  if (value === null || value === undefined) return undefined;
  const arr = Array.isArray(value) ? value : [value];
  const out = arr
    .filter((v) => v !== null && v !== undefined)
    .map((v) => String(v).trim())
    .filter((s) => s.length > 0);
  return out.length > 0 ? out : undefined;
}

function normalizeUpdates(input: Record<string, unknown>): Record<AllowedUpdateField, unknown> {
  const out: Record<string, unknown> = {};
  for (const field of ALLOWED_UPDATE_FIELDS) {
    if (!(field in input)) continue;

    let val = input[field];

    // Normalize empty string / empty array behavior.
    if (field === "image_url") {
      val = emptyStringToNull(val);
      if (val === undefined) continue;
      out[field] = val;
      continue;
    }

    // Handle images array
    if (field === "images") {
      if (Array.isArray(val)) {
        // Filter to valid URL strings only
        const validImages = val.filter(
          (v) => typeof v === "string" && (v.startsWith("http://") || v.startsWith("https://"))
        );
        out[field] = validImages;
      } else {
        out[field] = [];
      }
      continue;
    }

    if (field === "category") {
      // category is nullable in DB; allow clearing.
      val = emptyStringToNull(val);
      if (val === undefined) continue;
      out[field] = val;
      continue;
    }

    if (field === "media") {
      // Accept anything; normalize common shapes inside if present.
      if (val && typeof val === "object" && !Array.isArray(val)) {
        const media = val as Record<string, unknown>;
        const image_urls = normalizeStringArray(media.image_urls);
        const video_urls = normalizeStringArray(media.video_urls);

        // omit empty arrays
        const normalizedMedia: Record<string, unknown> = { ...media };
        if (media.image_urls !== undefined) {
          if (image_urls) normalizedMedia.image_urls = image_urls;
          else delete normalizedMedia.image_urls;
        }
        if (media.video_urls !== undefined) {
          if (video_urls) normalizedMedia.video_urls = video_urls;
          else delete normalizedMedia.video_urls;
        }

        // If the object becomes empty after deletes, omit the field.
        if (Object.keys(normalizedMedia).length > 0) out[field] = normalizedMedia;
        continue;
      }

      // allow explicit null, otherwise omit empty string
      val = emptyStringToNull(val);
      if (val === undefined) continue;
      out[field] = val;
      continue;
    }

    // For string-like optional fields: omit empty strings.
    val = emptyStringToUndefined(val);
    if (val === undefined) continue;

    // For arrays: omit empty arrays.
    if (Array.isArray(val) && val.length === 0) continue;

    out[field] = val;
  }

  return out as Record<AllowedUpdateField, unknown>;
}

function findForbiddenUpdateKeys(updateObj: Record<string, unknown>): string[] {
  const keys = Object.keys(updateObj);

  const explicit = keys.filter((k) => (FORBIDDEN_FIELDS as readonly string[]).includes(k));
  const pattern = keys.filter((k) => {
    const lk = k.toLowerCase();

    // Stripe identifiers / ownership / ids / foreign keys
    if (lk.startsWith("stripe_")) return true;
    if (lk.includes("stripe")) return true;
    if (lk.endsWith("_id")) return true;
    if (lk.endsWith("_by")) return true;
    if (lk.includes("owner")) return true;
    if (lk.includes("created_at") || lk.includes("updated_at")) return true;

    return false;
  });

  // Allowlist always wins: allowed fields are never rejected even if they match patterns.
  const allowedSet = new Set<string>(ALLOWED_UPDATE_FIELDS as readonly string[]);

  return Array.from(new Set([...explicit, ...pattern])).filter((k) => !allowedSet.has(k));
}

const packageSchema = z.object({
  id: uuidSchema.optional(),
  package_name: z.string().trim().min(1, "Package name is required").max(100, "Package name too long"),
  description: z.preprocess(emptyStringToUndefined, z.string().trim().max(2000, "Description too long").optional()),
  price: z.number().min(0, "Price must be non-negative").max(1000000, "Price exceeds maximum"),
  currency: z.string().length(3, "Currency must be 3 characters").default("USD"),
  features: z.array(z.string().trim().max(500, "Feature text too long")).max(50, "Too many features"),
  delivery_time: z.preprocess(emptyStringToUndefined, z.string().trim().max(100, "Delivery time too long").optional()),
  notes: z.preprocess(emptyStringToUndefined, z.string().trim().max(2000, "Notes too long").optional()),
  package_order: z.number().int().min(0).max(100).default(0),

  // Be tolerant: accept empty string / null / string / array. Normalize later.
  images: z.any().optional(),
  videos: z.any().optional(),

  build_cost: z.number().min(0).max(1000000).default(0),
  monthly_fee: z.number().min(0).max(1000000).default(0),
});

// Partial update schema - validate shape but allow unknown keys (so we can explicitly reject forbidden keys)
const updateServiceSchema = z.object({
  serviceId: uuidSchema,
  updates: z
    .object({
      name: z.preprocess(emptyStringToUndefined, z.string().trim().min(1, "Service name is required").max(200, "Service name too long").optional()),
      name_ar: z.preprocess(emptyStringToUndefined, z.string().trim().min(1, "Arabic name is required").max(200, "Arabic name too long").optional()),
      description: z.preprocess(
        emptyStringToUndefined,
        z.string().trim().min(1, "Description is required").max(5000, "Description too long").optional(),
      ),
      description_ar: z.preprocess(
        emptyStringToUndefined,
        z.string().trim().min(1, "Arabic description is required").max(5000, "Arabic description too long").optional(),
      ),
      price: z.number().min(0, "Price must be non-negative").max(1000000, "Price exceeds maximum").optional(),
      currency: z.preprocess(emptyStringToUndefined, z.string().length(3, "Currency must be 3 characters").optional()),
      category: z.preprocess(emptyStringToNull, uuidSchema.nullable().optional()),
      active: z.boolean().optional(),
      image_url: z.preprocess(emptyStringToNull, z.string().url("Invalid image URL").nullable().optional()),
      build_cost: z.number().min(0).max(1000000).optional(),
      monthly_fee: z.number().min(0).max(1000000).optional(),
      media: z.any().optional(),
    })
    .partial()
    .passthrough(),
  // Do NOT add Stripe/booking/package-dependent rules here.
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

    const {
      data: { user },
      error: userError,
    } = await supabaseAnon.auth.getUser();

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

    // Validate request BEFORE any DB work
    const { data: validatedData, error: validationError } = await validateBody(req, updateServiceSchema);
    if (validationError) {
      const formatted = formatZodError(validationError);
      return errors.validationError(formatted.message, formatted.details);
    }

    // Explicit forbidden key detection (works even when UI sends unknown keys)
    const forbiddenFound = findForbiddenUpdateKeys(validatedData.updates ?? {});
    if (forbiddenFound.length > 0) {
      console.log("[ADMIN-UPDATE-SERVICE] Rejected forbidden fields:", forbiddenFound);
      return errors.badRequest(`Cannot update protected fields: ${forbiddenFound.join(", ")}`);
    }

    // Strict allowlist + normalization (omit empty strings/arrays)
    const filteredUpdates = normalizeUpdates(validatedData.updates ?? {});

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
    if (typeof filteredUpdates.name === "string" && filteredUpdates.name.trim().length > 0) {
      const { data: duplicateService } = await supabaseAdmin
        .from("services")
        .select("id")
        .eq("name", filteredUpdates.name)
        .neq("id", validatedData.serviceId)
        .maybeSingle();

      if (duplicateService) {
        return errors.conflict("A service with this name already exists");
      }
    }

    // Update service fields
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

    // Update packages if provided (tolerant normalization; no URL/Stripe validation here)
    // Use smart upsert: update existing packages, insert new ones, delete removed ones
    if (validatedData.packages) {
      const normalizedPackages = validatedData.packages.map((pkg) => {
        const images = normalizeStringArray((pkg as Record<string, unknown>).images) ?? [];
        const videos = normalizeStringArray((pkg as Record<string, unknown>).videos) ?? [];

        return {
          ...pkg,
          images,
          videos,
        };
      });

      // Fetch existing packages for this service
      const { data: existingPackages, error: fetchPackagesError } = await supabaseAdmin
        .from("service_packages")
        .select("id")
        .eq("service_id", validatedData.serviceId);

      if (fetchPackagesError) {
        console.error("[ADMIN-UPDATE-SERVICE] Fetch packages error:", fetchPackagesError);
        return errors.internal("Failed to fetch existing packages");
      }

      const existingPackageIds = new Set((existingPackages || []).map((p) => p.id));
      const incomingPackageIds = new Set(
        normalizedPackages.filter((pkg) => pkg.id).map((pkg) => pkg.id as string)
      );

      // Determine which packages to delete (exist in DB but not in incoming)
      const packageIdsToDelete = [...existingPackageIds].filter((id) => !incomingPackageIds.has(id));

      // Delete removed packages
      if (packageIdsToDelete.length > 0) {
        const { error: deleteError } = await supabaseAdmin
          .from("service_packages")
          .delete()
          .in("id", packageIdsToDelete);

        if (deleteError) {
          console.error("[ADMIN-UPDATE-SERVICE] Delete packages error:", deleteError);
          return errors.internal("Failed to delete removed packages");
        }
      }

      // Separate packages into updates (have id) and inserts (no id)
      const packagesToUpdate = normalizedPackages.filter((pkg) => pkg.id && existingPackageIds.has(pkg.id as string));
      const packagesToInsert = normalizedPackages.filter((pkg) => !pkg.id);

      // Update existing packages one by one
      for (const pkg of packagesToUpdate) {
        const { error: updateError } = await supabaseAdmin
          .from("service_packages")
          .update({
            package_name: pkg.package_name,
            description: pkg.description,
            price: pkg.price,
            currency: pkg.currency,
            features: pkg.features,
            delivery_time: pkg.delivery_time,
            notes: pkg.notes,
            package_order: pkg.package_order,
            images: pkg.images ?? [],
            videos: pkg.videos ?? [],
            build_cost: pkg.build_cost ?? 0,
            monthly_fee: pkg.monthly_fee ?? 0,
          })
          .eq("id", pkg.id as string);

        if (updateError) {
          console.error("[ADMIN-UPDATE-SERVICE] Update package error:", updateError, pkg.id);
          return errors.internal("Failed to update package");
        }
      }

      // Insert new packages
      if (packagesToInsert.length > 0) {
        const insertData = packagesToInsert.map((pkg) => ({
          service_id: validatedData.serviceId,
          package_name: pkg.package_name,
          description: pkg.description,
          price: pkg.price,
          currency: pkg.currency,
          features: pkg.features,
          delivery_time: pkg.delivery_time,
          notes: pkg.notes,
          package_order: pkg.package_order,
          images: pkg.images ?? [],
          videos: pkg.videos ?? [],
          build_cost: pkg.build_cost ?? 0,
          monthly_fee: pkg.monthly_fee ?? 0,
        }));

        const { error: insertError } = await supabaseAdmin.from("service_packages").insert(insertData);

        if (insertError) {
          console.error("[ADMIN-UPDATE-SERVICE] Insert packages error:", insertError);
          return errors.internal("Failed to create new packages");
        }
      }
    }

    // Return updated record (200) - ensure we never log success and then return 422.
    const { data: updatedService, error: updatedServiceError } = await supabaseAdmin
      .from("services")
      .select("*")
      .eq("id", validatedData.serviceId)
      .single();

    if (updatedServiceError || !updatedService) {
      console.error("[ADMIN-UPDATE-SERVICE] Fetch updated record error:", updatedServiceError);
      return errors.internal("Service updated but could not be retrieved");
    }

    console.log(`[ADMIN-UPDATE-SERVICE] Service updated: ${validatedData.serviceId}`);

    return new Response(JSON.stringify({ ok: true, service: updatedService }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[ADMIN-UPDATE-SERVICE] Unexpected error:", error);
    return errors.internal("An unexpected error occurred");
  }
});
