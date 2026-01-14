-- Add images column to services table for multi-image support
-- This is additive only - does NOT modify existing image_url column
ALTER TABLE public.services 
ADD COLUMN IF NOT EXISTS images jsonb DEFAULT '[]'::jsonb;