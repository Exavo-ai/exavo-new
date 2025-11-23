import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import Stripe from 'https://esm.sh/stripe@18.5.0';

const PLAN_PRODUCT_MAP: Record<string, string> = {
  'prod_TTapRptmEkLouu': 'starter',
  'prod_TTapq8rgy3dmHT': 'pro', 
  'prod_TTapwaC6qD21xi': 'enterprise'
};

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2025-08-27.basil',
});

serve(async (req) => {
  const signature = req.headers.get('stripe-signature');
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');

  if (!signature || !webhookSecret) {
    return new Response('Webhook signature missing', { status: 400 });
  }

  try {
    const body = await req.text();
    const event = stripe.webhooks.constructEvent(body, signature, webhookSecret);

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
          
          // Fetch subscription to get product details
          const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
          const productId = typeof subscription.items.data[0].price.product === 'string'
            ? subscription.items.data[0].price.product
            : subscription.items.data[0].price.product.id;
          const planName = PLAN_PRODUCT_MAP[productId] || 'unknown';
          
          console.log(`[STRIPE-WEBHOOK] Product ID: ${productId}, Plan: ${planName}`);
          
          // Find user by customer email
          const customerEmail = session.customer_email || session.customer_details?.email;
          if (customerEmail) {
            const { data: userData, error: userError } = await supabase.auth.admin.listUsers();
            const user = userData?.users.find(u => u.email === customerEmail);
            
            if (user) {
              console.log(`[STRIPE-WEBHOOK] Found user: ${user.id}, updating workspace`);
              
              // Update or create workspace
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
        
        // Handle payment checkout completion (existing logic)
        // Update payment status
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
          // Update appointment status
          await supabase
            .from('appointments')
            .update({ status: 'confirmed' })
            .eq('id', payment.appointment_id);

          // Send confirmation email
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
        
        // Get customer email
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
        
        // Update workspace by stripe_subscription_id or customer_id
        const { error: updateError } = await supabase
          .from('workspaces')
          .update({
            current_plan_product_id: productId,
            subscription_status: subscription.status,
            stripe_customer_id: customerId,
            stripe_subscription_id: subscription.id,
            updated_at: new Date().toISOString()
          })
          .eq('stripe_subscription_id', subscription.id);
        
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
        
        // Revert to free plan
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
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }
});