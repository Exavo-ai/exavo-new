import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.1";
import { Resend } from "https://esm.sh/resend@4.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface TicketReplyRequest {
  ticketId: string;
  replyMessage: string;
  adminUserId: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { ticketId, replyMessage, adminUserId }: TicketReplyRequest = await req.json();

    console.log("Processing ticket reply notification for ticket:", ticketId);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch ticket details and user email
    const { data: ticket, error: ticketError } = await supabase
      .from("tickets")
      .select(`
        id,
        subject,
        user_id,
        status
      `)
      .eq("id", ticketId)
      .single();

    if (ticketError || !ticket) {
      console.error("Error fetching ticket:", ticketError);
      throw new Error("Ticket not found");
    }

    console.log("Ticket found:", ticket);

    // Fetch user profile to get email
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("email, full_name")
      .eq("id", ticket.user_id)
      .single();

    if (profileError || !profile) {
      console.error("Error fetching user profile:", profileError);
      throw new Error("User profile not found");
    }

    console.log("Sending email to:", profile.email);

    // Send email notification using Resend
    const emailResponse = await resend.emails.send({
      from: "Exavo Support <onboarding@resend.dev>",
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

    console.log("Email sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({
        success: true,
        emailId: emailResponse.data?.id,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  } catch (error: any) {
    console.error("Error in send-ticket-reply-notification function:", error);
    return new Response(
      JSON.stringify({
        error: error.message,
        details: error.toString(),
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  }
};

serve(handler);
