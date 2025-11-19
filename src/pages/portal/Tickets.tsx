import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, AlertCircle, Loader2 } from "lucide-react";
import { CreateTicketDialog } from "@/components/portal/CreateTicketDialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Ticket {
  ticketId: string;
  subject: string;
  priority: string;
  service: string;
  status: string;
  createdAt: string;
}

const getPriorityColor = (priority: string) => {
  switch (priority?.toLowerCase()) {
    case "high": return "destructive";
    case "medium": return "default";
    case "low": return "secondary";
    default: return "outline";
  }
};

const getStatusColor = (status: string) => {
  switch (status?.toLowerCase()) {
    case "in progress": return "default";
    case "open": return "destructive";
    case "pending": return "secondary";
    case "resolved": 
    case "closed": return "outline";
    default: return "outline";
  }
};

export default function TicketsPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();
  const navigate = useNavigate();

  const fetchTickets = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: "Error",
          description: "You must be logged in to view tickets",
          variant: "destructive",
        });
        return;
      }

      // Load tickets from Supabase
      const { data, error } = await supabase
        .from("tickets")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Map Supabase data to the expected format
      const mappedTickets: Ticket[] = (data || []).map((ticket) => ({
        ticketId: ticket.id,
        subject: ticket.subject,
        priority: ticket.priority,
        service: ticket.service || "General",
        status: ticket.status,
        createdAt: ticket.created_at,
      }));

      setTickets(mappedTickets);
    } catch (error) {
      console.error("Error fetching tickets:", error);
      toast({
        title: "Error",
        description: "Failed to load tickets. Please try again later.",
        variant: "destructive",
      });
      setTickets([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();

    // Set up real-time subscription for new tickets
    const channel = supabase
      .channel('tickets-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'tickets'
        },
        (payload) => {
          console.log('New ticket inserted:', payload);
          // Map the new ticket to the expected format and add to state
          const newTicket: Ticket = {
            ticketId: payload.new.id,
            subject: payload.new.subject,
            priority: payload.new.priority,
            service: payload.new.service || "General",
            status: payload.new.status,
            createdAt: payload.new.created_at,
          };
          
          // Add the new ticket to the beginning of the list
          setTickets(prev => [newTicket, ...prev]);
          
          toast({
            title: "New Ticket",
            description: "A new ticket has been created",
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'tickets'
        },
        (payload) => {
          console.log('Ticket updated:', payload);
          // Update the ticket in the list
          setTickets(prev => prev.map(ticket => 
            ticket.ticketId === payload.new.id
              ? {
                  ticketId: payload.new.id,
                  subject: payload.new.subject,
                  priority: payload.new.priority,
                  service: payload.new.service || "General",
                  status: payload.new.status,
                  createdAt: payload.new.created_at,
                }
              : ticket
          ));
        }
      )
      .subscribe();

    // Cleanup subscription on unmount
    return () => {
      supabase.removeChannel(channel);
    };
  }, [toast]);

  const filteredTickets = tickets.filter((ticket) =>
    ticket.subject?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    ticket.ticketId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    ticket.service?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleViewTicket = (ticketId: string) => {
    navigate(`/client/tickets/${ticketId}`);
  };
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Support Tickets</h1>
          <p className="text-muted-foreground">Track and manage your support requests</p>
        </div>
        <CreateTicketDialog onTicketCreated={fetchTickets} />
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="Search tickets..." 
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Button variant="outline">Filters</Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border text-left text-sm text-muted-foreground">
                  <th className="pb-3 font-medium">Subject</th>
                  <th className="pb-3 font-medium">Priority</th>
                  <th className="pb-3 font-medium">Service</th>
                  <th className="pb-3 font-medium">Ticket ID</th>
                  <th className="pb-3 font-medium">Status</th>
                  <th className="pb-3 font-medium">Created</th>
                  <th className="pb-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
                    </td>
                  </tr>
                ) : filteredTickets.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-muted-foreground">
                      No tickets found
                    </td>
                  </tr>
                ) : (
                  filteredTickets.map((ticket) => (
                  <tr key={ticket.ticketId} className="border-b border-border last:border-0 hover:bg-muted/50">
                    <td className="py-4">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-muted-foreground" />
                        <span className="font-medium">{ticket.subject}</span>
                      </div>
                    </td>
                    <td className="py-4">
                      <Badge variant={getPriorityColor(ticket.priority)}>{ticket.priority}</Badge>
                    </td>
                    <td className="py-4 text-sm text-muted-foreground">{ticket.service}</td>
                    <td className="py-4 text-sm font-mono">{ticket.ticketId}</td>
                    <td className="py-4">
                      <Badge variant={getStatusColor(ticket.status)}>{ticket.status}</Badge>
                    </td>
                    <td className="py-4 text-sm text-muted-foreground">
                      {new Date(ticket.createdAt).toISOString().split('T')[0]}
                    </td>
                    <td className="py-4">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleViewTicket(ticket.ticketId)}
                      >
                        View
                      </Button>
                    </td>
                  </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
