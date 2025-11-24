import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Building2, Users, Crown, Mail, Shield, UserPlus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTeam } from "@/contexts/TeamContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface WorkspaceData {
  ownerEmail: string;
  activeMembers: number;
}

export default function WorkspacePage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const { 
    currentUserRole, 
    isWorkspaceOwner, 
    workspaceOwnerEmail,
    teamMembers,
    loading: teamLoading,
    workspaceId,
    canManageTeam
  } = useTeam();

  const [workspaceData, setWorkspaceData] = useState<WorkspaceData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!teamLoading && workspaceId) {
      loadWorkspaceData();
    }
  }, [teamLoading, workspaceId]);

  const loadWorkspaceData = async () => {
    try {
      if (!user) return;

      // Fetch owner email if not already available
      let ownerEmail = workspaceOwnerEmail;
      
      if (!ownerEmail && workspaceId) {
        // Fetch workspace owner info
        const { data: profileData } = await supabase
          .from('profiles')
          .select('email')
          .eq('id', workspaceId)
          .single();
        
        ownerEmail = profileData?.email || "Unknown";
      }

      // Count active members
      const activeMembers = teamMembers.filter(m => m.status === 'active').length;

      setWorkspaceData({
        ownerEmail: ownerEmail || user.email || "Unknown",
        activeMembers
      });
    } catch (error) {
      console.error("Error loading workspace data:", error);
      toast({
        title: "Error",
        description: "Failed to load workspace data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (teamLoading || loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading workspace...</p>
        </div>
      </div>
    );
  }

  const displayRole = isWorkspaceOwner 
    ? "Admin (Owner)" 
    : currentUserRole || "Member";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Workspace</h1>
        <p className="text-muted-foreground">Manage your workspace and team members</p>
      </div>

      {/* Workspace Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Workspace Owner</CardTitle>
              <Crown className="w-5 h-5 text-yellow-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-muted-foreground" />
              <p className="text-sm font-medium truncate">
                {workspaceData?.ownerEmail || workspaceOwnerEmail || "Loading..."}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Your Role</CardTitle>
              <Shield className="w-5 h-5 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <Badge variant={isWorkspaceOwner ? "default" : "secondary"}>
              {displayRole}
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Team Size</CardTitle>
              <Users className="w-5 h-5 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {workspaceData?.activeMembers || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Active members</p>
          </CardContent>
        </Card>
      </div>

      {/* Team Members */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl">Team Members</CardTitle>
              <CardDescription>View and manage your workspace members</CardDescription>
            </div>
            {canManageTeam && (
              <Button onClick={() => navigate("/client/team")}>
                <UserPlus className="w-4 h-4 mr-2" />
                Manage Team
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {teamMembers.length === 0 ? (
            <div className="text-center py-8">
              <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No team members yet</p>
              {canManageTeam && (
                <p className="text-sm text-muted-foreground mt-1">
                  Invite members to collaborate on your workspace
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {teamMembers.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Users className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{member.full_name || member.email}</p>
                      <p className="text-sm text-muted-foreground">{member.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={member.status === 'active' ? 'default' : 'secondary'}>
                      {member.status}
                    </Badge>
                    <Badge variant="outline">{member.role}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      {!canManageTeam && (
        <Card>
          <CardHeader>
            <CardTitle>Need Help?</CardTitle>
            <CardDescription>
              Contact your workspace owner to manage team settings or invite new members
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" onClick={() => navigate("/client/tickets")}>
              <Mail className="w-4 h-4 mr-2" />
              Contact Support
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
