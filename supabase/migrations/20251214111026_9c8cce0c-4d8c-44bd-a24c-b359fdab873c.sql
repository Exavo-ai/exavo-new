-- Harden appointments table RLS policies
-- Drop existing policies and recreate with explicit TO authenticated requirement

-- Drop all existing appointment policies
DROP POLICY IF EXISTS "Authenticated users can view own appointments" ON public.appointments;
DROP POLICY IF EXISTS "Authenticated users can create own appointments" ON public.appointments;
DROP POLICY IF EXISTS "Authenticated users can update own appointments" ON public.appointments;
DROP POLICY IF EXISTS "Authenticated users can delete own appointments" ON public.appointments;
DROP POLICY IF EXISTS "Admins can view all appointments" ON public.appointments;
DROP POLICY IF EXISTS "Admins can manage all appointments" ON public.appointments;
DROP POLICY IF EXISTS "Users can view their own appointments" ON public.appointments;
DROP POLICY IF EXISTS "Users can create their own appointments" ON public.appointments;
DROP POLICY IF EXISTS "Users can update their own appointments" ON public.appointments;
DROP POLICY IF EXISTS "Users can delete their own appointments" ON public.appointments;

-- Ensure RLS is enabled (should already be, but confirm)
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

-- Force RLS even for table owners
ALTER TABLE public.appointments FORCE ROW LEVEL SECURITY;

-- Create new hardened policies with explicit TO authenticated
-- SELECT: User can only see their own appointments
CREATE POLICY "Users can view own appointments only"
ON public.appointments
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- INSERT: User can only create appointments for themselves
-- Both USING and WITH CHECK ensure ownership
CREATE POLICY "Users can create own appointments only"
ON public.appointments
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- UPDATE: User can only update their own appointments
-- Both USING and WITH CHECK ensure they can't change user_id
CREATE POLICY "Users can update own appointments only"
ON public.appointments
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- DELETE: User can only delete their own appointments
CREATE POLICY "Users can delete own appointments only"
ON public.appointments
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Admin policies - using has_role function for secure role check
CREATE POLICY "Admins can view all appointments"
ON public.appointments
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage all appointments"
ON public.appointments
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));