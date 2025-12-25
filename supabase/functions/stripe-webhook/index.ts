import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const signature = req.headers.get("stripe-signature");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SIGNING_SECRET");

  if (!signature || !webhookSecret) {
    console.error("[STRIPE] Missing signature or webhook secret");
    return new Response("Webhook misconfigured", { status: 400 });
  }

  const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, { apiVersion: "2025-08-27.basil" });

  try {
    const body = await req.text();
    const event = stripe.webhooks.constructEvent(body, signature, webhookSecret);

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;

      console.log("[STRIPE] checkout.session.completed", {
        id: session.id,
        email: session.customer_email,
        mode: session.mode,
        amount: session.amount_total,
        currency: session.currency,
        client_reference_id: session.client_reference_id,
        payment_status: session.payment_status,
      });

      // Get user ID from metadata (set by create-checkout and create-package-checkout)
      const lovableUserId = session.metadata?.lovable_user_id;
      
      // Only process if payment is complete and we have a user ID
      if (session.payment_status === "paid" && lovableUserId) {
        const supabaseAdmin = createClient(
          Deno.env.get("SUPABASE_URL") ?? "",
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
        );

        // Check if payment already exists
        const { data: existingPayment } = await supabaseAdmin
          .from("payments")
          .select("id")
          .eq("stripe_session_id", session.id)
          .maybeSingle();

        if (!existingPayment) {
          const { error: insertError } = await supabaseAdmin
            .from("payments")
            .insert({
              user_id: lovableUserId,
              stripe_session_id: session.id,
              amount: (session.amount_total || 0) / 100,
              currency: (session.currency || "usd").toUpperCase(),
              status: "paid",
              description: session.metadata?.service_name || session.metadata?.package_name || "Service Payment",
              customer_email: session.customer_email,
              service_id: session.metadata?.service_id || null,
              package_id: session.metadata?.package_id || null,
            });

          if (insertError) {
            console.error("[STRIPE] Failed to insert payment:", insertError);
          } else {
            console.log("[STRIPE] Payment record created for lovable_user_id:", lovableUserId);
          }
        } else {
          console.log("[STRIPE] Payment already exists for session:", session.id);
        }
      } else if (session.payment_status === "paid" && !lovableUserId) {
        console.warn("[STRIPE] Payment completed but no lovable_user_id in metadata:", session.id);
      }
    }

    return new Response(JSON.stringify({ received: true }), { status: 200 });
  } catch (err) {
    console.error("Stripe webhook error", err);
    return new Response("Webhook error", { status: 400 });
  }
});
