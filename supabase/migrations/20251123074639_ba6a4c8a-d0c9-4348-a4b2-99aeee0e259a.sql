-- Add category column to services table
ALTER TABLE public.services 
ADD COLUMN category text NOT NULL DEFAULT 'ai';

-- Add a check constraint to ensure valid categories
ALTER TABLE public.services
ADD CONSTRAINT services_category_check 
CHECK (category IN ('ai', 'automation', 'analytics', 'marketing', 'content'));