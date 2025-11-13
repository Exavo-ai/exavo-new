import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from 'https://esm.sh/stripe@14.21.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-10-16',
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