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
      from: "Exavo AI <noreply@exavoai.io>",
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
      "Welcome to Exavo AI! 🎉",
      `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #8B5CF6 0%, #06B6D4 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
              .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
              .button { display: inline-block; padding: 12px 30px; background: #8B5CF6; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
              .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Welcome to Exavo AI!</h1>
              </div>
              <div class="content">
                <p>Hello ${full_name},</p>
                <p>Thank you for joining Exavo AI! We're excited to help you transform your business with cutting-edge AI solutions.</p>
                <p>Here's what you can do next:</p>
                <ul>
                  <li>📅 Book a consultation with our AI experts</li>
                  <li>🔍 Explore our AI services and solutions</li>
                  <li>💬 Chat with our AI assistant for instant support</li>
                  <li>📊 Access your personalized dashboard</li>
                </ul>
                <center>
                  <a href="${Deno.env.get("VITE_SUPABASE_URL") || "http://localhost:5173"}/client" class="button">Get Started</a>
                </center>
                <p>If you have any questions, our team is here to help!</p>
                <p>Best regards,<br>The Exavo AI Team</p>
              </div>
              <div class="footer">
                <p>© 2024 Exavo AI. All rights reserved.</p>
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
