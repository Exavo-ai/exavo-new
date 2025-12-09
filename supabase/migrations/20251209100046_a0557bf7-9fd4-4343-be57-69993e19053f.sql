-- Fix workspaces table INSERT policy - restrict to service role only
DROP POLICY IF EXISTS "System can insert workspaces" ON public.workspaces;

CREATE POLICY "Service role can insert workspaces" 
ON public.workspaces 
FOR INSERT 
WITH CHECK ((auth.jwt() ->> 'role') = 'service_role');