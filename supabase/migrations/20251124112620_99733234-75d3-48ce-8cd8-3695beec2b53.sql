-- Add RLS policy to allow admins to delete all appointments
CREATE POLICY "Admins can delete all appointments"
ON public.appointments
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));