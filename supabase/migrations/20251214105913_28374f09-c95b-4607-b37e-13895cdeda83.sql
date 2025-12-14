-- Fix activity_logs admin policy to use authenticated role instead of public
-- Drop the existing policy that defaults to public
DROP POLICY IF EXISTS "Admins can view all activity logs" ON public.activity_logs;

-- Recreate with explicit TO authenticated requirement
CREATE POLICY "Admins can view all activity logs"
ON public.activity_logs
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));