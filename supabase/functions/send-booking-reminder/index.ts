import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Find users who started booking but didn't complete (abandoned bookings)
    // This is a scheduled function that should run daily
    const { data: profiles, error } = await supabaseClient
      .from('profiles')
      .select('id, email, full_name')
      .not('email', 'is', null);

    if (error) throw error;

    for (const profile of profiles || []) {
      // Check if user has any appointments
      const { data: appointments } = await supabaseClient
        .from('appointments')
        .select('id')
        .eq('user_id', profile.id)
        .limit(1);

      // If no appointments, send reminder
      if (!appointments || appointments.length === 0) {
        await sendEmail(
          [profile.email],
          "Complete Your Booking - Exavo AI",
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
                </style>
              </head>
              <body>
                <div class="container">
                  <div class="header">
                    <h1>Don't Miss Out! 📅</h1>
                  </div>
                  <div class="content">
                    <p>Hello ${profile.full_name || 'there'},</p>
                    <p>We noticed you haven't booked a consultation with us yet. Our AI experts are ready to help transform your business!</p>
                    <p>Book now and get:</p>
                    <ul>
                      <li>✨ Free consultation session</li>
                      <li>🎯 Personalized AI strategy</li>
                      <li>💡 Expert recommendations</li>
                      <li>🚀 Quick implementation roadmap</li>
                    </ul>
                    <center>
                      <a href="${Deno.env.get("VITE_SUPABASE_URL") || "http://localhost:5173"}/booking" class="button">Book Now</a>
                    </center>
                    <p>Best regards,<br>The Exavo AI Team</p>
                  </div>
                </div>
              </body>
            </html>
          `
        );
      }
    }

    return new Response(JSON.stringify({ success: true, processed: profiles?.length || 0 }), {
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
