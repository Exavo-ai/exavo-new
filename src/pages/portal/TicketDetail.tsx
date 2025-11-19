import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, AlertCircle, Clock, User, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface TicketDetail {
  ticketId: string;
  subject: string;
  priority: string;
  service: string;
  status: string;
  createdAt: string;
  updatedAt?: string;
  description?: string;
  assignedTo?: string;
  category?: string;
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

export default function TicketDetailPage() {
  const { ticketId } = useParams<{ ticketId: string }>();
  const navigate = useNavigate();
  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchTicketDetail = async () => {
      if (!ticketId) {
        toast({
          title: "Error",
          description: "Ticket ID not found",
          variant: "destructive",
        });
        navigate("/client/tickets");
        return;
      }

      setIsLoading(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const authToken = session?.access_token;

        if (!authToken) {
          toast({
            title: "Error",
            description: "Authentication token not found",
            variant: "destructive",
          });
          return;
        }

        const response = await fetch(`https://exavo.ai/api/tickets/${ticketId}`, {
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        setTicket(data);
      } catch (error) {
        console.error("Error fetching ticket details:", error);
        toast({
          title: "Error",
          description: "Failed to load ticket details. Please try again later.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchTicketDetail();
  }, [ticketId, navigate, toast]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <Skeleton className="h-8 w-64" />
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-4 w-3/4 mt-2" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => navigate("/client/tickets")}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Tickets
        </Button>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <AlertCircle className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Ticket not found</h3>
            <p className="text-muted-foreground mb-4">
              The ticket you're looking for doesn't exist or you don't have access to it.
            </p>
            <Button onClick={() => navigate("/client/tickets")}>
              Back to Tickets
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/client/tickets")}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Ticket Details</h1>
            <p className="text-muted-foreground">Ticket ID: {ticket.ticketId}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={getPriorityColor(ticket.priority)}>{ticket.priority}</Badge>
          <Badge variant={getStatusColor(ticket.status)}>{ticket.status}</Badge>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-muted-foreground mt-1" />
                <div className="flex-1">
                  <h2 className="text-xl font-semibold">{ticket.subject}</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Service: {ticket.service}
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Description
                  </h3>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {ticket.description || "No description provided."}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <h3 className="font-semibold">Ticket Information</h3>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                <Clock className="w-4 h-4 text-muted-foreground mt-1" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Created</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(ticket.createdAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                </div>
              </div>

              {ticket.updatedAt && (
                <div className="flex items-start gap-3">
                  <Clock className="w-4 h-4 text-muted-foreground mt-1" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Last Updated</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(ticket.updatedAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </p>
                  </div>
                </div>
              )}

              {ticket.assignedTo && (
                <div className="flex items-start gap-3">
                  <User className="w-4 h-4 text-muted-foreground mt-1" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Assigned To</p>
                    <p className="text-sm text-muted-foreground">{ticket.assignedTo}</p>
                  </div>
                </div>
              )}

              {ticket.category && (
                <div className="flex items-start gap-3">
                  <FileText className="w-4 h-4 text-muted-foreground mt-1" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Category</p>
                    <p className="text-sm text-muted-foreground">{ticket.category}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
