-- Create a public view for reviews that excludes sensitive client_id
CREATE VIEW public.reviews_public
WITH (security_invoker = on) AS
SELECT
  id,
  project_id,
  delivery_id,
  service_id,
  service_type,
  client_name,
  client_company,
  rating,
  comment,
  status,
  show_on_home,
  priority,
  created_at,
  updated_at
FROM public.reviews
WHERE status = 'approved';

-- Drop the permissive anonymous SELECT policy that exposes client_id
DROP POLICY "Anyone can view approved reviews" ON public.reviews;

-- Replace with a policy that only allows authenticated users to view approved reviews
-- (admins already have full access via the admin policy, clients via their own policy)
CREATE POLICY "Authenticated users can view approved reviews"
ON public.reviews
FOR SELECT
TO authenticated
USING (status = 'approved');