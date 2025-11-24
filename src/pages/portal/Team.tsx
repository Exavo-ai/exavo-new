import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Mail, Plus, Shield, Search, Loader2, Crown, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge } from "@/components/portal/StatusBadge";
import { useTeam } from "@/contexts/TeamContext";

interface TeamMember {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  status: 'active' | 'pending' | 'inactive';
}

interface TeamLimits {
  currentCount: number;
  maxTeamMembers: number;
  teamEnabled: boolean;
  canInvite: boolean;
  limitReached: boolean;
  planName: string;
}

export default function TeamPage() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("Member");
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [teamLimits, setTeamLimits] = useState<TeamLimits | null>(null);
  const [limitsLoading, setLimitsLoading] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { permissions, currentUserRole, loading: teamLoading } = useTeam();

  // Permission checks
  const canManageTeam = permissions.manage_team;
  const canInviteMembers = permissions.manage_team;

  const fetchMembers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("team_members")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setMembers((data || []) as TeamMember[]);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchTeamLimits = async () => {
    try {
      setLimitsLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      const { data, error } = await supabase.functions.invoke("check-team-limits", {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });

      if (error) throw error;
      setTeamLimits(data);
    } catch (error: any) {
      console.error("Error fetching team limits:", error);
      // Set default limits on error
      setTeamLimits({
        currentCount: members.length,
        maxTeamMembers: 1,
        teamEnabled: false,
        canInvite: false,
        limitReached: true,
        planName: "Free",
      });
    } finally {
      setLimitsLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, []);

  useEffect(() => {
    if (!loading) {
      fetchTeamLimits();
    }
  }, [loading, members.length]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail || !inviteRole) return;

    try {
      setSubmitting(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      const { data, error } = await supabase.functions.invoke("invite-team-member", {
        body: { email: inviteEmail, role: inviteRole },
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });

      if (error) throw error;

      // Check for email sending failures
      if (data?.error === "email_failed") {
        toast({
          title: "Email Sending Failed",
          description: `Team member added but could not send invitation email. Error: ${data.details || "Unknown error"}`,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Success",
          description: "Team member invited and email sent successfully",
        });
      }

      setInviteOpen(false);
      setInviteEmail("");
      setInviteRole("Member");
      fetchMembers();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateMember = async (role?: string, status?: string) => {
    if (!selectedMember) return;

    try {
      setSubmitting(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      const { data, error } = await supabase.functions.invoke("update-team-member", {
        body: { memberId: selectedMember.id, role, status },
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });

      if (error) {
        console.error("Function invocation error:", error);
        throw new Error(error.message || "Failed to update team member");
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      // Update local state immediately
      setMembers(members.map(m => 
        m.id === selectedMember.id 
          ? { ...m, role: role || m.role, status: (status as 'active' | 'pending' | 'inactive') || m.status }
          : m
      ));

      toast({
        title: "Success",
        description: "Team member updated successfully",
      });

      setManageOpen(false);
      setSelectedMember(null);
    } catch (error: any) {
      console.error("Error updating member:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to update team member",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveMember = async () => {
    if (!selectedMember) return;

    try {
      setSubmitting(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      const { data, error } = await supabase.functions.invoke("remove-team-member", {
        body: { memberId: selectedMember.id },
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });

      if (error) {
        console.error("Function invocation error:", error);
        throw new Error(error.message || "Failed to remove team member");
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      // Update local state immediately
      setMembers(members.filter(m => m.id !== selectedMember.id));

      toast({
        title: "Success",
        description: "Team member removed successfully",
      });

      setManageOpen(false);
      setSelectedMember(null);
    } catch (error: any) {
      console.error("Error removing member:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to remove team member",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const filteredMembers = members.filter(
    (member) =>
      member.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (member.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false)
  );

  // Show loading while team is initializing
  if (teamLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span className="ml-2 text-muted-foreground">Loading team...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Team Members</h1>
          <p className="text-muted-foreground">
            {canManageTeam ? "Manage your team and permissions" : "View team members"} {currentUserRole && `(Your role: ${currentUserRole})`}
          </p>
        </div>
        {canManageTeam && (
          <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
            <DialogTrigger asChild>
              <Button disabled={!teamLimits?.canInvite || limitsLoading}>
                <Plus className="w-4 h-4 mr-2" />
                Invite Member
              </Button>
            </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Invite Team Member</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleInvite} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="member@company.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select value={inviteRole} onValueChange={setInviteRole}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Admin">Admin</SelectItem>
                    <SelectItem value="Member">Member</SelectItem>
                    <SelectItem value="Viewer">Viewer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={() => setInviteOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Send Invite"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
        )}
      </div>

      {teamLimits && !teamLimits.teamEnabled && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Team features are not available on your <strong>{teamLimits.planName}</strong> plan. 
            {" "}
            <Button
              variant="link"
              className="p-0 h-auto font-semibold"
              onClick={() => navigate("/client/subscriptions")}
            >
              Upgrade your plan
            </Button>
            {" "}to invite team members.
          </AlertDescription>
        </Alert>
      )}

      {teamLimits && teamLimits.teamEnabled && teamLimits.limitReached && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Your <strong>{teamLimits.planName}</strong> plan allows up to {teamLimits.maxTeamMembers} team member{teamLimits.maxTeamMembers !== 1 ? "s" : ""}.
            {" "}
            <Button
              variant="link"
              className="p-0 h-auto font-semibold"
              onClick={() => navigate("/client/subscriptions")}
            >
              Upgrade your plan
            </Button>
            {" "}to add more members.
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search team members..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : filteredMembers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchQuery ? "No members found" : "No team members yet. Invite your first member!"}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredMembers.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-gradient-hero flex items-center justify-center text-white font-bold">
                      {member.full_name?.charAt(0) || member.email.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold">{member.full_name || member.email}</p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Mail className="w-3 h-3" />
                        {member.email}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm font-medium">{member.role}</span>
                    </div>
                    <StatusBadge status={member.status === "active" ? "Active" : "Pending"} />
                    {canManageTeam && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedMember(member);
                          setManageOpen(true);
                        }}
                      >
                        Manage
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={manageOpen} onOpenChange={setManageOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manage Team Member</DialogTitle>
          </DialogHeader>
          {selectedMember && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={selectedMember.email} disabled />
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <Select
                  defaultValue={selectedMember.role}
                  onValueChange={(value) => handleUpdateMember(value, undefined)}
                  disabled={submitting}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Admin">Admin</SelectItem>
                    <SelectItem value="Member">Member</SelectItem>
                    <SelectItem value="Viewer">Viewer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2 justify-end pt-4 border-t">
                <Button
                  variant="destructive"
                  onClick={handleRemoveMember}
                  disabled={submitting}
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Remove Member"}
                </Button>
                <Button variant="outline" onClick={() => setManageOpen(false)}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
