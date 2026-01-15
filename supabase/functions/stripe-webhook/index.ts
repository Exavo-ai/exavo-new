import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const logStep = (step: string, details?: unknown) => {
  console.log(`[STRIPE-WEBHOOK] ${step}`, details ? JSON.stringify(details) : "");
};

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

    logStep("Event received", { type: event.type, id: event.id });

    // Idempotency check - prevent duplicate processing
    const { data: existingEvent } = await supabaseAdmin
      .from("webhook_events")
      .select("event_id")
      .eq("event_id", event.id)
      .maybeSingle();

    if (existingEvent) {
      logStep("Event already processed", { eventId: event.id });
      return new Response(JSON.stringify({ received: true, duplicate: true }), { status: 200 });
    }

    // Record event for idempotency
    await supabaseAdmin.from("webhook_events").insert({ event_id: event.id, type: event.type });

    // Handle checkout.session.completed (one-time and subscription initial payments)
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;

      logStep("checkout.session.completed", {
        id: session.id,
        email: session.customer_email,
        mode: session.mode,
        amount: session.amount_total,
        currency: session.currency,
        payment_status: session.payment_status,
        metadata: session.metadata,
      });

      const lovableUserId = session.metadata?.lovable_user_id;

      if (session.payment_status === "paid" && lovableUserId) {
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
            // One-time payment: get receipt from charge
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
              logStep("Could not get receipt URL from payment intent", { error: e });
            }
          } else if (session.mode === "subscription" && session.subscription) {
            // Subscription: get receipt from latest invoice
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
              logStep("Could not get receipt URL from subscription invoice", { error: e });
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
                notes: `stripe_session:${session.id}\nService: ${serviceName}\nPackage: ${session.metadata?.package_name || "Unknown"}\nPayment: $${(session.amount_total || 0) / 100}\nPayment Model: ${paymentModel}`,
              })
              .select("id")
              .single();

            if (bookingError) {
              logStep("ERROR: Failed to create booking", { error: bookingError });
            } else {
              logStep("Booking created for service purchase", { 
                userId: lovableUserId, 
                bookingId: newBooking.id,
                mode: session.mode 
              });
              appointmentId = newBooking.id;
            }
          }

          // Insert payment record (with appointment_id if available)
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
            logStep("ERROR: Failed to insert payment", { error: insertError });
          } else {
            logStep("Payment record created", { userId: lovableUserId, sessionId: session.id, receiptUrl, appointmentId });
          }

          // Create project if booking was created
          if (appointmentId && session.metadata?.service_id) {
            const customerName = session.customer_details?.name || session.metadata?.customer_name || "Customer";
            const serviceName = session.metadata?.service_name || "Service Project";
            const paymentModel = session.metadata?.payment_model || (session.mode === "subscription" ? "subscription" : "one_time");

            // Create project immediately linked to booking (client sees it right away)
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
                logStep("Project already exists, fetching existing", { appointmentId });
                const { data: existingProject } = await supabaseAdmin
                  .from("projects")
                  .select("id")
                  .eq("appointment_id", appointmentId)
                  .maybeSingle();
                finalProjectId = existingProject?.id || null;
              } else {
                logStep("ERROR: Failed to create project", { error: projectError });
              }
            } else {
              logStep("Project created for client", { 
                userId: lovableUserId, 
                appointmentId,
                projectId: newProject.id 
              });
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
                  logStep("WARN: Failed to save client notes (non-blocking)", { error: notesError });
                } else {
                  logStep("Client notes saved to project", { projectId: finalProjectId });
                }
              }
            }

            // For subscriptions: create/upsert project_subscription record
            if (session.mode === "subscription" && session.subscription && finalProjectId) {
              const subscriptionId = typeof session.subscription === "string" 
                ? session.subscription 
                : session.subscription.id;
              
              try {
                const subscription = await stripe.subscriptions.retrieve(subscriptionId);
                const customerId = typeof session.customer === "string" 
                  ? session.customer 
                  : session.customer?.id || null;

                const { error: subError } = await supabaseAdmin
                  .from("project_subscriptions")
                  .upsert({
                    project_id: finalProjectId,
                    stripe_subscription_id: subscriptionId,
                    stripe_customer_id: customerId,
                    status: subscription.status,
                    next_renewal_date: new Date(subscription.current_period_end * 1000).toISOString(),
                  }, { onConflict: "project_id" });

                if (subError) {
                  logStep("ERROR: Failed to upsert project subscription", { error: subError });
                } else {
                  logStep("Project subscription upserted", { 
                    projectId: finalProjectId, 
                    subscriptionId,
                    status: subscription.status,
                    nextRenewal: new Date(subscription.current_period_end * 1000).toISOString()
                  });
                }
              } catch (e) {
                logStep("ERROR: Failed to retrieve subscription details", { error: e });
              }
            }
          }
        } else {
          logStep("Payment already exists for session", { sessionId: session.id });
        }

        // Handle subscription creation in subscriptions table (for user-level subscription tracking)
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
            logStep("ERROR: Failed to upsert subscription", { error: subError });
          } else {
            logStep("Subscription upserted", { subscriptionId });
          }
        }
      } else if (session.payment_status === "paid" && !lovableUserId) {
        logStep("WARN: Payment completed but no lovable_user_id in metadata", { sessionId: session.id });
      }
    }

    // Handle subscription updates
    if (event.type === "customer.subscription.updated") {
      const subscription = event.data.object as Stripe.Subscription;
      logStep("subscription.updated", { id: subscription.id, status: subscription.status });

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

        logStep("Subscription updated", { subscriptionId: subscription.id });
      }

      // Update project-level subscription
      await supabaseAdmin
        .from("project_subscriptions")
        .update({
          status: subscription.status,
          next_renewal_date: new Date(subscription.current_period_end * 1000).toISOString(),
        })
        .eq("stripe_subscription_id", subscription.id);
    }

    // Handle subscription cancellation
    if (event.type === "customer.subscription.deleted") {
      const subscription = event.data.object as Stripe.Subscription;
      logStep("subscription.deleted", { id: subscription.id });

      await supabaseAdmin
        .from("subscriptions")
        .update({ status: "canceled" })
        .eq("stripe_subscription_id", subscription.id);

      await supabaseAdmin
        .from("project_subscriptions")
        .update({ status: "canceled" })
        .eq("stripe_subscription_id", subscription.id);

      logStep("Subscription marked as canceled", { subscriptionId: subscription.id });
    }

    // Handle invoice payment succeeded (for recurring subscription payments)
    if (event.type === "invoice.payment_succeeded") {
      const invoice = event.data.object as Stripe.Invoice;
      
      // Only process subscription invoices (not one-time payments or initial subscription)
      if (invoice.subscription && invoice.billing_reason !== "subscription_create") {
        logStep("invoice.payment_succeeded (recurring)", { invoiceId: invoice.id });

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
            // Get project subscription to link payment to correct service
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
            logStep("Recurring payment recorded", { invoiceId: invoice.id });
          }
        }
      }
    }

    return new Response(JSON.stringify({ received: true }), { status: 200 });
  } catch (err) {
    logStep("ERROR", { message: err instanceof Error ? err.message : "Unknown error" });
    return new Response("Webhook error", { status: 400 });
  }
});
