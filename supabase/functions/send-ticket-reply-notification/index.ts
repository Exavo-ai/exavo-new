import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { Resend } from "https://esm.sh/resend@4.0.0";
import { corsHeaders, successResponse, errors, handleCors } from "../_shared/response.ts";
import { z, validateBody, formatZodError } from "../_shared/validation.ts";

// Request validation schema
const ticketReplySchema = z.object({
  ticketId: z.string().uuid("Invalid ticket ID format"),
  replyMessage: z.string().trim().min(1, "Reply message is required").max(10000, "Message too long"),
  adminUserId: z.string().uuid("Invalid admin user ID format"),
});

serve(async (req) => {
  // Handle CORS
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  // Only allow POST
  if (req.method !== "POST") {
    console.log("[TICKET-REPLY] Invalid method:", req.method);
    return errors.badRequest(`Method ${req.method} not allowed. Use POST.`);
  }

  try {
    // Validate request body
    const { data: body, error: validationError } = await validateBody(req, ticketReplySchema);
    if (validationError) {
      console.log("[TICKET-REPLY] Validation error:", validationError.errors);
      const formatted = formatZodError(validationError);
      return errors.validationError(formatted.message, formatted.details);
    }

    const { ticketId, replyMessage, adminUserId } = body;

    console.log("[TICKET-REPLY] Processing notification for ticket:", ticketId);

    // Initialize clients
    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) {
      console.error("[TICKET-REPLY] RESEND_API_KEY not configured");
      return errors.internal("Email service not configured");
    }
    
    const resend = new Resend(resendKey);
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch ticket details
    const { data: ticket, error: ticketError } = await supabase
      .from("tickets")
      .select("id, subject, user_id, status")
      .eq("id", ticketId)
      .single();

    if (ticketError || !ticket) {
      console.error("[TICKET-REPLY] Ticket not found:", ticketError);
      return errors.notFound("Ticket");
    }

    console.log("[TICKET-REPLY] Ticket found:", ticket.id);

    // Fetch user profile to get email
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("email, full_name")
      .eq("id", ticket.user_id)
      .single();

    if (profileError || !profile) {
      console.error("[TICKET-REPLY] User profile not found:", profileError);
      return errors.notFound("User profile");
    }

    console.log("[TICKET-REPLY] Sending email to:", profile.email);

    // Send email notification
    const emailResponse = await resend.emails.send({
      from: "Exavo Support <info@exavoai.io>",
      to: [profile.email],
      subject: `New Reply to Your Support Ticket: ${ticket.subject}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #333; border-bottom: 2px solid #0066cc; padding-bottom: 10px;">
            New Reply to Your Support Ticket
          </h1>
          
          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h2 style="color: #555; margin-top: 0;">Ticket: ${ticket.subject}</h2>
            <p style="color: #666; margin: 5px 0;"><strong>Status:</strong> ${ticket.status}</p>
          </div>

          <div style="background-color: #fff; padding: 20px; border: 1px solid #ddd; border-radius: 5px; margin: 20px 0;">
            <h3 style="color: #333; margin-top: 0;">Admin Reply:</h3>
            <p style="color: #333; line-height: 1.6; white-space: pre-wrap;">${replyMessage}</p>
          </div>

          <p style="color: #666; margin: 20px 0;">
            To view the full conversation and reply, please log in to your account.
          </p>

          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
            <p style="color: #999; font-size: 12px; margin: 5px 0;">
              This is an automated message from Exavo Support. Please do not reply directly to this email.
            </p>
          </div>
        </div>
      `,
    });

    console.log("[TICKET-REPLY] ✓ Email sent successfully:", emailResponse.data?.id);

    return successResponse({
      message: "Notification sent successfully",
      emailId: emailResponse.data?.id,
    });
  } catch (error) {
    console.error("[TICKET-REPLY] Error:", error);
    return errors.internal(error instanceof Error ? error.message : 'Unknown error');
  }
});
