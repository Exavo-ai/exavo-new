import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ================================
// ADMIN EMAIL RECIPIENTS
// ================================
const ADMIN_EMAILS = ["info@exavo.ai", "mahmoud@exavoai.io"];

// ================================
// BASE URL FOR LINKS
// ================================
const BASE_URL = "https://exavo-new.lovable.app";

// ================================
// EMAIL EVENT CONFIGURATION
// ================================
// Maps event types to email settings
// Only events listed here will trigger emails
const EMAIL_EVENT_CONFIG: Record<string, {
  shouldEmailAdmin: boolean;
  shouldEmailClient: boolean;
  priority: "normal" | "high";
  getSubject: (meta: Record<string, unknown>) => string;
  getAdminBody: (meta: Record<string, unknown>, link: string) => string;
  getClientBody: (meta: Record<string, unknown>, link: string) => string;
}> = {
  // ================================
  // ADMIN-ONLY EVENTS
  // ================================
  
  // Client purchases a service (from checkout/subscription creation)
  SERVICE_PURCHASED: {
    shouldEmailAdmin: true,
    shouldEmailClient: false,
    priority: "normal",
    getSubject: (m) => `New Purchase: ${m.service_name || m.project_name || "Service"}`,
    getAdminBody: (m, link) => `
      <p>A client has purchased a service.</p>
      <p><strong>Client:</strong> ${m.client_email || m.customer_email || "Unknown"}</p>
      <p><strong>Service:</strong> ${m.service_name || m.project_name || "Unknown"}</p>
      <p><strong>Amount:</strong> ${m.amount ? `$${(Number(m.amount) / 100).toFixed(2)}` : "N/A"}</p>
      <p><a href="${link}">View Details →</a></p>
    `,
    getClientBody: () => "",
  },

  // Client cancels subscription
  SUBSCRIPTION_CANCELED: {
    shouldEmailAdmin: true,
    shouldEmailClient: false,
    priority: "high",
    getSubject: (m) => `⚠️ Subscription Canceled: ${m.project_name || "Project"}`,
    getAdminBody: (m, link) => `
      <p>A client has canceled their subscription.</p>
      <p><strong>Project:</strong> ${m.project_name || "Unknown"}</p>
      <p><strong>Client:</strong> ${m.client_email || "Unknown"}</p>
      <p><strong>Reason:</strong> ${m.cancel_reason || "Not provided"}</p>
      <p><a href="${link}">View Project →</a></p>
    `,
    getClientBody: () => "",
  },

  // Client pauses subscription
  SUBSCRIPTION_PAUSED: {
    shouldEmailAdmin: true,
    shouldEmailClient: false,
    priority: "normal",
    getSubject: (m) => `Subscription Paused: ${m.project_name || "Project"}`,
    getAdminBody: (m, link) => `
      <p>A client has paused their subscription.</p>
      <p><strong>Project:</strong> ${m.project_name || "Unknown"}</p>
      <p><strong>Client:</strong> ${m.client_email || "Unknown"}</p>
      <p><a href="${link}">View Project →</a></p>
    `,
    getClientBody: () => "",
  },

  // Client approves delivery
  DELIVERY_APPROVED: {
    shouldEmailAdmin: true,
    shouldEmailClient: false,
    priority: "normal",
    getSubject: (m) => `✅ Delivery Approved: ${m.project_name || "Project"}`,
    getAdminBody: (m, link) => `
      <p>A client has approved a delivery.</p>
      <p><strong>Project:</strong> ${m.project_name || "Unknown"}</p>
      <p><strong>Client:</strong> ${m.client_email || "Unknown"}</p>
      <p><a href="${link}">View Project →</a></p>
    `,
    getClientBody: () => "",
  },

  // Payment failed
  PAYMENT_FAILED: {
    shouldEmailAdmin: true,
    shouldEmailClient: true,
    priority: "high",
    getSubject: (m) => `⚠️ Payment Failed: ${m.project_name || "Project"}`,
    getAdminBody: (m, link) => `
      <p>A payment has failed and requires attention.</p>
      <p><strong>Project:</strong> ${m.project_name || "Unknown"}</p>
      <p><strong>Client:</strong> ${m.client_email || "Unknown"}</p>
      <p><strong>Error:</strong> ${m.error || "Unknown error"}</p>
      <p><a href="${link}">View Project →</a></p>
    `,
    getClientBody: (m, link) => `
      <p>We encountered an issue processing your payment.</p>
      <p><strong>Project:</strong> ${m.project_name || "Your project"}</p>
      <p>Please update your payment method to avoid service interruption.</p>
      <p><a href="${link}">Update Payment Method →</a></p>
    `,
  },

  // Subscription requires manual attention
  MANUAL_INTERVENTION_REQUIRED: {
    shouldEmailAdmin: true,
    shouldEmailClient: false,
    priority: "high",
    getSubject: (m) => `🚨 Manual Intervention Required`,
    getAdminBody: (m, link) => `
      <p>A situation requires your immediate attention.</p>
      <p><strong>Reason:</strong> ${m.reason || "Unknown"}</p>
      <p><strong>Context:</strong> ${m.context || "N/A"}</p>
      ${link ? `<p><a href="${link}">View Details →</a></p>` : ""}
    `,
    getClientBody: () => "",
  },

  // Webhook failure
  WEBHOOK_FAILURE: {
    shouldEmailAdmin: true,
    shouldEmailClient: false,
    priority: "high",
    getSubject: (m) => `⚠️ Webhook Failed: ${m.webhook_name || "Unknown"}`,
    getAdminBody: (m, link) => `
      <p>A webhook has failed.</p>
      <p><strong>Webhook:</strong> ${m.webhook_name || "Unknown"}</p>
      <p><strong>Error:</strong> ${m.error || "Unknown error"}</p>
      <p><strong>Source:</strong> ${m.source || "Unknown"}</p>
    `,
    getClientBody: () => "",
  },

  // Automation failure
  AUTOMATION_FAILED: {
    shouldEmailAdmin: true,
    shouldEmailClient: false,
    priority: "high",
    getSubject: (m) => `⚠️ Automation Failed: ${m.automation_name || "Unknown"}`,
    getAdminBody: (m, link) => `
      <p>An automation has failed.</p>
      <p><strong>Automation:</strong> ${m.automation_name || "Unknown"}</p>
      <p><strong>Error:</strong> ${m.error || "Unknown error"}</p>
    `,
    getClientBody: () => "",
  },

  // ================================
  // CLIENT-ONLY EVENTS
  // ================================

  // Admin creates new delivery
  DELIVERY_CREATED: {
    shouldEmailAdmin: false,
    shouldEmailClient: true,
    priority: "high",
    getSubject: (m) => `📦 New Delivery Ready: ${m.project_name || "Your Project"}`,
    getAdminBody: () => "",
    getClientBody: (m, link) => `
      <p>Great news! A new delivery is ready for your review.</p>
      <p><strong>Project:</strong> ${m.project_name || "Your project"}</p>
      <p><strong>Message:</strong> ${m.message || "Please review the latest delivery."}</p>
      <p><a href="${link}">Review Delivery →</a></p>
    `,
  },

  // Subscription renewed successfully
  SUBSCRIPTION_RENEWED: {
    shouldEmailAdmin: false,
    shouldEmailClient: true,
    priority: "normal",
    getSubject: (m) => `✅ Subscription Renewed: ${m.project_name || "Your Project"}`,
    getAdminBody: () => "",
    getClientBody: (m, link) => `
      <p>Your subscription has been successfully renewed.</p>
      <p><strong>Project:</strong> ${m.project_name || "Your project"}</p>
      <p><strong>Next Renewal:</strong> ${m.next_renewal_date || "See your dashboard"}</p>
      <p><a href="${link}">View Project →</a></p>
    `,
  },

  // Subscription activated (first time)
  SUBSCRIPTION_ACTIVATED: {
    shouldEmailAdmin: true,
    shouldEmailClient: true,
    priority: "normal",
    getSubject: (m) => `🎉 Subscription Activated: ${m.project_name || "Project"}`,
    getAdminBody: (m, link) => `
      <p>A new subscription has been activated.</p>
      <p><strong>Project:</strong> ${m.project_name || "Unknown"}</p>
      <p><strong>Client:</strong> ${m.client_email || "Unknown"}</p>
      <p><a href="${link}">View Project →</a></p>
    `,
    getClientBody: (m, link) => `
      <p>Your subscription is now active!</p>
      <p><strong>Project:</strong> ${m.project_name || "Your project"}</p>
      <p>You can now access all features included in your plan.</p>
      <p><a href="${link}">Go to Project →</a></p>
    `,
  },

  // Admin approves service/delivery (client notification)
  SERVICE_APPROVED: {
    shouldEmailAdmin: false,
    shouldEmailClient: true,
    priority: "normal",
    getSubject: (m) => `✅ Service Approved: ${m.project_name || "Your Project"}`,
    getAdminBody: () => "",
    getClientBody: (m, link) => `
      <p>Your service request has been approved!</p>
      <p><strong>Project:</strong> ${m.project_name || "Your project"}</p>
      <p>Our team will begin working on your project shortly.</p>
      <p><a href="${link}">View Project →</a></p>
    `,
  },

  // Project status updated
  PROJECT_STATUS_CHANGED: {
    shouldEmailAdmin: false,
    shouldEmailClient: true,
    priority: "normal",
    getSubject: (m) => `Project Update: ${m.project_name || "Your Project"}`,
    getAdminBody: () => "",
    getClientBody: (m, link) => `
      <p>Your project status has been updated.</p>
      <p><strong>Project:</strong> ${m.project_name || "Your project"}</p>
      <p><strong>New Status:</strong> ${m.new_status || "Updated"}</p>
      ${m.due_date ? `<p><strong>Due Date:</strong> ${m.due_date}</p>` : ""}
      <p><a href="${link}">View Project →</a></p>
    `,
  },

  // Project completed
  PROJECT_COMPLETED: {
    shouldEmailAdmin: false,
    shouldEmailClient: true,
    priority: "high",
    getSubject: (m) => `🎉 Project Completed: ${m.project_name || "Your Project"}`,
    getAdminBody: () => "",
    getClientBody: (m, link) => `
      <p>Congratulations! Your project has been completed.</p>
      <p><strong>Project:</strong> ${m.project_name || "Your project"}</p>
      <p>Thank you for choosing Exavo AI. We hope you're delighted with the results!</p>
      <p><a href="${link}">View Final Delivery →</a></p>
    `,
  },

  // Revision requested (notify admin)
  REVISION_REQUESTED: {
    shouldEmailAdmin: true,
    shouldEmailClient: false,
    priority: "high",
    getSubject: (m) => `📝 Revision Requested: ${m.project_name || "Project"}`,
    getAdminBody: (m, link) => `
      <p>A client has requested revisions.</p>
      <p><strong>Project:</strong> ${m.project_name || "Unknown"}</p>
      <p><strong>Client:</strong> ${m.client_email || "Unknown"}</p>
      <p><strong>Notes:</strong> ${m.notes || m.revision_notes || "No notes provided"}</p>
      <p><a href="${link}">View Project →</a></p>
    `,
    getClientBody: () => "",
  },
};

// ================================
// EMAIL TEMPLATE
// ================================
function buildEmailHtml(
  subject: string,
  bodyContent: string,
  priority: "normal" | "high",
  recipientType: "admin" | "client"
): string {
  const priorityBadge = priority === "high" 
    ? `<div style="background: #FEE2E2; color: #991B1B; padding: 8px 16px; border-radius: 6px; font-size: 13px; font-weight: 600; margin-bottom: 20px; display: inline-block;">⚠️ HIGH PRIORITY</div>`
    : "";

  const recipientNote = recipientType === "admin"
    ? `<div style="background: #F3E8FF; color: #7C3AED; padding: 6px 12px; border-radius: 4px; font-size: 12px; margin-bottom: 15px; display: inline-block;">Admin Notification</div>`
    : "";

  return `
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
            border-radius: 12px; 
            overflow: hidden; 
            box-shadow: 0 2px 8px rgba(0,0,0,0.08); 
          }
          .logo-section {
            background: white;
            padding: 25px 30px 15px 30px;
            text-align: center;
            border-bottom: 1px solid #f0f0f0;
          }
          .logo-text {
            font-size: 28px;
            font-weight: 700;
            background: linear-gradient(135deg, #8B5CF6 0%, #06B6D4 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
          }
          .header { 
            background: linear-gradient(135deg, #8B5CF6 0%, #06B6D4 100%); 
            color: white; 
            padding: 30px; 
            text-align: center; 
          }
          .header h1 { 
            margin: 0; 
            font-size: 22px; 
            font-weight: 600; 
          }
          .content { 
            padding: 30px; 
            background: white; 
          }
          .content p { 
            margin: 0 0 15px 0; 
            font-size: 15px; 
            color: #4a4a4a; 
          }
          .content a { 
            color: #8B5CF6; 
            text-decoration: none; 
            font-weight: 600; 
          }
          .content a:hover { 
            text-decoration: underline; 
          }
          .footer { 
            text-align: center; 
            padding: 20px; 
            background: #f8f9fa; 
            color: #666; 
            font-size: 12px; 
            border-top: 1px solid #e0e0e0; 
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
              <h1>${subject}</h1>
            </div>
            <div class="content">
              ${recipientNote}
              ${priorityBadge}
              ${bodyContent}
            </div>
            <div class="footer">
              <p>Exavo AI — Empowering Business with Intelligence</p>
              <p style="margin-top: 10px; color: #999;">© ${new Date().getFullYear()} Exavo AI. All rights reserved.</p>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;
}

// ================================
// SEND EMAIL VIA RESEND
// ================================
async function sendEmail(
  to: string[],
  subject: string,
  html: string,
  priority: "normal" | "high"
): Promise<boolean> {
  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
  
  if (!RESEND_API_KEY) {
    console.error("[EVENT-EMAIL] RESEND_API_KEY not configured");
    return false;
  }

  try {
    const headers: Record<string, string> = {
      "Authorization": `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    };

    // Add priority header for high priority emails
    if (priority === "high") {
      headers["X-Priority"] = "1";
    }

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers,
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
      console.error("[EVENT-EMAIL] Resend API error:", { status: response.status, body: errorText });
      return false;
    }

    console.log("[EVENT-EMAIL] Email sent successfully to:", to.join(", "));
    return true;
  } catch (error) {
    console.error("[EVENT-EMAIL] Failed to send email:", error);
    return false;
  }
}

// ================================
// DEDUPLICATION CHECK
// ================================
async function checkRecentEmailSent(
  supabaseAdmin: any,
  eventType: string,
  entityId: string | null,
  recipientType: "admin" | "client",
  windowMinutes: number = 10
): Promise<boolean> {
  // Simple in-memory deduplication using activity_logs
  // We log each email sent and check if a similar one was sent recently
  if (!entityId) return false;

  try {
    const { data } = await supabaseAdmin
      .from("activity_logs")
      .select("id")
      .eq("entity_type", "email_notification")
      .eq("entity_id", entityId)
      .eq("action", `${eventType}_${recipientType}`)
      .gte("created_at", new Date(Date.now() - windowMinutes * 60 * 1000).toISOString())
      .limit(1);

    return Boolean(data && data.length > 0);
  } catch {
    return false;
  }
}

// ================================
// LOG EMAIL SENT
// ================================
async function logEmailSent(
  supabaseAdmin: any,
  eventType: string,
  entityId: string | null,
  recipientType: "admin" | "client",
  actorId: string | null
): Promise<void> {
  try {
    await supabaseAdmin.from("activity_logs").insert({
      user_id: actorId || "00000000-0000-0000-0000-000000000000", // System user if no actor
      entity_type: "email_notification",
      entity_id: entityId,
      action: `${eventType}_${recipientType}`,
      details: { sent_at: new Date().toISOString() },
    });
  } catch (error) {
    console.error("[EVENT-EMAIL] Failed to log email:", error);
  }
}

// ================================
// MAIN HANDLER
// ================================
interface EventEmailPayload {
  event_type: string;
  actor_id?: string;
  entity_type?: string;
  entity_id?: string;
  metadata?: Record<string, unknown>;
  target_user_id?: string;
  client_email?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = crypto.randomUUID();
  console.log(`[EVENT-EMAIL][${requestId}] Request received`);

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const payload: EventEmailPayload = await req.json();
    console.log(`[EVENT-EMAIL][${requestId}] Event:`, payload.event_type);

    const { event_type, actor_id, entity_type, entity_id, metadata = {}, target_user_id, client_email } = payload;

    // Check if this event type triggers emails
    const config = EMAIL_EVENT_CONFIG[event_type];
    if (!config) {
      console.log(`[EVENT-EMAIL][${requestId}] Event type not configured for email:`, event_type);
      return new Response(
        JSON.stringify({ success: true, emails_sent: 0, reason: "event_not_configured" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const enrichedMeta = { ...metadata, entity_id, client_email };
    let emailsSent = 0;

    // Determine links
    const adminLink = entity_id ? `${BASE_URL}/admin/projects/${entity_id}` : BASE_URL;
    const clientLink = entity_id ? `${BASE_URL}/client/projects/${entity_id}` : BASE_URL;

    // ================================
    // SEND ADMIN EMAIL
    // ================================
    if (config.shouldEmailAdmin) {
      // Check deduplication
      const alreadySent = await checkRecentEmailSent(supabaseAdmin, event_type, entity_id || null, "admin");
      
      if (!alreadySent) {
        const subject = config.getSubject(enrichedMeta);
        const bodyContent = config.getAdminBody(enrichedMeta, adminLink);
        const html = buildEmailHtml(subject, bodyContent, config.priority, "admin");

        const success = await sendEmail(ADMIN_EMAILS, subject, html, config.priority);
        if (success) {
          emailsSent++;
          await logEmailSent(supabaseAdmin, event_type, entity_id || null, "admin", actor_id || null);
          console.log(`[EVENT-EMAIL][${requestId}] Admin email sent for ${event_type}`);
        }
      } else {
        console.log(`[EVENT-EMAIL][${requestId}] Admin email deduplicated for ${event_type}`);
      }
    }

    // ================================
    // SEND CLIENT EMAIL
    // ================================
    if (config.shouldEmailClient) {
      // Resolve client email
      let recipientEmail: string | undefined = client_email || (metadata.client_email as string) || (metadata.customer_email as string);

      // If not provided, try to fetch from target_user_id or entity
      if (!recipientEmail && target_user_id) {
        const { data: profile } = await supabaseAdmin
          .from("profiles")
          .select("email")
          .eq("id", target_user_id)
          .single();
        recipientEmail = profile?.email;
      }

      // If still not found and we have entity_id for a project, get project owner email
      if (!recipientEmail && entity_id && entity_type === "project") {
        const { data: project } = await supabaseAdmin
          .from("projects")
          .select("user_id, client_id")
          .eq("id", entity_id)
          .single();

        if (project) {
          const ownerId = project.client_id || project.user_id;
          const { data: profile } = await supabaseAdmin
            .from("profiles")
            .select("email")
            .eq("id", ownerId)
            .single();
          recipientEmail = profile?.email;
          enrichedMeta.client_email = recipientEmail;
        }
      }

      // Skip if actor triggered their own action (no self-emails)
      let shouldSkipSelfNotification = false;
      if (recipientEmail && actor_id) {
        const { data: actorProfile } = await supabaseAdmin
          .from("profiles")
          .select("email")
          .eq("id", actor_id)
          .single();

        if (actorProfile?.email === recipientEmail) {
          console.log(`[EVENT-EMAIL][${requestId}] Skipping self-notification for client`);
          shouldSkipSelfNotification = true;
        }
      }

      if (recipientEmail && !shouldSkipSelfNotification) {
        // Check deduplication
        const alreadySent = await checkRecentEmailSent(supabaseAdmin, event_type, entity_id || null, "client");

        if (!alreadySent) {
          const subject = config.getSubject(enrichedMeta);
          const bodyContent = config.getClientBody(enrichedMeta, clientLink);
          const html = buildEmailHtml(subject, bodyContent, config.priority, "client");

          const success = await sendEmail([recipientEmail], subject, html, config.priority);
          if (success) {
            emailsSent++;
            await logEmailSent(supabaseAdmin, event_type, entity_id || null, "client", actor_id || null);
            console.log(`[EVENT-EMAIL][${requestId}] Client email sent to ${recipientEmail} for ${event_type}`);
          }
        } else {
          console.log(`[EVENT-EMAIL][${requestId}] Client email deduplicated for ${event_type}`);
        }
      } else if (!recipientEmail) {
        console.log(`[EVENT-EMAIL][${requestId}] No client email found for ${event_type}`);
      }
    }

    return new Response(
      JSON.stringify({ success: true, emails_sent: emailsSent }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    console.error(`[EVENT-EMAIL][${requestId}] Error:`, err.message);
    
    // Never fail the webhook - just log and return success
    return new Response(
      JSON.stringify({ success: true, emails_sent: 0, error: err.message }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
