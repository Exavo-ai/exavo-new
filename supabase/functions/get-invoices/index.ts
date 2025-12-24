import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { successResponse, errors, handleCors } from "../_shared/response.ts";

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");

    if (!supabaseUrl || !serviceRoleKey || !stripeSecretKey) {
      return errors.internal("Server configuration error");
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return errors.unauthorized("Missing authorization header");
    }

    const token = authHeader.replace("Bearer ", "");
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(token);
    if (userError || !user?.email) {
      return errors.unauthorized("Invalid or expired token");
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2025-08-27.basil",
    });

    // Find Stripe customer
    const customers = await stripe.customers.list({
      email: user.email,
      limit: 1,
    });

    if (customers.data.length === 0) {
      return successResponse({ invoices: [] });
    }

    const customerId = customers.data[0].id;

    const invoices = await stripe.invoices.list({
      customer: customerId,
      limit: 50,
    });

    const formattedInvoices = invoices.data.map((invoice) => {
      const firstLine = invoice.lines.data[0];

      return {
        id: invoice.id,
        amount: (invoice.amount_paid || 0) / 100,
        currency: (invoice.currency || "usd").toUpperCase(),
        status: invoice.status || "unknown",
        created_at: new Date(invoice.created * 1000).toISOString(),
        pdf_url: invoice.invoice_pdf || null,
        hosted_invoice_url: invoice.hosted_invoice_url || null,
        plan_name: firstLine?.description || "Subscription",
        period_start: invoice.period_start ? new Date(invoice.period_start * 1000).toISOString() : null,
        period_end: invoice.period_end ? new Date(invoice.period_end * 1000).toISOString() : null,
      };
    });

    return successResponse({ invoices: formattedInvoices });
  } catch (error) {
    console.error("[GET-INVOICES]", error);
    return errors.internal("Unexpected error");
  }
});
