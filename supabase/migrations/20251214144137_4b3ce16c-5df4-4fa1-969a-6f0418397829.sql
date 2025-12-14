-- =====================================================
-- PROFILES TABLE SECURITY HARDENING
-- =====================================================

-- 1. Create admin_audit_logs table for tracking admin access to sensitive data
CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id uuid NOT NULL,
  action text NOT NULL,
  target_table text NOT NULL,
  target_user_id uuid,
  details jsonb DEFAULT '{}'::jsonb,
  ip_address text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on audit logs - only admins can view
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_audit_logs FORCE ROW LEVEL SECURITY;

-- Only admins can view audit logs
CREATE POLICY "Admins can view audit logs"
ON public.admin_audit_logs
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Only service role can insert audit logs (from edge functions)
CREATE POLICY "Service role can insert audit logs"
ON public.admin_audit_logs
FOR INSERT
WITH CHECK ((auth.jwt() ->> 'role'::text) = 'service_role'::text);

-- 2. Drop existing profile DELETE policies to prevent data integrity issues
DROP POLICY IF EXISTS "Authenticated users can delete own profile" ON public.profiles;

-- 3. Add is_active column for soft delete instead of hard delete
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

-- 4. Create secure audit logging function for admin profile access
CREATE OR REPLACE FUNCTION public.log_admin_profile_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only log if admin is accessing someone else's profile
  IF public.has_role(auth.uid(), 'admin'::app_role) AND NEW.id != auth.uid() THEN
    INSERT INTO public.admin_audit_logs (admin_user_id, action, target_table, target_user_id, details)
    VALUES (
      auth.uid(),
      TG_OP,
      'profiles',
      NEW.id,
      jsonb_build_object('accessed_at', now())
    );
  END IF;
  RETURN NEW;
END;
$$;

-- 5. Revoke public execute on has_role function (only authenticated users should use it)
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM public;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;

-- 6. Create a more restrictive version of has_role that validates caller
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- Only allow checking own role or if service_role
  SELECT CASE 
    WHEN _user_id = auth.uid() OR (auth.jwt() ->> 'role') = 'service_role' THEN
      EXISTS (
        SELECT 1
        FROM public.user_roles
        WHERE user_id = _user_id
          AND role = _role
      )
    ELSE
      -- For checking other users' roles (needed for admin policies), 
      -- only return true if the caller is already an admin
      EXISTS (
        SELECT 1
        FROM public.user_roles AS ur
        WHERE ur.user_id = auth.uid()
          AND ur.role = 'admin'::app_role
      ) AND EXISTS (
        SELECT 1
        FROM public.user_roles
        WHERE user_id = _user_id
          AND role = _role
      )
  END
$$;

-- 7. Add index for audit log queries
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_admin_user_id ON public.admin_audit_logs(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_target_user_id ON public.admin_audit_logs(target_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_created_at ON public.admin_audit_logs(created_at DESC);