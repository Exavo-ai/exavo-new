-- Strengthen admin_notes table protection with FORCE ROW LEVEL SECURITY
-- This ensures RLS cannot be bypassed even by service_role unless explicitly intended

-- Enable FORCE ROW LEVEL SECURITY on admin_notes
ALTER TABLE public.admin_notes FORCE ROW LEVEL SECURITY;

-- Add an explicit restrictive policy that blocks non-admins from all operations
-- This creates a defense-in-depth layer: even if a permissive policy exists,
-- this restrictive policy ensures only admins can access the table
CREATE POLICY "Block all non-admin access to admin_notes"
ON public.admin_notes
AS RESTRICTIVE
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Also block anonymous users explicitly (defense in depth)
CREATE POLICY "Block anonymous access to admin_notes"
ON public.admin_notes
AS RESTRICTIVE
FOR ALL
TO anon
USING (false)
WITH CHECK (false);