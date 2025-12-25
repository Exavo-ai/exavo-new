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

    const customers = await stripe.customers.list({
      email: user.email,
      limit: 1,
    });

    if (customers.data.length === 0) {
      return successResponse({ invoices: [] });
    }

    const invoices = await stripe.invoices.list({
      customer: customers.data[0].id,
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
