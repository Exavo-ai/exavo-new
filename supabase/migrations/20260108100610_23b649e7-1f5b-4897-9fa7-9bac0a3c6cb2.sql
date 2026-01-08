-- Add client_notes column to projects table (nullable, backward-compatible)
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS client_notes text DEFAULT NULL;

ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS client_notes_updated_at timestamp with time zone DEFAULT NULL;