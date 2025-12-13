-- Allow anonymous users to view active services
CREATE POLICY "Anyone can view active services"
ON public.services
FOR SELECT
TO anon
USING (active = true);

-- Allow anonymous users to view categories  
CREATE POLICY "Anyone can view categories"
ON public.categories
FOR SELECT
TO anon
USING (true);