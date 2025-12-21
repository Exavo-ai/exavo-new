-- Drop the existing authenticated-only policy
DROP POLICY IF EXISTS "Authenticated users can view packages for active services" ON public.service_packages;

-- Create new policy allowing anyone (including guests) to view packages for active services
CREATE POLICY "Anyone can view packages for active services" 
ON public.service_packages 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM services 
  WHERE services.id = service_packages.service_id 
  AND services.active = true
));