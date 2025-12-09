-- Create a trigger to automatically create a workspace for new users
CREATE OR REPLACE FUNCTION public.handle_new_user_workspace()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Create a workspace for the new user
  INSERT INTO public.workspaces (owner_id, current_plan_product_id, subscription_status)
  VALUES (NEW.id, 'default', 'free');
  
  RETURN NEW;
END;
$$;

-- Create the trigger (runs after handle_new_user which creates profile and role)
DROP TRIGGER IF EXISTS on_auth_user_created_workspace ON auth.users;
CREATE TRIGGER on_auth_user_created_workspace
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_workspace();