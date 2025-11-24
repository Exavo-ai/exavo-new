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

    // If user already exists, send them a password reset link instead
    if (createError && createError.message.includes("already been registered")) {
      console.log(`User ${email} already exists, sending password reset link`);
      
      const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
        type: "recovery",
        email,
        options: {
          redirectTo: `${Deno.env.get("SUPABASE_URL")?.replace("/api", "")}/update-password`,
        },
      });

      if (linkError) {
        console.error("Error generating password reset link:", linkError);
        throw new Error(`Failed to generate password reset link: ${linkError.message}`);
      }

      const resetLink = linkData.properties.action_link;

      await sendEmail(
        [email],
        "🔐 Password Reset - Exavo AI",
        `
          <!DOCTYPE html>
          <html>
            <head>
              <style>
                body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4; }
                .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
                .header { background: linear-gradient(135deg, #8B5CF6 0%, #06B6D4 100%); color: white; padding: 40px 30px; text-align: center; }
                .header h1 { margin: 0; font-size: 28px; font-weight: 600; }
                .content { padding: 40px 30px; background: white; }
                .greeting { font-size: 18px; color: #1a1a1a; margin-bottom: 20px; font-weight: 500; }
                .message { font-size: 16px; color: #4a4a4a; margin-bottom: 15px; line-height: 1.8; }
                .cta-container { text-align: center; margin: 35px 0; }
                .button { display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #8B5CF6 0%, #06B6D4 100%); color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; }
                .security-note { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 4px; font-size: 14px; color: #856404; }
                .footer { text-align: center; padding: 25px; background: #f8f9fa; color: #666; font-size: 13px; border-top: 1px solid #e0e0e0; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>🔐 Reset Your Password</h1>
                </div>
                <div class="content">
                  <p class="greeting">Hello ${full_name || 'there'},</p>
                  <p class="message">
                    You already have an account with Exavo AI. Click the button below to reset your password and access your account.
                  </p>
                  <div class="cta-container">
                    <a href="${resetLink}" class="button">Reset Password →</a>
                  </div>
                  <div class="security-note">
                    <strong>🔒 Security Note:</strong> This link will expire in 24 hours. If you didn't request this, you can safely ignore this email.
                  </div>
                  <p class="message" style="margin-top: 30px;">
                    Best regards,<br>
                    <strong>The Exavo AI Team</strong>
                  </p>
                </div>
                <div class="footer">
                  <p><strong>Exavo AI</strong> - Empowering Business with Intelligence</p>
                  <p>© ${new Date().getFullYear()} Exavo AI. All rights reserved.</p>
                </div>
              </div>
            </body>
          </html>
        `
      );

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: `Password reset link sent to ${email} (user already exists)`,
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
      "🎉 You're Invited! Join Exavo AI Today",
      `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4; }
              .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
              .header { background: linear-gradient(135deg, #8B5CF6 0%, #06B6D4 100%); color: white; padding: 40px 30px; text-align: center; }
              .header h1 { margin: 0; font-size: 28px; font-weight: 600; }
              .content { padding: 40px 30px; background: white; }
              .greeting { font-size: 18px; color: #1a1a1a; margin-bottom: 20px; font-weight: 500; }
              .message { font-size: 16px; color: #4a4a4a; margin-bottom: 15px; line-height: 1.8; }
              .highlight { color: #8B5CF6; font-weight: 600; }
              .cta-container { text-align: center; margin: 35px 0; }
              .button { display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #8B5CF6 0%, #06B6D4 100%); color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; transition: transform 0.2s; box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3); }
              .button:hover { transform: translateY(-2px); }
              .benefits { background: #f8f9fa; padding: 25px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #8B5CF6; }
              .benefits ul { margin: 10px 0; padding-left: 20px; }
              .benefits li { margin: 10px 0; color: #4a4a4a; }
              .footer { text-align: center; padding: 25px; background: #f8f9fa; color: #666; font-size: 13px; border-top: 1px solid #e0e0e0; }
              .footer p { margin: 5px 0; }
              .security-note { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 4px; font-size: 14px; color: #856404; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>✨ Welcome to Exavo AI</h1>
              </div>
              <div class="content">
                <p class="greeting">Hello ${full_name || 'there'},</p>
                <p class="message">
                  You've been invited by our team to join <span class="highlight">Exavo AI</span>! We're thrilled to have you on board and can't wait to show you how our cutting-edge AI solutions can transform your business.
                </p>
                <p class="message">
                  Your account has been created and is ready to go. Click the button below to set your password and complete your registration.
                </p>
                
                <div class="benefits">
                  <strong style="color: #1a1a1a; font-size: 16px;">🚀 What you'll get access to:</strong>
                  <ul>
                    <li>Advanced AI-powered tools and automation</li>
                    <li>Personalized consultation with our experts</li>
                    <li>24/7 AI assistant support</li>
                    <li>Exclusive services tailored to your needs</li>
                  </ul>
                </div>

                <div class="cta-container">
                  <a href="${inviteLink}" class="button">Set Your Password & Get Started →</a>
                </div>

                <div class="security-note">
                  <strong>🔒 Security Note:</strong> This link is unique to your account and will expire in 24 hours. For your security, please set a strong password when you complete your registration.
                </div>

                <p class="message">
                  Have questions? Our team is ready to help you get started. Simply reply to this email or reach out through our platform.
                </p>
                
                <p class="message" style="margin-top: 30px;">
                  Best regards,<br>
                  <strong>The Exavo AI Team</strong>
                </p>
              </div>
              <div class="footer">
                <p><strong>Exavo AI</strong> - Empowering Business with Intelligence</p>
                <p>© ${new Date().getFullYear()} Exavo AI. All rights reserved.</p>
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
