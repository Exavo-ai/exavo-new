-- Add unique constraint to ensure only one project per booking (appointment)
CREATE UNIQUE INDEX IF NOT EXISTS idx_projects_appointment_id_unique 
ON public.projects (appointment_id) 
WHERE appointment_id IS NOT NULL;