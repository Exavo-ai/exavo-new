-- Add optional slug column to services table (nullable, no constraints)
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS slug text;