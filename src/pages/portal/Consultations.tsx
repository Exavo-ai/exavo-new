import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { MessageSquare, Plus, Send, Clock } from "lucide-react";
import { ConsultationRequestForm } from "@/components/ConsultationRequestForm";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Lead {
  id: string;
  subject: string;
  message: string;
  status: string;
  created_at: string;
  updated_at: string;
}

interface LeadMessage {
  id: string;
  lead_id: string;
  sender_id: string | null;
  sender_role: string;
  message: string;
  created_at: string;
}

export default function ConsultationsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [messages, setMessages] = useState<LeadMessage[]>([]);
  const [replyMessage, setReplyMessage] = useState("");
  const [sendingReply, setSendingReply] = useState(false);
  const [showNewDialog, setShowNewDialog] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      loadLeads();
    }
  }, [user]);

  const loadLeads = async () => {
    try {
      const { data, error } = await supabase
        .from("leads")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setLeads(data || []);
    } catch (error: any) {
      console.error("Error loading leads:", error);
      toast({
        title: "Error",
        description: "Failed to load consultation requests",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (leadId: string) => {
    try {
      const { data, error } = await supabase
        .from("lead_messages")
        .select("*")
        .eq("lead_id", leadId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (error: any) {
      console.error("Error loading messages:", error);
    }
  };

  const handleOpenLead = async (lead: Lead) => {
    setSelectedLead(lead);
    await loadMessages(lead.id);
  };

  const handleSendReply = async () => {
    if (!selectedLead || !replyMessage.trim() || !user) return;

    setSendingReply(true);
    try {
      const { error } = await supabase
        .from("lead_messages")
        .insert({
          lead_id: selectedLead.id,
          sender_id: user.id,
          sender_role: "user",
          message: replyMessage.trim(),
        });

      if (error) throw error;

      toast({
        title: "Message Sent",
        description: "Your message has been added to the thread.",
      });

      setReplyMessage("");
      await loadMessages(selectedLead.id);
    } catch (error: any) {
      console.error("Error sending reply:", error);
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      });
    } finally {
      setSendingReply(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "new":
        return <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20">Pending</Badge>;
      case "replied":
        return <Badge className="bg-green-500/10 text-green-600 border-green-500/20">Replied</Badge>;
      case "closed":
        return <Badge variant="secondary">Closed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">My Consultations</h1>
          <p className="text-muted-foreground">Track your consultation requests</p>
        </div>
        <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              New Request
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Request Consultation</DialogTitle>
            </DialogHeader>
            <ConsultationRequestForm 
              onSuccess={() => {
                setShowNewDialog(false);
                loadLeads();
              }} 
            />
          </DialogContent>
        </Dialog>
      </div>

      {leads.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <MessageSquare className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-medium mb-2">No Consultation Requests</h3>
            <p className="text-muted-foreground mb-4">
              Request a consultation to get personalized help with your project.
            </p>
            <Button onClick={() => setShowNewDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Request Consultation
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {leads.map((lead) => (
            <Card 
              key={lead.id} 
              className="cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => handleOpenLead(lead)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-base truncate">{lead.subject}</CardTitle>
                    <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      {format(new Date(lead.created_at), "MMM d, yyyy")}
                    </div>
                  </div>
                  {getStatusBadge(lead.status)}
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {lead.message}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Lead Detail Dialog */}
      <Dialog open={!!selectedLead} onOpenChange={() => setSelectedLead(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between pr-8">
              <span className="truncate">{selectedLead?.subject}</span>
              {selectedLead && getStatusBadge(selectedLead.status)}
            </DialogTitle>
          </DialogHeader>

          {selectedLead && (
            <div className="space-y-4">
              {/* Original Message */}
              <div className="p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline" className="text-xs">You</Badge>
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(selectedLead.created_at), "MMM d, h:mm a")}
                  </span>
                </div>
                <p className="text-sm whitespace-pre-wrap">{selectedLead.message}</p>
              </div>

              {/* Message Thread */}
              {messages.length > 0 && (
                <ScrollArea className="h-[250px] border rounded-lg p-4">
                  <div className="space-y-3">
                    {messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`p-3 rounded-lg ${
                          msg.sender_role === "admin"
                            ? "bg-primary/10 mr-4"
                            : "bg-muted ml-4"
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="text-xs">
                            {msg.sender_role === "admin" ? "Exavo Team" : "You"}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(msg.created_at), "MMM d, h:mm a")}
                          </span>
                        </div>
                        <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}

              {/* Reply Section */}
              {selectedLead.status !== "closed" && (
                <div className="space-y-3 border-t pt-4">
                  <Textarea
                    placeholder="Type a message..."
                    value={replyMessage}
                    onChange={(e) => setReplyMessage(e.target.value)}
                    className="min-h-[80px]"
                  />
                  <Button
                    onClick={handleSendReply}
                    disabled={!replyMessage.trim() || sendingReply}
                    className="w-full sm:w-auto"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    {sendingReply ? "Sending..." : "Send Message"}
                  </Button>
                </div>
              )}

              {selectedLead.status === "closed" && (
                <p className="text-center text-sm text-muted-foreground py-4 border-t">
                  This consultation has been closed.
                </p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
