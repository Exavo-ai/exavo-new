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
  manage_team: boolean;
  access_settings: boolean;
  delete_items: boolean;
  create_items: boolean;
  view_analytics: boolean;
  access_advanced_tools: boolean;
}

const permissionLabels = {
  manage_team: "Manage Team",
  access_settings: "Access Settings",
  delete_items: "Delete Items",
  create_items: "Create Items",
  view_analytics: "View Analytics",
  access_advanced_tools: "Access Advanced Tools",
};

const permissionDescriptions = {
  manage_team: "Can invite, remove, and manage team members",
  access_settings: "Can view and modify workspace settings",
  delete_items: "Can delete tickets, files, and other items",
  create_items: "Can create new tickets, orders, and files",
  view_analytics: "Can access analytics and reports",
  access_advanced_tools: "Can use AI tools and advanced features",
};

export function PermissionsManager() {
  const { organizationId, updatePermissions } = useTeam();
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
    const newPerms = { ...currentPerms, [permission]: !currentPerms[permission] };

    try {
      await updatePermissions(role, newPerms);
      
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
