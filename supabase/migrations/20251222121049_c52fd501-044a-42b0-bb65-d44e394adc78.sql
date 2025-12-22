-- Add stripe_price_id column to service_packages table
ALTER TABLE public.service_packages 
ADD COLUMN stripe_price_id text;

-- Add index for faster lookups
CREATE INDEX idx_service_packages_stripe_price_id ON public.service_packages(stripe_price_id) WHERE stripe_price_id IS NOT NULL;