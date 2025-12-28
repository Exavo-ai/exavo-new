import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

// Server-side price to credits mapping - MUST match create-credits-checkout
const PRICE_CREDITS_MAP: Record<string, { credits: number; kind: "credit_pack" | "subscription" }> = {
  // Credit Packs (one-time)
  "price_1SjKxLBcggXTMoM3EqEMUlMR": { credits: 10, kind: "credit_pack" },
  "price_1SjKxYBcggXTMoM3Vfo4WZ8i": { credits: 50, kind: "credit_pack" },
  "price_1SjKy0BcggXTMoM3dmx5Y4tK": { credits: 150, kind: "credit_pack" },
  // Subscriptions (monthly credits)
  "price_1SjKy6BcggXTMoM3GnREMyak": { credits: 25, kind: "subscription" },
  "price_1SjKy7BcggXTMoM3BuHnFJph": { credits: 100, kind: "subscription" },
  "price_1SjKy9BcggXTMoM3pPSS37h1": { credits: 300, kind: "subscription" },
};

const logStep = (step: string, details?: unknown) => {
  console.log(`[STRIPE-WEBHOOK] ${step}`, details ? JSON.stringify(details) : "");
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseAdmin = any;

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const signature = req.headers.get("stripe-signature");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SIGNING_SECRET");

  if (!signature || !webhookSecret) {
    logStep("ERROR", "Missing signature or webhook secret");
    return new Response("Webhook misconfigured", { status: 400 });
  }

  const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, { apiVersion: "2025-08-27.basil" });
  const supabaseAdmin: SupabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    const body = await req.text();
    const event = stripe.webhooks.constructEvent(body, signature, webhookSecret);

    logStep("Event received", { type: event.type, id: event.id });

    // Idempotency check
    const { data: existingEvent } = await supabaseAdmin
      .from("webhook_events")
      .select("event_id")
      .eq("event_id", event.id)
      .maybeSingle();

    if (existingEvent) {
      logStep("Event already processed", { eventId: event.id });
      return new Response(JSON.stringify({ received: true, duplicate: true }), { status: 200 });
    }

    // Record the event
    await supabaseAdmin.from("webhook_events").insert({
      event_id: event.id,
      type: event.type,
    });

    // Handle different event types
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(supabaseAdmin, stripe, session, event.id);
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoicePaymentSucceeded(supabaseAdmin, invoice, event.id);
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdated(supabaseAdmin, subscription);
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(supabaseAdmin, subscription);
        break;
      }

      default:
        logStep("Unhandled event type", { type: event.type });
    }

    return new Response(JSON.stringify({ received: true }), { status: 200 });
  } catch (err) {
    logStep("Webhook error", { error: err instanceof Error ? err.message : String(err) });
    return new Response("Webhook error", { status: 400 });
  }
});

async function handleCheckoutCompleted(
  supabase: SupabaseAdmin,
  stripe: Stripe,
  session: Stripe.Checkout.Session,
  eventId: string
) {
  logStep("Processing checkout.session.completed", {
    sessionId: session.id,
    mode: session.mode,
    paymentStatus: session.payment_status,
  });

  if (session.payment_status !== "paid") {
    logStep("Payment not complete, skipping");
    return;
  }

  const userId = session.metadata?.lovable_user_id;
  const kind = session.metadata?.kind;
  const priceId = session.metadata?.price_id;

  if (!userId) {
    logStep("ERROR: No lovable_user_id in metadata");
    return;
  }

  logStep("User identified", { userId, kind, priceId });

  if (kind === "credit_pack" && priceId) {
    // One-time credit pack purchase
    const priceConfig = PRICE_CREDITS_MAP[priceId];
    if (!priceConfig) {
      logStep("ERROR: Unknown priceId", { priceId });
      return;
    }

    await addCredits(supabase, userId, priceConfig.credits, "credit_pack_purchase", "stripe", eventId);
    logStep("Credits added for credit pack", { userId, credits: priceConfig.credits });

    // Also record in payments table for backwards compatibility
    await supabase.from("payments").insert({
      user_id: userId,
      stripe_session_id: session.id,
      amount: (session.amount_total || 0) / 100,
      currency: (session.currency || "usd").toUpperCase(),
      status: "paid",
      description: `${priceConfig.credits} Credits Pack`,
      customer_email: session.customer_email,
    });
  } else if (kind === "subscription") {
    // New subscription - get subscription details
    if (session.subscription) {
      const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
      const customerId = session.customer as string;
      const subPriceId = subscription.items.data[0]?.price?.id;

      await supabase.from("subscriptions").upsert({
        user_id: userId,
        stripe_customer_id: customerId,
        stripe_subscription_id: subscription.id,
        price_id: subPriceId || priceId || "",
        status: subscription.status,
        current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      });

      logStep("Subscription created/updated", { userId, subscriptionId: subscription.id });

      // Grant initial credits for subscription
      const priceConfig = PRICE_CREDITS_MAP[subPriceId || priceId || ""];
      if (priceConfig) {
        await addCredits(supabase, userId, priceConfig.credits, "subscription_initial", "stripe", eventId);
        logStep("Initial subscription credits added", { userId, credits: priceConfig.credits });
      }
    }
  }
}

async function handleInvoicePaymentSucceeded(
  supabase: SupabaseAdmin,
  invoice: Stripe.Invoice,
  eventId: string
) {
  logStep("Processing invoice.payment_succeeded", {
    invoiceId: invoice.id,
    billingReason: invoice.billing_reason,
  });

  // Only process recurring subscription payments (not the initial one)
  if (invoice.billing_reason !== "subscription_cycle") {
    logStep("Not a subscription cycle invoice, skipping credit grant");
    return;
  }

  const subscriptionId = invoice.subscription as string;
  if (!subscriptionId) {
    logStep("No subscription ID in invoice");
    return;
  }

  // Find user by subscription ID
  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("user_id, price_id")
    .eq("stripe_subscription_id", subscriptionId)
    .maybeSingle();

  if (!subscription) {
    logStep("Subscription not found in database", { subscriptionId });
    return;
  }

  const priceConfig = PRICE_CREDITS_MAP[subscription.price_id];
  if (!priceConfig) {
    logStep("Unknown price_id for subscription", { priceId: subscription.price_id });
    return;
  }

  await addCredits(supabase, subscription.user_id, priceConfig.credits, "subscription_renewal", "stripe", eventId);
  logStep("Monthly credits added", { userId: subscription.user_id, credits: priceConfig.credits });
}

async function handleSubscriptionUpdated(
  supabase: SupabaseAdmin,
  subscription: Stripe.Subscription
) {
  logStep("Processing customer.subscription.updated", {
    subscriptionId: subscription.id,
    status: subscription.status,
  });

  const priceId = subscription.items.data[0]?.price?.id;

  await supabase
    .from("subscriptions")
    .update({
      status: subscription.status,
      price_id: priceId || "",
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("stripe_subscription_id", subscription.id);

  logStep("Subscription updated in database");
}

async function handleSubscriptionDeleted(
  supabase: SupabaseAdmin,
  subscription: Stripe.Subscription
) {
  logStep("Processing customer.subscription.deleted", {
    subscriptionId: subscription.id,
  });

  await supabase
    .from("subscriptions")
    .update({
      status: "canceled",
      updated_at: new Date().toISOString(),
    })
    .eq("stripe_subscription_id", subscription.id);

  logStep("Subscription marked as canceled");
}

async function addCredits(
  supabase: SupabaseAdmin,
  userId: string,
  credits: number,
  reason: string,
  source: string,
  stripeEventId: string
) {
  // Check if credits already added for this event (extra idempotency)
  const { data: existingLedger } = await supabase
    .from("credit_ledger")
    .select("id")
    .eq("stripe_event_id", stripeEventId)
    .maybeSingle();

  if (existingLedger) {
    logStep("Credits already added for this event", { stripeEventId });
    return;
  }

  // Add to ledger
  await supabase.from("credit_ledger").insert({
    user_id: userId,
    delta: credits,
    reason,
    source,
    stripe_event_id: stripeEventId,
  });

  // Upsert user_credits
  const { data: existingCredits } = await supabase
    .from("user_credits")
    .select("balance")
    .eq("user_id", userId)
    .maybeSingle();

  if (existingCredits) {
    await supabase
      .from("user_credits")
      .update({
        balance: existingCredits.balance + credits,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId);
  } else {
    await supabase.from("user_credits").insert({
      user_id: userId,
      balance: credits,
    });
  }

  logStep("Credits added to user", { userId, credits, newBalance: (existingCredits?.balance || 0) + credits });
}
