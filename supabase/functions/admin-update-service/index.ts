import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1'
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
      throw new Error('Missing Supabase environment variables');
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const supabaseAnon = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    const { data: { user }, error: userError } = await supabaseAnon.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { data: isAdmin, error: roleError } = await supabaseAnon.rpc('has_role', {
      _user_id: user.id,
      _role: 'admin'
    });

    if (roleError || !isAdmin) {
      throw new Error('User does not have admin role');
    }

    const packageSchema = z.object({
      id: z.string().uuid().optional(),
      package_name: z.string().min(1),
      description: z.string().optional(),
      price: z.number().min(0),
      currency: z.string().default('USD'),
      features: z.array(z.string()),
      delivery_time: z.string().optional(),
      notes: z.string().optional(),
      package_order: z.number().default(0),
      images: z.array(z.string()).optional(),
      videos: z.array(z.string()).optional(),
    });

    const updateServiceSchema = z.object({
      serviceId: z.string().uuid(),
      updates: z.object({
        name: z.string().min(1),
        name_ar: z.string().min(1),
        description: z.string().min(1),
        description_ar: z.string().min(1),
        price: z.number().min(0),
        currency: z.string().default('USD'),
        category: z.string().uuid(),
        active: z.boolean(),
        image_url: z.string().nullable().optional(),
      }),
      packages: z.array(packageSchema).optional(),
    });

    const body = await req.json();
    const validatedData = updateServiceSchema.parse(body);

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

    const { error: serviceError } = await supabaseAdmin
      .from('services')
      .update(validatedData.updates)
      .eq('id', validatedData.serviceId);

    if (serviceError) {
      console.error('Error updating service:', serviceError);
      throw serviceError;
    }

    if (validatedData.packages) {
      await supabaseAdmin
        .from('service_packages')
        .delete()
        .eq('service_id', validatedData.serviceId);

      if (validatedData.packages.length > 0) {
        const packagesToInsert = validatedData.packages.map(pkg => ({
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
        }));

        const { error: packagesError } = await supabaseAdmin
          .from('service_packages')
          .insert(packagesToInsert);

        if (packagesError) {
          console.error('Error updating packages:', packagesError);
          throw packagesError;
        }
      }
    }

    console.log('Service updated successfully:', validatedData.serviceId);

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in admin-update-service:', error);
    
    if (error instanceof z.ZodError) {
      return new Response(
        JSON.stringify({ error: 'Validation error', details: error.errors }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});