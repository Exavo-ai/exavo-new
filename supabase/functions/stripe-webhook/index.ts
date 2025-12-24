import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";

serve(async (req) => {
  // Stripe دايمًا بيبعت POST
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const signature = req.headers.get("stripe-signature");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

  if (!signature || !webhookSecret) {
    return new Response("Webhook misconfigured", { status: 400 });
  }

  const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
    apiVersion: "2025-08-27.basil",
  });

  try {
    const body = await req.text();

    const event = stripe.webhooks.constructEvent(body, signature, webhookSecret);

    // نشتغل فقط على checkout.session.completed
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;

      console.log("[STRIPE] checkout.session.completed", {
        id: session.id,
        mode: session.mode,
        email: session.customer_email,
        amount_total: session.amount_total,
        currency: session.currency,
        metadata: session.metadata,
      });

      // نبعت الداتا لـ Lovable (موقعك)
      await fetch("https://exavo.ai/api/stripe/webhook", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-internal-secret": Deno.env.get("LOVABLE_WEBHOOK_SECRET")!,
        },
        body: JSON.stringify({
          event: "checkout.session.completed",
          session,
        }),
      });
    }

    return new Response(JSON.stringify({ received: true }), { status: 200 });
  } catch (err) {
    console.error("Stripe webhook error", err);
    return new Response("Webhook error", { status: 400 });
  }
});
