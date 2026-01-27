-- Fix overly permissive RLS policy for notifications inserts
DROP POLICY IF EXISTS "Service role can insert notifications" ON public.notifications;

-- Only service role and the emit_notification function (SECURITY DEFINER) can insert
-- The function already handles all inserts properly
CREATE POLICY "System can insert notifications" 
ON public.notifications 
FOR INSERT 
WITH CHECK (
  -- Service role bypass
  (auth.jwt() ->> 'role') = 'service_role'
);