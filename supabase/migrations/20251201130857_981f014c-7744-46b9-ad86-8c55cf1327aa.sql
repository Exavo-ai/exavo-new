-- Add new columns to service_packages table
ALTER TABLE public.service_packages
ADD COLUMN IF NOT EXISTS description text,
ADD COLUMN IF NOT EXISTS images jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS videos jsonb DEFAULT '[]'::jsonb;

-- Add new columns to appointments table for enhanced booking
ALTER TABLE public.appointments
ADD COLUMN IF NOT EXISTS package_id uuid REFERENCES public.service_packages(id),
ADD COLUMN IF NOT EXISTS company text,
ADD COLUMN IF NOT EXISTS country text,
ADD COLUMN IF NOT EXISTS project_description text,
ADD COLUMN IF NOT EXISTS preferred_communication text,
ADD COLUMN IF NOT EXISTS preferred_timeline text,
ADD COLUMN IF NOT EXISTS budget_range text;

-- Update service_packages RLS policies to allow image/video data
-- (existing policies should already cover this, but ensuring access)

-- Create index for package_id foreign key
CREATE INDEX IF NOT EXISTS idx_appointments_package_id ON public.appointments(package_id);