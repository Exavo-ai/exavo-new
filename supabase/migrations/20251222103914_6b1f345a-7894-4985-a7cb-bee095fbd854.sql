-- Add lead_id column to projects table to track consultation-to-project conversions
ALTER TABLE public.projects 
ADD COLUMN lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL;

-- Add unique constraint to prevent duplicate conversions
CREATE UNIQUE INDEX idx_projects_lead_id_unique ON public.projects (lead_id) WHERE lead_id IS NOT NULL;

-- Add index for faster lookups
CREATE INDEX idx_projects_lead_id ON public.projects (lead_id) WHERE lead_id IS NOT NULL;