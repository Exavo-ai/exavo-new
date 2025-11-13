import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface BookingData {
  full_name: string;
  email: string;
  phone: string;
  service: string;
  appointment_date: string;
  appointment_time: string;
  notes?: string;
}

async function sendEmail(to: string[], subject: string, html: string) {
  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
  
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Exavo AI <onboarding@resend.dev>",
      to,
      subject,
      html,
    }),
  });

  return await response.json();
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const booking: BookingData = await req.json();

    // Email to admin
    const adminEmail = await sendEmail(
      ["ahmed@exavoai.io"],
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
          <p style="color: #666;">Please review and confirm this booking in the admin dashboard.</p>
        </div>
      `
    );

    // Confirmation email to client
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
          <p>Our team will review your request and contact you shortly to confirm the details.</p>
          <p style="color: #666;">If you have any questions, please don't hesitate to reach out.</p>
          <p>Best regards,<br>The Exavo AI Team</p>
        </div>
      `
    );

    console.log("Emails sent successfully:", { adminEmail, clientEmail });

    return new Response(
      JSON.stringify({ success: true, adminEmail, clientEmail }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error sending emails:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
