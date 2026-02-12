import { corsHeaders } from "../_shared/response.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { name, email, phone, message } = await req.json();

    // Validate required fields
    if (!name?.trim() || !email?.trim() || !message?.trim()) {
      return new Response(
        JSON.stringify({ success: false, error: { code: "VALIDATION_ERROR", message: "Missing required fields" } }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      console.error("[SEND_CONTACT_EMAIL] Missing RESEND_API_KEY");
      return new Response(
        JSON.stringify({ success: false, error: { code: "CONFIG_ERROR", message: "Email service not configured" } }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #333; border-bottom: 2px solid #6366f1; padding-bottom: 10px;">New Contact Form Submission</h2>
        <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
          <tr>
            <td style="padding: 10px; font-weight: bold; color: #555; width: 120px;">Name:</td>
            <td style="padding: 10px; color: #333;">${name}</td>
          </tr>
          <tr style="background-color: #f9fafb;">
            <td style="padding: 10px; font-weight: bold; color: #555;">Email:</td>
            <td style="padding: 10px; color: #333;"><a href="mailto:${email}">${email}</a></td>
          </tr>
          <tr>
            <td style="padding: 10px; font-weight: bold; color: #555;">Phone:</td>
            <td style="padding: 10px; color: #333;">${phone || "Not provided"}</td>
          </tr>
          <tr style="background-color: #f9fafb;">
            <td style="padding: 10px; font-weight: bold; color: #555; vertical-align: top;">Message:</td>
            <td style="padding: 10px; color: #333; white-space: pre-wrap;">${message}</td>
          </tr>
        </table>
        <p style="margin-top: 20px; font-size: 12px; color: #999;">Sent from Exavo AI Contact Form</p>
      </div>
    `;

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: "Exavo AI <info@exavoai.io>",
        to: ["info@exavo.ai"],
        reply_to: email,
        subject: "New Contact Form Submission – Exavo AI",
        html: htmlBody,
      }),
    });

    if (!resendResponse.ok) {
      const errorData = await resendResponse.text();
      console.error("[SEND_CONTACT_EMAIL] Resend error:", errorData);
      return new Response(
        JSON.stringify({ success: false, error: { code: "EMAIL_ERROR", message: "Failed to send email" } }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[SEND_CONTACT_EMAIL] Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: { code: "INTERNAL_ERROR", message: "Internal server error" } }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
