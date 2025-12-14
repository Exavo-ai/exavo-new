import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { corsHeaders, successResponse, errors, handleCors } from "../_shared/response.ts";
import { z, validateBody, formatZodError } from "../_shared/validation.ts";

// Request validation schema
const paymentConfirmationSchema = z.object({
  paymentId: z.string().uuid("Invalid payment ID format"),
  appointmentId: z.string().uuid("Invalid appointment ID format").optional(),
  userId: z.string().uuid("Invalid user ID format"),
});

async function sendEmail(to: string[], subject: string, html: string) {
  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
  
  if (!RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY not configured");
  }
  
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "ExavoAI <info@exavoai.io>",
      to,
      subject,
      html,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to send email: ${error}`);
  }

  return await response.json();
}

serve(async (req) => {
  // Handle CORS
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  // Only allow POST
  if (req.method !== "POST") {
    console.log("[PAYMENT-CONFIRMATION] Invalid method:", req.method);
    return errors.badRequest(`Method ${req.method} not allowed. Use POST.`);
  }

  try {
    // Validate request body
    const { data: body, error: validationError } = await validateBody(req, paymentConfirmationSchema);
    if (validationError) {
      console.log("[PAYMENT-CONFIRMATION] Validation error:", validationError.errors);
      const formatted = formatZodError(validationError);
      return errors.validationError(formatted.message, formatted.details);
    }

    const { paymentId, userId } = body;

    console.log("[PAYMENT-CONFIRMATION] Processing payment confirmation:", paymentId);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get payment and appointment details
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .select('*, appointments(*, services(name, name_ar)), profiles(email, full_name)')
      .eq('id', paymentId)
      .single();

    if (paymentError || !payment) {
      console.error("[PAYMENT-CONFIRMATION] Payment not found:", paymentError);
      return errors.notFound("Payment");
    }

    const appointment = payment.appointments;
    const profile = payment.profiles;

    if (!profile?.email) {
      console.error("[PAYMENT-CONFIRMATION] No email found for user");
      return errors.badRequest("User email not found");
    }

    // Send email to client
    await sendEmail(
      [profile.email],
      "Payment Confirmation - ExavoAI",
      `
        <h1>Payment Confirmed!</h1>
        <p>Dear ${profile.full_name || 'Valued Client'},</p>
        <p>Your payment has been successfully processed.</p>
        
        <h2>Payment Details:</h2>
        <ul>
          <li><strong>Amount:</strong> ${payment.amount} ${payment.currency}</li>
          <li><strong>Payment ID:</strong> ${payment.id}</li>
          <li><strong>Date:</strong> ${new Date(payment.created_at).toLocaleDateString()}</li>
        </ul>

        ${appointment ? `
        <h2>Appointment Details:</h2>
        <ul>
          <li><strong>Service:</strong> ${appointment.services?.name || 'N/A'}</li>
          <li><strong>Date:</strong> ${appointment.appointment_date}</li>
          <li><strong>Time:</strong> ${appointment.appointment_time}</li>
        </ul>
        ` : ''}

        <p>We look forward to serving you!</p>
        <p>Best regards,<br>The ExavoAI Team</p>
      `
    );

    // Send email to admin
    await sendEmail(
      ["info@exavo.ai"],
      "New Payment Received - ExavoAI",
      `
        <h1>New Payment Received</h1>
        
        <h2>Payment Details:</h2>
        <ul>
          <li><strong>Amount:</strong> ${payment.amount} ${payment.currency}</li>
          <li><strong>Payment ID:</strong> ${payment.id}</li>
          <li><strong>Status:</strong> ${payment.status}</li>
        </ul>

        <h2>Client Details:</h2>
        <ul>
          <li><strong>Name:</strong> ${profile.full_name || 'N/A'}</li>
          <li><strong>Email:</strong> ${profile.email}</li>
        </ul>

        ${appointment ? `
        <h2>Appointment Details:</h2>
        <ul>
          <li><strong>Service:</strong> ${appointment.services?.name || 'N/A'}</li>
          <li><strong>Date:</strong> ${appointment.appointment_date}</li>
          <li><strong>Time:</strong> ${appointment.appointment_time}</li>
        </ul>
        ` : ''}
      `
    );

    console.log("[PAYMENT-CONFIRMATION] ✓ Confirmation emails sent successfully");

    return successResponse({ 
      message: "Payment confirmation sent",
      paymentId: payment.id 
    });

  } catch (error) {
    console.error('[PAYMENT-CONFIRMATION] Error:', error);
    return errors.internal(error instanceof Error ? error.message : 'Unknown error');
  }
});
