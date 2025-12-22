import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { corsHeaders, successResponse, errors, handleCors } from "../_shared/response.ts";

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
    const body = await req.json();
    console.log("[PAYMENT-CONFIRMATION] Received request:", JSON.stringify(body));

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Handle new format (from package purchase)
    if (body.customerEmail && body.serviceName) {
      const { 
        customerEmail, 
        customerName, 
        serviceName, 
        packageName, 
        amount, 
        currency, 
        receiptUrl,
        invoiceUrl,
        paymentId 
      } = body;

      console.log("[PAYMENT-CONFIRMATION] Processing package purchase confirmation for:", customerEmail);

      const formattedAmount = typeof amount === 'number' 
        ? `${currency} ${amount.toFixed(2)}` 
        : `${currency} ${amount}`;

      // Send email to client
      await sendEmail(
        [customerEmail],
        "Payment Confirmation - ExavoAI",
        `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 28px;">Payment Successful! ✓</h1>
            </div>
            
            <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
              <p style="font-size: 16px;">Dear ${customerName || 'Valued Client'},</p>
              <p style="font-size: 16px;">Thank you for your purchase! Your payment has been successfully processed.</p>
              
              <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea;">
                <h2 style="margin: 0 0 15px 0; font-size: 18px; color: #667eea;">Order Details</h2>
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 8px 0; color: #666;">Service:</td>
                    <td style="padding: 8px 0; font-weight: 600; text-align: right;">${serviceName}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #666;">Package:</td>
                    <td style="padding: 8px 0; font-weight: 600; text-align: right;">${packageName}</td>
                  </tr>
                  <tr style="border-top: 1px solid #eee;">
                    <td style="padding: 12px 0 8px 0; color: #666; font-size: 18px;">Total Paid:</td>
                    <td style="padding: 12px 0 8px 0; font-weight: 700; text-align: right; font-size: 18px; color: #667eea;">${formattedAmount}</td>
                  </tr>
                </table>
              </div>

              ${receiptUrl ? `
              <div style="text-align: center; margin: 25px 0;">
                <a href="${receiptUrl}" style="display: inline-block; background: #667eea; color: white; padding: 12px 30px; border-radius: 6px; text-decoration: none; font-weight: 600;">View Receipt</a>
              </div>
              ` : ''}

              ${invoiceUrl ? `
              <div style="text-align: center; margin: 25px 0;">
                <a href="${invoiceUrl}" style="display: inline-block; background: white; color: #667eea; padding: 12px 30px; border-radius: 6px; text-decoration: none; font-weight: 600; border: 2px solid #667eea;">Download Invoice</a>
              </div>
              ` : ''}

              <div style="background: #e8f4fd; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 0; font-size: 14px; color: #1a73e8;">
                  <strong>What's Next?</strong><br>
                  Our team will begin working on your project shortly. You can track progress in your client portal.
                </p>
              </div>

              <p style="font-size: 14px; color: #666; margin-top: 30px;">
                If you have any questions, please don't hesitate to reach out to us at <a href="mailto:info@exavo.ai" style="color: #667eea;">info@exavo.ai</a>
              </p>

              <p style="font-size: 14px; color: #666;">
                Best regards,<br>
                <strong>The ExavoAI Team</strong>
              </p>
            </div>
          </body>
          </html>
        `
      );

      // Send email to admin
      await sendEmail(
        ["info@exavo.ai"],
        `New Payment Received - ${formattedAmount}`,
        `
          <h1>New Payment Received</h1>
          
          <h2>Payment Details:</h2>
          <ul>
            <li><strong>Amount:</strong> ${formattedAmount}</li>
            <li><strong>Payment ID:</strong> ${paymentId || 'N/A'}</li>
          </ul>

          <h2>Purchase Details:</h2>
          <ul>
            <li><strong>Service:</strong> ${serviceName}</li>
            <li><strong>Package:</strong> ${packageName}</li>
          </ul>

          <h2>Client Details:</h2>
          <ul>
            <li><strong>Name:</strong> ${customerName || 'N/A'}</li>
            <li><strong>Email:</strong> ${customerEmail}</li>
          </ul>

          ${receiptUrl ? `<p><a href="${receiptUrl}">View Receipt</a></p>` : ''}
        `
      );

      console.log("[PAYMENT-CONFIRMATION] ✓ Confirmation emails sent successfully");

      return successResponse({ 
        message: "Payment confirmation sent",
        email: customerEmail 
      });
    }

    // Handle legacy format (from appointment payment)
    const { paymentId, userId } = body;

    if (!paymentId) {
      console.log("[PAYMENT-CONFIRMATION] No paymentId or customerEmail provided");
      return errors.badRequest("Missing required fields");
    }

    console.log("[PAYMENT-CONFIRMATION] Processing legacy payment confirmation:", paymentId);

    // Get payment and appointment details
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .select('*, appointments(*, services(name, name_ar)), profiles:user_id(email, full_name)')
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

    const formattedAmount = `${payment.currency} ${payment.amount}`;

    // Send email to client
    await sendEmail(
      [profile.email],
      "Payment Confirmation - ExavoAI",
      `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0;">Payment Confirmed! ✓</h1>
          </div>
          
          <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
            <p>Dear ${profile.full_name || 'Valued Client'},</p>
            <p>Your payment has been successfully processed.</p>
            
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea;">
              <h2 style="margin: 0 0 15px 0; color: #667eea;">Payment Details</h2>
              <p><strong>Amount:</strong> ${formattedAmount}</p>
              <p><strong>Payment ID:</strong> ${payment.id}</p>
              <p><strong>Date:</strong> ${new Date(payment.created_at).toLocaleDateString()}</p>
            </div>

            ${appointment ? `
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h2 style="margin: 0 0 15px 0;">Appointment Details</h2>
              <p><strong>Service:</strong> ${appointment.services?.name || 'N/A'}</p>
              <p><strong>Date:</strong> ${appointment.appointment_date}</p>
              <p><strong>Time:</strong> ${appointment.appointment_time}</p>
            </div>
            ` : ''}

            ${payment.stripe_receipt_url ? `
            <div style="text-align: center; margin: 25px 0;">
              <a href="${payment.stripe_receipt_url}" style="display: inline-block; background: #667eea; color: white; padding: 12px 30px; border-radius: 6px; text-decoration: none; font-weight: 600;">View Receipt</a>
            </div>
            ` : ''}

            <p style="font-size: 14px; color: #666; margin-top: 30px;">
              Best regards,<br>
              <strong>The ExavoAI Team</strong>
            </p>
          </div>
        </body>
        </html>
      `
    );

    // Send email to admin
    await sendEmail(
      ["info@exavo.ai"],
      `New Payment Received - ${formattedAmount}`,
      `
        <h1>New Payment Received</h1>
        
        <h2>Payment Details:</h2>
        <ul>
          <li><strong>Amount:</strong> ${formattedAmount}</li>
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