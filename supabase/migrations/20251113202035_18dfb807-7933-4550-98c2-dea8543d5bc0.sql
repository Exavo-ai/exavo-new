-- Sync types
SELECT public._lovable_types_sync();

-- Create admin user with proper credentials
-- First, we need to insert the admin manually via trigger
-- We'll create the admin role mapping for admin@exavo.ai

-- Note: The actual user signup must be done through Supabase Auth UI
-- This migration prepares the role for when admin@exavo.ai signs up

-- Create a function to automatically assign admin role to admin@exavo.ai
CREATE OR REPLACE FUNCTION public.assign_admin_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if the new user's email is admin@exavo.ai
  IF NEW.email = 'admin@exavo.ai' THEN
    -- Delete any existing role for this user (in case of re-registration)
    DELETE FROM public.user_roles WHERE user_id = NEW.id;
    -- Assign admin role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin');
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger to auto-assign admin role
DROP TRIGGER IF EXISTS on_admin_user_created ON auth.users;
CREATE TRIGGER on_admin_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  WHEN (NEW.email = 'admin@exavo.ai')
  EXECUTE FUNCTION public.assign_admin_role();