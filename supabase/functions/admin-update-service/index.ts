import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.1";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get JWT from authorization header
    const authHeader = req.headers.get("Authorization") || req.headers.get("authorization");
    
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Extract JWT token and decode to get user ID
    const token = authHeader.replace("Bearer ", "");
    const payload = JSON.parse(atob(token.split('.')[1]));
    const userId = payload.sub;
    
    if (!userId) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    // Verify admin role
    const { data: isAdmin } = await supabaseClient.rpc('has_role', {
      _user_id: userId,
      _role: 'admin'
    });

    if (!isAdmin) {
      return new Response(JSON.stringify({ error: 'Forbidden: Admin access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate input
    const updateServiceSchema = z.object({
      serviceId: z.string().uuid('Invalid service ID format'),
      updates: z.object({
        name: z.string().trim().min(2, 'Name must be at least 2 characters').max(200, 'Name must be less than 200 characters').optional(),
        name_ar: z.string().trim().min(2, 'Arabic name must be at least 2 characters').max(200, 'Arabic name must be less than 200 characters').optional(),
        description: z.string().trim().min(10, 'Description must be at least 10 characters').max(2000, 'Description must be less than 2000 characters').optional(),
        description_ar: z.string().trim().min(10, 'Arabic description must be at least 10 characters').max(2000, 'Arabic description must be less than 2000 characters').optional(),
        price: z.number().positive('Price must be positive').optional(),
        currency: z.string().length(3, 'Currency must be 3 characters').optional(),
        category: z.string().uuid('Invalid category ID').optional(),
        active: z.boolean().optional(),
        image_url: z.string().url('Invalid image URL').max(500, 'Image URL must be less than 500 characters').nullable().optional()
      }).refine(data => Object.keys(data).length > 0, {
        message: 'At least one field must be provided for update'
      })
    });

    let validated;
    try {
      const input = await req.json();
      validated = updateServiceSchema.parse(input);
    } catch (error: any) {
      return new Response(JSON.stringify({ error: error.errors?.[0]?.message || 'Invalid input data' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { serviceId, updates } = validated;

    // Use service role for updates
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { error } = await supabaseAdmin
      .from('services')
      .update(updates)
      .eq('id', serviceId);

    if (error) throw error;

    console.log('Admin performed service update operation');

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Error in admin-update-service:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
