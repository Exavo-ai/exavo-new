import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { checkRateLimit, createRateLimitKey, RateLimitPresets } from "../_shared/rate-limit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "X-Frame-Options": "DENY",
  "X-Content-Type-Options": "nosniff",
  "X-XSS-Protection": "1; mode=block",
  "Referrer-Policy": "no-referrer-when-downgrade",
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload",
  "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
  "Pragma": "no-cache",
};

// Validation schema
const inviteSchema = z.object({
  email: z.string().trim().email("Invalid email address").max(255, "Email must be less than 255 characters"),
  role: z.enum(["Admin", "Member", "Viewer"], {
    errorMap: () => ({ message: "Role must be Admin, Member, or Viewer" }),
  }),
});

function successResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify({ success: true, data }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function errorResponse(code: string, message: string, status: number, details?: unknown): Response {
  const errorObj: { code: string; message: string; details?: unknown } = { code, message };
  if (details !== undefined) errorObj.details = details;
  return new Response(JSON.stringify({ success: false, error: errorObj }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const sendInvitationEmail = async (to: string, role: string, inviterEmail: string, inviteToken: string) => {
  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
  
  if (!RESEND_API_KEY) {
    console.error("[INVITE-EMAIL] RESEND_API_KEY not configured");
    return { success: false, error: "Email service not configured" };
  }
  
  try {
    console.log(`[INVITE-EMAIL] Sending invitation to ${to} with role ${role}`);
    
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Exavo AI <info@exavoai.io>",
        reply_to: "info@exavoai.io",
        to: [to],
        subject: "You've been invited to join Exavo AI",
        html: `
          <!DOCTYPE html>
          <html lang="en">
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Team Invitation - Exavo AI</title>
            </head>
            <body style="margin: 0; padding: 0; background-color: #0a0a1b; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #0a0a1b;">
                <tr>
                  <td style="padding: 40px 20px;">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 600px; margin: 0 auto; background-color: #1a1a2e; border-radius: 16px; overflow: hidden;">
                      <tr>
                        <td style="padding: 40px 32px 32px; text-align: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
                          <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">Team Invitation</h1>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 48px 40px; color: #e5e7eb;">
                          <p style="margin: 0 0 24px; font-size: 16px;">Hello <strong>${to}</strong>,</p>
                          <p style="margin: 0 0 24px; font-size: 16px;">
                            <strong style="color: #667eea;">${inviterEmail}</strong> has invited you to join their workspace as a <strong style="color: #a78bfa;">${role}</strong>.
                          </p>
                          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                            <tr>
                              <td style="text-align: center; padding: 32px 0;">
                                <a href="https://exavo.ai/client/invite/accept?token=${inviteToken}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; font-size: 16px; font-weight: 600; text-decoration: none; padding: 16px 48px; border-radius: 10px;">Accept Invitation</a>
                              </td>
                            </tr>
                          </table>
                          <p style="margin: 0; font-size: 14px; color: #6b7280;">
                            If you didn't expect this invitation, you can safely ignore this email. The invitation will expire in 7 days.
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </body>
          </html>
        `,
      }),
    });

    if (!emailResponse.ok) {
      const errorData = await emailResponse.json();
      throw new Error(`Resend API error: ${errorData.message || JSON.stringify(errorData)}`);
    }

    const result = await emailResponse.json();
    console.log(`[INVITE-EMAIL] ✓ Invitation email sent to ${to}`);
    return { success: true, data: result };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error(`[INVITE-EMAIL] Failed:`, errorMessage);
    return { success: false, error: errorMessage };
  }
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Rate limiting check - 5 invitations per 15 minutes
    const rateLimitKey = createRateLimitKey(req, "invite");
    const rateCheck = checkRateLimit(rateLimitKey, RateLimitPresets.SENSITIVE);
    
    if (!rateCheck.allowed) {
      console.log("[INVITE] Rate limit exceeded for:", rateLimitKey);
      return new Response(
        JSON.stringify({
          success: false,
          error: {
            code: "RATE_LIMIT_EXCEEDED",
            message: "Too many invitation requests. Please try again later.",
            retryAfter: rateCheck.retryAfter,
          },
        }),
        { 
          status: 429, 
          headers: { 
            ...corsHeaders, 
            "Content-Type": "application/json",
            ...(rateCheck.retryAfter && { "Retry-After": String(rateCheck.retryAfter) })
          } 
        }
      );
    }

    console.log("[INVITE] Processing invitation request");
    
    // Check authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return errorResponse("UNAUTHORIZED", "Authorization header is required", 401);
    }

    // Authenticate user
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      console.error("[INVITE] Auth error:", userError);
      return errorResponse("UNAUTHORIZED", "Invalid or expired authentication token", 401);
    }

    console.log("[INVITE] ✓ User authenticated:", user.email);

    // Parse and validate request body
    let body;
    try {
      body = await req.json();
    } catch {
      return errorResponse("BAD_REQUEST", "Invalid JSON in request body", 400);
    }

    const validation = inviteSchema.safeParse(body);
    if (!validation.success) {
      const firstError = validation.error.errors[0];
      return errorResponse("VALIDATION_ERROR", firstError?.message || "Validation failed", 422, 
        validation.error.errors.map(e => ({ field: e.path.join("."), message: e.message }))
      );
    }

    const { email, role } = validation.data;

    // Create service role client
    const supabaseServiceClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Check team limits
    const limitsCheckUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/check-team-limits`;
    const limitsResponse = await fetch(limitsCheckUrl, {
      method: "POST",
      headers: {
        "Authorization": authHeader,
        "Content-Type": "application/json",
      },
    });

    if (!limitsResponse.ok) {
      return errorResponse("INTERNAL_ERROR", "Failed to check team limits", 500);
    }

    const limitsData = await limitsResponse.json();

    if (!limitsData.teamEnabled) {
      return errorResponse("FORBIDDEN", "Team features are not available on your current plan. Please upgrade to invite team members.", 403);
    }

    if (limitsData.limitReached || !limitsData.canInvite) {
      return errorResponse("FORBIDDEN", `Your ${limitsData.planName} plan allows up to ${limitsData.maxTeamMembers} team members. Please upgrade to add more.`, 403);
    }

    // Check for duplicate
    const { data: existing, error: existingError } = await supabaseServiceClient
      .from("team_members")
      .select("id, status")
      .eq("organization_id", user.id)
      .eq("email", email)
      .maybeSingle();

    if (existingError) {
      console.error("Error checking existing member:", existingError);
      return errorResponse("INTERNAL_ERROR", "Failed to check existing member", 500);
    }

    if (existing) {
      return errorResponse("CONFLICT", "A team member with this email already exists", 409);
    }

    // Generate invitation token
    const inviteToken = crypto.randomUUID();
    const tokenExpiresAt = new Date();
    tokenExpiresAt.setDate(tokenExpiresAt.getDate() + 7);

    // Create team member
    const { data: member, error: insertError } = await supabaseServiceClient
      .from("team_members")
      .insert({
        organization_id: user.id,
        email,
        role,
        status: "pending",
        invited_by: user.id,
        invite_token: inviteToken,
        token_expires_at: tokenExpiresAt.toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      console.error("Insert error:", insertError);
      return errorResponse("INTERNAL_ERROR", "Failed to create team member", 500);
    }

    console.log(`[INVITE] ✓ Team member created: ${member.id}`);

    // Send invitation email
    const emailResult = await sendInvitationEmail(email, role, user.email || "a team member", member.invite_token);
    
    if (!emailResult.success) {
      console.error(`[INVITE] Email failed:`, emailResult.error);
      // Still return success but note email failure
      return successResponse({ 
        member, 
        emailSent: false, 
        emailError: emailResult.error 
      }, 201);
    }

    console.log(`[INVITE] ✓ Invitation complete for ${email}`);
    return successResponse({ member, emailSent: true }, 201);

  } catch (error) {
    console.error("[INVITE] Unexpected error:", error);
    return errorResponse("INTERNAL_ERROR", "An unexpected error occurred", 500);
  }
});
