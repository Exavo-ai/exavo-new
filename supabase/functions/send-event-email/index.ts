import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import Stripe from "https://esm.sh/stripe@18.5.0";

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
// ENRICHED DATA TYPE
// ================================
interface EnrichedEventData {
  // Project data
  project_id: string | null;
  project_name: string | null;
  project_status: string | null;
  
  // Service data
  service_id: string | null;
  service_name: string | null;
  
  // Client data
  client_id: string | null;
  client_email: string | null;
  client_name: string | null;
  
  // Subscription data (from Stripe)
  subscription_id: string | null;
  subscription_status: string | null;
  plan_name: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  
  // Original metadata (merged)
  [key: string]: unknown;
}

// ================================
// DATA ENRICHMENT FUNCTION
// ================================
async function enrichEventData(
  supabaseAdmin: any,
  stripe: Stripe | null,
  payload: EventEmailPayload,
  requestId: string
): Promise<EnrichedEventData> {
  const { entity_id, entity_type, metadata = {}, target_user_id, client_email } = payload;
  
  const enriched: EnrichedEventData = {
    // Start with null values
    project_id: null,
    project_name: null,
    project_status: null,
    service_id: null,
    service_name: null,
    client_id: null,
    client_email: client_email || (metadata.client_email as string) || null,
    client_name: (metadata.client_name as string) || null,
    subscription_id: (metadata.subscription_id as string) || (metadata.stripe_subscription_id as string) || null,
    subscription_status: null,
    plan_name: null,
    current_period_end: null,
    cancel_at_period_end: false,
    // Merge original metadata
    ...metadata,
  };

  try {
    // ================================
    // STEP 1: Resolve Project Data
    // ================================
    let projectId = entity_type === "project" ? entity_id : (metadata.project_id as string) || null;
    
    if (projectId) {
      console.log(`[EVENT-EMAIL][${requestId}] Enriching project data for: ${projectId}`);
      
      const { data: project, error: projectError } = await supabaseAdmin
        .from("projects")
        .select("id, name, title, status, service_id, user_id, client_id")
        .eq("id", projectId)
        .maybeSingle();

      if (project && !projectError) {
        enriched.project_id = project.id;
        enriched.project_name = project.title || project.name || "Project";
        enriched.project_status = project.status;
        enriched.service_id = project.service_id;
        enriched.client_id = project.client_id || project.user_id;
        
        console.log(`[EVENT-EMAIL][${requestId}] Project resolved: ${enriched.project_name}`);
      } else {
        console.warn(`[EVENT-EMAIL][${requestId}] Could not fetch project: ${projectId}`);
      }
    }

    // ================================
    // STEP 2: Resolve Service Data
    // ================================
    const serviceId = enriched.service_id || (metadata.service_id as string);
    
    if (serviceId) {
      const { data: service, error: serviceError } = await supabaseAdmin
        .from("services")
        .select("id, name")
        .eq("id", serviceId)
        .maybeSingle();

      if (service && !serviceError) {
        enriched.service_id = service.id;
        enriched.service_name = service.name || "Service";
        console.log(`[EVENT-EMAIL][${requestId}] Service resolved: ${enriched.service_name}`);
      }
    }

    // ================================
    // STEP 3: Resolve Client Data from Profile
    // ================================
    const clientId = enriched.client_id || target_user_id || (metadata.user_id as string);
    
    if (clientId && (!enriched.client_email || !enriched.client_name)) {
      const { data: profile, error: profileError } = await supabaseAdmin
        .from("profiles")
        .select("id, email, full_name")
        .eq("id", clientId)
        .maybeSingle();

      if (profile && !profileError) {
        enriched.client_id = profile.id;
        enriched.client_email = enriched.client_email || profile.email;
        enriched.client_name = enriched.client_name || profile.full_name || "Client";
        console.log(`[EVENT-EMAIL][${requestId}] Client resolved: ${enriched.client_email}`);
      }
    }

    // ================================
    // STEP 4: Resolve Subscription Data from project_subscriptions
    // ================================
    if (projectId || enriched.subscription_id) {
      // First try to get from project_subscriptions table
      let subscriptionQuery = supabaseAdmin
        .from("project_subscriptions")
        .select("id, stripe_subscription_id, status, next_renewal_date, cancel_at_period_end, project_id");
      
      if (enriched.subscription_id) {
        subscriptionQuery = subscriptionQuery.eq("stripe_subscription_id", enriched.subscription_id);
      } else if (projectId) {
        subscriptionQuery = subscriptionQuery.eq("project_id", projectId);
      }
      
      const { data: projectSub, error: subError } = await subscriptionQuery.maybeSingle();
      
      if (projectSub && !subError) {
        enriched.subscription_id = projectSub.stripe_subscription_id;
        enriched.subscription_status = projectSub.status;
        enriched.cancel_at_period_end = projectSub.cancel_at_period_end || false;
        
        if (projectSub.next_renewal_date) {
          enriched.current_period_end = projectSub.next_renewal_date;
        }
        
        // If we got project_id from subscription, resolve project data
        if (!enriched.project_id && projectSub.project_id) {
          const { data: project } = await supabaseAdmin
            .from("projects")
            .select("id, name, title, status, service_id, user_id, client_id")
            .eq("id", projectSub.project_id)
            .maybeSingle();
          
          if (project) {
            enriched.project_id = project.id;
            enriched.project_name = project.title || project.name || "Project";
            enriched.project_status = project.status;
            enriched.service_id = enriched.service_id || project.service_id;
            enriched.client_id = enriched.client_id || project.client_id || project.user_id;
          }
        }
        
        console.log(`[EVENT-EMAIL][${requestId}] Subscription resolved from DB: ${enriched.subscription_status}`);
      }
    }

    // ================================
    // STEP 5: Enrich from Stripe API (if available)
    // ================================
    if (stripe && enriched.subscription_id) {
      try {
        const subscription = await stripe.subscriptions.retrieve(enriched.subscription_id);
        
        enriched.subscription_status = subscription.status;
        enriched.cancel_at_period_end = subscription.cancel_at_period_end;
        
        if (subscription.current_period_end) {
          enriched.current_period_end = new Date(subscription.current_period_end * 1000).toISOString();
        }
        
        // Get plan/price name
        if (subscription.items?.data?.[0]?.price) {
          const price = subscription.items.data[0].price;
          if (typeof price.product === "string") {
            try {
              const product = await stripe.products.retrieve(price.product);
              enriched.plan_name = product.name || null;
            } catch {
              enriched.plan_name = price.nickname || null;
            }
          } else if (price.product && typeof price.product === "object" && "name" in price.product) {
            enriched.plan_name = (price.product as any).name || null;
          }
        }
        
        // Resolve client email from Stripe customer
        if (!enriched.client_email && subscription.customer) {
          const customerId = typeof subscription.customer === "string" 
            ? subscription.customer 
            : subscription.customer.id;
          
          const customer = await stripe.customers.retrieve(customerId);
          if (customer && !customer.deleted) {
            enriched.client_email = (customer as Stripe.Customer).email || enriched.client_email;
            enriched.client_name = enriched.client_name || (customer as Stripe.Customer).name || null;
          }
        }
        
        console.log(`[EVENT-EMAIL][${requestId}] Stripe subscription enriched: ${subscription.status}`);
      } catch (stripeErr) {
        console.warn(`[EVENT-EMAIL][${requestId}] Stripe enrichment failed:`, stripeErr);
      }
    }

    // ================================
    // STEP 6: Final client resolution if still missing
    // ================================
    if (!enriched.client_email && enriched.client_id) {
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("email, full_name")
        .eq("id", enriched.client_id)
        .maybeSingle();
      
      if (profile) {
        enriched.client_email = profile.email;
        enriched.client_name = enriched.client_name || profile.full_name;
      }
    }

  } catch (error) {
    console.error(`[EVENT-EMAIL][${requestId}] Enrichment error:`, error);
  }

  // Log final enriched data summary
  console.log(`[EVENT-EMAIL][${requestId}] Enrichment complete:`, {
    project_name: enriched.project_name,
    service_name: enriched.service_name,
    client_email: enriched.client_email,
    subscription_status: enriched.subscription_status,
  });

  return enriched;
}

// ================================
// EMAIL EVENT CONFIGURATION
// ================================
const EMAIL_EVENT_CONFIG: Record<string, {
  shouldEmailAdmin: boolean;
  shouldEmailClient: boolean;
  priority: "normal" | "high";
  getSubject: (meta: EnrichedEventData) => string;
  getAdminBody: (meta: EnrichedEventData, link: string) => string;
  getClientBody: (meta: EnrichedEventData, link: string) => string;
}> = {
  // ================================
  // ADMIN-ONLY EVENTS
  // ================================
  
  SERVICE_PURCHASED: {
    shouldEmailAdmin: true,
    shouldEmailClient: false,
    priority: "normal",
    getSubject: (m) => `New Purchase: ${m.service_name || m.project_name || "Service"}`,
    getAdminBody: (m, link) => `
      <p>A client has purchased a service.</p>
      <p><strong>Client:</strong> ${m.client_name || "N/A"} (${m.client_email || "Unknown email"})</p>
      <p><strong>Service:</strong> ${m.service_name || "N/A"}</p>
      <p><strong>Project:</strong> ${m.project_name || "N/A"}</p>
      ${m.amount ? `<p><strong>Amount:</strong> $${(Number(m.amount) / 100).toFixed(2)}</p>` : ""}
      ${m.plan_name ? `<p><strong>Plan:</strong> ${m.plan_name}</p>` : ""}
      <p><a href="${link}">View Details →</a></p>
    `,
    getClientBody: () => "",
  },

  SUBSCRIPTION_CANCELED: {
    shouldEmailAdmin: true,
    shouldEmailClient: true,
    priority: "high",
    getSubject: (m) => `⚠️ Subscription ${m.cancel_at_period_end ? "Scheduled for Cancellation" : "Canceled"}: ${m.project_name || "Project"}`,
    getAdminBody: (m, link) => `
      <p>A client has ${m.cancel_at_period_end ? "scheduled cancellation for" : "canceled"} their subscription.</p>
      <p><strong>Project:</strong> ${m.project_name || "Unknown"}</p>
      <p><strong>Service:</strong> ${m.service_name || "N/A"}</p>
      <p><strong>Client:</strong> ${m.client_name || "N/A"} (${m.client_email || "Unknown email"})</p>
      ${m.plan_name ? `<p><strong>Plan:</strong> ${m.plan_name}</p>` : ""}
      ${m.cancel_at_period_end && m.current_period_end ? `<p><strong>Access Until:</strong> ${new Date(m.current_period_end).toLocaleDateString()}</p>` : ""}
      ${m.cancel_reason ? `<p><strong>Reason:</strong> ${m.cancel_reason}</p>` : ""}
      <p><a href="${link}">View Project →</a></p>
    `,
    getClientBody: (m, link) => `
      <p>Your subscription ${m.cancel_at_period_end ? "has been scheduled for cancellation" : "has been canceled"}.</p>
      <p><strong>Project:</strong> ${m.project_name || "Your project"}</p>
      ${m.cancel_at_period_end && m.current_period_end ? `
        <p>You will continue to have access until <strong>${new Date(m.current_period_end).toLocaleDateString()}</strong>.</p>
        <p>If you change your mind, you can resubscribe anytime from your project dashboard.</p>
      ` : `
        <p>Your access has ended. If you'd like to continue, you can resubscribe from your project dashboard.</p>
      `}
      <p><a href="${link}">View Project →</a></p>
    `,
  },

  SUBSCRIPTION_PAUSED: {
    shouldEmailAdmin: true,
    shouldEmailClient: true,
    priority: "normal",
    getSubject: (m) => `⏸️ Subscription Paused: ${m.project_name || "Project"}`,
    getAdminBody: (m, link) => `
      <p>A client has paused their subscription.</p>
      <p><strong>Project:</strong> ${m.project_name || "Unknown"}</p>
      <p><strong>Service:</strong> ${m.service_name || "N/A"}</p>
      <p><strong>Client:</strong> ${m.client_name || "N/A"} (${m.client_email || "Unknown email"})</p>
      ${m.plan_name ? `<p><strong>Plan:</strong> ${m.plan_name}</p>` : ""}
      ${m.resume_at ? `<p><strong>Auto-resume:</strong> ${new Date(String(m.resume_at)).toLocaleDateString()}</p>` : ""}
      <p><a href="${link}">View Project →</a></p>
    `,
    getClientBody: (m, link) => `
      <p>Your subscription has been paused.</p>
      <p><strong>Project:</strong> ${m.project_name || "Your project"}</p>
      ${m.resume_at ? `<p>Your subscription will automatically resume on <strong>${new Date(String(m.resume_at)).toLocaleDateString()}</strong>.</p>` : ""}
      <p>You can resume your subscription anytime from your project dashboard.</p>
      <p><a href="${link}">View Project →</a></p>
    `,
  },

  SUBSCRIPTION_RESUMED: {
    shouldEmailAdmin: true,
    shouldEmailClient: true,
    priority: "normal",
    getSubject: (m) => `▶️ Subscription Resumed: ${m.project_name || "Project"}`,
    getAdminBody: (m, link) => `
      <p>A client has resumed their subscription.</p>
      <p><strong>Project:</strong> ${m.project_name || "Unknown"}</p>
      <p><strong>Service:</strong> ${m.service_name || "N/A"}</p>
      <p><strong>Client:</strong> ${m.client_name || "N/A"} (${m.client_email || "Unknown email"})</p>
      ${m.plan_name ? `<p><strong>Plan:</strong> ${m.plan_name}</p>` : ""}
      ${m.current_period_end ? `<p><strong>Next Renewal:</strong> ${new Date(m.current_period_end).toLocaleDateString()}</p>` : ""}
      <p><a href="${link}">View Project →</a></p>
    `,
    getClientBody: (m, link) => `
      <p>Your subscription has been resumed successfully!</p>
      <p><strong>Project:</strong> ${m.project_name || "Your project"}</p>
      ${m.current_period_end ? `<p>Your next billing date is <strong>${new Date(m.current_period_end).toLocaleDateString()}</strong>.</p>` : ""}
      <p>You now have full access to all features included in your plan.</p>
      <p><a href="${link}">View Project →</a></p>
    `,
  },

  DELIVERY_APPROVED: {
    shouldEmailAdmin: true,
    shouldEmailClient: false,
    priority: "normal",
    getSubject: (m) => `✅ Delivery Approved: ${m.project_name || "Project"}`,
    getAdminBody: (m, link) => `
      <p>A client has approved a delivery.</p>
      <p><strong>Project:</strong> ${m.project_name || "Unknown"}</p>
      <p><strong>Service:</strong> ${m.service_name || "N/A"}</p>
      <p><strong>Client:</strong> ${m.client_name || "N/A"} (${m.client_email || "Unknown email"})</p>
      <p><a href="${link}">View Project →</a></p>
    `,
    getClientBody: () => "",
  },

  PAYMENT_FAILED: {
    shouldEmailAdmin: true,
    shouldEmailClient: true,
    priority: "high",
    getSubject: (m) => `⚠️ Payment Failed: ${m.project_name || "Project"}`,
    getAdminBody: (m, link) => `
      <p>A payment has failed and requires attention.</p>
      <p><strong>Project:</strong> ${m.project_name || "Unknown"}</p>
      <p><strong>Service:</strong> ${m.service_name || "N/A"}</p>
      <p><strong>Client:</strong> ${m.client_name || "N/A"} (${m.client_email || "Unknown email"})</p>
      ${m.error ? `<p><strong>Error:</strong> ${m.error}</p>` : ""}
      <p><a href="${link}">View Project →</a></p>
    `,
    getClientBody: (m, link) => `
      <p>We encountered an issue processing your payment.</p>
      <p><strong>Project:</strong> ${m.project_name || "Your project"}</p>
      <p>Please update your payment method to avoid service interruption.</p>
      <p><a href="${link}">Update Payment Method →</a></p>
    `,
  },

  MANUAL_INTERVENTION_REQUIRED: {
    shouldEmailAdmin: true,
    shouldEmailClient: false,
    priority: "high",
    getSubject: (m) => `🚨 Manual Intervention Required`,
    getAdminBody: (m, link) => `
      <p>A situation requires your immediate attention.</p>
      ${m.project_name ? `<p><strong>Project:</strong> ${m.project_name}</p>` : ""}
      <p><strong>Reason:</strong> ${m.reason || "Unknown"}</p>
      <p><strong>Context:</strong> ${m.context || "N/A"}</p>
      ${link !== BASE_URL ? `<p><a href="${link}">View Details →</a></p>` : ""}
    `,
    getClientBody: () => "",
  },

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

  REVISION_REQUESTED: {
    shouldEmailAdmin: true,
    shouldEmailClient: false,
    priority: "high",
    getSubject: (m) => `📝 Revision Requested: ${m.project_name || "Project"}`,
    getAdminBody: (m, link) => `
      <p>A client has requested revisions.</p>
      <p><strong>Project:</strong> ${m.project_name || "Unknown"}</p>
      <p><strong>Service:</strong> ${m.service_name || "N/A"}</p>
      <p><strong>Client:</strong> ${m.client_name || "N/A"} (${m.client_email || "Unknown email"})</p>
      <p><strong>Notes:</strong> ${m.notes || m.revision_notes || "No notes provided"}</p>
      <p><a href="${link}">View Project →</a></p>
    `,
    getClientBody: () => "",
  },

  // ================================
  // CLIENT-ONLY EVENTS
  // ================================

  DELIVERY_CREATED: {
    shouldEmailAdmin: false,
    shouldEmailClient: true,
    priority: "high",
    getSubject: (m) => `📦 New Delivery Ready: ${m.project_name || "Your Project"}`,
    getAdminBody: () => "",
    getClientBody: (m, link) => `
      <p>Great news! A new delivery is ready for your review.</p>
      <p><strong>Project:</strong> ${m.project_name || "Your project"}</p>
      ${m.service_name ? `<p><strong>Service:</strong> ${m.service_name}</p>` : ""}
      ${m.message ? `<p><strong>Message:</strong> ${m.message}</p>` : "<p>Please review the latest delivery.</p>"}
      <p><a href="${link}">Review Delivery →</a></p>
    `,
  },

  SUBSCRIPTION_RENEWED: {
    shouldEmailAdmin: false,
    shouldEmailClient: true,
    priority: "normal",
    getSubject: (m) => `✅ Subscription Renewed: ${m.project_name || "Your Project"}`,
    getAdminBody: () => "",
    getClientBody: (m, link) => `
      <p>Your subscription has been successfully renewed.</p>
      <p><strong>Project:</strong> ${m.project_name || "Your project"}</p>
      ${m.plan_name ? `<p><strong>Plan:</strong> ${m.plan_name}</p>` : ""}
      ${m.current_period_end ? `<p><strong>Next Renewal:</strong> ${new Date(m.current_period_end).toLocaleDateString()}</p>` : ""}
      <p><a href="${link}">View Project →</a></p>
    `,
  },

  SUBSCRIPTION_ACTIVATED: {
    shouldEmailAdmin: true,
    shouldEmailClient: true,
    priority: "normal",
    getSubject: (m) => `🎉 Subscription Activated: ${m.project_name || "Project"}`,
    getAdminBody: (m, link) => `
      <p>A new subscription has been activated.</p>
      <p><strong>Project:</strong> ${m.project_name || "Unknown"}</p>
      <p><strong>Service:</strong> ${m.service_name || "N/A"}</p>
      <p><strong>Client:</strong> ${m.client_name || "N/A"} (${m.client_email || "Unknown email"})</p>
      ${m.plan_name ? `<p><strong>Plan:</strong> ${m.plan_name}</p>` : ""}
      <p><a href="${link}">View Project →</a></p>
    `,
    getClientBody: (m, link) => `
      <p>Your subscription is now active!</p>
      <p><strong>Project:</strong> ${m.project_name || "Your project"}</p>
      ${m.plan_name ? `<p><strong>Plan:</strong> ${m.plan_name}</p>` : ""}
      <p>You can now access all features included in your plan.</p>
      <p><a href="${link}">Go to Project →</a></p>
    `,
  },

  SERVICE_APPROVED: {
    shouldEmailAdmin: false,
    shouldEmailClient: true,
    priority: "normal",
    getSubject: (m) => `✅ Service Approved: ${m.project_name || "Your Project"}`,
    getAdminBody: () => "",
    getClientBody: (m, link) => `
      <p>Your service request has been approved!</p>
      <p><strong>Project:</strong> ${m.project_name || "Your project"}</p>
      ${m.service_name ? `<p><strong>Service:</strong> ${m.service_name}</p>` : ""}
      <p>Our team will begin working on your project shortly.</p>
      <p><a href="${link}">View Project →</a></p>
    `,
  },

  PROJECT_STATUS_CHANGED: {
    shouldEmailAdmin: false,
    shouldEmailClient: true,
    priority: "normal",
    getSubject: (m) => `Project Update: ${m.project_name || "Your Project"}`,
    getAdminBody: () => "",
    getClientBody: (m, link) => `
      <p>Your project status has been updated.</p>
      <p><strong>Project:</strong> ${m.project_name || "Your project"}</p>
      ${m.new_status ? `<p><strong>New Status:</strong> ${m.new_status}</p>` : ""}
      ${m.due_date ? `<p><strong>Due Date:</strong> ${m.due_date}</p>` : ""}
      <p><a href="${link}">View Project →</a></p>
    `,
  },

  PROJECT_COMPLETED: {
    shouldEmailAdmin: false,
    shouldEmailClient: true,
    priority: "high",
    getSubject: (m) => `🎉 Project Completed: ${m.project_name || "Your Project"}`,
    getAdminBody: () => "",
    getClientBody: (m, link) => `
      <p>Congratulations! Your project has been completed.</p>
      <p><strong>Project:</strong> ${m.project_name || "Your project"}</p>
      ${m.service_name ? `<p><strong>Service:</strong> ${m.service_name}</p>` : ""}
      <p>Thank you for choosing Exavo AI. We hope you're delighted with the results!</p>
      <p><a href="${link}">View Final Delivery →</a></p>
    `,
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
      user_id: actorId || "00000000-0000-0000-0000-000000000000",
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

    // Initialize Stripe if key is available
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    let stripe: Stripe | null = null;
    if (stripeKey) {
      stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    }

    const payload: EventEmailPayload = await req.json();
    console.log(`[EVENT-EMAIL][${requestId}] Event:`, payload.event_type);

    const { event_type, actor_id } = payload;

    // Check if this event type triggers emails
    const config = EMAIL_EVENT_CONFIG[event_type];
    if (!config) {
      console.log(`[EVENT-EMAIL][${requestId}] Event type not configured for email:`, event_type);
      return new Response(
        JSON.stringify({ success: true, emails_sent: 0, reason: "event_not_configured" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ================================
    // ENRICH EVENT DATA BEFORE SENDING
    // ================================
    const enrichedData = await enrichEventData(supabaseAdmin, stripe, payload, requestId);
    let emailsSent = 0;

    // Determine links using enriched project_id
    const projectId = enrichedData.project_id || payload.entity_id;
    const adminLink = projectId ? `${BASE_URL}/admin/projects/${projectId}` : BASE_URL;
    const clientLink = projectId ? `${BASE_URL}/client/projects/${projectId}` : BASE_URL;

    // ================================
    // SEND ADMIN EMAIL
    // ================================
    if (config.shouldEmailAdmin) {
      const alreadySent = await checkRecentEmailSent(supabaseAdmin, event_type, projectId || null, "admin");
      
      if (!alreadySent) {
        const subject = config.getSubject(enrichedData);
        const bodyContent = config.getAdminBody(enrichedData, adminLink);
        const html = buildEmailHtml(subject, bodyContent, config.priority, "admin");

        const success = await sendEmail(ADMIN_EMAILS, subject, html, config.priority);
        if (success) {
          emailsSent++;
          await logEmailSent(supabaseAdmin, event_type, projectId || null, "admin", actor_id || null);
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
      const recipientEmail = enrichedData.client_email;

      // Define lifecycle events that should ALWAYS send to client
      // even if client triggered the action themselves
      const LIFECYCLE_EVENTS = [
        "SUBSCRIPTION_CANCELED",
        "SUBSCRIPTION_PAUSED",
        "SUBSCRIPTION_RESUMED",
        "SUBSCRIPTION_RENEWED",
        "SUBSCRIPTION_ACTIVATED",
        "PAYMENT_FAILED",
        "DELIVERY_APPROVED",
        "PROJECT_COMPLETED",
        "PROJECT_STATUS_CHANGED",
        "DELIVERY_CREATED",
        "SERVICE_APPROVED",
      ];

      // Only skip self-notifications for non-lifecycle events (like comments)
      let shouldSkipSelfNotification = false;
      const isLifecycleEvent = LIFECYCLE_EVENTS.includes(event_type);
      
      if (!isLifecycleEvent && recipientEmail && actor_id) {
        const { data: actorProfile } = await supabaseAdmin
          .from("profiles")
          .select("email")
          .eq("id", actor_id)
          .maybeSingle();

        if (actorProfile?.email === recipientEmail) {
          console.log(`[EVENT-EMAIL][${requestId}] Skipping self-notification for non-lifecycle event: ${event_type}`);
          shouldSkipSelfNotification = true;
        }
      }

      if (recipientEmail && !shouldSkipSelfNotification) {
        const alreadySent = await checkRecentEmailSent(supabaseAdmin, event_type, projectId || null, "client");

        if (!alreadySent) {
          const subject = config.getSubject(enrichedData);
          const bodyContent = config.getClientBody(enrichedData, clientLink);
          const html = buildEmailHtml(subject, bodyContent, config.priority, "client");

          const success = await sendEmail([recipientEmail], subject, html, config.priority);
          if (success) {
            emailsSent++;
            await logEmailSent(supabaseAdmin, event_type, projectId || null, "client", actor_id || null);
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
