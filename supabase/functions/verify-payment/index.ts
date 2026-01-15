import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: unknown) => {
  console.log(`[VERIFY-PAYMENT] ${step}`, details ? JSON.stringify(details) : "");
};

// Helper to extract client notes from Stripe session metadata
const extractClientNotes = (session: Stripe.Checkout.Session): string | null => {
  try {
    if (session.metadata?.client_notes && typeof session.metadata.client_notes === 'string') {
      const notes = session.metadata.client_notes.trim();
      if (notes.length > 0 && notes.length <= 500) {
        logStep("Client notes from metadata", { preview: notes.substring(0, 50) });
        return notes;
      }
    }
    return null;
  } catch (e) {
    logStep("Could not extract client notes", { error: e });
    return null;
  }
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Only allow POST
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ success: false, error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const { session_id } = await req.json();
    
    if (!session_id) {
      return new Response(
        JSON.stringify({ success: false, error: "session_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    logStep("Verifying session", { session_id });

    // Initialize Stripe
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      return new Response(
        JSON.stringify({ success: false, error: "Stripe not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Retrieve the checkout session from Stripe
    const session = await stripe.checkout.sessions.retrieve(session_id);
    logStep("Session retrieved", { payment_status: session.payment_status, mode: session.mode });

    // Check if checkout was successful (paid OR 100% discounted)
    const isSuccessfulCheckout = session.payment_status === "paid" || session.payment_status === "no_payment_required";
    
    if (!isSuccessfulCheckout) {
      return new Response(
        JSON.stringify({ success: false, error: "Payment not completed" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get user from metadata or try to authenticate
    let userId = session.metadata?.lovable_user_id;
    
    if (!userId) {
      // Try to get from auth header
      const authHeader = req.headers.get("Authorization");
      if (authHeader) {
        const supabaseClient = createClient(
          Deno.env.get("SUPABASE_URL") ?? "",
          Deno.env.get("SUPABASE_ANON_KEY") ?? ""
        );
        const token = authHeader.replace("Bearer ", "");
        const { data: userData } = await supabaseClient.auth.getUser(token);
        userId = userData.user?.id;
      }
    }

    if (!userId) {
      logStep("No user ID available");
      return new Response(
        JSON.stringify({ success: false, error: "User not identified" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if payment already recorded in our database
    const { data: existingPayment } = await supabaseAdmin
      .from("payments")
      .select("id, amount, currency, description, status, appointment_id")
      .eq("stripe_session_id", session_id)
      .maybeSingle();

    // If payment exists AND has appointment_id, everything is already done
    if (existingPayment && existingPayment.appointment_id) {
      logStep("Payment and booking already exist", { paymentId: existingPayment.id, appointmentId: existingPayment.appointment_id });
      return new Response(
        JSON.stringify({ 
          success: true, 
          payment: existingPayment,
          message: "Payment verified" 
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Prepare description
    let description = session.metadata?.service_name || session.metadata?.package_name || "Payment";
    if (session.mode === "subscription") {
      description = `Subscription: ${description}`;
    }

    // Get receipt URL
    let receiptUrl: string | null = null;
    if (session.mode === "payment" && session.payment_intent) {
      const paymentIntentId = typeof session.payment_intent === "string" 
        ? session.payment_intent 
        : session.payment_intent.id;
      try {
        const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
        if (paymentIntent.latest_charge && typeof paymentIntent.latest_charge === "string") {
          const charge = await stripe.charges.retrieve(paymentIntent.latest_charge);
          receiptUrl = charge.receipt_url || null;
        }
      } catch (e) {
        logStep("Could not get receipt URL", { error: e });
      }
    } else if (session.mode === "subscription" && session.subscription) {
      const subscriptionId = typeof session.subscription === "string" 
        ? session.subscription 
        : session.subscription.id;
      try {
        const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
          expand: ["latest_invoice"],
        });
        const invoice = subscription.latest_invoice as Stripe.Invoice | null;
        if (invoice) {
          receiptUrl = invoice.hosted_invoice_url || invoice.invoice_pdf || null;
        }
      } catch (e) {
        logStep("Could not get receipt URL from subscription", { error: e });
      }
    }

    // Create booking first if service purchase (needed for payment linkage)
    let appointmentId: string | null = null;
    const serviceId = session.metadata?.service_id;
    
    if (serviceId) {
      // Check if booking already exists for this session
      const { data: existingBooking } = await supabaseAdmin
        .from("appointments")
        .select("id")
        .ilike("notes", `%${session_id}%`)
        .maybeSingle();
      
      if (existingBooking) {
        appointmentId = existingBooking.id;
        logStep("Booking already exists", { appointmentId });
      } else {
        // Create booking
        const customerName = session.customer_details?.name || session.metadata?.customer_name || "Customer";
        const customerEmail = session.customer_email || "";
        const serviceName = session.metadata?.service_name || "Service Project";
        const paymentModel = session.metadata?.payment_model || (session.mode === "subscription" ? "subscription" : "one_time");

        const { data: newBooking, error: bookingError } = await supabaseAdmin
          .from("appointments")
          .insert({
            user_id: userId,
            service_id: serviceId,
            package_id: session.metadata?.package_id || null,
            full_name: customerName,
            email: customerEmail,
            phone: "",
            appointment_date: new Date().toISOString().split("T")[0],
            appointment_time: "TBD",
            status: "pending",
            project_status: "not_started",
            notes: `stripe_session:${session_id}\nService: ${serviceName}\nPackage: ${session.metadata?.package_name || "Unknown"}\nPayment: $${(session.amount_total || 0) / 100}\nPayment Model: ${paymentModel}`,
          })
          .select("id")
          .single();

        if (bookingError) {
          logStep("ERROR: Failed to create booking", { error: bookingError });
        } else {
          logStep("Booking created", { bookingId: newBooking.id });
          appointmentId = newBooking.id;
        }
      }

      // Create project if booking exists
      if (appointmentId) {
        // Check if project already exists
        const { data: existingProject } = await supabaseAdmin
          .from("projects")
          .select("id")
          .eq("appointment_id", appointmentId)
          .maybeSingle();

        let finalProjectId: string | null = existingProject?.id || null;

        if (!existingProject) {
          const customerName = session.customer_details?.name || session.metadata?.customer_name || "Customer";
          const serviceName = session.metadata?.service_name || "Service Project";
          const paymentModel = session.metadata?.payment_model || (session.mode === "subscription" ? "subscription" : "one_time");

          const { data: newProject, error: projectError } = await supabaseAdmin
            .from("projects")
            .insert({
              user_id: userId,
              client_id: userId,
              workspace_id: userId,
              service_id: serviceId,
              appointment_id: appointmentId,
              name: serviceName,
              title: serviceName,
              description: `Project for ${customerName}`,
              status: "pending",
              progress: 0,
              start_date: new Date().toISOString().split("T")[0],
              payment_model: paymentModel,
            })
            .select("id")
            .single();

          if (projectError) {
            logStep("ERROR: Failed to create project", { error: projectError });
          } else {
            logStep("Project created", { projectId: newProject.id });
            finalProjectId = newProject.id;
          }
        } else {
          logStep("Project already exists", { projectId: existingProject.id });
        }

        // Save client notes to project if provided
        if (finalProjectId) {
          const clientNotes = extractClientNotes(session);
          if (clientNotes) {
            const { error: notesError } = await supabaseAdmin
              .from("projects")
              .update({ 
                client_notes: clientNotes, 
                client_notes_updated_at: new Date().toISOString() 
              })
              .eq("id", finalProjectId);
            
            if (notesError) {
              logStep("WARN: Failed to save client notes", { error: notesError });
            } else {
              logStep("Client notes saved to project", { projectId: finalProjectId });
            }
          }

          // For subscriptions: create/upsert project_subscription record
          if (session.mode === "subscription" && session.subscription) {
            const subscriptionId = typeof session.subscription === "string" 
              ? session.subscription 
              : session.subscription.id;
            
            try {
              const subscription = await stripe.subscriptions.retrieve(subscriptionId);
              const customerId = typeof session.customer === "string" 
                ? session.customer 
                : session.customer?.id || null;

              const { error: subError } = await supabaseAdmin
                .from("project_subscriptions")
                .upsert({
                  project_id: finalProjectId,
                  stripe_subscription_id: subscriptionId,
                  stripe_customer_id: customerId,
                  status: subscription.status,
                  next_renewal_date: new Date(subscription.current_period_end * 1000).toISOString(),
                }, { onConflict: "project_id" });

              if (subError) {
                logStep("ERROR: Failed to upsert project subscription", { error: subError });
              } else {
                logStep("Project subscription upserted", { projectId: finalProjectId, subscriptionId });
              }
            } catch (e) {
              logStep("ERROR: Failed to retrieve subscription details", { error: e });
            }
          }
        }
      }
    }

    // Insert or update payment record with appointment_id
    if (existingPayment) {
      // Update existing payment with appointment_id
      const { error: updateError } = await supabaseAdmin
        .from("payments")
        .update({ appointment_id: appointmentId })
        .eq("id", existingPayment.id);
      
      if (updateError) {
        logStep("ERROR: Failed to update payment", { error: updateError });
      } else {
        logStep("Payment updated with appointment_id", { paymentId: existingPayment.id, appointmentId });
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          payment: { ...existingPayment, appointment_id: appointmentId },
          message: "Payment verified and booking created" 
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create new payment record
    const paymentData = {
      user_id: userId,
      stripe_session_id: session_id,
      amount: (session.amount_total ?? 0) / 100,
      currency: (session.currency || "usd").toUpperCase(),
      status: "paid",
      description,
      customer_email: session.customer_email || session.customer_details?.email,
      customer_name: session.customer_details?.name || null,
      service_id: serviceId || null,
      package_id: session.metadata?.package_id || null,
      stripe_receipt_url: receiptUrl,
      payment_method: session.payment_method_types?.[0] || "card",
      appointment_id: appointmentId,
    };

    const { data: newPayment, error: insertError } = await supabaseAdmin
      .from("payments")
      .insert(paymentData)
      .select("id, amount, currency, description, status")
      .single();

    if (insertError) {
      logStep("Insert error", { error: insertError });
      return new Response(
        JSON.stringify({ success: false, error: "Failed to record payment" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    logStep("Payment recorded successfully", { paymentId: newPayment.id, appointmentId });

    // Handle user-level subscription tracking
    if (session.mode === "subscription" && session.subscription) {
      const subscriptionId = typeof session.subscription === "string" 
        ? session.subscription 
        : session.subscription.id;
      
      try {
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        
        const { error: subError } = await supabaseAdmin
          .from("subscriptions")
          .upsert({
            user_id: userId,
            stripe_subscription_id: subscriptionId,
            stripe_customer_id: typeof session.customer === "string" ? session.customer : session.customer?.id || "",
            price_id: subscription.items.data[0]?.price.id || "",
            status: subscription.status,
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
          }, { onConflict: "user_id" });

        if (subError) {
          logStep("ERROR: Failed to upsert subscription", { error: subError });
        } else {
          logStep("Subscription upserted", { subscriptionId });
        }
      } catch (e) {
        logStep("ERROR: Failed to track subscription", { error: e });
      }
    }
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        payment: newPayment,
        message: "Payment verified and recorded" 
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
