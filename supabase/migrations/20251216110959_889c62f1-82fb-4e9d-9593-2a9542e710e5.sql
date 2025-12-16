-- Strengthen orders table RLS to prevent user_id manipulation

-- Ensure RLS is forced even for table owners
ALTER TABLE public.orders FORCE ROW LEVEL SECURITY;

-- Drop existing insert policy that may not be strict enough
DROP POLICY IF EXISTS "Users can create their own orders" ON public.orders;

-- Create stricter insert policy ensuring user_id MUST equal authenticated user
CREATE POLICY "Users can only create orders for themselves"
ON public.orders
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Drop existing update policy
DROP POLICY IF EXISTS "Users can update their own orders" ON public.orders;

-- Create update policy that prevents changing user_id field
-- Users can only update their own orders AND cannot change the user_id
CREATE POLICY "Users can update their own orders without changing ownership"
ON public.orders
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);