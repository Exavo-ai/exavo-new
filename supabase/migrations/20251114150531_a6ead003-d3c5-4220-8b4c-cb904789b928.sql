-- Fix duplicate roles for admin user
-- Delete the 'client' role for admin@exavo.ai, keeping only 'admin'
DELETE FROM public.user_roles
WHERE user_id = (
  SELECT id FROM auth.users WHERE email = 'admin@exavo.ai'
)
AND role = 'client';

-- Ensure the admin role exists for admin@exavo.ai
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role
FROM auth.users
WHERE email = 'admin@exavo.ai'
ON CONFLICT (user_id, role) DO NOTHING;