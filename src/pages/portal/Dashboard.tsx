import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge } from "@/components/portal/StatusBadge";
import { DollarSign, Bot, Zap, AlertCircle, LifeBuoy, FileText, MessageSquare, Briefcase } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { KPICard } from "@/components/portal/KPICard";

interface Ticket {
  id: string;
  subject: string;
  status: string;
  priority: string;
  service: string | null;
  created_at: string;
}

interface Appointment {
  id: string;
  full_name: string;
  service_id: string | null;
  status: string;
  appointment_date: string;
  created_at: string;
}

export default function DashboardPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setError(null);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error("Not authenticated");
      }

      // Fetch tickets
      const { data: ticketsData, error: ticketsError } = await supabase
        .from('tickets')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (ticketsError) throw ticketsError;

      // Fetch appointments (service requests)
      const { data: appointmentsData, error: appointmentsError } = await supabase
        .from('appointments')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (appointmentsError) throw appointmentsError;

      setTickets(ticketsData || []);
      setAppointments(appointmentsData || []);
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

  if (loading) {
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

  // Calculate stats from real data
  const totalTickets = tickets.length;
  const openTickets = tickets.filter(t => t.status === 'open').length;
  const resolvedTickets = tickets.filter(t => t.status === 'resolved' || t.status === 'closed').length;
  
  const totalAppointments = appointments.length;
  const activeAppointments = appointments.filter(a => a.status === 'confirmed' || a.status === 'pending').length;
  const completedAppointments = appointments.filter(a => a.status === 'completed').length;

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="px-2 sm:px-0">
        <h1 className="text-2xl sm:text-3xl font-bold">Dashboard</h1>
        <p className="text-sm sm:text-base text-muted-foreground">Welcome to your AI workspace overview</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Total Tickets</CardTitle>
              <Bot className="w-5 h-5 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalTickets}</div>
            <div className="text-xs text-muted-foreground mt-1">
              {openTickets} open • {resolvedTickets} resolved
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Service Requests</CardTitle>
              <Zap className="w-5 h-5 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalAppointments}</div>
            <div className="text-xs text-muted-foreground mt-1">
              {activeAppointments} active • {completedAppointments} completed
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full justify-start"
              onClick={() => navigate("/client/tickets")}
            >
              <LifeBuoy className="w-4 h-4 mr-2" />
              Create Ticket
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full justify-start"
              onClick={() => navigate("/client/services/browse")}
            >
              <Briefcase className="w-4 h-4 mr-2" />
              Service Request
            </Button>
          </CardContent>
        </Card>
      </div>

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
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(ticket.created_at).toLocaleDateString()}
                      </span>
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
              <CardTitle className="text-lg sm:text-xl">Service Requests</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => navigate("/client/orders")}>
                View All
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {appointments.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No service requests yet</p>
                <p className="text-sm mt-1">Browse and request services</p>
              </div>
            ) : (
              <div className="space-y-3">
                {appointments.map((appointment) => (
                  <div 
                    key={appointment.id} 
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 rounded-lg border hover:bg-muted/50 transition-colors gap-2"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{appointment.full_name}</p>
                      <p className="text-xs sm:text-sm text-muted-foreground truncate">
                        {new Date(appointment.appointment_date).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <StatusBadge status={appointment.status as any} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg sm:text-xl">Notes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            placeholder="Write your notes here..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="min-h-[150px] resize-none"
          />
          <div className="flex justify-end">
            <Button size="sm" variant="outline">
              Save
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
