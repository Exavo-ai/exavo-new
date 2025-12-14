import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const WEBHOOK_URL = "https://n8n.exavo.app/webhook/Client-webhook";

interface BookingPayload {
  package: string;
  package_id: string;
  service: string;
  service_id: string;
  full_name: string;
  email: string;
  phone?: string;
  company?: string;
  country?: string;
  project_description?: string;
  preferred_communication?: string;
  preferred_timeline?: string;
  is_guest: boolean;
  user_id: string | null;
  submitted_at: string;
  source_url: string;
  utm: {
    utm_source?: string;
    utm_medium?: string;
    utm_campaign?: string;
    utm_content?: string;
    utm_term?: string;
  };
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[BOOKING-WEBHOOK] Received booking submission request');

    const payload: BookingPayload = await req.json();
    
    // Validate required fields
    if (!payload.full_name || !payload.email) {
      console.log('[BOOKING-WEBHOOK] Validation failed: missing required fields');
      return new Response(
        JSON.stringify({ success: false, error: 'Name and email are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[BOOKING-WEBHOOK] Sending to webhook:', {
      service: payload.service,
      package: payload.package,
      email: payload.email,
      is_guest: payload.is_guest
    });

    // Forward to n8n webhook
    const webhookResponse = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    console.log('[BOOKING-WEBHOOK] Webhook response status:', webhookResponse.status);

    if (!webhookResponse.ok) {
      const errorText = await webhookResponse.text();
      console.error('[BOOKING-WEBHOOK] Webhook error:', errorText);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Failed to submit booking request. Please try again.' 
        }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[BOOKING-WEBHOOK] Booking submitted successfully');

    return new Response(
      JSON.stringify({ success: true, message: 'Booking submitted successfully' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[BOOKING-WEBHOOK] Error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'An unexpected error occurred. Please try again.' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
