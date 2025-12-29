-- Remove the trigger that creates projects on appointment confirmation
-- Since projects are now created immediately at purchase time
DROP TRIGGER IF EXISTS on_appointment_confirmed ON public.appointments;

-- Update the function to only update existing projects (not create new ones)
CREATE OR REPLACE FUNCTION public.create_project_from_appointment()
RETURNS TRIGGER AS $$
BEGIN
  -- Only trigger when status becomes 'confirmed'
  -- Now we only UPDATE the existing project status to 'active' (don't create new)
  IF NEW.status = 'confirmed' AND (OLD IS NULL OR OLD.status != 'confirmed') THEN
    UPDATE public.projects 
    SET status = 'active', updated_at = now()
    WHERE appointment_id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Re-create the trigger with the updated function
CREATE TRIGGER on_appointment_confirmed
  AFTER UPDATE OF status ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.create_project_from_appointment();