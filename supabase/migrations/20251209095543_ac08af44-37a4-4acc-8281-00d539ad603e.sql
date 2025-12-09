-- Fix payments table RLS policies - restrict to service role only
DROP POLICY IF EXISTS "System can insert payments" ON public.payments;
DROP POLICY IF EXISTS "System can update payments" ON public.payments;

CREATE POLICY "Service role can insert payments" 
ON public.payments 
FOR INSERT 
WITH CHECK ((auth.jwt() ->> 'role') = 'service_role');

CREATE POLICY "Service role can update payments" 
ON public.payments 
FOR UPDATE 
USING ((auth.jwt() ->> 'role') = 'service_role');

-- Fix notifications table RLS policy - restrict to service role only
DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;

CREATE POLICY "Service role can insert notifications" 
ON public.notifications 
FOR INSERT 
WITH CHECK ((auth.jwt() ->> 'role') = 'service_role');