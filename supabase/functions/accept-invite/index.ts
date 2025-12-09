import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Password validation matching frontend registerSchema requirements
function validatePassword(password: string): { valid: boolean; error?: string } {
  if (!password || password.length < 8) {
    return { valid: false, error: "Password must be at least 8 characters long" };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, error: "Password must contain at least one uppercase letter" };
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, error: "Password must contain at least one lowercase letter" };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, error: "Password must contain at least one number" };
  }
  return { valid: true };
}

// Simple in-memory rate limiting (resets on function cold start)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_MAX = 5; // Max attempts per window
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

function checkRateLimit(identifier: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const entry = rateLimitMap.get(identifier);
  
  if (!entry || now > entry.resetTime) {
    rateLimitMap.set(identifier, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true };
  }
  
  if (entry.count >= RATE_LIMIT_MAX) {
    const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
    return { allowed: false, retryAfter };
  }
  
  entry.count++;
  return { allowed: true };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get client IP for rate limiting
    const clientIP = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || 
                     req.headers.get("cf-connecting-ip") || 
                     "unknown";
    
    const { token, fullName, password, createAccount } = await req.json();

    if (!token) {
      console.log("[ACCEPT-INVITE] No token provided");
      return new Response(
        JSON.stringify({ success: false, error: "Token is required" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Rate limiting check based on IP + token combination
    const rateLimitKey = `${clientIP}:${token.substring(0, 8)}`;
    const rateCheck = checkRateLimit(rateLimitKey);
    
    if (!rateCheck.allowed) {
      console.log("[ACCEPT-INVITE] Rate limit exceeded for:", rateLimitKey);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Too many attempts. Please try again later.",
          retryAfter: rateCheck.retryAfter 
        }),
        { 
          headers: { 
            ...corsHeaders, 
            "Content-Type": "application/json",
            "Retry-After": String(rateCheck.retryAfter)
          }, 
          status: 429 
        }
      );
    }

    console.log("[ACCEPT-INVITE] Accepting invitation with token:", token.substring(0, 8) + "...");

    // Create service role client to bypass RLS
    const supabaseServiceClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // First, validate that the token is still valid
    const { data: member, error: fetchError } = await supabaseServiceClient
      .from("team_members")
      .select("id, email, status, token_expires_at, role, organization_id")
      .eq("invite_token", token)
      .maybeSingle();

    console.log("[ACCEPT-INVITE] Member lookup result:", {
      found: !!member,
      status: member?.status,
      error: fetchError?.message,
    });

    if (fetchError) {
      console.error("[ACCEPT-INVITE] Database error:", fetchError);
      return new Response(
        JSON.stringify({ success: false, error: "Database error" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    if (!member) {
      console.log("[ACCEPT-INVITE] No invitation found for token");
      return new Response(
        JSON.stringify({ success: false, error: "Invalid invitation token" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Check if already activated
    if (member.status === "active") {
      console.log("[ACCEPT-INVITE] Already activated, returning success");
      return new Response(
        JSON.stringify({ success: true, message: "This invitation has already been accepted" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Check if expired
    if (member.token_expires_at && new Date(member.token_expires_at) < new Date()) {
      console.log("[ACCEPT-INVITE] Token expired");
      return new Response(
        JSON.stringify({ success: false, error: "This invitation has expired" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // If createAccount flag is set, create the user account
    if (createAccount && password) {
      // Validate password strength server-side
      const passwordValidation = validatePassword(password);
      if (!passwordValidation.valid) {
        console.log("[ACCEPT-INVITE] Password validation failed:", passwordValidation.error);
        return new Response(
          JSON.stringify({ success: false, error: passwordValidation.error }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
        );
      }

      console.log("[ACCEPT-INVITE] Creating user account with email confirmed");
      
      const supabaseAdmin = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false
          }
        }
      );

      // Create user with email already confirmed and no verification email
      const { data: userData, error: userError } = await supabaseAdmin.auth.admin.createUser({
        email: member.email,
        password: password,
        email_confirm: true,
        user_metadata: {
          full_name: fullName || "",
        },
      });

      if (userError) {
        console.error("[ACCEPT-INVITE] User creation error:", userError);
        if (userError.message.includes("already registered") || userError.message.includes("already exists")) {
          console.log("[ACCEPT-INVITE] User already exists, proceeding with activation");
        } else {
          return new Response(
            JSON.stringify({ success: false, error: "Failed to create account" }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
          );
        }
      } else {
        console.log("[ACCEPT-INVITE] ✓ User account created:", userData.user?.id);
      }
    }

    // Update team member to active
    const updateData: Record<string, unknown> = {
      status: "active",
      activated_at: new Date().toISOString(),
      invite_token: null,
    };

    if (fullName) {
      updateData.full_name = fullName;
    }

    console.log("[ACCEPT-INVITE] Updating team member to active:", member.id);

    const { error: updateError } = await supabaseServiceClient
      .from("team_members")
      .update(updateData)
      .eq("id", member.id);

    if (updateError) {
      console.error("[ACCEPT-INVITE] Update error:", updateError);
      return new Response(
        JSON.stringify({ success: false, error: "Failed to activate invitation" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    console.log("[ACCEPT-INVITE] ✓ Invitation activated successfully");

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Invitation accepted successfully",
        data: {
          email: member.email,
          role: member.role,
          organization_id: member.organization_id,
        }
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    console.error("[ACCEPT-INVITE] Error:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: "An error occurred processing your request" 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
