import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import Stripe from 'https://esm.sh/stripe@18.5.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Feature flag: set to false to disable client notes collection
const ENABLE_CLIENT_NOTES = true;

const logStep = (step: string, details?: unknown) => {
  console.log(`[CREATE-PACKAGE-CHECKOUT] ${step}`, details ? JSON.stringify(details) : "");
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { packageId, customerEmail, customerName, successUrl, cancelUrl } = await req.json();

    if (!packageId) {
      return new Response(
        JSON.stringify({ error: 'Package ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    logStep("Request received", { packageId });

    // Get package details with service payment_model
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: packageData, error: packageError } = await supabase
      .from('service_packages')
      .select('*, services(id, name, payment_model)')
      .eq('id', packageId)
      .single();

    if (packageError || !packageData) {
      console.error('Package not found:', packageError);
      return new Response(
        JSON.stringify({ error: 'Package not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const service = packageData.services as { id: string; name: string; payment_model: string } | null;
    const paymentModel = service?.payment_model || 'one_time';
    
    logStep("Package found", { 
      packageName: packageData.package_name, 
      paymentModel,
      price: packageData.price,
      buildCost: packageData.build_cost,
      monthlyFee: packageData.monthly_fee
    });

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2025-08-27.basil',
    });

    // Get user from auth header - REQUIRED for booking creation
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authentication required to purchase services' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const supabaseAuth = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authentication token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const userId = user.id;
    logStep("User authenticated", { userId, email: user.email });

    // Check for existing Stripe customer
    let customerId: string | undefined;
    const email = customerEmail || user.email;
    if (email) {
      const customers = await stripe.customers.list({ email, limit: 1 });
      customerId = customers.data.length > 0 ? customers.data[0].id : undefined;
      if (customerId) {
        logStep("Found existing customer", { customerId });
      }
    }

    const serviceName = service?.name || 'Service';
    const origin = req.headers.get('origin') || 'https://exavo.ai';

    // Handle based on payment model
    if (paymentModel === 'subscription') {
      // SUBSCRIPTION: Build cost (one-time) + Monthly fee (recurring)
      const buildCost = packageData.build_cost || 0;
      const monthlyFee = packageData.monthly_fee || 0;

      if (monthlyFee <= 0) {
        return new Response(
          JSON.stringify({ error: 'This subscription package has no monthly fee configured' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [];

      // Add build cost as one-time line item if > 0
      if (buildCost > 0) {
        lineItems.push({
          price_data: {
            currency: packageData.currency?.toLowerCase() || 'usd',
            product_data: {
              name: `${serviceName} - ${packageData.package_name} (Build Cost)`,
              description: 'One-time setup and build fee',
            },
            unit_amount: Math.round(buildCost * 100),
          },
          quantity: 1,
        });
      }

      // Add monthly subscription
      lineItems.push({
        price_data: {
          currency: packageData.currency?.toLowerCase() || 'usd',
          product_data: {
            name: `${serviceName} - ${packageData.package_name} (Monthly)`,
            description: 'Monthly subscription fee including hosting & support',
          },
          unit_amount: Math.round(monthlyFee * 100),
          recurring: {
            interval: 'month',
          },
        },
        quantity: 1,
      });

      logStep("Creating subscription checkout", { buildCost, monthlyFee, lineItemsCount: lineItems.length });

      // Build session options
      const sessionOptions: Stripe.Checkout.SessionCreateParams = {
        customer: customerId,
        customer_email: customerId ? undefined : email,
        client_reference_id: userId,
        line_items: lineItems,
        mode: 'subscription',
        allow_promotion_codes: true,
        success_url: successUrl || `${origin}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: cancelUrl || `${origin}/services`,
        metadata: {
          lovable_user_id: userId,
          package_id: packageId,
          service_id: service?.id || '',
          service_name: serviceName,
          package_name: packageData.package_name,
          customer_name: customerName || user.user_metadata?.full_name || '',
          payment_model: 'subscription',
          build_cost: buildCost.toString(),
          monthly_fee: monthlyFee.toString(),
        },
      };

      // Add optional client notes field (feature-flagged)
      if (ENABLE_CLIENT_NOTES) {
        try {
          sessionOptions.custom_fields = [
            {
              key: 'notes',
              label: { type: 'custom', custom: 'Notes / Requirements (optional)' },
              type: 'text',
              optional: true,
              text: { maximum_length: 255 },
            },
          ];
        } catch (e) {
          logStep("Could not add custom_fields (feature not supported)", { error: e });
        }
      }

      const session = await stripe.checkout.sessions.create(sessionOptions);

      logStep("Subscription checkout session created", { sessionId: session.id });

      return new Response(
        JSON.stringify({ 
          sessionId: session.id, 
          url: session.url,
          package: {
            name: packageData.package_name,
            build_cost: buildCost,
            monthly_fee: monthlyFee,
            currency: packageData.currency,
            payment_model: 'subscription',
          }
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else {
      // ONE-TIME PAYMENT
      const price = packageData.price || 0;

      if (price <= 0) {
        return new Response(
          JSON.stringify({ error: 'This package requires a valid price. Please contact support.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      logStep("Creating one-time checkout", { price });

      // Check if package has a Stripe price ID for one-time, otherwise use price_data
      const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = packageData.stripe_price_id 
        ? [{
            price: packageData.stripe_price_id,
            quantity: 1,
          }]
        : [{
            price_data: {
              currency: packageData.currency?.toLowerCase() || 'usd',
              product_data: {
                name: `${serviceName} - ${packageData.package_name}`,
                description: packageData.description || 'One-time purchase',
              },
              unit_amount: Math.round(price * 100),
            },
            quantity: 1,
          }];

      // Build session options
      const paymentSessionOptions: Stripe.Checkout.SessionCreateParams = {
        customer: customerId,
        customer_email: customerId ? undefined : email,
        client_reference_id: userId,
        line_items: lineItems,
        mode: 'payment',
        allow_promotion_codes: true,
        success_url: successUrl || `${origin}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: cancelUrl || `${origin}/services`,
        metadata: {
          lovable_user_id: userId,
          package_id: packageId,
          service_id: service?.id || '',
          service_name: serviceName,
          package_name: packageData.package_name,
          customer_name: customerName || user.user_metadata?.full_name || '',
          payment_model: 'one_time',
        },
      };

      // Add optional client notes field (feature-flagged)
      if (ENABLE_CLIENT_NOTES) {
        try {
          paymentSessionOptions.custom_fields = [
            {
              key: 'notes',
              label: { type: 'custom', custom: 'Notes / Requirements (optional)' },
              type: 'text',
              optional: true,
              text: { maximum_length: 255 },
            },
          ];
        } catch (e) {
          logStep("Could not add custom_fields for payment (feature not supported)", { error: e });
        }
      }

      const session = await stripe.checkout.sessions.create(paymentSessionOptions);

      logStep("One-time checkout session created", { sessionId: session.id });

      return new Response(
        JSON.stringify({ 
          sessionId: session.id, 
          url: session.url,
          package: {
            name: packageData.package_name,
            price: price,
            currency: packageData.currency,
            payment_model: 'one_time',
          }
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error: unknown) {
    console.error('Checkout error:', error);
    const message = error instanceof Error ? error.message : 'Failed to create checkout session';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
