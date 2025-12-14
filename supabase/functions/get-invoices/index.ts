import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { corsHeaders, successResponse, errors, handleCors } from "../_shared/response.ts";

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error("[GET-INVOICES] Missing Supabase environment variables");
      return errors.internal("Server configuration error");
    }

    if (!stripeSecretKey) {
      console.error("[GET-INVOICES] Missing Stripe secret key");
      return errors.internal("Payment system not configured");
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return errors.unauthorized("No authorization header");
    }

    const token = authHeader.replace("Bearer ", "");
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);

    if (userError || !user?.email) {
      console.error("[GET-INVOICES] Auth error:", userError?.message);
      return errors.unauthorized("Invalid or expired token");
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2025-08-27.basil",
    });

    // Find Stripe customer by email
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });

    if (customers.data.length === 0) {
      console.log(`[GET-INVOICES] No Stripe customer found for: ${user.email}`);
      return successResponse({ invoices: [] });
    }

    const customerId = customers.data[0].id;

    // Get invoices for this customer
    const invoices = await stripe.invoices.list({
      customer: customerId,
      limit: 50,
    });

    const formattedInvoices = invoices.data.map((invoice: Stripe.Invoice) => ({
      id: invoice.id,
      number: invoice.number || invoice.id,
      amount: invoice.amount_paid,
      currency: invoice.currency || "usd",
      status: invoice.status || "unknown",
      created: invoice.created,
      period_start: invoice.period_start || invoice.created,
      period_end: invoice.period_end || invoice.created,
      hosted_invoice_url: invoice.hosted_invoice_url || null,
      invoice_pdf: invoice.invoice_pdf || null,
      customer_email: invoice.customer_email || user.email,
      customer_name: invoice.customer_name || null,
      lines: invoice.lines.data.map((line: Stripe.InvoiceLineItem) => ({
        description: line.description || "Service",
        amount: line.amount,
        quantity: line.quantity || 1,
      })),
    }));

    console.log(`[GET-INVOICES] Returning ${formattedInvoices.length} invoices for user: ${user.id}`);

    return successResponse({ invoices: formattedInvoices });
  } catch (error) {
    console.error("[GET-INVOICES] Unexpected error:", error);

    if (error instanceof Stripe.errors.StripeError) {
      return errors.internal("Payment service error");
    }

    return errors.internal("An unexpected error occurred");
  }
});
