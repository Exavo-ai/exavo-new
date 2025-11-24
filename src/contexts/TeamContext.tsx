import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./AuthContext";

interface TeamMember {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  status: string;
  organization_id: string;
}

interface WorkspacePermissions {
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

interface TeamContextType {
  currentUserRole: string | null;
  organizationId: string | null;
  teamMembers: TeamMember[];
  loading: boolean;
  isWorkspaceOwner: boolean;
  workspaceOwnerEmail: string | null;
  workspaceOwnerId: string | null;
  permissions: WorkspacePermissions;
  canManageBilling: boolean;
  refreshTeam: () => Promise<void>;
  updatePermissions: (role: string, permissions: WorkspacePermissions) => Promise<void>;
}

const TeamContext = createContext<TeamContextType | undefined>(undefined);

export function TeamProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [isWorkspaceOwner, setIsWorkspaceOwner] = useState(false);
  const [workspaceOwnerEmail, setWorkspaceOwnerEmail] = useState<string | null>(null);
  const [workspaceOwnerId, setWorkspaceOwnerId] = useState<string | null>(null);
  const [permissions, setPermissions] = useState<WorkspacePermissions>({
    access_dashboard: false,
    view_team: false,
    manage_team: false,
    invite_members: false,
    remove_members: false,
    access_files: false,
    upload_files: false,
    delete_files: false,
    manage_tickets: false,
    create_tickets: false,
    manage_orders: false,
    view_billing: false,
    manage_billing: false,
    access_settings: false,
    change_workspace_info: false,
  });

  const fetchUserRole = async () => {
    if (!user) {
      setCurrentUserRole(null);
      setOrganizationId(null);
      setIsWorkspaceOwner(false);
      setWorkspaceOwnerEmail(null);
      setWorkspaceOwnerId(null);
      setPermissions({
        access_dashboard: false,
        view_team: false,
        manage_team: false,
        invite_members: false,
        remove_members: false,
        access_files: false,
        upload_files: false,
        delete_files: false,
        manage_tickets: false,
        create_tickets: false,
        manage_orders: false,
        view_billing: false,
        manage_billing: false,
        access_settings: false,
        change_workspace_info: false,
      });
      return;
    }

    try {
      // First, check if user is a team member (invited user)
      const { data: memberOf } = await supabase
        .from("team_members")
        .select("role, organization_id, status")
        .eq("email", user.email)
        .in("status", ["active", "pending"])
        .maybeSingle();

      if (memberOf) {
        // User is an invited team member
        setCurrentUserRole(memberOf.role);
        setOrganizationId(memberOf.organization_id);
        setIsWorkspaceOwner(false);
        setWorkspaceOwnerId(memberOf.organization_id);
        
        // Fetch workspace owner email
        const { data: ownerProfile } = await supabase
          .from("profiles")
          .select("email")
          .eq("id", memberOf.organization_id)
          .maybeSingle();
        
        setWorkspaceOwnerEmail(ownerProfile?.email || null);

        // Fetch permissions for this role
        const { data: perms } = await supabase
          .from("workspace_permissions")
          .select("permissions")
          .eq("organization_id", memberOf.organization_id)
          .eq("role", memberOf.role)
          .maybeSingle();

        if (perms?.permissions) {
          setPermissions(perms.permissions as any);
        }
        return;
      }

      // Not a team member - check if they own a workspace
      const { data: workspace } = await supabase
        .from("workspaces")
        .select("id, owner_id")
        .eq("owner_id", user.id)
        .maybeSingle();

      if (workspace) {
        // User owns a workspace - they are the owner
        setCurrentUserRole("workspaceOwner");
        setOrganizationId(user.id);
        setIsWorkspaceOwner(true);
        setWorkspaceOwnerEmail(user.email || null);
        setWorkspaceOwnerId(user.id);
        // Workspace owners have all permissions
        setPermissions({
          access_dashboard: true,
          view_team: true,
          manage_team: true,
          invite_members: true,
          remove_members: true,
          access_files: true,
          upload_files: true,
          delete_files: true,
          manage_tickets: true,
          create_tickets: true,
          manage_orders: true,
          view_billing: true,
          manage_billing: true,
          access_settings: true,
          change_workspace_info: true,
        });
      } else {
        // User doesn't own a workspace and isn't a team member
        setCurrentUserRole(null);
        setOrganizationId(null);
        setIsWorkspaceOwner(false);
        setWorkspaceOwnerEmail(null);
        setWorkspaceOwnerId(null);
        setPermissions({
          access_dashboard: false,
          view_team: false,
          manage_team: false,
          invite_members: false,
          remove_members: false,
          access_files: false,
          upload_files: false,
          delete_files: false,
          manage_tickets: false,
          create_tickets: false,
          manage_orders: false,
          view_billing: false,
          manage_billing: false,
          access_settings: false,
          change_workspace_info: false,
        });
      }
    } catch (error) {
      console.error("Error fetching user role:", error);
      setCurrentUserRole(null);
      setOrganizationId(null);
      setIsWorkspaceOwner(false);
      setWorkspaceOwnerEmail(null);
      setWorkspaceOwnerId(null);
      setPermissions({
        access_dashboard: false,
        view_team: false,
        manage_team: false,
        invite_members: false,
        remove_members: false,
        access_files: false,
        upload_files: false,
        delete_files: false,
        manage_tickets: false,
        create_tickets: false,
        manage_orders: false,
        view_billing: false,
        manage_billing: false,
        access_settings: false,
        change_workspace_info: false,
      });
    }
  };

  const fetchTeamMembers = async () => {
    if (!user || !organizationId) {
      setTeamMembers([]);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("team_members")
        .select("*")
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching team members:", error);
        setTeamMembers([]);
        return;
      }
      setTeamMembers((data || []) as TeamMember[]);
    } catch (error) {
      console.error("Error fetching team members:", error);
      setTeamMembers([]);
    }
  };

  const updatePermissions = async (role: string, newPermissions: WorkspacePermissions) => {
    if (!organizationId || !isWorkspaceOwner) {
      throw new Error("Only workspace owners can update permissions");
    }

    try {
      const { error } = await supabase
        .from("workspace_permissions")
        .update({ permissions: newPermissions as any })
        .eq("organization_id", organizationId)
        .eq("role", role);

      if (error) throw error;

      // If updating current user's role permissions, refresh
      if (role === currentUserRole) {
        await fetchUserRole();
      }
    } catch (error) {
      console.error("Error updating permissions:", error);
      throw error;
    }
  };

  const refreshTeam = async () => {
    setLoading(true);
    try {
      await fetchUserRole();
      setTimeout(() => {
        fetchTeamMembers();
      }, 100);
    } catch (error) {
      console.error("Error refreshing team:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      refreshTeam();
    } else {
      setLoading(false);
    }
  }, [user]);

  const canManageBilling = isWorkspaceOwner;

  return (
    <TeamContext.Provider
      value={{
        currentUserRole,
        organizationId,
        teamMembers,
        loading,
        isWorkspaceOwner,
        workspaceOwnerEmail,
        workspaceOwnerId,
        permissions,
        canManageBilling,
        refreshTeam,
        updatePermissions,
      }}
    >
      {children}
    </TeamContext.Provider>
  );
}

export function useTeam() {
  const context = useContext(TeamContext);
  if (context === undefined) {
    return {
      currentUserRole: null,
      organizationId: null,
      teamMembers: [],
      loading: false,
      isWorkspaceOwner: false,
      workspaceOwnerEmail: null,
      workspaceOwnerId: null,
      permissions: {
        access_dashboard: false,
        view_team: false,
        manage_team: false,
        invite_members: false,
        remove_members: false,
        access_files: false,
        upload_files: false,
        delete_files: false,
        manage_tickets: false,
        create_tickets: false,
        manage_orders: false,
        view_billing: false,
        manage_billing: false,
        access_settings: false,
        change_workspace_info: false,
      },
      canManageBilling: false,
      refreshTeam: async () => {},
      updatePermissions: async () => {},
    };
  }
  return context;
}
