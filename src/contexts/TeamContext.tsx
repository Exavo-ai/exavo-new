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

interface TeamContextType {
  currentUserRole: string | null;
  teamMembers: TeamMember[];
  loading: boolean;
  canInviteMembers: boolean;
  canManageBilling: boolean;
  canManageTeam: boolean;
  isViewer: boolean;
  isMember: boolean;
  isAdmin: boolean;
  isWorkspaceOwner: boolean;
  workspaceId: string | null;
  workspaceOwnerEmail: string | null;
  refreshTeam: () => Promise<void>;
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

  const fetchUserRole = async () => {
    if (!user) {
      setCurrentUserRole(null);
      setOrganizationId(null);
      setIsWorkspaceOwner(false);
      setWorkspaceOwnerEmail(null);
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
        // User is an invited team member - use their assigned role
        setCurrentUserRole(memberOf.role);
        setOrganizationId(memberOf.organization_id);
        setIsWorkspaceOwner(false);
        
        // Fetch workspace owner email
        const { data: ownerProfile } = await supabase
          .from("profiles")
          .select("email")
          .eq("id", memberOf.organization_id)
          .maybeSingle();
        
        setWorkspaceOwnerEmail(ownerProfile?.email || null);
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
        setCurrentUserRole("Admin");
        setOrganizationId(user.id);
        setIsWorkspaceOwner(true);
        setWorkspaceOwnerEmail(user.email || null);
      } else {
        // User doesn't own a workspace and isn't a team member
        // This shouldn't happen in normal flow, but handle gracefully
        setCurrentUserRole(null);
        setOrganizationId(null);
        setIsWorkspaceOwner(false);
        setWorkspaceOwnerEmail(null);
      }
    } catch (error) {
      console.error("Error fetching user role:", error);
      // Don't default to owner on error - this prevents privilege escalation
      setCurrentUserRole(null);
      setOrganizationId(null);
      setIsWorkspaceOwner(false);
      setWorkspaceOwnerEmail(null);
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

  const refreshTeam = async () => {
    setLoading(true);
    try {
      await fetchUserRole();
      // Give organizationId time to be set before fetching members
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

  const isAdmin = currentUserRole === "Admin";
  const isMember = currentUserRole === "Member";
  const isViewer = currentUserRole === "Viewer";

  // Only workspace owners and admins can manage team and billing
  const canManageTeam = isWorkspaceOwner || isAdmin;
  const canInviteMembers = isWorkspaceOwner || isAdmin;
  const canManageBilling = isWorkspaceOwner || isAdmin;

  return (
    <TeamContext.Provider
      value={{
        currentUserRole,
        teamMembers,
        loading,
        canInviteMembers,
        canManageBilling,
        canManageTeam,
        isViewer,
        isMember,
        isAdmin,
        isWorkspaceOwner,
        workspaceId: organizationId,
        workspaceOwnerEmail,
        refreshTeam,
      }}
    >
      {children}
    </TeamContext.Provider>
  );
}

export function useTeam() {
  const context = useContext(TeamContext);
  if (context === undefined) {
    // Return restricted defaults - don't grant permissions by default
    return {
      currentUserRole: null,
      teamMembers: [],
      loading: false,
      canInviteMembers: false,
      canManageBilling: false,
      canManageTeam: false,
      isViewer: false,
      isMember: false,
      isAdmin: false,
      isWorkspaceOwner: false,
      workspaceId: null,
      workspaceOwnerEmail: null,
      refreshTeam: async () => {},
    };
  }
  return context;
}
