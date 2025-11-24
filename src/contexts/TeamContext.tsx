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
  refreshTeam: () => Promise<void>;
}

const TeamContext = createContext<TeamContextType | undefined>(undefined);

export function TeamProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUserRole = async () => {
    if (!user) {
      setCurrentUserRole(null);
      setOrganizationId(null);
      return;
    }

    try {
      // Check if user is the organization owner
      const { data: ownedTeams } = await supabase
        .from("team_members")
        .select("role, organization_id")
        .eq("organization_id", user.id)
        .eq("email", user.email)
        .maybeSingle();

      if (ownedTeams) {
        setCurrentUserRole("Admin"); // Owner is always admin
        setOrganizationId(user.id); // Owner's workspace is their user ID
        return;
      }

      // Check if user is a team member of another organization
      const { data: memberOf } = await supabase
        .from("team_members")
        .select("role, organization_id")
        .eq("email", user.email)
        .eq("status", "active")
        .maybeSingle();

      if (memberOf) {
        setCurrentUserRole(memberOf.role);
        setOrganizationId(memberOf.organization_id); // Use the organization they joined
      } else {
        // User is neither owner nor team member - default to Admin for their own workspace
        setCurrentUserRole("Admin");
        setOrganizationId(user.id); // Default to their own workspace
      }
    } catch (error) {
      console.error("Error fetching user role:", error);
      setCurrentUserRole("Admin"); // Default to admin on error
      setOrganizationId(user.id); // Default to own workspace on error
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
  const canManageBilling = isAdmin;

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
