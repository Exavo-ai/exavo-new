import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.1";

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
      from: "Exavo AI <info@exavoai.io>",
      to,
      subject,
      html,
      reply_to: "info@exavoai.io",
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Resend API error:", {
      status: response.status,
      body: errorText
    });
    throw new Error(`Failed to send email: ${errorText}`);
  }

  return await response.json();
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, full_name } = await req.json();

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ error: "Invalid email address" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Create Supabase admin client
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Try to create user with auto-confirmed email
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: {
        full_name: full_name || "",
      },
    });

    // If user already exists, send them the same invitation email
    if (createError && createError.message.includes("already been registered")) {
      console.log(`User ${email} already exists, sending invitation email`);
      
      const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
        type: "recovery",
        email,
        options: {
          redirectTo: `${Deno.env.get("SUPABASE_URL")?.replace("/api", "")}/update-password`,
        },
      });

      if (linkError) {
        console.error("Error generating invite link for existing user:", linkError);
        throw new Error(`Failed to generate invite link: ${linkError.message}`);
      }

      const inviteLink = linkData.properties.action_link;

      // Send the same invitation email template
      await sendEmail(
        [email],
        "You're invited! Join Exavo AI Today",
        `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <style>
                body { 
                  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; 
                  line-height: 1.6; 
                  color: #333; 
                  margin: 0; 
                  padding: 0; 
                  background-color: #f5f5f5; 
                }
                .email-wrapper { 
                  max-width: 600px; 
                  margin: 0 auto; 
                  background-color: #f5f5f5; 
                  padding: 20px; 
                }
                .container { 
                  background: white; 
                  border-radius: 16px; 
                  overflow: hidden; 
                  box-shadow: 0 4px 12px rgba(0,0,0,0.08); 
                }
                .logo-section {
                  background: white;
                  padding: 30px 30px 20px 30px;
                  text-align: center;
                  border-bottom: 1px solid #f0f0f0;
                }
                .logo-text {
                  font-size: 32px;
                  font-weight: 700;
                  background: linear-gradient(135deg, #8B5CF6 0%, #06B6D4 100%);
                  -webkit-background-clip: text;
                  -webkit-text-fill-color: transparent;
                  background-clip: text;
                  letter-spacing: -0.5px;
                }
                .header { 
                  background: linear-gradient(135deg, #8B5CF6 0%, #06B6D4 100%); 
                  color: white; 
                  padding: 50px 30px; 
                  text-align: center; 
                }
                .header h1 { 
                  margin: 0; 
                  font-size: 32px; 
                  font-weight: 700; 
                  letter-spacing: -0.5px;
                }
                .content { 
                  padding: 40px 30px; 
                  background: white; 
                }
                .greeting { 
                  font-size: 18px; 
                  color: #1a1a1a; 
                  margin-bottom: 20px; 
                  font-weight: 600; 
                }
                .message { 
                  font-size: 16px; 
                  color: #4a4a4a; 
                  margin-bottom: 15px; 
                  line-height: 1.7; 
                }
                .highlight { 
                  color: #8B5CF6; 
                  font-weight: 600; 
                }
                .cta-container { 
                  text-align: center; 
                  margin: 35px 0; 
                }
                .button { 
                  display: inline-block; 
                  padding: 18px 45px; 
                  background: linear-gradient(135deg, #8B5CF6 0%, #06B6D4 100%); 
                  color: white !important; 
                  text-decoration: none; 
                  border-radius: 10px; 
                  font-weight: 600; 
                  font-size: 17px; 
                  box-shadow: 0 6px 20px rgba(139, 92, 246, 0.4); 
                  transition: transform 0.2s, box-shadow 0.2s;
                }
                .button:hover { 
                  transform: translateY(-2px); 
                  box-shadow: 0 8px 25px rgba(139, 92, 246, 0.5);
                }
                .link-fallback {
                  font-size: 13px;
                  color: #666;
                  margin-top: 20px;
                  text-align: center;
                  line-height: 1.5;
                }
                .link-fallback a {
                  color: #8B5CF6;
                  word-break: break-all;
                }
                .benefits { 
                  background: linear-gradient(135deg, #f8f9ff 0%, #f0f9ff 100%);
                  padding: 30px; 
                  border-radius: 12px; 
                  margin: 30px 0; 
                  border-left: 5px solid #8B5CF6; 
                }
                .benefits-title {
                  color: #1a1a1a;
                  font-size: 18px;
                  font-weight: 600;
                  margin-bottom: 15px;
                }
                .benefits ul { 
                  margin: 0; 
                  padding-left: 20px; 
                }
                .benefits li { 
                  margin: 12px 0; 
                  color: #333; 
                  font-size: 15px;
                  line-height: 1.6;
                }
                .benefits li strong {
                  color: #1a1a1a;
                  font-weight: 600;
                }
                .footer { 
                  text-align: center; 
                  padding: 30px; 
                  background: #f8f9fa; 
                  color: #666; 
                  font-size: 13px; 
                  border-top: 1px solid #e0e0e0; 
                }
                .footer p { 
                  margin: 5px 0; 
                }
                .footer-brand {
                  color: #333;
                  font-weight: 600;
                  font-size: 14px;
                }
              </style>
            </head>
            <body>
              <div class="email-wrapper">
                <div class="container">
                  <div class="logo-section">
                    <div class="logo-text">EXAVO AI</div>
                  </div>
                  <div class="header">
                    <h1>Welcome to Exavo AI</h1>
                  </div>
                  <div class="content">
                    <p class="greeting">Hello ${full_name || email.split('@')[0]},</p>
                    <p class="message">
                      Thank you for joining <span class="highlight">Exavo AI</span>! We're excited to have you as our client and look forward to helping transform your business with cutting-edge AI solutions.
                    </p>
                    <p class="message">
                      Click the button below to access your account and get started.
                    </p>
                    
                    <div class="benefits">
                      <div class="benefits-title">🚀 What you'll get access to:</div>
                      <ul>
                        <li><strong>AI-powered tools and automation</strong> to streamline your workflows</li>
                        <li><strong>Personalized consultation</strong> with our expert team</li>
                        <li><strong>24/7 AI assistant support</strong> whenever you need help</li>
                        <li><strong>Exclusive services</strong> tailored to your business needs</li>
                      </ul>
                    </div>

                    <div class="cta-container">
                      <a href="${inviteLink}" class="button">Create Your Account Now →</a>
                    </div>

                    <div class="link-fallback">
                      If the button doesn't work, copy and paste this link into your browser:<br>
                      <a href="${inviteLink}">${inviteLink}</a>
                    </div>

                    <p class="message" style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #f0f0f0;">
                      Questions? Our team is here to help! Simply reply to this email and we'll get back to you right away.
                    </p>
                    
                    <p class="message" style="margin-top: 25px;">
                      Best regards,<br>
                      <strong>The Exavo AI Team</strong>
                    </p>
                  </div>
                  <div class="footer">
                    <p class="footer-brand">Exavo AI</p>
                    <p>Empowering Business with Intelligence</p>
                    <p style="margin-top: 15px; color: #999;">© ${new Date().getFullYear()} Exavo AI. All rights reserved.</p>
                  </div>
                </div>
              </div>
            </body>
          </html>
        `
      );

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: `Invitation sent to ${email}`,
          existing_user: true
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    if (createError) {
      console.error("Error creating user:", createError);
      throw new Error(`Failed to create user: ${createError.message}`);
    }

    // Generate password recovery link for the new user
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: "recovery",
      email,
      options: {
        redirectTo: `${Deno.env.get("SUPABASE_URL")?.replace("/api", "")}/update-password`,
      },
    });

    if (linkError) {
      console.error("Error generating invite link:", linkError);
      throw new Error(`Failed to generate invite link: ${linkError.message}`);
    }

    const inviteLink = linkData.properties.action_link;

    // Send invitation email with the unique setup link
    await sendEmail(
      [email],
      "You're invited! Join Exavo AI Today",
      `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              body { 
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; 
                line-height: 1.6; 
                color: #333; 
                margin: 0; 
                padding: 0; 
                background-color: #f5f5f5; 
              }
              .email-wrapper { 
                max-width: 600px; 
                margin: 0 auto; 
                background-color: #f5f5f5; 
                padding: 20px; 
              }
              .container { 
                background: white; 
                border-radius: 16px; 
                overflow: hidden; 
                box-shadow: 0 4px 12px rgba(0,0,0,0.08); 
              }
              .logo-section {
                background: white;
                padding: 30px 30px 20px 30px;
                text-align: center;
                border-bottom: 1px solid #f0f0f0;
              }
              .logo-text {
                font-size: 32px;
                font-weight: 700;
                background: linear-gradient(135deg, #8B5CF6 0%, #06B6D4 100%);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                background-clip: text;
                letter-spacing: -0.5px;
              }
              .header { 
                background: linear-gradient(135deg, #8B5CF6 0%, #06B6D4 100%); 
                color: white; 
                padding: 50px 30px; 
                text-align: center; 
              }
              .header h1 { 
                margin: 0; 
                font-size: 32px; 
                font-weight: 700; 
                letter-spacing: -0.5px;
              }
              .content { 
                padding: 40px 30px; 
                background: white; 
              }
              .greeting { 
                font-size: 18px; 
                color: #1a1a1a; 
                margin-bottom: 20px; 
                font-weight: 600; 
              }
              .message { 
                font-size: 16px; 
                color: #4a4a4a; 
                margin-bottom: 15px; 
                line-height: 1.7; 
              }
              .highlight { 
                color: #8B5CF6; 
                font-weight: 600; 
              }
              .cta-container { 
                text-align: center; 
                margin: 35px 0; 
              }
              .button { 
                display: inline-block; 
                padding: 18px 45px; 
                background: linear-gradient(135deg, #8B5CF6 0%, #06B6D4 100%); 
                color: white !important; 
                text-decoration: none; 
                border-radius: 10px; 
                font-weight: 600; 
                font-size: 17px; 
                box-shadow: 0 6px 20px rgba(139, 92, 246, 0.4); 
                transition: transform 0.2s, box-shadow 0.2s;
              }
              .button:hover { 
                transform: translateY(-2px); 
                box-shadow: 0 8px 25px rgba(139, 92, 246, 0.5);
              }
              .link-fallback {
                font-size: 13px;
                color: #666;
                margin-top: 20px;
                text-align: center;
                line-height: 1.5;
              }
              .link-fallback a {
                color: #8B5CF6;
                word-break: break-all;
              }
              .benefits { 
                background: linear-gradient(135deg, #f8f9ff 0%, #f0f9ff 100%);
                padding: 30px; 
                border-radius: 12px; 
                margin: 30px 0; 
                border-left: 5px solid #8B5CF6; 
              }
              .benefits-title {
                color: #1a1a1a;
                font-size: 18px;
                font-weight: 600;
                margin-bottom: 15px;
              }
              .benefits ul { 
                margin: 0; 
                padding-left: 20px; 
              }
              .benefits li { 
                margin: 12px 0; 
                color: #333; 
                font-size: 15px;
                line-height: 1.6;
              }
              .benefits li strong {
                color: #1a1a1a;
                font-weight: 600;
              }
              .footer { 
                text-align: center; 
                padding: 30px; 
                background: #f8f9fa; 
                color: #666; 
                font-size: 13px; 
                border-top: 1px solid #e0e0e0; 
              }
              .footer p { 
                margin: 5px 0; 
              }
              .footer-brand {
                color: #333;
                font-weight: 600;
                font-size: 14px;
              }
            </style>
          </head>
          <body>
            <div class="email-wrapper">
              <div class="container">
                <div class="logo-section">
                  <div class="logo-text">EXAVO AI</div>
                </div>
                <div class="header">
                  <h1>Welcome to Exavo AI</h1>
                </div>
                <div class="content">
                  <p class="greeting">Hello ${full_name || email.split('@')[0]},</p>
                  <p class="message">
                    Thank you for joining <span class="highlight">Exavo AI</span>! We're excited to have you as our client and look forward to helping transform your business with cutting-edge AI solutions.
                  </p>
                  <p class="message">
                    Your account has been created and is ready to use. Simply click the button below to create your password and get started.
                  </p>
                  
                  <div class="benefits">
                    <div class="benefits-title">🚀 What you'll get access to:</div>
                    <ul>
                      <li><strong>AI-powered tools and automation</strong> to streamline your workflows</li>
                      <li><strong>Personalized consultation</strong> with our expert team</li>
                      <li><strong>24/7 AI assistant support</strong> whenever you need help</li>
                      <li><strong>Exclusive services</strong> tailored to your business needs</li>
                    </ul>
                  </div>

                  <div class="cta-container">
                    <a href="${inviteLink}" class="button">Create Your Account Now →</a>
                  </div>

                  <div class="link-fallback">
                    If the button doesn't work, copy and paste this link into your browser:<br>
                    <a href="${inviteLink}">${inviteLink}</a>
                  </div>

                  <p class="message" style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #f0f0f0;">
                    Questions? Our team is here to help! Simply reply to this email and we'll get back to you right away.
                  </p>
                  
                  <p class="message" style="margin-top: 25px;">
                    Best regards,<br>
                    <strong>The Exavo AI Team</strong>
                  </p>
                </div>
                <div class="footer">
                  <p class="footer-brand">Exavo AI</p>
                  <p>Empowering Business with Intelligence</p>
                  <p style="margin-top: 15px; color: #999;">© ${new Date().getFullYear()} Exavo AI. All rights reserved.</p>
                </div>
              </div>
            </div>
          </body>
        </html>
      `
    );

    console.log(`Successfully sent invitation to ${email}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Invitation sent to ${email}`,
        user_id: newUser.user.id 
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error in send-welcome-email:", error);
    
    // Return 400 for email sending failures, 500 for other errors
    const isEmailError = error instanceof Error && error.message.includes("Failed to send email");
    const statusCode = isEmailError ? 400 : 500;
    
    return new Response(
      JSON.stringify({ 
        error: "Failed to send email",
        details: error instanceof Error ? error.message : 'Unknown error occurred' 
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: statusCode,
      }
    );
  }
});
