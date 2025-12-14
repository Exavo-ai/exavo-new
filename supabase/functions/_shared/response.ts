// Shared response utilities for consistent API responses

export const corsHeaders = {
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

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export function successResponse<T>(data: T, status = 200): Response {
  const body: ApiResponse<T> = {
    success: true,
    data,
  };
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// For REST compliance: 201 Created response
export function createdResponse<T>(data: T): Response {
  return successResponse(data, 201);
}

// For REST compliance: 200 OK with data for updates
export function updatedResponse<T>(data: T): Response {
  return successResponse(data, 200);
}

// For REST compliance: 200 OK with confirmation for deletes
export function deletedResponse(id?: string): Response {
  return successResponse({ 
    deleted: true, 
    ...(id && { id }),
    message: "Resource deleted successfully" 
  }, 200);
}

export function errorResponse(
  code: string,
  message: string,
  status: number,
  details?: unknown
): Response {
  const errorObj: { code: string; message: string; details?: unknown } = {
    code,
    message,
  };
  if (details !== undefined) {
    errorObj.details = details;
  }
  const body: ApiResponse = {
    success: false,
    error: errorObj,
  };
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// Common error responses
export const errors = {
  unauthorized: (message = "Authentication required") =>
    errorResponse("UNAUTHORIZED", message, 401),
  
  forbidden: (message = "Access denied") =>
    errorResponse("FORBIDDEN", message, 403),
  
  badRequest: (message: string, details?: unknown) =>
    errorResponse("BAD_REQUEST", message, 400, details),
  
  validationError: (message: string, details?: unknown) =>
    errorResponse("VALIDATION_ERROR", message, 422, details),
  
  notFound: (resource: string) =>
    errorResponse("NOT_FOUND", `${resource} not found`, 404),
  
  conflict: (message: string) =>
    errorResponse("CONFLICT", message, 409),
  
  tooManyRequests: (retryAfter?: number) => {
    const headers: Record<string, string> = {
      ...corsHeaders,
      "Content-Type": "application/json",
    };
    if (retryAfter) {
      headers["Retry-After"] = String(retryAfter);
    }
    return new Response(
      JSON.stringify({
        success: false,
        error: {
          code: "RATE_LIMIT_EXCEEDED",
          message: "Too many requests. Please try again later.",
          ...(retryAfter && { retryAfter }),
        },
      }),
      { status: 429, headers }
    );
  },
  
  internal: (message = "An internal error occurred") =>
    errorResponse("INTERNAL_ERROR", message, 500),
};

export function handleCors(req: Request): Response | null {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  return null;
}
