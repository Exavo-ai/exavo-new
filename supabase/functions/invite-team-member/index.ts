import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const sendInvitationEmail = async (to: string, role: string, inviterEmail: string) => {
  try {
    const emailResponse = await resend.emails.send({
      from: "info@exavo.ai",
      replyTo: "info@exavo.ai",
      to: [to],
      subject: "You've been invited to join a team on Exavo",
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center; border-radius: 8px 8px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 28px;">Team Invitation</h1>
            </div>
            <div style="background: #ffffff; padding: 40px 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 8px 8px;">
              <p style="font-size: 16px; margin-bottom: 20px;">Hello!</p>
              <p style="font-size: 16px; margin-bottom: 20px;">
                You've been invited by <strong>${inviterEmail}</strong> to join their team on Exavo as a <strong>${role}</strong>.
              </p>
              <p style="font-size: 16px; margin-bottom: 30px;">
                To accept this invitation and get started, please create your account or log in at:
              </p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="https://exavo.ai/register" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block; font-size: 16px;">Accept Invitation</a>
              </div>
              <p style="font-size: 14px; color: #666; margin-top: 30px;">
                If you didn't expect this invitation, you can safely ignore this email.
              </p>
              <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">
              <p style="font-size: 12px; color: #999; text-align: center; margin: 0;">
                Exavo - AI-Powered Business Solutions<br>
                <a href="https://exavo.ai" style="color: #667eea; text-decoration: none;">exavo.ai</a>
              </p>
            </div>
          </body>
        </html>
      `,
    });

    console.log(`Invitation email sent to ${to}:`, emailResponse);
    return { success: true, data: emailResponse };
  } catch (error) {
    console.error(`Failed to send invitation email to ${to}:`, error);
    return { success: false, error: error.message };
  }
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create client for auth verification
    const supabaseAuth = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser(token);

    if (userError || !user) {
      throw new Error("Unauthorized");
    }

    // Create client with service role for database operations (bypasses RLS)
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { email, role } = await req.json();

    if (!email || !role) {
      throw new Error("Email and role are required");
    }

    // Validate role
    if (!["Admin", "Member", "Viewer"].includes(role)) {
      throw new Error("Invalid role");
    }

    // Check if member already exists
    const { data: existing, error: existingError } = await supabaseClient
      .from("team_members")
      .select("id")
      .eq("organization_id", user.id)
      .eq("email", email)
      .maybeSingle();

    // Only throw error if there's a database error (not "not found")
    if (existingError) {
      console.error("Error checking existing member:", existingError);
      throw new Error(`Failed to check existing member: ${existingError.message}`);
    }

    if (existing) {
      throw new Error("Team member with this email already exists");
    }

    // Create team member
    const { data: member, error: insertError } = await supabaseClient
      .from("team_members")
      .insert({
        organization_id: user.id,
        email,
        role,
        status: "pending",
        invited_by: user.id,
      })
      .select()
      .single();

    if (insertError) {
      throw new Error(`Failed to create team member: ${insertError.message}`);
    }

    // Send invitation email
    console.log(`Team member invited: ${email} with role ${role}`);
    
    const emailResult = await sendInvitationEmail(email, role, user.email || "a team member");
    
    if (!emailResult.success) {
      console.error(`Warning: Team member created but email failed: ${emailResult.error}`);
      return new Response(
        JSON.stringify({ 
          success: true, 
          member, 
          warning: "Team member invited but email notification failed to send. Please contact them directly.",
          emailError: emailResult.error 
        }), 
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    console.log(`Invitation email sent successfully to ${email}`);
    return new Response(JSON.stringify({ success: true, member }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});