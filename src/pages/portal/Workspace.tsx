import { useState, useEffect } from "react";
import { useTeam } from "@/contexts/TeamContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { PermissionsManager } from "@/components/portal/PermissionsManager";
import { 
  Users, 
  Crown, 
  Shield, 
  Eye, 
  UserPlus, 
  Settings as SettingsIcon,
  LifeBuoy,
  FolderOpen,
  Loader2,
  Briefcase
} from "lucide-react";

interface WorkspaceData {
  ownerEmail: string;
  teamSize: number;
}

export default function WorkspacePage() {
  const navigate = useNavigate();
  const {
    teamMembers,
    currentUserRole,
    isWorkspaceOwner,
    workspaceOwnerEmail,
    permissions,
    organizationId,
    loading: teamLoading,
  } = useTeam();

  const [workspaceData, setWorkspaceData] = useState<WorkspaceData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load workspace data once team context finishes loading
    // Don't block on organizationId - handle new users gracefully
    if (!teamLoading) {
      loadWorkspaceData();
    }
  }, [teamLoading, teamMembers, workspaceOwnerEmail]);

  const loadWorkspaceData = async () => {
    try {
      // Count active members
      const activeMembers = teamMembers.filter(m => m.status === 'active').length;

      setWorkspaceData({
        ownerEmail: workspaceOwnerEmail || "Not set",
        teamSize: activeMembers
      });
    } catch (error) {
      console.error("Error loading workspace data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Only show team loading state briefly
  if (teamLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <Loader2 className="w-16 h-16 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading workspace...</p>
        </div>
      </div>
    );
  }

  // Handle new users without a workspace - show empty state with CTA
  if (!organizationId && !isWorkspaceOwner) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Workspace</h1>
          <p className="text-muted-foreground mt-2">
            Manage your workspace team and settings
          </p>
        </div>

        <Separator />

        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-6">
              <Users className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Welcome to Your Workspace</h2>
            <p className="text-muted-foreground max-w-md mb-6">
              Your workspace is being set up. You can browse services, create support tickets, and manage your projects.
            </p>
            <div className="flex gap-3">
              <Button onClick={() => navigate("/client/services/browse")}>
                <Briefcase className="w-4 h-4 mr-2" />
                Browse Services
              </Button>
              <Button variant="outline" onClick={() => navigate("/client/settings")}>
                <SettingsIcon className="w-4 h-4 mr-2" />
                Settings
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const displayRole = isWorkspaceOwner 
    ? "Workspace Owner" 
    : currentUserRole === "admin" ? "Admin"
    : currentUserRole === "member" ? "Member"
    : currentUserRole === "viewer" ? "Viewer"
    : "Member";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Workspace</h1>
        <p className="text-muted-foreground mt-2">
          Manage your workspace team and settings
        </p>
      </div>

      <Separator />

      {isWorkspaceOwner ? (
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="permissions">Permissions</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Workspace Overview */}
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Workspace Owner</CardTitle>
                  <Crown className="h-4 w-4 text-yellow-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-base font-bold truncate max-w-full">{workspaceData?.ownerEmail || "Unknown"}</div>
                  <p className="text-xs text-muted-foreground">
                    Subscription holder
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Your Role</CardTitle>
                  <Crown className="h-4 w-4 text-yellow-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{displayRole}</div>
                  <p className="text-xs text-muted-foreground">
                    Full access
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Team Size</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{workspaceData?.teamSize || 0}</div>
                  <p className="text-xs text-muted-foreground">
                    Active members
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Team Members */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Team Members</CardTitle>
                  <CardDescription>
                    {teamMembers.length} member{teamMembers.length !== 1 ? "s" : ""} in your workspace
                  </CardDescription>
                </div>
                <Button onClick={() => navigate("/client/team")}>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Manage Team
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {teamMembers.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{member.full_name || member.email}</p>
                          <Badge variant={
                            member.role === "admin" ? "default" :
                            member.role === "member" ? "secondary" :
                            "outline"
                          }>
                            {member.role}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{member.email}</p>
                      </div>
                      <Badge variant={member.status === "active" ? "default" : "secondary"}>
                        {member.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>
                  Manage your workspace efficiently
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                  <Button
                    variant="outline"
                    className="justify-start"
                    onClick={() => navigate("/client/team")}
                  >
                    <Users className="w-4 h-4 mr-2" />
                    Manage Team
                  </Button>
                  <Button
                    variant="outline"
                    className="justify-start"
                    onClick={() => navigate("/client/settings")}
                  >
                    <SettingsIcon className="w-4 h-4 mr-2" />
                    Workspace Settings
                  </Button>
                  <Button
                    variant="outline"
                    className="justify-start"
                    onClick={() => navigate("/client/tickets")}
                  >
                    <LifeBuoy className="w-4 h-4 mr-2" />
                    Support Tickets
                  </Button>
                  <Button
                    variant="outline"
                    className="justify-start"
                    onClick={() => navigate("/client/files")}
                  >
                    <FolderOpen className="w-4 h-4 mr-2" />
                    View Files
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="permissions">
            <PermissionsManager />
          </TabsContent>
        </Tabs>
      ) : (
        <div className="space-y-6">
          {/* Workspace Overview for Invited Users */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Workspace Owner</CardTitle>
                <Crown className="h-4 w-4 text-yellow-500" />
              </CardHeader>
              <CardContent>
                <div className="text-base font-bold truncate max-w-full">{workspaceData?.ownerEmail || "Unknown"}</div>
                <p className="text-xs text-muted-foreground">
                  Subscription holder
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Your Role</CardTitle>
                {displayRole === "Admin" ? (
                  <Shield className="h-4 w-4 text-primary" />
                ) : displayRole === "Member" ? (
                  <Users className="h-4 w-4 text-blue-500" />
                ) : (
                  <Eye className="h-4 w-4 text-muted-foreground" />
                )}
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{displayRole}</div>
                <p className="text-xs text-muted-foreground">
                  Team member
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Team Size</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{workspaceData?.teamSize || 0}</div>
                <p className="text-xs text-muted-foreground">
                  Active members
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Team Members */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Team Members</CardTitle>
                <CardDescription>
                  {teamMembers.length} member{teamMembers.length !== 1 ? "s" : ""} in your workspace
                </CardDescription>
              </div>
              {permissions.manage_team && (
                <Button onClick={() => navigate("/client/team")}>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Manage Team
                </Button>
              )}
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {teamMembers.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{member.full_name || member.email}</p>
                        <Badge variant={
                          member.role === "admin" ? "default" :
                          member.role === "member" ? "secondary" :
                          "outline"
                        }>
                          {member.role}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{member.email}</p>
                    </div>
                    <Badge variant={member.status === "active" ? "default" : "secondary"}>
                      {member.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Workspace Permissions for Invited Users */}
          <Card>
            <CardHeader>
              <CardTitle>Your Workspace Permissions</CardTitle>
              <CardDescription>
                What you can do in this workspace
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="flex items-center gap-2 p-3 border rounded-lg">
                  <div className={`w-2 h-2 rounded-full ${permissions.manage_team ? "bg-green-500" : "bg-gray-400"}`} />
                  <span className="text-sm">Manage Team</span>
                </div>
                <div className="flex items-center gap-2 p-3 border rounded-lg">
                  <div className={`w-2 h-2 rounded-full ${permissions.access_settings ? "bg-green-500" : "bg-gray-400"}`} />
                  <span className="text-sm">Access Settings</span>
                </div>
                <div className="flex items-center gap-2 p-3 border rounded-lg">
                  <div className={`w-2 h-2 rounded-full ${permissions.delete_files ? "bg-green-500" : "bg-gray-400"}`} />
                  <span className="text-sm">Delete Files</span>
                </div>
                <div className="flex items-center gap-2 p-3 border rounded-lg">
                  <div className={`w-2 h-2 rounded-full ${permissions.create_tickets ? "bg-green-500" : "bg-gray-400"}`} />
                  <span className="text-sm">Create Tickets</span>
                </div>
                <div className="flex items-center gap-2 p-3 border rounded-lg">
                  <div className={`w-2 h-2 rounded-full ${permissions.upload_files ? "bg-green-500" : "bg-gray-400"}`} />
                  <span className="text-sm">Upload Files</span>
                </div>
                <div className="flex items-center gap-2 p-3 border rounded-lg">
                  <div className={`w-2 h-2 rounded-full ${permissions.manage_orders ? "bg-green-500" : "bg-gray-400"}`} />
                  <span className="text-sm">Manage Orders</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
