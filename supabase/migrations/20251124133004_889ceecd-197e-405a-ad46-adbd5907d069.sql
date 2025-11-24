-- Create workspace_permissions table to store role-based permissions
CREATE TABLE IF NOT EXISTS public.workspace_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'member', 'viewer')),
  permissions JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(organization_id, role)
);

-- Enable RLS
ALTER TABLE public.workspace_permissions ENABLE ROW LEVEL SECURITY;

-- Workspace owners can view their permissions
CREATE POLICY "Workspace owners can view their permissions"
ON public.workspace_permissions
FOR SELECT
USING (auth.uid() = organization_id);

-- Workspace owners can manage their permissions
CREATE POLICY "Workspace owners can manage their permissions"
ON public.workspace_permissions
FOR ALL
USING (auth.uid() = organization_id);

-- Add trigger for updated_at
CREATE TRIGGER update_workspace_permissions_updated_at
  BEFORE UPDATE ON public.workspace_permissions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default permissions for new workspaces
CREATE OR REPLACE FUNCTION public.create_default_workspace_permissions()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Admin default permissions
  INSERT INTO public.workspace_permissions (organization_id, role, permissions)
  VALUES (
    NEW.owner_id,
    'admin',
    '{"manage_team": true, "access_settings": true, "delete_items": true, "create_items": true, "view_analytics": true, "access_advanced_tools": true}'::jsonb
  ) ON CONFLICT (organization_id, role) DO NOTHING;

  -- Member default permissions
  INSERT INTO public.workspace_permissions (organization_id, role, permissions)
  VALUES (
    NEW.owner_id,
    'member',
    '{"manage_team": false, "access_settings": false, "delete_items": false, "create_items": true, "view_analytics": false, "access_advanced_tools": false}'::jsonb
  ) ON CONFLICT (organization_id, role) DO NOTHING;

  -- Viewer default permissions
  INSERT INTO public.workspace_permissions (organization_id, role, permissions)
  VALUES (
    NEW.owner_id,
    'viewer',
    '{"manage_team": false, "access_settings": false, "delete_items": false, "create_items": false, "view_analytics": false, "access_advanced_tools": false}'::jsonb
  ) ON CONFLICT (organization_id, role) DO NOTHING;

  RETURN NEW;
END;
$$;

-- Trigger to create default permissions when workspace is created
CREATE TRIGGER create_workspace_permissions_trigger
  AFTER INSERT ON public.workspaces
  FOR EACH ROW
  EXECUTE FUNCTION public.create_default_workspace_permissions();