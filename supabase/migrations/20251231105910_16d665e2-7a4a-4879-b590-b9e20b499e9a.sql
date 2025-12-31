-- Add package-level pricing fields for conditional pricing based on service payment_model
-- For one_time services: packages use 'price' as one_time_price
-- For subscription services: packages use 'build_cost' and 'monthly_fee'

ALTER TABLE public.service_packages 
ADD COLUMN IF NOT EXISTS build_cost numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS monthly_fee numeric DEFAULT 0;

-- Add comments for clarity
COMMENT ON COLUMN public.service_packages.price IS 'One-time price for packages under one_time payment model services';
COMMENT ON COLUMN public.service_packages.build_cost IS 'One-time build cost for packages under subscription payment model services';
COMMENT ON COLUMN public.service_packages.monthly_fee IS 'Monthly recurring fee for packages under subscription payment model services';