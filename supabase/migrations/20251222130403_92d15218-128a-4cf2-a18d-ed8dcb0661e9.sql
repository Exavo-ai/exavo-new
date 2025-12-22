-- Add missing columns to payments table for complete Stripe integration
ALTER TABLE public.payments 
ADD COLUMN IF NOT EXISTS service_id uuid REFERENCES public.services(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS package_id uuid REFERENCES public.service_packages(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS stripe_invoice_id text,
ADD COLUMN IF NOT EXISTS stripe_receipt_url text,
ADD COLUMN IF NOT EXISTS customer_email text,
ADD COLUMN IF NOT EXISTS customer_name text,
ADD COLUMN IF NOT EXISTS description text;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON public.payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_service_id ON public.payments(service_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON public.payments(created_at DESC);

-- Update RLS policy to allow service role to insert payments (for webhook)
DROP POLICY IF EXISTS "Service role can insert payments" ON public.payments;
CREATE POLICY "Service role can insert payments" ON public.payments
FOR INSERT WITH CHECK ((auth.jwt() ->> 'role'::text) = 'service_role'::text);

-- Update RLS policy to allow service role to update payments (for webhook)
DROP POLICY IF EXISTS "Service role can update payments" ON public.payments;
CREATE POLICY "Service role can update payments" ON public.payments
FOR UPDATE USING ((auth.jwt() ->> 'role'::text) = 'service_role'::text);