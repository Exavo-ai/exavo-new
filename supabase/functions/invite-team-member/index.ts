import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const sendInvitationEmail = async (to: string, role: string, inviterEmail: string, inviteToken: string) => {
  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
  
  if (!RESEND_API_KEY) {
    console.error("[INVITE-EMAIL] RESEND_API_KEY not configured");
    return { success: false, error: "Email service not configured" };
  }
  
  try {
    console.log(`[INVITE-EMAIL] Sending invitation to ${to} with role ${role}`);
    
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Exavo AI <info@exavoai.io>",
        reply_to: "info@exavoai.io",
        to: [to],
        subject: "You've been invited to join Exavo AI",
        html: `
          <!DOCTYPE html>
          <html lang="en">
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <meta http-equiv="X-UA-Compatible" content="IE=edge">
              <title>Team Invitation - Exavo AI</title>
            </head>
            <body style="margin: 0; padding: 0; background-color: #0a0a1b; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #0a0a1b;">
                <tr>
                  <td style="padding: 40px 20px;">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 600px; margin: 0 auto; background-color: #1a1a2e; border-radius: 16px; overflow: hidden; box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);">
                      
                      <!-- Header with Logo -->
                      <tr>
                        <td style="padding: 40px 32px 32px; text-align: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
                          <img src="https://exavo.ai/assets/exavo-logo.png" alt="Exavo AI" style="height: 48px; width: auto; display: inline-block; margin-bottom: 16px;" />
                          <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700; line-height: 1.3; letter-spacing: -0.5px;">Team Invitation</h1>
                        </td>
                      </tr>
                      
                      <!-- Content -->
                      <tr>
                        <td style="padding: 48px 40px; color: #e5e7eb;">
                          <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.6; color: #f3f4f6;">Hello <strong>${to}</strong>,</p>
                          
                          <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.6;">
                            <strong style="color: #667eea;">${inviterEmail}</strong> has invited you to join their workspace on Exavo AI as a <strong style="color: #a78bfa;">${role}</strong>.
                          </p>
                          
                          <p style="margin: 0 0 32px; font-size: 15px; line-height: 1.6; color: #9ca3af;">
                            Exavo AI provides powerful AI-driven solutions to streamline your business operations, boost productivity, and transform how your team works together.
                          </p>
                          
                          <!-- CTA Button -->
                          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                            <tr>
                              <td style="text-align: center; padding: 0 0 32px;">
                                <a href="https://exavo.ai/client/invite/accept?token=${inviteToken}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; font-size: 16px; font-weight: 600; text-decoration: none; padding: 16px 48px; border-radius: 10px; box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);">Accept Invitation</a>
                              </td>
                            </tr>
                          </table>
                          
                          <!-- Fallback URL -->
                          <p style="margin: 0 0 32px; font-size: 14px; line-height: 1.6; color: #9ca3af; text-align: center; padding-top: 16px; border-top: 1px solid #374151;">
                            Or copy and paste this URL into your browser:<br/>
                            <a href="https://exavo.ai/client/invite/accept?token=${inviteToken}" style="color: #667eea; text-decoration: underline; word-break: break-all;">https://exavo.ai/client/invite/accept?token=${inviteToken}</a>
                          </p>
                          
                          <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #6b7280;">
                            If you didn't expect this invitation, you can safely ignore this email. The invitation will expire in 7 days.
                          </p>
                        </td>
                      </tr>
                      
                      <!-- Footer -->
                      <tr>
                        <td style="padding: 32px 40px; background-color: #0f0f23; text-align: center; border-top: 1px solid #374151;">
                          <p style="margin: 0 0 12px; font-size: 14px; color: #9ca3af; line-height: 1.5;">
                            <strong style="color: #e5e7eb;">Exavo AI</strong><br/>
                            AI-Powered Business Solutions
                          </p>
                          <p style="margin: 0; font-size: 13px; color: #6b7280;">
                            <a href="https://exavo.ai" style="color: #667eea; text-decoration: none; margin-right: 16px;">Website</a>
                            <a href="mailto:info@exavoai.io" style="color: #667eea; text-decoration: none;">Contact Support</a>
                          </p>
                        </td>
                      </tr>
                      
                    </table>
                  </td>
                </tr>
              </table>
            </body>
          </html>
        `,
      }),
    });

    if (!emailResponse.ok) {
      const errorData = await emailResponse.json();
      const errorDetail = JSON.stringify(errorData);
      console.error(`[INVITE-EMAIL] Resend API error (status ${emailResponse.status}):`, errorDetail);
      throw new Error(`Resend API error (${emailResponse.status}): ${errorData.message || errorDetail}`);
    }

    const result = await emailResponse.json();
    console.log(`[INVITE-EMAIL] ✓ Invitation email sent successfully to ${to}. Email ID:`, result.id);
    return { success: true, data: result };
  } catch (error: any) {
    console.error(`[INVITE-EMAIL] Failed to send invitation email to ${to}:`, error.message);
    return { success: false, error: error.message };
  }
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("[INVITE] Processing invitation request");
    
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("[INVITE] No Authorization header provided");
      throw new Error("Unauthorized - No authorization header");
    }

    console.log("[INVITE] Auth header present, validating user...");
    
    // Create client for auth verification with the Authorization header
    const supabaseAuth = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: authHeader }
        }
      }
    );

    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser();

    if (userError) {
      console.error("[INVITE] Auth error:", userError);
      throw new Error("Unauthorized - Invalid token");
    }

    if (!user) {
      console.error("[INVITE] No user found");
      throw new Error("Unauthorized - User not found");
    }

    console.log("[INVITE] ✓ User authenticated:", user.email);

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

    // Check team limits before creating invitation
    const limitsCheckUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/check-team-limits`;
    const limitsResponse = await fetch(limitsCheckUrl, {
      method: "POST",
      headers: {
        "Authorization": authHeader,
        "Content-Type": "application/json",
      },
    });

    if (!limitsResponse.ok) {
      throw new Error("Failed to check team limits");
    }

    const limitsData = await limitsResponse.json();
    console.log("Team limits check:", limitsData);

    if (!limitsData.teamEnabled) {
      throw new Error("Team features are not available on your current plan. Please upgrade to invite team members.");
    }

    if (limitsData.limitReached || !limitsData.canInvite) {
      throw new Error(`Your ${limitsData.planName} plan allows up to ${limitsData.maxTeamMembers} team members. Please upgrade your plan to add more members.`);
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

    // Generate secure invitation token
    const inviteToken = crypto.randomUUID();
    const tokenExpiresAt = new Date();
    tokenExpiresAt.setDate(tokenExpiresAt.getDate() + 7); // Token expires in 7 days

    // Create team member
    const { data: member, error: insertError } = await supabaseClient
      .from("team_members")
      .insert({
        organization_id: user.id,
        email,
        role,
        status: "pending",
        invited_by: user.id,
        invite_token: inviteToken,
        token_expires_at: tokenExpiresAt.toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      throw new Error(`Failed to create team member: ${insertError.message}`);
    }

    // Send invitation email with token
    console.log(`[INVITE] Team member created: ${email} with role ${role}. Sending email...`);
    
    const emailResult = await sendInvitationEmail(
      email, 
      role, 
      user.email || "a team member",
      member.invite_token
    );
    
    if (!emailResult.success) {
      console.error(`[INVITE] Email failed for ${email}:`, emailResult.error);
      
      // Return error response with detailed info
      return new Response(
        JSON.stringify({ 
          error: "email_failed",
          message: `Team member created but invitation email could not be sent: ${emailResult.error}`,
          details: emailResult.error,
          member
        }), 
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    console.log(`[INVITE] ✓ Invitation complete for ${email}`);
    return new Response(JSON.stringify({ success: true, member }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[INVITE] Error occurred:", errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});