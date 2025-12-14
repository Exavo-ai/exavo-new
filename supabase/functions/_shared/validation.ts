import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

// Common validation schemas
export const emailSchema = z.string().trim().email("Invalid email address").max(255, "Email must be less than 255 characters");

export const uuidSchema = z.string().uuid("Invalid ID format");

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[0-9]/, "Password must contain at least one number");

export const fullNameSchema = z
  .string()
  .trim()
  .min(2, "Name must be at least 2 characters")
  .max(100, "Name must be less than 100 characters");

export const phoneSchema = z
  .string()
  .trim()
  .regex(/^[+]?[0-9\s\-()]+$/, "Invalid phone number format")
  .max(20, "Phone number must be less than 20 characters")
  .optional()
  .nullable();

export const roleSchema = z.enum(["Admin", "Member", "Viewer"], {
  errorMap: () => ({ message: "Role must be Admin, Member, or Viewer" }),
});

export const appRoleSchema = z.enum(["admin", "client"], {
  errorMap: () => ({ message: "Role must be admin or client" }),
});

export const statusSchema = z.enum(["active", "pending", "inactive"], {
  errorMap: () => ({ message: "Status must be active, pending, or inactive" }),
});

// Validate and parse request body
export async function validateBody<T>(
  req: Request,
  schema: z.ZodSchema<T>
): Promise<{ data: T; error: null } | { data: null; error: z.ZodError }> {
  try {
    const body = await req.json();
    const data = schema.parse(body);
    return { data, error: null };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { data: null, error };
    }
    throw error;
  }
}

// Format Zod errors for API response
export function formatZodError(error: z.ZodError): { message: string; details: unknown } {
  const firstError = error.errors[0];
  return {
    message: firstError?.message || "Validation error",
    details: error.errors.map((e) => ({
      field: e.path.join("."),
      message: e.message,
    })),
  };
}

export { z };
