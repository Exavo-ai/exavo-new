-- Update the create_default_workspace_permissions function with expanded permissions
CREATE OR REPLACE FUNCTION public.create_default_workspace_permissions()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Admin default permissions (all enabled)
  INSERT INTO public.workspace_permissions (organization_id, role, permissions)
  VALUES (
    NEW.owner_id,
    'admin',
    '{
      "access_dashboard": true,
      "view_team": true,
      "manage_team": true,
      "invite_members": true,
      "remove_members": true,
      "access_files": true,
      "upload_files": true,
      "delete_files": true,
      "manage_tickets": true,
      "create_tickets": true,
      "manage_orders": true,
      "view_billing": false,
      "manage_billing": false,
      "access_settings": true,
      "change_workspace_info": true
    }'::jsonb
  ) ON CONFLICT (organization_id, role) DO UPDATE
  SET permissions = EXCLUDED.permissions;

  -- Member default permissions (collaboration focused)
  INSERT INTO public.workspace_permissions (organization_id, role, permissions)
  VALUES (
    NEW.owner_id,
    'member',
    '{
      "access_dashboard": true,
      "view_team": true,
      "manage_team": false,
      "invite_members": false,
      "remove_members": false,
      "access_files": true,
      "upload_files": true,
      "delete_files": false,
      "manage_tickets": false,
      "create_tickets": true,
      "manage_orders": false,
      "view_billing": false,
      "manage_billing": false,
      "access_settings": false,
      "change_workspace_info": false
    }'::jsonb
  ) ON CONFLICT (organization_id, role) DO UPDATE
  SET permissions = EXCLUDED.permissions;

  -- Viewer default permissions (read-only)
  INSERT INTO public.workspace_permissions (organization_id, role, permissions)
  VALUES (
    NEW.owner_id,
    'viewer',
    '{
      "access_dashboard": true,
      "view_team": true,
      "manage_team": false,
      "invite_members": false,
      "remove_members": false,
      "access_files": true,
      "upload_files": false,
      "delete_files": false,
      "manage_tickets": false,
      "create_tickets": false,
      "manage_orders": false,
      "view_billing": false,
      "manage_billing": false,
      "access_settings": false,
      "change_workspace_info": false
    }'::jsonb
  ) ON CONFLICT (organization_id, role) DO UPDATE
  SET permissions = EXCLUDED.permissions;

  RETURN NEW;
END;
$function$;

-- Update existing workspace permissions for all workspaces
DO $$
DECLARE
  workspace_record RECORD;
BEGIN
  FOR workspace_record IN SELECT owner_id FROM public.workspaces LOOP
    -- Update admin permissions
    INSERT INTO public.workspace_permissions (organization_id, role, permissions)
    VALUES (
      workspace_record.owner_id,
      'admin',
      '{
        "access_dashboard": true,
        "view_team": true,
        "manage_team": true,
        "invite_members": true,
        "remove_members": true,
        "access_files": true,
        "upload_files": true,
        "delete_files": true,
        "manage_tickets": true,
        "create_tickets": true,
        "manage_orders": true,
        "view_billing": false,
        "manage_billing": false,
        "access_settings": true,
        "change_workspace_info": true
      }'::jsonb
    ) ON CONFLICT (organization_id, role) DO UPDATE
    SET permissions = EXCLUDED.permissions;

    -- Update member permissions
    INSERT INTO public.workspace_permissions (organization_id, role, permissions)
    VALUES (
      workspace_record.owner_id,
      'member',
      '{
        "access_dashboard": true,
        "view_team": true,
        "manage_team": false,
        "invite_members": false,
        "remove_members": false,
        "access_files": true,
        "upload_files": true,
        "delete_files": false,
        "manage_tickets": false,
        "create_tickets": true,
        "manage_orders": false,
        "view_billing": false,
        "manage_billing": false,
        "access_settings": false,
        "change_workspace_info": false
      }'::jsonb
    ) ON CONFLICT (organization_id, role) DO UPDATE
    SET permissions = EXCLUDED.permissions;

    -- Update viewer permissions
    INSERT INTO public.workspace_permissions (organization_id, role, permissions)
    VALUES (
      workspace_record.owner_id,
      'viewer',
      '{
        "access_dashboard": true,
        "view_team": true,
        "manage_team": false,
        "invite_members": false,
        "remove_members": false,
        "access_files": true,
        "upload_files": false,
        "delete_files": false,
        "manage_tickets": false,
        "create_tickets": false,
        "manage_orders": false,
        "view_billing": false,
        "manage_billing": false,
        "access_settings": false,
        "change_workspace_info": false
      }'::jsonb
    ) ON CONFLICT (organization_id, role) DO UPDATE
    SET permissions = EXCLUDED.permissions;
  END LOOP;
END $$;