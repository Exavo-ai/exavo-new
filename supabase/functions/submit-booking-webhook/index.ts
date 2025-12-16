import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Use environment variable with fallback for backward compatibility
const WEBHOOK_URL = Deno.env.get('N8N_WEBHOOK_URL') || "https://n8n.exavo.app/webhook/Client-webhook";
const WEBHOOK_SECRET = Deno.env.get('N8N_WEBHOOK_SECRET');

// Rate limiting - in-memory store (resets on cold start)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute

function getClientIP(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("cf-connecting-ip") ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

function checkRateLimit(ip: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  
  if (!entry || now > entry.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true };
  }
  
  if (entry.count >= RATE_LIMIT_MAX) {
    const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
    return { allowed: false, retryAfter };
  }
  
  entry.count++;
  return { allowed: true };
}

// Comprehensive input validation schema
const utmSchema = z.object({
  utm_source: z.string().max(100).optional(),
  utm_medium: z.string().max(100).optional(),
  utm_campaign: z.string().max(200).optional(),
  utm_content: z.string().max(200).optional(),
  utm_term: z.string().max(200).optional(),
}).optional();

const bookingSchema = z.object({
  package: z.string().trim().max(200, "Package name too long"),
  package_id: z.string().uuid("Invalid package ID").optional().nullable(),
  service: z.string().trim().max(200, "Service name too long"),
  service_id: z.string().uuid("Invalid service ID").optional().nullable(),
  full_name: z.string()
    .trim()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name must be less than 100 characters")
    .regex(/^[a-zA-Z\s\-'\.]+$/, "Name contains invalid characters"),
  email: z.string()
    .trim()
    .email("Invalid email address")
    .max(255, "Email must be less than 255 characters"),
  phone: z.string()
    .trim()
    .regex(/^[+]?[0-9\s\-()]*$/, "Invalid phone number format")
    .max(20, "Phone number must be less than 20 characters")
    .optional()
    .nullable()
    .transform(val => val || null),
  company: z.string()
    .trim()
    .max(200, "Company name must be less than 200 characters")
    .optional()
    .nullable()
    .transform(val => val || null),
  country: z.string()
    .trim()
    .max(100, "Country must be less than 100 characters")
    .optional()
    .nullable()
    .transform(val => val || null),
  project_description: z.string()
    .trim()
    .max(5000, "Project description must be less than 5000 characters")
    .optional()
    .nullable()
    .transform(val => val || null),
  preferred_communication: z.string()
    .trim()
    .max(50, "Preferred communication must be less than 50 characters")
    .optional()
    .nullable()
    .transform(val => val || null),
  preferred_timeline: z.string()
    .trim()
    .max(100, "Preferred timeline must be less than 100 characters")
    .optional()
    .nullable()
    .transform(val => val || null),
  is_guest: z.boolean(),
  user_id: z.string().uuid("Invalid user ID").optional().nullable(),
  submitted_at: z.string().datetime().optional(),
  source_url: z.string()
    .url("Invalid source URL")
    .max(2000, "Source URL too long")
    .optional()
    .nullable()
    .transform(val => val || null),
  utm: utmSchema,
});

type BookingPayload = z.infer<typeof bookingSchema>;

// Generate HMAC signature for webhook authentication
async function generateHmacSignature(payload: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const clientIP = getClientIP(req);

  try {
    // Check rate limit
    const rateLimitResult = checkRateLimit(clientIP);
    if (!rateLimitResult.allowed) {
      console.log(`[BOOKING-WEBHOOK] Rate limit exceeded for IP: ${clientIP}`);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Too many requests. Please try again later.',
          retryAfter: rateLimitResult.retryAfter 
        }),
        { 
          status: 429, 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json',
            'Retry-After': String(rateLimitResult.retryAfter)
          } 
        }
      );
    }

    console.log('[BOOKING-WEBHOOK] Received booking submission request');

    // Parse and validate request body
    let rawPayload: unknown;
    try {
      rawPayload = await req.json();
    } catch {
      console.log('[BOOKING-WEBHOOK] Invalid JSON in request body');
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid request body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate with Zod schema
    const validationResult = bookingSchema.safeParse(rawPayload);
    
    if (!validationResult.success) {
      const firstError = validationResult.error.errors[0];
      console.log('[BOOKING-WEBHOOK] Validation failed:', firstError?.message);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: firstError?.message || 'Validation error',
          details: validationResult.error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message
          }))
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const payload: BookingPayload = validationResult.data;

    // Ensure submitted_at is set
    const submissionPayload = {
      ...payload,
      submitted_at: payload.submitted_at || new Date().toISOString(),
    };

    console.log('[BOOKING-WEBHOOK] Sending to webhook:', {
      service: payload.service,
      package: payload.package,
      email: payload.email.substring(0, 3) + '***', // Log partial email for debugging
      is_guest: payload.is_guest
    });

    // Prepare webhook request headers
    const webhookHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Add HMAC signature if secret is configured
    const payloadString = JSON.stringify(submissionPayload);
    if (WEBHOOK_SECRET) {
      const signature = await generateHmacSignature(payloadString, WEBHOOK_SECRET);
      webhookHeaders['X-Webhook-Signature'] = signature;
      webhookHeaders['X-Webhook-Timestamp'] = Date.now().toString();
      console.log('[BOOKING-WEBHOOK] Added HMAC signature to request');
    } else {
      console.log('[BOOKING-WEBHOOK] Warning: N8N_WEBHOOK_SECRET not configured, sending without signature');
    }

    // Forward to n8n webhook
    const webhookResponse = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: webhookHeaders,
      body: payloadString,
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
