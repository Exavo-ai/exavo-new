import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Initialize Supabase client with user's token
    const authHeader = req.headers.get("Authorization")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Verify user is authenticated
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify user has admin role
    const { data: hasAdminRole, error: roleError } = await supabase.rpc("has_role", {
      _user_id: user.id,
      _role: "admin",
    });

    if (roleError || !hasAdminRole) {
      return new Response(JSON.stringify({ error: "Forbidden: Admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse and validate request body
    const createServiceSchema = z.object({
      name: z.string().min(1, "Service name is required").max(200),
      name_ar: z.string().min(1, "Arabic service name is required").max(200),
      description: z.string().min(1, "Description is required").max(1000),
      description_ar: z.string().min(1, "Arabic description is required").max(1000),
      price: z.number().min(0, "Price must be positive"),
      currency: z.string().min(3).max(3),
      category: z.string().uuid("Invalid category ID"),
      active: z.boolean().optional().default(true),
      image_url: z.string().nullable().optional(),
    });

    const body = await req.json();
    const validatedData = createServiceSchema.parse(body);

    // Create service using service role
    const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey);

    const { data: newService, error: createError } = await adminClient
      .from("services")
      .insert([
        {
          name: validatedData.name,
          name_ar: validatedData.name_ar,
          description: validatedData.description,
          description_ar: validatedData.description_ar,
          price: validatedData.price,
          currency: validatedData.currency,
          category: validatedData.category,
          active: validatedData.active,
          image_url: validatedData.image_url,
        },
      ])
      .select()
      .single();

    if (createError) {
      throw createError;
    }

    return new Response(JSON.stringify({ success: true, service: newService }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error creating service:", error);

    if (error instanceof z.ZodError) {
      return new Response(
        JSON.stringify({
          error: "Validation error",
          details: error.errors,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Internal server error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
