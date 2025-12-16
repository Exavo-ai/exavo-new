-- Ensure RLS is forced even for table owners
ALTER TABLE public.appointments FORCE ROW LEVEL SECURITY;
ALTER TABLE public.profiles FORCE ROW LEVEL SECURITY;

-- Block anonymous access to appointments table
CREATE POLICY "Block anonymous access to appointments"
ON public.appointments
AS RESTRICTIVE
FOR ALL
TO anon
USING (false);

-- Block anonymous access to profiles table
CREATE POLICY "Block anonymous access to profiles"
ON public.profiles
AS RESTRICTIVE
FOR ALL
TO anon
USING (false);