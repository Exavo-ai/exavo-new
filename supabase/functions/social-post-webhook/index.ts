import { corsHeaders } from "../_shared/response.ts";
import { authenticateRequest, requireAdminRole } from "../_shared/auth.ts";

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate request
    const authResult = await authenticateRequest(req);
    if (authResult.error) {
      console.error("Auth error:", authResult.error);
      return new Response(
        JSON.stringify({ success: false, error: authResult.error }),
        { status: authResult.error.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify admin role
    const adminCheck = await requireAdminRole(authResult.user.id);
    if (adminCheck.error) {
      console.error("Admin check error:", adminCheck.error);
      return new Response(
        JSON.stringify({ success: false, error: adminCheck.error }),
        { status: adminCheck.error.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request body
    const body = await req.json();
    const { postId, decision, feedback } = body;

    console.log("Processing webhook for post:", postId, "decision:", decision);

    // Validate required fields
    if (!postId || !decision) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: { code: "INVALID_BODY", message: "postId and decision are required" } 
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (decision === "changes_requested" && (!feedback || !feedback.trim())) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: { code: "FEEDBACK_REQUIRED", message: "Feedback is required when requesting changes" } 
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get webhook URL from environment
    const webhookUrl = Deno.env.get("N8N_APPROVAL_WEBHOOK_URL");

    if (!webhookUrl) {
      console.warn("N8N_APPROVAL_WEBHOOK_URL not configured, skipping webhook");
      return new Response(
        JSON.stringify({ success: true, message: "Webhook URL not configured, skipped" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Send webhook to n8n
    console.log("Sending webhook to:", webhookUrl);
    const webhookResponse = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        postId,
        decision,
        feedback: feedback || "",
      }),
    });

    if (!webhookResponse.ok) {
      const errorText = await webhookResponse.text();
      console.error("Webhook failed:", webhookResponse.status, errorText);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: { 
            code: "WEBHOOK_FAILED", 
            message: `n8n webhook failed with status ${webhookResponse.status}` 
          } 
        }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Webhook sent successfully");

    return new Response(
      JSON.stringify({ success: true, message: "Webhook sent successfully" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error processing webhook:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: { 
          code: "INTERNAL_ERROR", 
          message: error instanceof Error ? error.message : "Internal server error" 
        } 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
