-- Create function to automatically create project when appointment is confirmed
CREATE OR REPLACE FUNCTION public.create_project_from_appointment()
RETURNS TRIGGER AS $$
DECLARE
  service_name TEXT;
  project_exists BOOLEAN;
BEGIN
  -- Only trigger when status becomes 'confirmed'
  IF NEW.status = 'confirmed' AND (OLD IS NULL OR OLD.status != 'confirmed') THEN
    -- Check if project already exists for this appointment
    SELECT EXISTS(
      SELECT 1 FROM public.projects WHERE appointment_id = NEW.id
    ) INTO project_exists;
    
    IF NOT project_exists THEN
      -- Get service name for project title
      SELECT name INTO service_name 
      FROM public.services 
      WHERE id = NEW.service_id;
      
      -- Create the project
      INSERT INTO public.projects (
        user_id,
        workspace_id,
        client_id,
        service_id,
        appointment_id,
        name,
        title,
        description,
        status,
        progress,
        start_date
      ) VALUES (
        NEW.user_id,
        NEW.user_id,
        NEW.user_id,
        NEW.service_id,
        NEW.id,
        COALESCE(service_name, 'New Project'),
        COALESCE(service_name, 'New Project'),
        NEW.project_description,
        'active',
        0,
        CURRENT_DATE
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger on appointments table
DROP TRIGGER IF EXISTS on_appointment_confirmed ON public.appointments;
CREATE TRIGGER on_appointment_confirmed
  AFTER INSERT OR UPDATE OF status ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.create_project_from_appointment();