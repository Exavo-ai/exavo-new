import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { corsHeaders, successResponse, errors } from "../_shared/response.ts";

const PLAN_PRODUCT_MAP: Record<string, string> = {
  prod_TTapRptmEkLouu: "starter",
  prod_TTapq8rgy3dmHT: "pro",
  prod_TTapwaC6qD21xi: "enterprise",
};

async function getUserIdByEmail(supabase: any, email: string): Promise<string | null> {
  // IMPORTANT: Use profiles table instead of auth.admin.listUsers() to avoid pagination limits.
  const { data, error } = await supabase.from("profiles").select("id").eq("email", email).maybeSingle();

  if (error) {
    console.error("[STRIPE-WEBHOOK] Error looking up profile by email:", error);
    return null;
  }

  return (data as any)?.id ?? null;
}

serve(async (req) => {
  // Only allow POST for webhooks
  if (req.method !== "POST") {
    console.log("[STRIPE-WEBHOOK] Invalid method:", req.method);
    return errors.badRequest(`Method ${req.method} not allowed. Use POST.`);
  }

  const signature = req.headers.get("stripe-signature");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

  if (!signature) {
    console.log("[STRIPE-WEBHOOK] Missing stripe-signature header");
    return errors.badRequest("Missing stripe-signature header");
  }

  if (!webhookSecret) {
    console.error("[STRIPE-WEBHOOK] STRIPE_WEBHOOK_SECRET not configured");
    return errors.internal("Webhook not configured");
  }

  const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
    apiVersion: "2025-08-27.basil",
  });

  try {
    const body = await req.text();
    const event = stripe.webhooks.constructEvent(body, signature, webhookSecret);

    console.log(`[STRIPE-WEBHOOK] Received event: ${event.type}, id: ${event.id}`);

    const supabase = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;

        // نهمنا فقط Service / Package (مش subscription)
        if (session.mode !== "payment") {
          break;
        }

        const lovableUserId = session.metadata?.lovable_user_id;

        if (!lovableUserId) {
          console.log("[WEBHOOK] No lovable_user_id in metadata");
          break;
        }

        const amount = (session.amount_total || 0) / 100;
        const currency = (session.currency || "usd").toUpperCase();

        const { error } = await supabase.from("payments").insert({
          lovable_user_id: lovableUserId,
          amount,
          currency,
          status: "completed",
          stripe_session_id: session.id,
          stripe_payment_id: session.payment_intent as string,
          description: "Service / Package purchase",
        });

        if (error) {
          console.error("[WEBHOOK] Failed to save payment:", error);
        } else {
          console.log("[WEBHOOK] ✅ Payment saved for lovable user:", lovableUserId);
        }

        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        console.log(`[STRIPE-WEBHOOK] Subscription ${event.type}: ${subscription.id}, status: ${subscription.status}`);

        const customer = await stripe.customers.retrieve(customerId);
        const customerEmail = "email" in customer ? customer.email : null;

        if (!customerEmail) {
          console.error("[STRIPE-WEBHOOK] No customer email found");
          break;
        }

        const productId =
          typeof subscription.items.data[0].price.product === "string"
            ? subscription.items.data[0].price.product
            : subscription.items.data[0].price.product.id;
        const planName = PLAN_PRODUCT_MAP[productId] || "unknown";

        console.log(`[STRIPE-WEBHOOK] Email: ${customerEmail}, Product: ${productId}, Plan: ${planName}`);

        const userId = await getUserIdByEmail(supabase, customerEmail);

        if (!userId) {
          console.error("[STRIPE-WEBHOOK] User not found for email:", customerEmail);
          break;
        }

        const { data: existingWorkspace } = await supabase
          .from("workspaces")
          .select("stripe_subscription_id")
          .eq("owner_id", userId)
          .single();

        if (existingWorkspace?.stripe_subscription_id && existingWorkspace.stripe_subscription_id !== subscription.id) {
          console.log(`[STRIPE-WEBHOOK] Canceling old subscription: ${existingWorkspace.stripe_subscription_id}`);
          try {
            await stripe.subscriptions.cancel(existingWorkspace.stripe_subscription_id);
            console.log(`[STRIPE-WEBHOOK] ✓ Old subscription canceled`);
          } catch (cancelError) {
            console.error("[STRIPE-WEBHOOK] Error canceling old subscription:", cancelError);
          }
        }

        const { error: updateError } = await supabase.from("workspaces").upsert(
          {
            owner_id: userId,
            current_plan_product_id: productId,
            subscription_status: subscription.status,
            stripe_customer_id: customerId,
            stripe_subscription_id: subscription.id,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: "owner_id",
          },
        );

        if (updateError) {
          console.error("[STRIPE-WEBHOOK] Error updating workspace:", updateError);
        } else {
          console.log(`[STRIPE-WEBHOOK] ✓ Successfully updated workspace subscription to ${planName} plan`);
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        console.log(`[STRIPE-WEBHOOK] Subscription deleted: ${subscription.id}`);

        const customer = await stripe.customers.retrieve(customerId);
        const customerEmail = "email" in customer ? customer.email : null;

        console.log(`[STRIPE-WEBHOOK] Subscription canceled for ${customerEmail}, reverting to free plan`);

        const { error: updateError } = await supabase
          .from("workspaces")
          .update({
            current_plan_product_id: "default",
            subscription_status: "canceled",
            stripe_subscription_id: null,
            updated_at: new Date().toISOString(),
          })
          .eq("stripe_subscription_id", subscription.id);

        if (updateError) {
          console.error("[STRIPE-WEBHOOK] Error reverting workspace to free:", updateError);
        } else {
          console.log(`[STRIPE-WEBHOOK] ✓ Successfully reverted workspace to free plan`);
        }
        break;
      }

      case "checkout.session.expired":
      case "payment_intent.payment_failed": {
        const session = event.data.object as Stripe.Checkout.Session;

        await supabase.from("payments").update({ status: "failed" }).eq("stripe_session_id", session.id);
        break;
      }

      default:
        console.log(`[STRIPE-WEBHOOK] Unhandled event type: ${event.type}`);
    }

    return successResponse({ received: true, eventType: event.type });
  } catch (error) {
    console.error("[STRIPE-WEBHOOK] Error:", error);
    if (error instanceof Stripe.errors.StripeSignatureVerificationError) {
      return errors.badRequest("Invalid webhook signature");
    }
    return errors.badRequest(error instanceof Error ? error.message : "Unknown error");
  }
});
