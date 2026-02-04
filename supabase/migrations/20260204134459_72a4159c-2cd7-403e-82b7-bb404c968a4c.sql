-- Add explicit RESTRICTIVE policies to block anonymous access to profiles and payment_methods
-- This provides defense-in-depth even though existing policies already use TO authenticated

-- Block anonymous access to profiles table
CREATE POLICY "Block anonymous access to profiles"
ON public.profiles
AS RESTRICTIVE
FOR ALL
TO anon
USING (false)
WITH CHECK (false);

-- Block anonymous access to payment_methods table  
CREATE POLICY "Block anonymous access to payment_methods"
ON public.payment_methods
AS RESTRICTIVE
FOR ALL
TO anon
USING (false)
WITH CHECK (false);