import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { corsHeaders, successResponse, errors, handleCors } from "../_shared/response.ts";
import { z, validateBody, formatZodError } from "../_shared/validation.ts";

// Request validation schema
const signupDataSchema = z.object({
  email: z.string().trim().email("Invalid email address").max(255),
  full_name: z.string().trim().min(1, "Name is required").max(100),
  phone: z.string().trim().max(20).optional().nullable(),
  created_at: z.string().optional(),
});

serve(async (req) => {
  // Handle CORS
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  // Only allow POST
  if (req.method !== "POST") {
    console.log("[SIGNUP-WEBHOOK] Invalid method:", req.method);
    return errors.badRequest(`Method ${req.method} not allowed. Use POST.`);
  }

  try {
    // Validate request body
    const { data: signupData, error: validationError } = await validateBody(req, signupDataSchema);
    if (validationError) {
      console.log("[SIGNUP-WEBHOOK] Validation error:", validationError.errors);
      const formatted = formatZodError(validationError);
      return errors.validationError(formatted.message, formatted.details);
    }

    console.log("[SIGNUP-WEBHOOK] Sending signup data to webhook:", signupData.email);

    const webhookUrl = "https://n8n.exavo.app/webhook/lovable-form";
    
    const webhookResponse = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: signupData.full_name,
        email: signupData.email,
        phone: signupData.phone || null,
        created_at: signupData.created_at || new Date().toISOString(),
        source: "exavo-platform",
      }),
    });

    if (!webhookResponse.ok) {
      const errorText = await webhookResponse.text();
      console.error("[SIGNUP-WEBHOOK] Webhook response not OK:", webhookResponse.status, errorText);
      // Don't fail the request if webhook fails - it's not critical
      return successResponse({ 
        webhookSent: false, 
        message: "Signup recorded but webhook failed" 
      });
    }

    console.log("[SIGNUP-WEBHOOK] ✓ Webhook sent successfully");

    return successResponse({ 
      webhookSent: true,
      message: "Signup data sent to webhook successfully"
    });
  } catch (error) {
    console.error("[SIGNUP-WEBHOOK] Error:", error);
    return errors.internal(error instanceof Error ? error.message : 'Unknown error');
  }
});
