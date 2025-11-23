-- Update default currency from EGP to USD in services table
ALTER TABLE public.services ALTER COLUMN currency SET DEFAULT 'USD';

-- Update default currency from EGP to USD in payments table
ALTER TABLE public.payments ALTER COLUMN currency SET DEFAULT 'USD';