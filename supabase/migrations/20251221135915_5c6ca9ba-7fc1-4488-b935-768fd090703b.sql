-- =============================================
-- APPOINTMENTS TABLE RLS HARDENING
-- =============================================

-- Drop existing policies (cleanup)
DROP POLICY IF EXISTS "Admins can manage all appointments" ON public.appointments;
DROP POLICY IF EXISTS "Admins can view all appointments" ON public.appointments;
DROP POLICY IF EXISTS "Block anonymous access to appointments" ON public.appointments;
DROP POLICY IF EXISTS "Users can create own appointments only" ON public.appointments;
DROP POLICY IF EXISTS "Users can delete own appointments only" ON public.appointments;
DROP POLICY IF EXISTS "Users can update own appointments only" ON public.appointments;
DROP POLICY IF EXISTS "Users can view own appointments only" ON public.appointments;

-- Ensure RLS is enabled and forced
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments FORCE ROW LEVEL SECURITY;

-- SELECT: Owner OR Admin only (anonymous blocked by TO authenticated)
CREATE POLICY "appointments_select_owner_or_admin" 
ON public.appointments 
FOR SELECT 
TO authenticated
USING (
  auth.uid() = user_id 
  OR public.has_role(auth.uid(), 'admin'::app_role)
);

-- INSERT: Owner only (user_id must match caller)
CREATE POLICY "appointments_insert_owner" 
ON public.appointments 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- UPDATE: Owner OR Admin only
CREATE POLICY "appointments_update_owner_or_admin" 
ON public.appointments 
FOR UPDATE 
TO authenticated
USING (
  auth.uid() = user_id 
  OR public.has_role(auth.uid(), 'admin'::app_role)
)
WITH CHECK (
  auth.uid() = user_id 
  OR public.has_role(auth.uid(), 'admin'::app_role)
);

-- DELETE: Owner OR Admin only
CREATE POLICY "appointments_delete_owner_or_admin" 
ON public.appointments 
FOR DELETE 
TO authenticated
USING (
  auth.uid() = user_id 
  OR public.has_role(auth.uid(), 'admin'::app_role)
);

-- =============================================
-- PROFILES TABLE RLS HARDENING
-- =============================================

-- Drop existing policies (cleanup)
DROP POLICY IF EXISTS "Admins can delete all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Block anonymous access to profiles" ON public.profiles;

-- Ensure RLS is enabled and forced
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles FORCE ROW LEVEL SECURITY;

-- SELECT: Owner OR Admin only (anonymous blocked by TO authenticated)
CREATE POLICY "profiles_select_owner_or_admin" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (
  auth.uid() = id 
  OR public.has_role(auth.uid(), 'admin'::app_role)
);

-- INSERT: Allow service role for trigger-based creation
CREATE POLICY "profiles_insert_service_role" 
ON public.profiles 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = id);

-- UPDATE: Owner OR Admin only
CREATE POLICY "profiles_update_owner_or_admin" 
ON public.profiles 
FOR UPDATE 
TO authenticated
USING (
  auth.uid() = id 
  OR public.has_role(auth.uid(), 'admin'::app_role)
)
WITH CHECK (
  auth.uid() = id 
  OR public.has_role(auth.uid(), 'admin'::app_role)
);

-- DELETE: Admin only (users cannot self-delete profiles)
CREATE POLICY "profiles_delete_admin_only" 
ON public.profiles 
FOR DELETE 
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));