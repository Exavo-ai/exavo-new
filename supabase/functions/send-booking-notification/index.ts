import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "X-Frame-Options": "DENY",
  "X-Content-Type-Options": "nosniff",
  "X-XSS-Protection": "1; mode=block",
  "Referrer-Policy": "no-referrer-when-downgrade",
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload",
  "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
  "Pragma": "no-cache",
};

const bookingSchema = z.object({
  full_name: z.string().trim().min(2, "Name must be at least 2 characters").max(100),
  email: z.string().trim().email("Invalid email address"),
  phone: z.string().trim().min(5, "Phone number is required").max(20),
  service: z.string().min(1, "Service is required"),
  appointment_date: z.string().min(1, "Appointment date is required"),
  appointment_time: z.string().min(1, "Appointment time is required"),
  notes: z.string().max(1000, "Notes must be less than 1000 characters").optional(),
});

function successResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify({ success: true, data }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function errorResponse(code: string, message: string, status: number, details?: unknown): Response {
  const errorObj: { code: string; message: string; details?: unknown } = { code, message };
  if (details !== undefined) errorObj.details = details;
  return new Response(JSON.stringify({ success: false, error: errorObj }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function sendEmail(to: string[], subject: string, html: string, attachments?: { filename: string; content: string }[]) {
  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
  if (!RESEND_API_KEY) {
    throw new Error("Email service not configured");
  }
  
  const emailPayload: Record<string, unknown> = {
    from: "Exavo AI <onboarding@resend.dev>",
    to,
    subject,
    html,
  };

  if (attachments && attachments.length > 0) {
    emailPayload.attachments = attachments;
  }
  
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(emailPayload),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Email send failed: ${error.message || JSON.stringify(error)}`);
  }

  return await response.json();
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse and validate request body
    let body;
    try {
      body = await req.json();
    } catch {
      return errorResponse("BAD_REQUEST", "Invalid JSON in request body", 400);
    }

    const validation = bookingSchema.safeParse(body);
    if (!validation.success) {
      const firstError = validation.error.errors[0];
      return errorResponse("VALIDATION_ERROR", firstError?.message || "Validation failed", 422,
        validation.error.errors.map(e => ({ field: e.path.join("."), message: e.message }))
      );
    }

    const booking = validation.data;

    // Generate CSV
    const csvContent = `Name,Email,Phone,Service,Date,Time,Notes\n"${booking.full_name}","${booking.email}","${booking.phone}","${booking.service}","${booking.appointment_date}","${booking.appointment_time}","${booking.notes || 'N/A'}"`;
    const csvBase64 = btoa(csvContent);

    // Send admin email
    const adminEmail = await sendEmail(
      ["info@exavo.ai"],
      `New Booking: ${booking.service}`,
      `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #6E00FF;">New Service Booking</h1>
          <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h2 style="margin-top: 0;">Client Details</h2>
            <p><strong>Name:</strong> ${booking.full_name}</p>
            <p><strong>Email:</strong> ${booking.email}</p>
            <p><strong>Phone:</strong> ${booking.phone}</p>
          </div>
          <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h2 style="margin-top: 0;">Booking Details</h2>
            <p><strong>Service:</strong> ${booking.service}</p>
            <p><strong>Date:</strong> ${booking.appointment_date}</p>
            <p><strong>Time:</strong> ${booking.appointment_time}</p>
            ${booking.notes ? `<p><strong>Notes:</strong> ${booking.notes}</p>` : ''}
          </div>
        </div>
      `,
      [{ filename: `booking-${booking.full_name.replace(/\s+/g, '-')}-${Date.now()}.csv`, content: csvBase64 }]
    );

    // Send client confirmation
    const clientEmail = await sendEmail(
      [booking.email],
      "Booking Confirmed - Exavo AI",
      `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #6E00FF;">Thank You for Your Booking!</h1>
          <p>Dear ${booking.full_name},</p>
          <p>We've received your booking request for <strong>${booking.service}</strong>.</p>
          <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h2 style="margin-top: 0;">Booking Summary</h2>
            <p><strong>Service:</strong> ${booking.service}</p>
            <p><strong>Date:</strong> ${booking.appointment_date}</p>
            <p><strong>Time:</strong> ${booking.appointment_time}</p>
          </div>
          <p>Our team will review your request and contact you shortly.</p>
          <p>Best regards,<br>The Exavo AI Team</p>
        </div>
      `
    );

    console.log("Emails sent successfully");
    return successResponse({ adminEmail, clientEmail });

  } catch (error) {
    console.error("Error:", error);
    const message = error instanceof Error ? error.message : "Failed to send notification";
    return errorResponse("INTERNAL_ERROR", message, 500);
  }
});
