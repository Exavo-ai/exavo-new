-- Add new columns to orders table for simple order form
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS title text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS short_message text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS long_message text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS multiselect_options jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS links jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS attachments jsonb DEFAULT '[]'::jsonb;