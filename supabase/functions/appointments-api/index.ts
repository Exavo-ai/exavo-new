import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { corsHeaders, successResponse, errors, handleCors, createdResponse, deletedResponse } from "../_shared/response.ts";
import { z, validateBody, formatZodError, uuidSchema } from "../_shared/validation.ts";
import { checkRateLimit, createRateLimitKey, RateLimitPresets } from "../_shared/rate-limit.ts";

// Track failed access attempts for monitoring
const failedAccessAttempts = new Map<string, { count: number; lastAttempt: number }>();
const FAILED_ATTEMPT_THRESHOLD = 5;
const FAILED_ATTEMPT_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

function logSecurityEvent(type: string, details: Record<string, unknown>) {
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    type: `SECURITY_EVENT:${type}`,
    ...details,
  }));
}

function trackFailedAttempt(identifier: string, userId: string, action: string) {
  const now = Date.now();
  const entry = failedAccessAttempts.get(identifier);
  
  if (!entry || now - entry.lastAttempt > FAILED_ATTEMPT_WINDOW_MS) {
    failedAccessAttempts.set(identifier, { count: 1, lastAttempt: now });
  } else {
    entry.count++;
    entry.lastAttempt = now;
    
    if (entry.count >= FAILED_ATTEMPT_THRESHOLD) {
      logSecurityEvent("REPEATED_FORBIDDEN_ACCESS", {
        identifier,
        userId,
        action,
        attemptCount: entry.count,
        severity: "HIGH",
        message: "Possible enumeration attack detected",
      });
    }
  }
}

// Validation schemas
const createAppointmentSchema = z.object({
  service_id: uuidSchema.optional(),
  package_id: uuidSchema.optional(),
  full_name: z.string().trim().min(1, "Full name is required").max(100, "Name too long"),
  email: z.string().trim().email("Invalid email").max(255, "Email too long"),
  phone: z.string().trim().min(1, "Phone is required").max(50, "Phone too long"),
  appointment_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)"),
  appointment_time: z.string().min(1, "Appointment time is required").max(20, "Time too long"),
  company: z.string().trim().max(200, "Company name too long").optional(),
  country: z.string().trim().max(100, "Country too long").optional(),
  notes: z.string().trim().max(2000, "Notes too long").optional(),
  project_description: z.string().trim().max(5000, "Description too long").optional(),
  preferred_communication: z.string().max(50).optional(),
  preferred_timeline: z.string().max(100).optional(),
  budget_range: z.string().max(100).optional(),
});

const updateAppointmentSchema = z.object({
  appointment_id: uuidSchema,
  updates: z.object({
    status: z.enum(["pending", "confirmed", "completed", "cancelled"]).optional(),
    notes: z.string().trim().max(2000, "Notes too long").optional(),
    project_progress: z.number().int().min(0).max(100).optional(),
    project_status: z.string().max(100).optional(),
  }),
});

const getAppointmentSchema = z.object({
  appointment_id: uuidSchema,
});

serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    // Rate limiting - stricter for appointments (sensitive data)
    const rateLimitKey = createRateLimitKey(req, "appointments");
    const rateCheck = checkRateLimit(rateLimitKey, {
      maxRequests: 20,
      windowMs: 60 * 1000, // 20 requests per minute
      prefix: "appointments",
    });
    
    if (!rateCheck.allowed) {
      logSecurityEvent("RATE_LIMIT_EXCEEDED", {
        key: rateLimitKey,
        endpoint: "appointments-api",
      });
      return errors.tooManyRequests(rateCheck.retryAfter);
    }

    // Require authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return errors.unauthorized("Authentication required");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    const token = authHeader.replace("Bearer ", "");
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    // Verify user
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      return errors.unauthorized("Invalid or expired token");
    }

    const clientIP = createRateLimitKey(req);
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

    // Route based on method
    const url = new URL(req.url);
    const pathParts = url.pathname.split("/").filter(Boolean);
    const action = pathParts[pathParts.length - 1] || "list";

    // GET - List user's appointments or get single appointment
    if (req.method === "GET") {
      const appointmentId = url.searchParams.get("id");
      
      if (appointmentId) {
        // Get single appointment - ONLY user's own
        const { data: appointment, error } = await supabaseAdmin
          .from("appointments")
          .select("*")
          .eq("id", appointmentId)
          .eq("user_id", user.id) // CRITICAL: Always filter by authenticated user
          .maybeSingle();

        if (error) {
          console.error("[APPOINTMENTS-API] Get error:", error);
          return errors.internal("Failed to retrieve appointment");
        }

        if (!appointment) {
          // Log potential enumeration attempt - don't reveal if appointment exists
          trackFailedAttempt(clientIP, user.id, "GET");
          logSecurityEvent("APPOINTMENT_ACCESS_DENIED", {
            userId: user.id,
            attemptedId: appointmentId,
            clientIP,
          });
          // Return generic error - don't reveal if appointment exists for another user
          return errors.notFound("Appointment");
        }

        return successResponse({ appointment });
      }

      // List all user's appointments - NEVER accepts user_id from client
      const { data: appointments, error } = await supabaseAdmin
        .from("appointments")
        .select("*")
        .eq("user_id", user.id) // CRITICAL: Always use auth.uid(), never from request
        .order("appointment_date", { ascending: false });

      if (error) {
        console.error("[APPOINTMENTS-API] List error:", error);
        return errors.internal("Failed to retrieve appointments");
      }

      return successResponse({ appointments });
    }

    // POST - Create appointment
    if (req.method === "POST") {
      const { data: validatedData, error: validationError } = await validateBody(req, createAppointmentSchema);
      if (validationError) {
        const formatted = formatZodError(validationError);
        return errors.validationError(formatted.message, formatted.details);
      }

      const { data: appointment, error } = await supabaseAdmin
        .from("appointments")
        .insert({
          ...validatedData,
          user_id: user.id, // CRITICAL: Always set from authenticated user
          status: "pending",
        })
        .select()
        .single();

      if (error) {
        console.error("[APPOINTMENTS-API] Create error:", error);
        return errors.internal("Failed to create appointment");
      }

      logSecurityEvent("APPOINTMENT_CREATED", {
        userId: user.id,
        appointmentId: appointment.id,
      });

      return createdResponse({ appointment });
    }

    // PUT/PATCH - Update appointment
    if (req.method === "PUT" || req.method === "PATCH") {
      const { data: validatedData, error: validationError } = await validateBody(req, updateAppointmentSchema);
      if (validationError) {
        const formatted = formatZodError(validationError);
        return errors.validationError(formatted.message, formatted.details);
      }

      // First verify ownership - CRITICAL security check
      const { data: existingAppointment } = await supabaseAdmin
        .from("appointments")
        .select("id, user_id")
        .eq("id", validatedData.appointment_id)
        .eq("user_id", user.id) // CRITICAL: Only allow updating own appointments
        .maybeSingle();

      if (!existingAppointment) {
        trackFailedAttempt(clientIP, user.id, "UPDATE");
        logSecurityEvent("APPOINTMENT_UPDATE_DENIED", {
          userId: user.id,
          attemptedId: validatedData.appointment_id,
          clientIP,
        });
        return errors.notFound("Appointment");
      }

      const { data: appointment, error } = await supabaseAdmin
        .from("appointments")
        .update(validatedData.updates)
        .eq("id", validatedData.appointment_id)
        .eq("user_id", user.id) // Double-check ownership
        .select()
        .single();

      if (error) {
        console.error("[APPOINTMENTS-API] Update error:", error);
        return errors.internal("Failed to update appointment");
      }

      return successResponse({ appointment });
    }

    // DELETE - Cancel appointment
    if (req.method === "DELETE") {
      const appointmentId = url.searchParams.get("id");
      
      if (!appointmentId) {
        return errors.badRequest("Appointment ID is required");
      }

      // Verify ownership before delete
      const { data: existingAppointment } = await supabaseAdmin
        .from("appointments")
        .select("id, user_id")
        .eq("id", appointmentId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (!existingAppointment) {
        trackFailedAttempt(clientIP, user.id, "DELETE");
        logSecurityEvent("APPOINTMENT_DELETE_DENIED", {
          userId: user.id,
          attemptedId: appointmentId,
          clientIP,
        });
        return errors.notFound("Appointment");
      }

      const { error } = await supabaseAdmin
        .from("appointments")
        .delete()
        .eq("id", appointmentId)
        .eq("user_id", user.id);

      if (error) {
        console.error("[APPOINTMENTS-API] Delete error:", error);
        return errors.internal("Failed to delete appointment");
      }

      logSecurityEvent("APPOINTMENT_DELETED", {
        userId: user.id,
        appointmentId,
      });

      return deletedResponse(appointmentId);
    }

    return errors.badRequest(`Method ${req.method} not allowed`);
  } catch (error) {
    console.error("[APPOINTMENTS-API] Unexpected error:", error);
    return errors.internal("An unexpected error occurred");
  }
});
