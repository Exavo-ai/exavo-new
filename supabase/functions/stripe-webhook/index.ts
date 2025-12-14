import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import Stripe from 'https://esm.sh/stripe@18.5.0';
import { corsHeaders, successResponse, errors } from "../_shared/response.ts";

const PLAN_PRODUCT_MAP: Record<string, string> = {
  'prod_TTapRptmEkLouu': 'starter',
  'prod_TTapq8rgy3dmHT': 'pro', 
  'prod_TTapwaC6qD21xi': 'enterprise'
};

serve(async (req) => {
  // Only allow POST for webhooks
  if (req.method !== "POST") {
    console.log("[STRIPE-WEBHOOK] Invalid method:", req.method);
    return errors.badRequest(`Method ${req.method} not allowed. Use POST.`);
  }

  const signature = req.headers.get('stripe-signature');
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');

  if (!signature) {
    console.log("[STRIPE-WEBHOOK] Missing stripe-signature header");
    return errors.badRequest("Missing stripe-signature header");
  }

  if (!webhookSecret) {
    console.error("[STRIPE-WEBHOOK] STRIPE_WEBHOOK_SECRET not configured");
    return errors.internal("Webhook not configured");
  }

  const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
    apiVersion: '2025-08-27.basil',
  });

  try {
    const body = await req.text();
    const event = stripe.webhooks.constructEvent(body, signature, webhookSecret);

    console.log(`[STRIPE-WEBHOOK] Received event: ${event.type}, id: ${event.id}`);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        console.log(`[STRIPE-WEBHOOK] Checkout completed: ${session.id}, mode: ${session.mode}`);
        
        if (session.mode === 'subscription' && session.subscription) {
          console.log(`[STRIPE-WEBHOOK] Processing subscription checkout`);
          
          const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
          const productId = typeof subscription.items.data[0].price.product === 'string'
            ? subscription.items.data[0].price.product
            : subscription.items.data[0].price.product.id;
          const planName = PLAN_PRODUCT_MAP[productId] || 'unknown';
          
          console.log(`[STRIPE-WEBHOOK] Product ID: ${productId}, Plan: ${planName}`);
          
          const customerEmail = session.customer_email || session.customer_details?.email;
          if (customerEmail) {
            const { data: userData, error: userError } = await supabase.auth.admin.listUsers();
            const user = userData?.users.find(u => u.email === customerEmail);
            
            if (user) {
              console.log(`[STRIPE-WEBHOOK] Found user: ${user.id}, updating workspace`);
              
              const { error: upsertError } = await supabase
                .from('workspaces')
                .upsert({
                  owner_id: user.id,
                  current_plan_product_id: productId,
                  subscription_status: subscription.status,
                  stripe_customer_id: session.customer as string,
                  stripe_subscription_id: subscription.id,
                  updated_at: new Date().toISOString()
                }, {
                  onConflict: 'owner_id'
                });
              
              if (upsertError) {
                console.error('[STRIPE-WEBHOOK] Error updating workspace:', upsertError);
              } else {
                console.log(`[STRIPE-WEBHOOK] ✓ Successfully updated workspace to ${planName} plan`);
              }
            } else {
              console.error('[STRIPE-WEBHOOK] User not found for email:', customerEmail);
            }
          }
          break;
        }
        
        // Handle payment checkout completion
        const { data: payment } = await supabase
          .from('payments')
          .update({
            status: 'completed',
            stripe_payment_id: session.payment_intent as string,
            payment_method: 'card'
          })
          .eq('stripe_session_id', session.id)
          .select()
          .single();

        if (payment) {
          await supabase
            .from('appointments')
            .update({ status: 'confirmed' })
            .eq('id', payment.appointment_id);

          await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-payment-confirmation`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
            },
            body: JSON.stringify({
              paymentId: payment.id,
              appointmentId: payment.appointment_id,
              userId: payment.user_id,
            }),
          });
        }
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        
        console.log(`[STRIPE-WEBHOOK] Subscription ${event.type}: ${subscription.id}, status: ${subscription.status}`);
        
        const customer = await stripe.customers.retrieve(customerId);
        const customerEmail = 'email' in customer ? customer.email : null;
        
        if (!customerEmail) {
          console.error('[STRIPE-WEBHOOK] No customer email found');
          break;
        }

        const productId = typeof subscription.items.data[0].price.product === 'string'
          ? subscription.items.data[0].price.product
          : subscription.items.data[0].price.product.id;
        const planName = PLAN_PRODUCT_MAP[productId] || 'unknown';
        
        console.log(`[STRIPE-WEBHOOK] Email: ${customerEmail}, Product: ${productId}, Plan: ${planName}`);
        
        const { data: userData } = await supabase.auth.admin.listUsers();
        const user = userData?.users.find(u => u.email === customerEmail);
        
        if (!user) {
          console.error('[STRIPE-WEBHOOK] User not found for email:', customerEmail);
          break;
        }
        
        const { data: existingWorkspace } = await supabase
          .from('workspaces')
          .select('stripe_subscription_id')
          .eq('owner_id', user.id)
          .single();
        
        if (existingWorkspace?.stripe_subscription_id && 
            existingWorkspace.stripe_subscription_id !== subscription.id) {
          console.log(`[STRIPE-WEBHOOK] Canceling old subscription: ${existingWorkspace.stripe_subscription_id}`);
          try {
            await stripe.subscriptions.cancel(existingWorkspace.stripe_subscription_id);
            console.log(`[STRIPE-WEBHOOK] ✓ Old subscription canceled`);
          } catch (cancelError) {
            console.error('[STRIPE-WEBHOOK] Error canceling old subscription:', cancelError);
          }
        }
        
        const { error: updateError } = await supabase
          .from('workspaces')
          .upsert({
            owner_id: user.id,
            current_plan_product_id: productId,
            subscription_status: subscription.status,
            stripe_customer_id: customerId,
            stripe_subscription_id: subscription.id,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'owner_id'
          });
        
        if (updateError) {
          console.error('[STRIPE-WEBHOOK] Error updating workspace:', updateError);
        } else {
          console.log(`[STRIPE-WEBHOOK] ✓ Successfully updated workspace subscription to ${planName} plan`);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        
        console.log(`[STRIPE-WEBHOOK] Subscription deleted: ${subscription.id}`);
        
        const customer = await stripe.customers.retrieve(customerId);
        const customerEmail = 'email' in customer ? customer.email : null;
        
        console.log(`[STRIPE-WEBHOOK] Subscription canceled for ${customerEmail}, reverting to free plan`);
        
        const { error: updateError } = await supabase
          .from('workspaces')
          .update({
            current_plan_product_id: 'default',
            subscription_status: 'canceled',
            stripe_subscription_id: null,
            updated_at: new Date().toISOString()
          })
          .eq('stripe_subscription_id', subscription.id);
        
        if (updateError) {
          console.error('[STRIPE-WEBHOOK] Error reverting workspace to free:', updateError);
        } else {
          console.log(`[STRIPE-WEBHOOK] ✓ Successfully reverted workspace to free plan`);
        }
        break;
      }

      case 'checkout.session.expired':
      case 'payment_intent.payment_failed': {
        const session = event.data.object as Stripe.Checkout.Session;
        
        await supabase
          .from('payments')
          .update({ status: 'failed' })
          .eq('stripe_session_id', session.id);
        break;
      }

      default:
        console.log(`[STRIPE-WEBHOOK] Unhandled event type: ${event.type}`);
    }

    return successResponse({ received: true, eventType: event.type });

  } catch (error) {
    console.error('[STRIPE-WEBHOOK] Error:', error);
    if (error instanceof Stripe.errors.StripeSignatureVerificationError) {
      return errors.badRequest("Invalid webhook signature");
    }
    return errors.badRequest(error instanceof Error ? error.message : 'Unknown error');
  }
});
