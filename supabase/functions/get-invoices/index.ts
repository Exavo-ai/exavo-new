import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { successResponse, errors, handleCors } from "../_shared/response.ts";

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");

    if (!supabaseUrl || !anonKey || !stripeSecretKey) {
      return errors.internal("Server not configured");
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return errors.unauthorized("Missing authorization header");
    }

    const token = authHeader.replace("Bearer ", "");

    const supabase = createClient(supabaseUrl, anonKey);
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(token);

    if (userError || !user?.email) {
      return errors.unauthorized("Invalid user");
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2025-08-27.basil",
    });

    console.log(`[GET-INVOICES] Fetching invoices for user ${user.id} (${user.email})`);

    const customers = await stripe.customers.list({
      email: user.email,
      limit: 1,
    });

    if (customers.data.length === 0) {
      console.log(`[GET-INVOICES] No Stripe customer found for ${user.email}`);
      return successResponse({ invoices: [] });
    }

    const stripeCustomer = customers.data[0];

    // SECURITY: Verify the Stripe customer email matches the authenticated user
    if (
      !stripeCustomer.email ||
      stripeCustomer.email.toLowerCase() !== user.email!.toLowerCase()
    ) {
      console.log(`[GET-INVOICES] SECURITY: Email mismatch! Stripe=${stripeCustomer.email}, Auth=${user.email}. Creating new customer.`);
      const newCustomer = await stripe.customers.create({
        email: user.email,
        metadata: { lovable_user_id: user.id },
      });
      console.log(`[GET-INVOICES] Created corrected customer ${newCustomer.id} for ${user.email}`);
      // New customer has no invoices yet
      return successResponse({ invoices: [] });
    }

    console.log(`[GET-INVOICES] Using verified Stripe customer ${stripeCustomer.id} for ${user.email}`);

    const invoices = await stripe.invoices.list({
      customer: stripeCustomer.id,
      limit: 50,
    });

    const formattedInvoices = invoices.data.map((invoice: Stripe.Invoice) => ({
      id: invoice.id,
      amount: invoice.amount_paid / 100,
      currency: invoice.currency,
      status: invoice.status,
      created_at: new Date(invoice.created * 1000).toISOString(),
      hosted_invoice_url: invoice.hosted_invoice_url,
      pdf_url: invoice.invoice_pdf,
      plan_name: invoice.lines.data[0]?.description || "Subscription",
    }));

    return successResponse({
      invoices: formattedInvoices,
    });
  } catch (err) {
    console.error("[GET-INVOICES]", err);
    return errors.internal("Failed to fetch invoices");
  }
});
