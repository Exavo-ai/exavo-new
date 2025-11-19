import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

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
      from: "Exavo AI <onboarding@resend.dev>",
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
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, full_name } = await req.json();

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
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>✨ Welcome to Exavo AI</h1>
              </div>
              <div class="content">
                <p class="greeting">Hello ${full_name},</p>
                <p class="message">
                  Thank you for your interest in <span class="highlight">Exavo AI</span>! We're thrilled to invite you to join our platform and discover how our cutting-edge AI solutions can transform your business.
                </p>
                <p class="message">
                  Your journey to smarter automation and enhanced productivity starts here.
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
                  <a href="${Deno.env.get("VITE_SUPABASE_URL") || "http://localhost:5173"}/register" class="button">Create Your Account Now →</a>
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

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
