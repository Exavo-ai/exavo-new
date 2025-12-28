import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

import { Badge } from "@/components/ui/badge";

import { StatusBadge } from "@/components/portal/StatusBadge";
import { Building2, Crown, Users, Bot, Zap, AlertCircle, FolderKanban, ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useTeam } from "@/contexts/TeamContext";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";

interface Ticket {
  id: string;
  subject: string;
  status: string;
  priority: string;
  service: string | null;
  created_at: string;
  project_id: string | null;
}

interface Project {
  id: string;
  name: string;
  title: string | null;
  status: string;
  progress: number;
  created_at: string;
  service?: { name: string } | null;
}

export default function DashboardPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [totalTicketsCount, setTotalTicketsCount] = useState(0);
  const [totalProjectsCount, setTotalProjectsCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const { 
    currentUserRole, 
    isWorkspaceOwner, 
    teamMembers,
    loading: teamLoading,
    organizationId 
  } = useTeam();

  useEffect(() => {
    if (user && !teamLoading && organizationId) {
      loadDashboardData();
    }
  }, [user, teamLoading, organizationId]);

  const loadDashboardData = async () => {
    try {
      setError(null);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user || !organizationId) {
        throw new Error("Not authenticated or workspace not found");
      }

      const userId = isWorkspaceOwner ? user.id : organizationId;

      // Fetch all tickets count
      const { count: ticketsCount, error: ticketsCountError } = await supabase
        .from('tickets')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

      if (ticketsCountError) throw ticketsCountError;
      setTotalTicketsCount(ticketsCount || 0);

      // Fetch recent tickets
      const { data: ticketsData, error: ticketsError } = await supabase
        .from('tickets')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(5);

      if (ticketsError) throw ticketsError;
      setTickets(ticketsData || []);

      // Fetch all projects count
      const { count: projectsCount, error: projectsCountError } = await supabase
        .from('projects')
        .select('*', { count: 'exact', head: true });

      if (projectsCountError) throw projectsCountError;
      setTotalProjectsCount(projectsCount || 0);

      // Fetch recent projects
      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select('*, service:services(name)')
        .order('created_at', { ascending: false })
        .limit(5);

      if (projectsError) throw projectsError;
      setProjects(projectsData || []);
    } catch (err: any) {
      console.error("Error loading dashboard:", err);
      setError(err.message || "Failed to load dashboard data");
      toast({
        title: "Error",
        description: "Failed to load dashboard data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading || teamLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center space-y-4">
          <AlertCircle className="w-16 h-16 text-destructive mx-auto" />
          <div>
            <p className="text-lg font-semibold">Error Loading Dashboard</p>
            <p className="text-muted-foreground">{error}</p>
          </div>
          <Button onClick={loadDashboardData}>Try Again</Button>
        </div>
      </div>
    );
  }

  const openTickets = tickets.filter(t => t.status === 'open').length;
  const resolvedTickets = tickets.filter(t => t.status === 'resolved' || t.status === 'closed').length;
  
  const activeProjects = projects.filter(p => p.status === 'active' || p.status === 'in_progress').length;
  const completedProjects = projects.filter(p => p.status === 'completed').length;

  const displayRole = isWorkspaceOwner && currentUserRole === "Admin"
    ? "Admin (Owner)" 
    : currentUserRole || "Member";
  
  const activeTeamMembers = teamMembers.filter(m => m.status === 'active').length;

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="px-2 sm:px-0">
        <h1 className="text-2xl sm:text-3xl font-bold">Dashboard</h1>
        <p className="text-sm sm:text-base text-muted-foreground">Welcome to your AI workspace overview</p>
      </div>

      {/* Workspace Info Section */}
      <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            Your Workspace
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Crown className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Your Role</p>
                <Badge variant={isWorkspaceOwner ? "default" : "secondary"}>
                  {displayRole}
                </Badge>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Team Size</p>
                <p className="font-bold text-lg">{activeTeamMembers}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <FolderKanban className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Active Projects</p>
                <p className="font-bold text-lg">{activeProjects}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Total Tickets</CardTitle>
              <Bot className="w-5 h-5 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalTicketsCount}</div>
            <div className="text-xs text-muted-foreground mt-1">
              {openTickets} open • {resolvedTickets} resolved
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Projects</CardTitle>
              <Zap className="w-5 h-5 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalProjectsCount}</div>
            <div className="text-xs text-muted-foreground mt-1">
              {activeProjects} active • {completedProjects} completed
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg sm:text-xl">Recent Tickets</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => navigate("/client/tickets")}>
                View All
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {tickets.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No tickets yet</p>
                <p className="text-sm mt-1">Create your first support ticket</p>
              </div>
            ) : (
              <div className="space-y-3">
                {tickets.map((ticket) => (
                  <div 
                    key={ticket.id} 
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors gap-2"
                    onClick={() => navigate(`/client/tickets/${ticket.id}`)}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{ticket.subject}</p>
                      <p className="text-xs sm:text-sm text-muted-foreground truncate">
                        {ticket.service || "General"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <StatusBadge status={ticket.status as any} />
                      {ticket.project_id && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/client/projects/${ticket.project_id}`);
                          }}
                        >
                          <ExternalLink className="w-3 h-3 mr-1" />
                          Project
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg sm:text-xl">Recent Projects</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => navigate("/client/projects")}>
                View All
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {projects.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No projects yet</p>
                <p className="text-sm mt-1">Browse services to get started</p>
              </div>
            ) : (
              <div className="space-y-3">
                {projects.map((project) => (
                  <div 
                    key={project.id} 
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors gap-2"
                    onClick={() => navigate(`/client/projects/${project.id}`)}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{project.title || project.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {project.service?.name || format(new Date(project.created_at), "MMM d, yyyy")}
                      </p>
                    </div>
                    <Button variant="ghost" size="sm" className="h-8">
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
