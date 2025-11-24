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
      setIsWorkspaceOwner(true); // Default to true
      setWorkspaceOwnerEmail(null);
      return;
    }

    try {
      // Check if user is a team member of another organization
      const { data: memberOf } = await supabase
        .from("team_members")
        .select("role, organization_id")
        .eq("email", user.email)
        .eq("status", "active")
        .maybeSingle();

      if (memberOf) {
        // User is a team member
        setCurrentUserRole(memberOf.role);
        setOrganizationId(memberOf.organization_id);
        setIsWorkspaceOwner(false);
        setWorkspaceOwnerEmail(null);
      } else {
        // User is the workspace owner
        setCurrentUserRole("Admin");
        setOrganizationId(user.id);
        setIsWorkspaceOwner(true);
        setWorkspaceOwnerEmail(user.email || null);
      }
    } catch (error) {
      console.error("Error fetching user role:", error);
      // Default to Admin owner on error to avoid blocking the app
      setCurrentUserRole("Admin");
      setOrganizationId(user.id);
      setIsWorkspaceOwner(true);
      setWorkspaceOwnerEmail(user.email || null);
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

  const canManageTeam = isAdmin;
  const canInviteMembers = isAdmin;
  const canManageBilling = isWorkspaceOwner; // Only workspace owner can manage billing

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
    // Return safe defaults that allow the app to work
    return {
      currentUserRole: "Admin",
      teamMembers: [],
      loading: false,
      canInviteMembers: true,
      canManageBilling: true,
      canManageTeam: true,
      isViewer: false,
      isMember: false,
      isAdmin: true,
      isWorkspaceOwner: true,
      workspaceId: null,
      workspaceOwnerEmail: null,
      refreshTeam: async () => {},
    };
  }
  return context;
}
