import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function sendEmail(to: string[], subject: string, html: string) {
  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
  
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "ExavoAI <onboarding@resend.dev>",
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
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { paymentId, appointmentId, userId } = await req.json();

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get payment and appointment details
    const { data: payment } = await supabase
      .from('payments')
      .select('*, appointments(*, services(name, name_ar)), profiles(email, full_name)')
      .eq('id', paymentId)
      .single();

    if (!payment) {
      throw new Error('Payment not found');
    }

    const appointment = payment.appointments;
    const profile = payment.profiles;

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

        <h2>Appointment Details:</h2>
        <ul>
          <li><strong>Service:</strong> ${appointment.services?.name}</li>
          <li><strong>Date:</strong> ${appointment.appointment_date}</li>
          <li><strong>Time:</strong> ${appointment.appointment_time}</li>
        </ul>

        <p>We look forward to serving you!</p>
        <p>Best regards,<br>The ExavoAI Team</p>
      `
    );

    // Send email to admin
    await sendEmail(
      ["ahmed@exavoai.io"],
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
          <li><strong>Name:</strong> ${profile.full_name}</li>
          <li><strong>Email:</strong> ${profile.email}</li>
        </ul>

        <h2>Appointment Details:</h2>
        <ul>
          <li><strong>Service:</strong> ${appointment.services?.name}</li>
          <li><strong>Date:</strong> ${appointment.appointment_date}</li>
          <li><strong>Time:</strong> ${appointment.appointment_time}</li>
        </ul>
      `
    );

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error sending payment confirmation:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});