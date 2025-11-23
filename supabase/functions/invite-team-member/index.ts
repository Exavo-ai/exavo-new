import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const sendInvitationEmail = async (to: string, role: string, inviterEmail: string, inviteToken: string) => {
  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
  
  try {
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
            <body style="margin: 0; padding: 0; background-color: #0f0f23; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #0f0f23;">
                <tr>
                  <td style="padding: 40px 20px;">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 600px; margin: 0 auto; background-color: #1a1a2e; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);">
                      
                      <!-- Header with Logo -->
                      <tr>
                        <td style="padding: 32px 32px 24px; text-align: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
                          <img src="https://2906855a-3f3b-4327-9a13-6b3ce2fbf463.lovableproject.com/src/assets/exavo-logo.png" alt="Exavo AI" style="height: 40px; width: auto; display: inline-block; margin-bottom: 16px;" />
                          <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600; line-height: 1.3;">Team Invitation</h1>
                        </td>
                      </tr>
                      
                      <!-- Content -->
                      <tr>
                        <td style="padding: 40px 32px; color: #e5e7eb;">
                          <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.6;">Hello <strong>${to}</strong>,</p>
                          
                          <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.6;">
                            <strong>${inviterEmail}</strong> has invited you to join their workspace on Exavo AI as a <strong style="color: #667eea;">${role}</strong>.
                          </p>
                          
                          <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.6; color: #9ca3af;">
                            Exavo AI provides powerful AI-driven solutions to streamline your business operations and boost productivity.
                          </p>
                          
                          <!-- CTA Button -->
                          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                            <tr>
                              <td style="text-align: center; padding: 8px 0 24px;">
                                 <a href="https://exavo.ai/accept-invitation?token=${inviteToken}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; font-size: 16px; font-weight: 600; text-decoration: none; padding: 14px 32px; border-radius: 8px; box-shadow: 0 2px 4px rgba(102, 126, 234, 0.3);">Accept Invitation</a>
                              </td>
                            </tr>
                          </table>
                          
                          <!-- Fallback URL -->
                          <p style="margin: 0 0 24px; font-size: 14px; line-height: 1.6; color: #9ca3af; text-align: center;">
                            Or copy and paste this URL into your browser:<br/>
                            <a href="https://exavo.ai/accept-invitation?token=${inviteToken}" style="color: #667eea; text-decoration: underline; word-break: break-all;">https://exavo.ai/accept-invitation?token=${inviteToken}</a>
                          </p>
                          
                          <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #6b7280; padding-top: 16px; border-top: 1px solid #374151;">
                            If you didn't expect this invitation, you can safely ignore this email.
                          </p>
                        </td>
                      </tr>
                      
                      <!-- Footer -->
                      <tr>
                        <td style="padding: 24px 32px; background-color: #0f0f23; text-align: center;">
                          <p style="margin: 0 0 8px; font-size: 14px; color: #6b7280; line-height: 1.5;">
                            <strong style="color: #e5e7eb;">Exavo AI</strong><br/>
                            AI-Powered Business Solutions
                          </p>
                          <p style="margin: 0; font-size: 12px; color: #6b7280;">
                            <a href="https://exavo.ai" style="color: #667eea; text-decoration: none;">exavo.ai</a>
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
      console.error(`Resend API error (status ${emailResponse.status}):`, errorData);
      throw new Error(`Resend API error: ${JSON.stringify(errorData)}`);
    }

    const result = await emailResponse.json();
    console.log(`Invitation email sent to ${to}:`, result);
    return { success: true, data: result };
  } catch (error: any) {
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

    // Check team limits before creating invitation
    const limitsCheckUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/check-team-limits`;
    const limitsResponse = await fetch(limitsCheckUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
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
    console.log(`Team member invited: ${email} with role ${role}`);
    
    const emailResult = await sendInvitationEmail(
      email, 
      role, 
      user.email || "a team member",
      member.invite_token
    );
    
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