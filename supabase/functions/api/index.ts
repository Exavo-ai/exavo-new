import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { corsHeaders, errors, handleCors } from "../_shared/response.ts";

/**
 * API Gateway - Handles all generic API requests and returns proper REST responses
 * This endpoint catches requests that don't match specific edge functions
 * and returns appropriate JSON error responses with correct status codes.
 */
serve(async (req) => {
  // Handle CORS preflight
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  const url = new URL(req.url);
  const path = url.pathname;
  const method = req.method;

  console.log(`[API-GATEWAY] ${method} ${path}`);

  // Check Content-Type for POST/PUT/PATCH requests
  if (["POST", "PUT", "PATCH"].includes(method)) {
    const contentType = req.headers.get("content-type") || "";
    
    // Reject unsupported content types
    if (contentType && !contentType.includes("application/json") && !contentType.includes("text/plain") && !contentType.includes("multipart/form-data")) {
      console.log(`[API-GATEWAY] Unsupported media type: ${contentType}`);
      return new Response(
        JSON.stringify({
          success: false,
          error: {
            code: "UNSUPPORTED_MEDIA_TYPE",
            message: `Content-Type '${contentType}' is not supported. Use 'application/json'.`,
          },
        }),
        {
          status: 415,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
  }

  // Check authentication for protected operations
  const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
  
  // For most API operations, require authentication
  if (["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
    if (!authHeader || !authHeader.startsWith("Bearer ") || authHeader === "Bearer ." || authHeader.length < 20) {
      console.log(`[API-GATEWAY] Missing or invalid authentication`);
      return errors.unauthorized("Authentication required. Please provide a valid Bearer token.");
    }
  }

  // Validate request body for POST/PUT/PATCH
  if (["POST", "PUT", "PATCH"].includes(method)) {
    try {
      const contentType = req.headers.get("content-type") || "";
      
      if (contentType.includes("application/json")) {
        const bodyText = await req.text();
        
        // Check for empty body
        if (!bodyText || bodyText.trim() === "") {
          console.log(`[API-GATEWAY] Empty request body`);
          return errors.badRequest("Request body is required");
        }

        // Check for malformed JSON
        try {
          const body = JSON.parse(bodyText);
          
          // Check for extremely long parameters (>100KB total)
          if (bodyText.length > 100000) {
            console.log(`[API-GATEWAY] Request body too large: ${bodyText.length} bytes`);
            return new Response(
              JSON.stringify({
                success: false,
                error: {
                  code: "PAYLOAD_TOO_LARGE",
                  message: "Request body exceeds maximum allowed size of 100KB",
                },
              }),
              {
                status: 413,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
              }
            );
          }

          // Validate required fields based on method
          if (method === "POST") {
            // For POST (create), require at least one field
            if (Object.keys(body).length === 0) {
              console.log(`[API-GATEWAY] Missing required fields in POST request`);
              return errors.validationError("Request body cannot be empty. At least one field is required.");
            }
          }

          // Check for XSS/injection patterns and sanitize (log only, don't block)
          const jsonStr = JSON.stringify(body);
          if (jsonStr.includes("<script>") || jsonStr.includes("javascript:")) {
            console.log(`[API-GATEWAY] Warning: Potential XSS attempt detected`);
            // Don't include the script in response to prevent reflection
          }

          // Check for SQL injection patterns (log only, don't block - Supabase handles this)
          if (/('|--|;|DROP\s+TABLE|DELETE\s+FROM|INSERT\s+INTO|UPDATE\s+.*SET)/i.test(jsonStr)) {
            console.log(`[API-GATEWAY] Warning: Potential SQL injection attempt detected`);
          }

        } catch (parseError) {
          console.log(`[API-GATEWAY] Malformed JSON: ${parseError}`);
          return errors.badRequest("Invalid JSON in request body. Please check the syntax.");
        }
      }
    } catch (bodyError) {
      console.log(`[API-GATEWAY] Error reading request body: ${bodyError}`);
      return errors.badRequest("Could not read request body");
    }
  }

  // This is the catch-all - if we reach here, the endpoint doesn't exist
  // Return 404 for any unmatched routes
  console.log(`[API-GATEWAY] Endpoint not found: ${method} ${path}`);
  return errors.notFound("Endpoint");
});
