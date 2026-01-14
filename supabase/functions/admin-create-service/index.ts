import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { corsHeaders, createdResponse, errors, handleCors } from "../_shared/response.ts";
import { z, validateBody, formatZodError, uuidSchema } from "../_shared/validation.ts";
import { checkRateLimit, createRateLimitKey, RateLimitPresets } from "../_shared/rate-limit.ts";

const packageSchema = z.object({
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

const paymentModelSchema = z.enum(["one_time", "subscription"]);

// Generate URL-friendly slug from service name
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .replace(/^-+|-+$/g, ''); // Trim hyphens from start/end
}

const createServiceSchema = z.object({
  name: z.string().trim().min(1, "Service name is required").max(200, "Service name too long"),
  name_ar: z.string().trim().min(1, "Arabic name is required").max(200, "Arabic name too long"),
  description: z.string().trim().min(1, "Description is required").max(5000, "Description too long"),
  description_ar: z.string().trim().min(1, "Arabic description is required").max(5000, "Arabic description too long"),
  price: z.number().min(0, "Price must be non-negative").max(1000000, "Price exceeds maximum"),
  currency: z.string().length(3, "Currency must be 3 characters").default("USD"),
  category: uuidSchema.nullable().optional(),
  active: z.boolean().default(true),
  image_url: z.string().url("Invalid image URL").nullable().optional(),
  images: z.array(z.string().url()).max(10).default([]),
  payment_model: paymentModelSchema,
  build_cost: z.number().min(0).max(1000000).default(0),
  monthly_fee: z.number().min(0).max(1000000).default(0),
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
      console.log("[ADMIN-CREATE-SERVICE] Rate limit exceeded for:", rateLimitKey);
      return errors.tooManyRequests(rateCheck.retryAfter);
    }
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
      console.error("[ADMIN-CREATE-SERVICE] Missing environment variables");
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
      console.error("[ADMIN-CREATE-SERVICE] Auth error:", userError?.message);
      return errors.unauthorized("Invalid or expired token");
    }

    const { data: isAdmin, error: roleError } = await supabaseAnon.rpc("has_role", {
      _user_id: user.id,
      _role: "admin",
    });

    if (roleError || !isAdmin) {
      console.error("[ADMIN-CREATE-SERVICE] Role check failed:", roleError?.message);
      return errors.forbidden("Admin access required");
    }

    const { data: validatedData, error: validationError } = await validateBody(req, createServiceSchema);
    if (validationError) {
      const formatted = formatZodError(validationError);
      return errors.validationError(formatted.message, formatted.details);
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

    // Check for duplicate service name
    const { data: existingService } = await supabaseAdmin
      .from("services")
      .select("id")
      .eq("name", validatedData.name)
      .maybeSingle();

    if (existingService) {
      return errors.conflict("A service with this name already exists");
    }

    // Generate slug from service name
    const baseSlug = generateSlug(validatedData.name);
    let slug = baseSlug;
    let slugSuffix = 1;

    // Check for duplicate slugs and generate unique one
    while (true) {
      const { data: existingSlug } = await supabaseAdmin
        .from("services")
        .select("id")
        .eq("slug", slug)
        .maybeSingle();

      if (!existingSlug) break;
      
      slug = `${baseSlug}-${slugSuffix}`;
      slugSuffix++;
    }

    const { data: service, error: serviceError } = await supabaseAdmin
      .from("services")
      .insert({
        name: validatedData.name,
        name_ar: validatedData.name_ar,
        description: validatedData.description,
        description_ar: validatedData.description_ar,
        price: validatedData.price,
        currency: validatedData.currency,
        category: validatedData.category,
        active: validatedData.active,
        image_url: validatedData.image_url,
        images: validatedData.images || [],
        payment_model: validatedData.payment_model,
        build_cost: validatedData.build_cost,
        monthly_fee: validatedData.monthly_fee,
        slug: slug,
      })
      .select()
      .single();

    if (serviceError) {
      console.error("[ADMIN-CREATE-SERVICE] Insert error:", serviceError);
      return errors.internal("Failed to create service");
    }

    if (validatedData.packages && validatedData.packages.length > 0) {
      const packagesToInsert = validatedData.packages.map((pkg) => ({
        service_id: service.id,
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
        console.error("[ADMIN-CREATE-SERVICE] Packages error:", packagesError);
        // Rollback service creation
        await supabaseAdmin.from("services").delete().eq("id", service.id);
        return errors.internal("Failed to create service packages");
      }
    }

    console.log(`[ADMIN-CREATE-SERVICE] Service created: ${service.id}`);

    return createdResponse({ service });
  } catch (error) {
    console.error("[ADMIN-CREATE-SERVICE] Unexpected error:", error);
    return errors.internal("An unexpected error occurred");
  }
});
