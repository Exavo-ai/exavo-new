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
      // Check if user is a team member of another organization first
      const { data: memberOf } = await supabase
        .from("team_members")
        .select("role, organization_id")
        .eq("email", user.email)
        .eq("status", "active")
        .maybeSingle();

      if (memberOf) {
        // User is a team member (not owner)
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
      } else {
        // User is the workspace owner (not a team member of another workspace)
        setCurrentUserRole("Admin");
        setOrganizationId(user.id);
        setIsWorkspaceOwner(true);
        setWorkspaceOwnerEmail(user.email || null);
      }
    } catch (error) {
      console.error("Error fetching user role:", error);
      // Default to workspace owner on error
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
        .eq("organization_id", organizationId) // Use the determined organization ID
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTeamMembers((data || []) as TeamMember[]);
    } catch (error) {
      console.error("Error fetching team members:", error);
      setTeamMembers([]);
    }
  };

  const refreshTeam = async () => {
    setLoading(true);
    await Promise.all([fetchUserRole(), fetchTeamMembers()]);
    setLoading(false);
  };

  useEffect(() => {
    refreshTeam();
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
    throw new Error("useTeam must be used within a TeamProvider");
  }
  return context;
}
