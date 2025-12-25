-- Remove the foreign key constraint on payments.user_id that references auth.users
ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_user_id_fkey;