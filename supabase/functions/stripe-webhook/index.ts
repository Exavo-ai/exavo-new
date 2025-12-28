import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const logStep = (step: string, details?: unknown) => {
  console.log(`[STRIPE-WEBHOOK] ${step}`, details ? JSON.stringify(details) : "");
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
          // Retrieve checkout session with line items for more details
          const fullSession = await stripe.checkout.sessions.retrieve(session.id, {
            expand: ["line_items", "line_items.data.price.product"],
          });

          let description = session.metadata?.service_name || session.metadata?.package_name || "Payment";
          if (session.mode === "subscription") {
            description = `Subscription: ${description}`;
          }

          // Get receipt URL from payment intent if available
          let receiptUrl: string | null = null;
          if (session.payment_intent && typeof session.payment_intent === "string") {
            const paymentIntent = await stripe.paymentIntents.retrieve(session.payment_intent);
            if (paymentIntent.latest_charge && typeof paymentIntent.latest_charge === "string") {
              const charge = await stripe.charges.retrieve(paymentIntent.latest_charge);
              receiptUrl = charge.receipt_url || null;
            }
          }

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
            });

          if (insertError) {
            logStep("ERROR: Failed to insert payment", { error: insertError });
          } else {
            logStep("Payment record created", { userId: lovableUserId, sessionId: session.id });
          }
        } else {
          logStep("Payment already exists for session", { sessionId: session.id });
        }

        // Handle subscription creation
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

      // Find user by customer ID
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
    }

    // Handle subscription cancellation
    if (event.type === "customer.subscription.deleted") {
      const subscription = event.data.object as Stripe.Subscription;
      logStep("subscription.deleted", { id: subscription.id });

      await supabaseAdmin
        .from("subscriptions")
        .update({ status: "canceled" })
        .eq("stripe_subscription_id", subscription.id);

      logStep("Subscription marked as canceled", { subscriptionId: subscription.id });
    }

    // Handle invoice payment succeeded (for recurring subscription payments)
    if (event.type === "invoice.payment_succeeded") {
      const invoice = event.data.object as Stripe.Invoice;
      
      // Only process subscription invoices (not one-time payments)
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
                stripe_receipt_url: invoice.hosted_invoice_url,
                payment_method: "card",
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
