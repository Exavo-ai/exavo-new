import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useTeam } from "@/contexts/TeamContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Shield, Users, Eye } from "lucide-react";

interface RolePermissions {
  access_dashboard: boolean;
  view_team: boolean;
  manage_team: boolean;
  invite_members: boolean;
  remove_members: boolean;
  access_files: boolean;
  upload_files: boolean;
  delete_files: boolean;
  manage_tickets: boolean;
  create_tickets: boolean;
  manage_orders: boolean;
  view_billing: boolean;
  manage_billing: boolean;
  access_settings: boolean;
  change_workspace_info: boolean;
}

const permissionLabels: Record<keyof RolePermissions, string> = {
  access_dashboard: "Access Dashboard",
  view_team: "View Team",
  manage_team: "Manage Team Members",
  invite_members: "Invite Members",
  remove_members: "Remove Members",
  access_files: "Access Files",
  upload_files: "Upload Files",
  delete_files: "Delete Files",
  manage_tickets: "Manage Tickets",
  create_tickets: "Create Service Requests",
  manage_orders: "Manage Orders",
  view_billing: "View Billing",
  manage_billing: "Manage Billing",
  access_settings: "Access Settings",
  change_workspace_info: "Change Workspace Info",
};

const permissionDescriptions: Record<keyof RolePermissions, string> = {
  access_dashboard: "Can view the dashboard and metrics",
  view_team: "Can see team members list",
  manage_team: "Can manage team member roles and permissions",
  invite_members: "Can invite new team members",
  remove_members: "Can remove team members from workspace",
  access_files: "Can view files in the workspace",
  upload_files: "Can upload new files",
  delete_files: "Can delete files from workspace",
  manage_tickets: "Can edit and manage all tickets",
  create_tickets: "Can create new support tickets",
  manage_orders: "Can manage and edit orders",
  view_billing: "Can view billing information",
  manage_billing: "Can manage billing and subscriptions",
  access_settings: "Can access workspace settings",
  change_workspace_info: "Can modify workspace details",
};

export function PermissionsManager() {
  const { organizationId, updatePermissions, isWorkspaceOwner } = useTeam();
  const [loading, setLoading] = useState(true);
  const [adminPerms, setAdminPerms] = useState<RolePermissions | null>(null);
  const [memberPerms, setMemberPerms] = useState<RolePermissions | null>(null);
  const [viewerPerms, setViewerPerms] = useState<RolePermissions | null>(null);

  useEffect(() => {
    loadPermissions();
  }, [organizationId]);

  const loadPermissions = async () => {
    if (!organizationId) return;

    try {
      const { data, error } = await supabase
        .from("workspace_permissions")
        .select("role, permissions")
        .eq("organization_id", organizationId);

      if (error) throw error;

      data?.forEach((item) => {
        const perms = item.permissions as any as RolePermissions;
        if (item.role === "admin") setAdminPerms(perms);
        if (item.role === "member") setMemberPerms(perms);
        if (item.role === "viewer") setViewerPerms(perms);
      });
    } catch (error) {
      console.error("Error loading permissions:", error);
      toast.error("Failed to load permissions");
    } finally {
      setLoading(false);
    }
  };

  const handlePermissionToggle = async (
    role: string,
    permission: keyof RolePermissions,
    currentPerms: RolePermissions
  ) => {
    if (!isWorkspaceOwner) {
      toast.error("Only workspace owners can modify permissions");
      return;
    }

    const newPerms = { ...currentPerms, [permission]: !currentPerms[permission] };

    try {
      await updatePermissions(role, newPerms as any);
      
      // Update local state
      if (role === "admin") setAdminPerms(newPerms);
      if (role === "member") setMemberPerms(newPerms);
      if (role === "viewer") setViewerPerms(newPerms);

      toast.success(`${role} permissions updated`);
    } catch (error) {
      console.error("Error updating permissions:", error);
      toast.error("Failed to update permissions");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isWorkspaceOwner) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <Shield className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Only workspace owners can configure permissions</p>
        </CardContent>
      </Card>
    );
  }

  const renderPermissionsCard = (
    role: string,
    icon: React.ReactNode,
    perms: RolePermissions | null,
    description: string
  ) => {
    if (!perms) return null;

    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            {icon}
            <div>
              <CardTitle className="capitalize">{role} Permissions</CardTitle>
              <CardDescription>{description}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {(Object.keys(permissionLabels) as Array<keyof RolePermissions>).map((key) => (
            <div key={key} className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor={`${role}-${key}`} className="text-sm font-medium">
                  {permissionLabels[key]}
                </Label>
                <p className="text-xs text-muted-foreground">
                  {permissionDescriptions[key]}
                </p>
              </div>
              <Switch
                id={`${role}-${key}`}
                checked={perms[key]}
                onCheckedChange={() => handlePermissionToggle(role, key, perms)}
              />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Workspace Permissions</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Configure what actions each role can perform in your workspace
        </p>
      </div>

      <Separator />

      <div className="grid gap-6">
        {renderPermissionsCard(
          "admin",
          <Shield className="w-5 h-5 text-primary" />,
          adminPerms,
          "High-level access with most permissions enabled"
        )}
        {renderPermissionsCard(
          "member",
          <Users className="w-5 h-5 text-blue-500" />,
          memberPerms,
          "Standard access for team collaboration"
        )}
        {renderPermissionsCard(
          "viewer",
          <Eye className="w-5 h-5 text-muted-foreground" />,
          viewerPerms,
          "Read-only access to workspace content"
        )}
      </div>
    </div>
  );
}
