-- Block anonymous/public access to profiles
CREATE POLICY "anon_blocked"
ON public.profiles
FOR SELECT
TO anon
USING (false);

-- Ensure authenticated users can only view their own profile (drop existing if any conflict)
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;

CREATE POLICY "user_can_view_own_profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);