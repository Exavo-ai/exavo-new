import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

export interface AuthResult {
  user: { id: string; email: string };
  error: null;
}

export interface AuthError {
  user: null;
  error: { code: string; message: string; status: number };
}

export async function authenticateRequest(
  req: Request
): Promise<AuthResult | AuthError> {
  const authHeader = req.headers.get("Authorization") || req.headers.get("authorization");

  if (!authHeader) {
    return {
      user: null,
      error: {
        code: "MISSING_AUTH_HEADER",
        message: "Authorization header is required",
        status: 401,
      },
    };
  }

  const token = authHeader.replace("Bearer ", "");
  
  if (!token || token === authHeader) {
    return {
      user: null,
      error: {
        code: "INVALID_AUTH_FORMAT",
        message: "Invalid authorization header format",
        status: 401,
      },
    };
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  const { data: { user }, error } = await supabaseClient.auth.getUser(token);

  if (error || !user) {
    return {
      user: null,
      error: {
        code: "INVALID_TOKEN",
        message: "Invalid or expired authentication token",
        status: 401,
      },
    };
  }

  return {
    user: { id: user.id, email: user.email || "" },
    error: null,
  };
}

export async function requireAdminRole(userId: string): Promise<{ isAdmin: boolean; error?: { code: string; message: string; status: number } }> {
  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  const { data: isAdmin, error } = await supabaseClient.rpc("has_role", {
    _user_id: userId,
    _role: "admin",
  });

  if (error) {
    return {
      isAdmin: false,
      error: {
        code: "ROLE_CHECK_FAILED",
        message: "Failed to verify user role",
        status: 500,
      },
    };
  }

  if (!isAdmin) {
    return {
      isAdmin: false,
      error: {
        code: "ADMIN_REQUIRED",
        message: "Admin access required",
        status: 403,
      },
    };
  }

  return { isAdmin: true };
}

export function getServiceClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );
}

export function getAnonClient(authHeader?: string) {
  const options = authHeader
    ? { global: { headers: { Authorization: authHeader } } }
    : undefined;
  
  return createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    options
  );
}
