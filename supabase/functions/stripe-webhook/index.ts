import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { emitSystemAlert, emitEvent } from "../_shared/notifications.ts";

// Generate request ID for tracing
const generateRequestId = () => `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

const logStep = (step: string, details?: unknown, context?: { requestId?: string; eventId?: string }) => {
  const timestamp = new Date().toISOString();
  const contextStr = context ? `[${context.requestId || ''}][${context.eventId || ''}]` : '';
  console.log(`[STRIPE-WEBHOOK][${timestamp}]${contextStr} ${step}`, details ? JSON.stringify(details) : "");
};

// ============================================
// EXTERNAL WEBHOOK FORWARDER (Fire-and-Forget)
// Forwards subscription events to n8n without blocking main logic
// ============================================
const N8N_SUBSCRIPTION_WEBHOOK_URL = "https://n8n.exavo.app/webhook/Subscription-status";

async function forwardSubscriptionEventToN8N(
  stripe: Stripe,
  event: Stripe.Event,
  ctx: { requestId?: string; eventId?: string }
): Promise<void> {
  // Only forward specific subscription events
  const forwardableEvents = ["customer.subscription.created", "customer.subscription.deleted"];
  if (!forwardableEvents.includes(event.type)) {
    return;
  }

  try {
    const subscription = event.data.object as Stripe.Subscription;
    
    // Map event type for external system
    const eventType = event.type === "customer.subscription.deleted" 
      ? "customer.subscription.cancelled" 
      : event.type;

    // Extract customer ID
    const customerId = typeof subscription.customer === "string" 
      ? subscription.customer 
      : subscription.customer?.id || null;

    // Attempt to get customer email (non-blocking)
    let customerEmail: string | null = null;
    if (customerId) {
      try {
        const customer = await stripe.customers.retrieve(customerId) as Stripe.Customer;
        if (customer && !customer.deleted) {
          customerEmail = customer.email || null;
        }
      } catch (e) {
        logStep("forwardSubscriptionEventToN8N: Could not retrieve customer email (non-blocking)", { error: e }, ctx);
      }
    }

    // Extract plan name from price nickname or product name
    let planName: string | null = null;
    const priceItem = subscription.items?.data?.[0]?.price;
    if (priceItem) {
      planName = priceItem.nickname || null;
      // If no nickname, try to get product name
      if (!planName && priceItem.product) {
        try {
          const productId = typeof priceItem.product === "string" ? priceItem.product : priceItem.product.id;
          const product = await stripe.products.retrieve(productId);
          planName = product.name || null;
        } catch (e) {
          logStep("forwardSubscriptionEventToN8N: Could not retrieve product name (non-blocking)", { error: e }, ctx);
        }
      }
    }

    // Build payload
    const payload = {
      event: eventType,
      subscription_id: subscription.id || null,
      status: subscription.status || null,
      customer_id: customerId,
      customer_email: customerEmail,
      plan: planName,
      cancel_at_period_end: subscription.cancel_at_period_end ?? null,
      current_period_end: subscription.current_period_end || null,
    };

    logStep("forwardSubscriptionEventToN8N: Sending payload", { url: N8N_SUBSCRIPTION_WEBHOOK_URL, payload }, ctx);

    // Fire-and-forget POST request
    const response = await fetch(N8N_SUBSCRIPTION_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      logStep("forwardSubscriptionEventToN8N: Success", { status: response.status }, ctx);
    } else {
      logStep("forwardSubscriptionEventToN8N: Non-OK response (ignored)", { status: response.status }, ctx);
    }
  } catch (error) {
    // Log error but DO NOT throw - this is fire-and-forget
    logStep("forwardSubscriptionEventToN8N: Error (ignored, non-blocking)", { 
      error: error instanceof Error ? error.message : String(error) 
    }, ctx);
  }
}

// ============================================
// CHECKOUT SESSION SUBSCRIPTION FORWARDER (Fire-and-Forget)
// Handles checkout.session.completed events that include subscriptions
// Stripe does not always emit customer.subscription.created for checkout-based subscriptions
// ============================================
async function forwardCheckoutSubscriptionToN8N(
  stripe: Stripe,
  event: Stripe.Event,
  ctx: { requestId?: string; eventId?: string }
): Promise<void> {
  // Only handle checkout.session.completed
  if (event.type !== "checkout.session.completed") {
    return;
  }

  const session = event.data.object as Stripe.Checkout.Session;
  
  // Only forward if session has a subscription
  if (!session.subscription) {
    logStep("forwardCheckoutSubscriptionToN8N: No subscription in session, skipping", {}, ctx);
    return;
  }

  try {
    // Retrieve the full subscription object from Stripe
    const subscriptionId = typeof session.subscription === "string" 
      ? session.subscription 
      : session.subscription.id;
    
    logStep("forwardCheckoutSubscriptionToN8N: Retrieving subscription", { subscriptionId }, ctx);
    
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);

    // Extract customer ID
    const customerId = typeof subscription.customer === "string" 
      ? subscription.customer 
      : subscription.customer?.id || null;

    // Get customer email - try session first, then customer object
    let customerEmail: string | null = session.customer_email || null;
    if (!customerEmail && customerId) {
      try {
        const customer = await stripe.customers.retrieve(customerId) as Stripe.Customer;
        if (customer && !customer.deleted) {
          customerEmail = customer.email || null;
        }
      } catch (e) {
        logStep("forwardCheckoutSubscriptionToN8N: Could not retrieve customer email (non-blocking)", { error: e }, ctx);
      }
    }

    // Extract plan name from price nickname or product name
    let planName: string | null = null;
    const priceItem = subscription.items?.data?.[0]?.price;
    if (priceItem) {
      planName = priceItem.nickname || null;
      // If no nickname, try to get product name
      if (!planName && priceItem.product) {
        try {
          const productId = typeof priceItem.product === "string" ? priceItem.product : priceItem.product.id;
          const product = await stripe.products.retrieve(productId);
          planName = product.name || null;
        } catch (e) {
          logStep("forwardCheckoutSubscriptionToN8N: Could not retrieve product name (non-blocking)", { error: e }, ctx);
        }
      }
    }

    // Build payload - same structure as other subscription events
    const payload = {
      event: "customer.subscription.created",
      subscription_id: subscription.id || null,
      status: subscription.status || null,
      customer_id: customerId,
      customer_email: customerEmail,
      plan: planName,
      cancel_at_period_end: subscription.cancel_at_period_end ?? null,
      current_period_end: subscription.current_period_end || null,
    };

    logStep("forwardCheckoutSubscriptionToN8N: Sending payload", { url: N8N_SUBSCRIPTION_WEBHOOK_URL, payload }, ctx);

    // Fire-and-forget POST request
    const response = await fetch(N8N_SUBSCRIPTION_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      logStep("forwardCheckoutSubscriptionToN8N: Success", { status: response.status }, ctx);
    } else {
      logStep("forwardCheckoutSubscriptionToN8N: Non-OK response (ignored)", { status: response.status }, ctx);
    }
  } catch (error) {
    // Log error but DO NOT throw - this is fire-and-forget
    logStep("forwardCheckoutSubscriptionToN8N: Error (ignored, non-blocking)", { 
      error: error instanceof Error ? error.message : String(error) 
    }, ctx);
  }
}

// Helper to extract client notes from Stripe custom_fields or metadata
const extractClientNotes = (session: Stripe.Checkout.Session): string | null => {
  try {
    // First, check metadata for client_notes (pre-checkout dialog flow)
    if (session.metadata?.client_notes && typeof session.metadata.client_notes === 'string') {
      const notes = session.metadata.client_notes.trim();
      if (notes.length > 0 && notes.length <= 500) {
        logStep("Client notes from metadata", { preview: notes.substring(0, 50) });
        return notes;
      }
    }
    
    // Fallback: check custom_fields (legacy Stripe UI flow)
    if (!session.custom_fields || !Array.isArray(session.custom_fields)) {
      return null;
    }
    const notesField = session.custom_fields.find((f: any) => f.key === 'notes');
    if (notesField && notesField.text && typeof notesField.text.value === 'string') {
      const notes = notesField.text.value.trim();
      if (notes.length > 0 && notes.length <= 255) {
        logStep("Client notes from custom_fields", { preview: notes.substring(0, 50) });
        return notes;
      }
    }
    return null;
  } catch (e) {
    logStep("Could not extract client notes (non-blocking)", { error: e });
    return null;
  }
};

// ============================================
// UPSERT HELPER: Safe project subscription sync
// Primary key: stripe_subscription_id
// Fallback: project_id
// ============================================
async function upsertProjectSubscription(
  supabaseAdmin: any,
  subscription: Stripe.Subscription,
  projectId: string,
  ctx: { requestId?: string; eventId?: string }
) {
  const customerId = typeof subscription.customer === "string" 
    ? subscription.customer 
    : subscription.customer?.id || null;

  const priceId = subscription.items.data[0]?.price.id || null;
  
  const subscriptionData = {
    project_id: projectId,
    stripe_subscription_id: subscription.id,
    stripe_customer_id: customerId,
    status: subscription.status,
    next_renewal_date: new Date(subscription.current_period_end * 1000).toISOString(),
    cancel_at_period_end: subscription.cancel_at_period_end,
    paused_at: subscription.pause_collection ? new Date().toISOString() : null,
    resume_at: subscription.pause_collection?.resumes_at 
      ? new Date(subscription.pause_collection.resumes_at * 1000).toISOString() 
      : null,
    updated_at: new Date().toISOString(),
  };

  // Try to find existing record by stripe_subscription_id first (primary key)
  const { data: existingBySub } = await supabaseAdmin
    .from("project_subscriptions")
    .select("id, project_id")
    .eq("stripe_subscription_id", subscription.id)
    .maybeSingle();

  if (existingBySub) {
    // Update existing record by subscription ID
    const { error } = await supabaseAdmin
      .from("project_subscriptions")
      .update(subscriptionData)
      .eq("stripe_subscription_id", subscription.id);

    if (error) {
      logStep("ERROR: Failed to update project_subscription by subscription_id", { error }, ctx);
      return false;
    }
    logStep("subscription_upserted (updated by stripe_subscription_id)", { 
      subscriptionId: subscription.id, 
      projectId: existingBySub.project_id,
      status: subscription.status
    }, ctx);
    return true;
  }

  // Try to find by project_id (fallback)
  const { data: existingByProject } = await supabaseAdmin
    .from("project_subscriptions")
    .select("id, stripe_subscription_id")
    .eq("project_id", projectId)
    .maybeSingle();

  if (existingByProject) {
    // Update existing record by project_id
    const { error } = await supabaseAdmin
      .from("project_subscriptions")
      .update(subscriptionData)
      .eq("project_id", projectId);

    if (error) {
      logStep("ERROR: Failed to update project_subscription by project_id", { error }, ctx);
      return false;
    }
    logStep("subscription_upserted (updated by project_id)", { 
      subscriptionId: subscription.id, 
      projectId,
      previousSubId: existingByProject.stripe_subscription_id,
      status: subscription.status
    }, ctx);
    return true;
  }

  // Insert new record
  const { error: insertError } = await supabaseAdmin
    .from("project_subscriptions")
    .insert(subscriptionData);

  if (insertError) {
    // Handle race condition: record might have been inserted by another event
    if (insertError.code === "23505") {
      logStep("subscription_upserted (race condition, already exists)", { 
        subscriptionId: subscription.id, 
        projectId 
      }, ctx);
      return true;
    }
    logStep("ERROR: Failed to insert project_subscription", { error: insertError }, ctx);
    return false;
  }

  logStep("subscription_linked (new record)", { 
    subscriptionId: subscription.id, 
    projectId,
    status: subscription.status
  }, ctx);
  return true;
}

// ============================================
// FIND PROJECT HELPER: Multiple strategies
// ============================================
async function findProjectForSubscription(
  supabaseAdmin: any,
  stripe: Stripe,
  subscription: Stripe.Subscription,
  ctx: { requestId?: string; eventId?: string }
): Promise<{ id: string } | null> {
  const serviceId = subscription.metadata?.service_id;
  const userId = subscription.metadata?.lovable_user_id;
  const customerId = typeof subscription.customer === "string"
    ? subscription.customer 
    : subscription.customer?.id;

  // Strategy 1: Find by service_id and user_id from metadata (most reliable)
  if (serviceId && userId) {
    const { data: projectByMeta } = await supabaseAdmin
      .from("projects")
      .select("id")
      .eq("service_id", serviceId)
      .eq("user_id", userId)
      .eq("payment_model", "subscription")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (projectByMeta) {
      logStep("subscription_detected: Found project by metadata", { 
        projectId: projectByMeta.id, 
        serviceId, 
        userId 
      }, ctx);
      return projectByMeta;
    }
  }

  // Strategy 2: Find recent subscription project for user (created within 1 hour)
  if (userId) {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { data: recentProject } = await supabaseAdmin
      .from("projects")
      .select("id")
      .eq("user_id", userId)
      .eq("payment_model", "subscription")
      .gte("created_at", oneHourAgo)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (recentProject) {
      logStep("subscription_detected: Found recent subscription project", { 
        projectId: recentProject.id, 
        userId 
      }, ctx);
      return recentProject;
    }
  }

  // Strategy 3: Find by customer email (customer.metadata fallback)
  if (customerId) {
    try {
      const customer = await stripe.customers.retrieve(customerId) as Stripe.Customer;
      if (customer && !customer.deleted) {
        // Try customer metadata first
        const lastUserId = customer.metadata?.last_lovable_user_id;
        const lastServiceId = customer.metadata?.last_service_id;
        
        if (lastUserId && lastServiceId) {
          const { data: projectByCustomerMeta } = await supabaseAdmin
            .from("projects")
            .select("id")
            .eq("user_id", lastUserId)
            .eq("service_id", lastServiceId)
            .eq("payment_model", "subscription")
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          if (projectByCustomerMeta) {
            logStep("subscription_detected: Found project by customer metadata", { 
              projectId: projectByCustomerMeta.id 
            }, ctx);
            return projectByCustomerMeta;
          }
        }

        // Try email lookup
        if (customer.email) {
          const { data: profile } = await supabaseAdmin
            .from("profiles")
            .select("id")
            .eq("email", customer.email)
            .maybeSingle();

          if (profile) {
            const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
            const { data: recentProject } = await supabaseAdmin
              .from("projects")
              .select("id")
              .eq("user_id", profile.id)
              .eq("payment_model", "subscription")
              .gte("created_at", oneHourAgo)
              .order("created_at", { ascending: false })
              .limit(1)
              .maybeSingle();

            if (recentProject) {
              logStep("subscription_detected: Found project via customer email", { 
                projectId: recentProject.id, 
                email: customer.email 
              }, ctx);
              return recentProject;
            }
          }
        }
      }
    } catch (e) {
      logStep("Could not lookup customer for fallback", { error: e }, ctx);
    }
  }

  return null;
}

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const signature = req.headers.get("stripe-signature");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SIGNING_SECRET");

  if (!signature || !webhookSecret) {
    logStep("ERROR: Missing signature or webhook secret");
    return new Response("Webhook misconfigured", { status: 400 });
  }

  const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, { apiVersion: "2025-08-27.basil" });
  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    const body = await req.text();
    const event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    const requestId = generateRequestId();
    const ctx = { requestId, eventId: event.id };

    logStep("Event received", { type: event.type, id: event.id }, ctx);

    // ============================================
    // EXTERNAL WEBHOOK FORWARDING (Fire-and-Forget)
    // Must NOT block or fail main webhook processing
    // ============================================
    forwardSubscriptionEventToN8N(stripe, event, ctx).catch((e) => {
      // Extra safety: catch any unhandled promise rejection
      logStep("forwardSubscriptionEventToN8N: Unhandled error (ignored)", { error: e }, ctx);
    });

    // Forward checkout.session.completed with subscription to n8n
    // This handles cases where Stripe doesn't emit customer.subscription.created
    forwardCheckoutSubscriptionToN8N(stripe, event, ctx).catch((e) => {
      // Extra safety: catch any unhandled promise rejection
      logStep("forwardCheckoutSubscriptionToN8N: Unhandled error (ignored)", { error: e }, ctx);
    });

    // Idempotency check - prevent duplicate processing
    const { data: existingEvent } = await supabaseAdmin
      .from("webhook_events")
      .select("event_id")
      .eq("event_id", event.id)
      .maybeSingle();

    if (existingEvent) {
      logStep("skipped_duplicate_event", { eventId: event.id }, ctx);
      return new Response(JSON.stringify({ received: true, duplicate: true }), { status: 200 });
    }

    // Record event for idempotency
    await supabaseAdmin.from("webhook_events").insert({ event_id: event.id, type: event.type });

    // ============================================
    // HANDLE: checkout.session.completed
    // ============================================
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;

      const hasClientNotes = !!(session.metadata?.client_notes && session.metadata.client_notes.trim().length > 0);
      
      logStep("checkout.session.completed", {
        id: session.id,
        email: session.customer_email,
        mode: session.mode,
        amount: session.amount_total,
        currency: session.currency,
        payment_status: session.payment_status,
        metadata: session.metadata,
        has_client_notes: hasClientNotes,
        subscription_id: session.subscription,
      }, ctx);

      const lovableUserId = session.metadata?.lovable_user_id;

      // Handle both paid AND 100% discounted (no_payment_required)
      // NEVER rely on amount - rely on status
      const isSuccessfulCheckout = session.payment_status === "paid" || session.payment_status === "no_payment_required";

      if (isSuccessfulCheckout && lovableUserId) {
        // Check if payment already exists
        const { data: existingPayment } = await supabaseAdmin
          .from("payments")
          .select("id")
          .eq("stripe_session_id", session.id)
          .maybeSingle();

        if (!existingPayment) {
          let description = session.metadata?.service_name || session.metadata?.package_name || "Payment";
          if (session.mode === "subscription") {
            description = `Subscription: ${description}`;
          }

          // Get receipt URL based on payment mode
          let receiptUrl: string | null = null;

          if (session.mode === "payment" && session.payment_intent) {
            const paymentIntentId = typeof session.payment_intent === "string" 
              ? session.payment_intent 
              : session.payment_intent.id;
            try {
              const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
              if (paymentIntent.latest_charge && typeof paymentIntent.latest_charge === "string") {
                const charge = await stripe.charges.retrieve(paymentIntent.latest_charge);
                receiptUrl = charge.receipt_url || null;
              }
            } catch (e) {
              logStep("Could not get receipt URL from payment intent", { error: e }, ctx);
            }
          } else if (session.mode === "subscription" && session.subscription) {
            const subscriptionId = typeof session.subscription === "string" 
              ? session.subscription 
              : session.subscription.id;
            try {
              const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
                expand: ["latest_invoice"],
              });
              const invoice = subscription.latest_invoice as Stripe.Invoice | null;
              if (invoice) {
                receiptUrl = invoice.hosted_invoice_url || invoice.invoice_pdf || null;
              }
            } catch (e) {
              logStep("Could not get receipt URL from subscription invoice", { error: e }, ctx);
            }
          }

          // Create booking first if service purchase (needed for payment linkage)
          let appointmentId: string | null = null;
          if (session.metadata?.service_id) {
            const customerName = session.customer_details?.name || session.metadata?.customer_name || "Customer";
            const customerEmail = session.customer_email || "";
            const serviceName = session.metadata?.service_name || "Service Project";
            const paymentModel = session.metadata?.payment_model || (session.mode === "subscription" ? "subscription" : "one_time");

            // Create booking with status = pending
            const { data: newBooking, error: bookingError } = await supabaseAdmin
              .from("appointments")
              .insert({
                user_id: lovableUserId,
                service_id: session.metadata.service_id,
                package_id: session.metadata.package_id || null,
                full_name: customerName,
                email: customerEmail,
                phone: "",
                appointment_date: new Date().toISOString().split("T")[0],
                appointment_time: "TBD",
                status: "pending",
                project_status: "not_started",
                notes: `stripe_session:${session.id}\nService: ${serviceName}\nPackage: ${session.metadata?.package_name || "Unknown"}\nPayment Model: ${paymentModel}`,
              })
              .select("id")
              .single();

            if (bookingError) {
              logStep("ERROR: Failed to create booking", { error: bookingError }, ctx);
            } else {
              logStep("Booking created", { 
                userId: lovableUserId, 
                bookingId: newBooking.id,
                mode: session.mode 
              }, ctx);
              appointmentId = newBooking.id;
            }
          }

          // Insert payment record
          const { error: insertError } = await supabaseAdmin
            .from("payments")
            .insert({
              user_id: lovableUserId,
              stripe_session_id: session.id,
              amount: (session.amount_total || 0) / 100,
              currency: (session.currency || "usd").toUpperCase(),
              status: "paid",
              description,
              customer_email: session.customer_email,
              customer_name: session.customer_details?.name || null,
              service_id: session.metadata?.service_id || null,
              package_id: session.metadata?.package_id || null,
              stripe_receipt_url: receiptUrl,
              payment_method: session.payment_method_types?.[0] || "card",
              appointment_id: appointmentId,
            });

          if (insertError) {
            logStep("ERROR: Failed to insert payment", { error: insertError }, ctx);
          } else {
            logStep("Payment record created", { 
              userId: lovableUserId, 
              sessionId: session.id, 
              receiptUrl, 
              appointmentId 
            }, ctx);
          }

          // Create project if booking was created
          if (appointmentId && session.metadata?.service_id) {
            const customerName = session.customer_details?.name || session.metadata?.customer_name || "Customer";
            const serviceName = session.metadata?.service_name || "Service Project";
            const paymentModel = session.metadata?.payment_model || (session.mode === "subscription" ? "subscription" : "one_time");

            const { data: newProject, error: projectError } = await supabaseAdmin
              .from("projects")
              .insert({
                user_id: lovableUserId,
                client_id: lovableUserId,
                workspace_id: lovableUserId,
                service_id: session.metadata.service_id,
                appointment_id: appointmentId,
                name: serviceName,
                title: serviceName,
                description: `Project for ${customerName}`,
                status: "pending",
                progress: 0,
                start_date: new Date().toISOString().split("T")[0],
                payment_model: paymentModel,
              })
              .select("id")
              .single();

            let finalProjectId: string | null = null;

            if (projectError) {
              if (projectError.code === "23505") {
                logStep("Project already exists, fetching existing", { appointmentId }, ctx);
                const { data: existingProject } = await supabaseAdmin
                  .from("projects")
                  .select("id")
                  .eq("appointment_id", appointmentId)
                  .maybeSingle();
                finalProjectId = existingProject?.id || null;
              } else {
                logStep("ERROR: Failed to create project", { error: projectError }, ctx);
              }
            } else {
              logStep("Project created", { 
                userId: lovableUserId, 
                appointmentId,
                projectId: newProject.id 
              }, ctx);
              finalProjectId = newProject.id;
            }

            // Save client notes to project if provided (non-blocking)
            if (finalProjectId) {
              const clientNotes = extractClientNotes(session);
              if (clientNotes) {
                const { error: notesError } = await supabaseAdmin
                  .from("projects")
                  .update({ 
                    client_notes: clientNotes, 
                    client_notes_updated_at: new Date().toISOString() 
                  })
                  .eq("id", finalProjectId);
                
                if (notesError) {
                  logStep("WARN: Failed to save client notes", { error: notesError }, ctx);
                } else {
                  logStep("Client notes saved to project", { projectId: finalProjectId }, ctx);
                }
              }
            }

            // ============================================
            // SUBSCRIPTION LINKING - CRITICAL
            // ============================================
            if (session.mode === "subscription" && session.subscription && finalProjectId) {
              const subscriptionId = typeof session.subscription === "string" 
                ? session.subscription 
                : session.subscription.id;
              
              try {
                const subscription = await stripe.subscriptions.retrieve(subscriptionId);
                await upsertProjectSubscription(supabaseAdmin, subscription, finalProjectId, ctx);
              } catch (e) {
                logStep("ERROR: Failed to link subscription on checkout", { error: e }, ctx);
              }
            }
          }
        } else {
          logStep("Payment already exists for session", { sessionId: session.id }, ctx);
        }

        // Handle subscription creation in subscriptions table (user-level tracking)
        if (session.mode === "subscription" && session.subscription) {
          const subscriptionId = typeof session.subscription === "string" 
            ? session.subscription 
            : session.subscription.id;
          
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          
          const { error: subError } = await supabaseAdmin
            .from("subscriptions")
            .upsert({
              user_id: lovableUserId,
              stripe_subscription_id: subscriptionId,
              stripe_customer_id: typeof session.customer === "string" ? session.customer : session.customer?.id || "",
              price_id: subscription.items.data[0]?.price.id || "",
              status: subscription.status,
              current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            }, { onConflict: "user_id" });

          if (subError) {
            logStep("ERROR: Failed to upsert user subscription", { error: subError }, ctx);
          } else {
            logStep("User subscription upserted", { subscriptionId }, ctx);
          }
        }
      } else if (isSuccessfulCheckout && !lovableUserId) {
        logStep("skipped_missing_project_id: Payment completed but no lovable_user_id", { 
          sessionId: session.id 
        }, ctx);
      }
    }

    // ============================================
    // HANDLE: customer.subscription.created
    // CRITICAL FALLBACK for subscription linking
    // ============================================
    if (event.type === "customer.subscription.created") {
      const subscription = event.data.object as Stripe.Subscription;
      
      logStep("subscription.created", { 
        subscription_id: subscription.id, 
        status: subscription.status,
        customer_id: subscription.customer,
        metadata: subscription.metadata 
      }, ctx);

      // Check if project_subscription already exists for this subscription
      const { data: existingProjectSub } = await supabaseAdmin
        .from("project_subscriptions")
        .select("id, project_id")
        .eq("stripe_subscription_id", subscription.id)
        .maybeSingle();

      if (existingProjectSub) {
        logStep("subscription_linked (already exists)", { 
          subscriptionId: subscription.id, 
          projectId: existingProjectSub.project_id 
        }, ctx);
      } else {
        // Find project to link
        const projectToLink = await findProjectForSubscription(supabaseAdmin, stripe, subscription, ctx);

        if (projectToLink) {
          await upsertProjectSubscription(supabaseAdmin, subscription, projectToLink.id, ctx);
        } else {
          logStep("skipped_missing_project_id: Could not find project to link", { 
            subscription_id: subscription.id,
            metadata: subscription.metadata 
          }, ctx);
        }
      }

      // Also upsert to user-level subscriptions table
      const userId = subscription.metadata?.lovable_user_id;
      const customerId = typeof subscription.customer === "string" 
        ? subscription.customer 
        : subscription.customer?.id;

      if (userId) {
        const priceId = subscription.items.data[0]?.price.id || "";
        
        await supabaseAdmin
          .from("subscriptions")
          .upsert({
            user_id: userId,
            stripe_subscription_id: subscription.id,
            stripe_customer_id: customerId || "",
            price_id: priceId,
            status: subscription.status,
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
          }, { onConflict: "user_id" });

        logStep("User subscription upserted on created", { subscriptionId: subscription.id, userId }, ctx);
      }
    }

    // ============================================
    // HANDLE: customer.subscription.updated
    // ============================================
    if (event.type === "customer.subscription.updated") {
      const subscription = event.data.object as Stripe.Subscription;
      
      logStep("subscription.updated", { 
        subscription_id: subscription.id, 
        status: subscription.status,
        cancel_at_period_end: subscription.cancel_at_period_end 
      }, ctx);

      // Update user-level subscription
      const { data: existingSub } = await supabaseAdmin
        .from("subscriptions")
        .select("user_id")
        .eq("stripe_subscription_id", subscription.id)
        .maybeSingle();

      if (existingSub) {
        await supabaseAdmin
          .from("subscriptions")
          .update({
            status: subscription.status,
            price_id: subscription.items.data[0]?.price.id || "",
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
          })
          .eq("stripe_subscription_id", subscription.id);

        logStep("User subscription updated", { subscriptionId: subscription.id }, ctx);
      }

      // Update or create project-level subscription
      const { data: existingProjectSub } = await supabaseAdmin
        .from("project_subscriptions")
        .select("id, project_id")
        .eq("stripe_subscription_id", subscription.id)
        .maybeSingle();

      if (existingProjectSub) {
        await supabaseAdmin
          .from("project_subscriptions")
          .update({
            status: subscription.status,
            next_renewal_date: new Date(subscription.current_period_end * 1000).toISOString(),
            cancel_at_period_end: subscription.cancel_at_period_end,
            paused_at: subscription.pause_collection ? new Date().toISOString() : null,
            resume_at: subscription.pause_collection?.resumes_at 
              ? new Date(subscription.pause_collection.resumes_at * 1000).toISOString() 
              : null,
            updated_at: new Date().toISOString(),
          })
          .eq("stripe_subscription_id", subscription.id);

        logStep("subscription_upserted (updated on .updated event)", { 
          subscription_id: subscription.id, 
          project_id: existingProjectSub.project_id,
          status: subscription.status
        }, ctx);
      } else {
        // Fallback: Try to find and link project
        const projectToLink = await findProjectForSubscription(supabaseAdmin, stripe, subscription, ctx);

        if (projectToLink) {
          await upsertProjectSubscription(supabaseAdmin, subscription, projectToLink.id, ctx);
        } else {
          logStep("skipped_missing_project_id: No project found for update event", { 
            subscription_id: subscription.id 
          }, ctx);
        }
      }
    }

    // ============================================
    // HANDLE: customer.subscription.deleted
    // ============================================
    if (event.type === "customer.subscription.deleted") {
      const subscription = event.data.object as Stripe.Subscription;
      logStep("subscription.deleted", { subscription_id: subscription.id }, ctx);

      await supabaseAdmin
        .from("subscriptions")
        .update({ status: "canceled" })
        .eq("stripe_subscription_id", subscription.id);

      await supabaseAdmin
        .from("project_subscriptions")
        .update({ status: "canceled", updated_at: new Date().toISOString() })
        .eq("stripe_subscription_id", subscription.id);

      logStep("Subscription marked as canceled", { subscriptionId: subscription.id }, ctx);
    }

    // ============================================
    // HANDLE: invoice.payment_succeeded (recurring)
    // ============================================
    if (event.type === "invoice.payment_succeeded") {
      const invoice = event.data.object as Stripe.Invoice;
      
      // Only process subscription invoices (not initial subscription)
      if (invoice.subscription && invoice.billing_reason !== "subscription_create") {
        logStep("invoice.payment_succeeded (recurring)", { 
          invoiceId: invoice.id,
          subscriptionId: invoice.subscription 
        }, ctx);

        const { data: sub } = await supabaseAdmin
          .from("subscriptions")
          .select("user_id")
          .eq("stripe_subscription_id", invoice.subscription)
          .maybeSingle();

        if (sub) {
          const { data: existingPayment } = await supabaseAdmin
            .from("payments")
            .select("id")
            .eq("stripe_invoice_id", invoice.id)
            .maybeSingle();

          if (!existingPayment) {
            const { data: projectSub } = await supabaseAdmin
              .from("project_subscriptions")
              .select("project_id")
              .eq("stripe_subscription_id", invoice.subscription)
              .maybeSingle();

            let serviceId: string | null = null;
            let appointmentId: string | null = null;

            if (projectSub?.project_id) {
              const { data: projectData } = await supabaseAdmin
                .from("projects")
                .select("service_id, appointment_id")
                .eq("id", projectSub.project_id)
                .maybeSingle();
              
              serviceId = projectData?.service_id || null;
              appointmentId = projectData?.appointment_id || null;
            }

            await supabaseAdmin
              .from("payments")
              .insert({
                user_id: sub.user_id,
                stripe_invoice_id: invoice.id,
                amount: (invoice.amount_paid || 0) / 100,
                currency: (invoice.currency || "usd").toUpperCase(),
                status: "paid",
                description: `Subscription renewal`,
                customer_email: invoice.customer_email,
                stripe_receipt_url: invoice.hosted_invoice_url || invoice.invoice_pdf || null,
                payment_method: "card",
                service_id: serviceId,
                appointment_id: appointmentId,
              });
            logStep("Recurring payment recorded", { invoiceId: invoice.id }, ctx);
          }
        }
      }
    }

    // ============================================
    // HANDLE: invoice.payment_failed
    // ============================================
    if (event.type === "invoice.payment_failed") {
      const invoice = event.data.object as Stripe.Invoice;
      
      if (invoice.subscription) {
        logStep("invoice.payment_failed", { 
          invoiceId: invoice.id, 
          subscriptionId: invoice.subscription,
          attemptCount: invoice.attempt_count 
        }, ctx);

        await supabaseAdmin
          .from("project_subscriptions")
          .update({ status: "past_due", updated_at: new Date().toISOString() })
          .eq("stripe_subscription_id", invoice.subscription);

        await supabaseAdmin
          .from("subscriptions")
          .update({ status: "past_due" })
          .eq("stripe_subscription_id", invoice.subscription);

        logStep("Subscription marked as past_due", { subscriptionId: invoice.subscription }, ctx);

        // Get project info for notification
        const { data: projectSub } = await supabaseAdmin
          .from("project_subscriptions")
          .select("project_id")
          .eq("stripe_subscription_id", invoice.subscription)
          .maybeSingle();

        if (projectSub?.project_id) {
          const { data: project } = await supabaseAdmin
            .from("projects")
            .select("name, user_id, client_id")
            .eq("id", projectSub.project_id)
            .maybeSingle();

          if (project) {
            const clientId = project.client_id || project.user_id;
            
            // Emit payment failed event to client
            await emitEvent("PAYMENT_FAILED", {
              entity_type: "subscription",
              entity_id: projectSub.project_id,
              target_user_id: clientId,
              metadata: {
                project_name: project.name,
                invoice_id: invoice.id,
                attempt_count: invoice.attempt_count,
              },
            });

            // Alert admins about payment failure
            await emitSystemAlert(
              `Payment failed for project "${project.name}"`,
              {
                source: "stripe-webhook",
                severity: invoice.attempt_count && invoice.attempt_count >= 3 ? "critical" : "warning",
                affected_entity_type: "project",
                affected_entity_id: projectSub.project_id,
                suggested_action: "Contact customer about payment method update",
                metadata: {
                  invoice_id: invoice.id,
                  subscription_id: invoice.subscription,
                  attempt_count: invoice.attempt_count,
                  customer_email: invoice.customer_email,
                },
              }
            );
          }
        }
      }
    }

    // ============================================
    // HANDLE: customer.subscription.paused
    // ============================================
    if (event.type === "customer.subscription.paused") {
      const subscription = event.data.object as Stripe.Subscription;
      logStep("subscription.paused", { subscription_id: subscription.id }, ctx);

      const pausedAt = new Date().toISOString();
      const resumeAt = subscription.pause_collection?.resumes_at 
        ? new Date(subscription.pause_collection.resumes_at * 1000).toISOString() 
        : null;

      await supabaseAdmin
        .from("project_subscriptions")
        .update({ 
          status: "paused", 
          paused_at: pausedAt,
          resume_at: resumeAt,
          updated_at: new Date().toISOString()
        })
        .eq("stripe_subscription_id", subscription.id);

      await supabaseAdmin
        .from("subscriptions")
        .update({ status: "paused" })
        .eq("stripe_subscription_id", subscription.id);

      logStep("Subscription marked as paused", { subscriptionId: subscription.id }, ctx);
    }

    // ============================================
    // HANDLE: customer.subscription.resumed
    // ============================================
    if (event.type === "customer.subscription.resumed") {
      const subscription = event.data.object as Stripe.Subscription;
      logStep("subscription.resumed", { subscription_id: subscription.id, status: subscription.status }, ctx);

      await supabaseAdmin
        .from("project_subscriptions")
        .update({ 
          status: subscription.status, 
          paused_at: null,
          resume_at: null,
          next_renewal_date: new Date(subscription.current_period_end * 1000).toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq("stripe_subscription_id", subscription.id);

      await supabaseAdmin
        .from("subscriptions")
        .update({ 
          status: subscription.status,
          current_period_end: new Date(subscription.current_period_end * 1000).toISOString()
        })
        .eq("stripe_subscription_id", subscription.id);

      logStep("Subscription resumed", { subscriptionId: subscription.id, status: subscription.status }, ctx);
    }

    return new Response(JSON.stringify({ received: true }), { status: 200 });
  } catch (err) {
    logStep("ERROR", { message: err instanceof Error ? err.message : "Unknown error" });
    return new Response("Webhook error", { status: 400 });
  }
});
