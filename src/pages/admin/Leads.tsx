import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Search, MessageSquare, Mail, User, Clock, Send, Calendar } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Lead {
  id: string;
  user_id: string | null;
  full_name: string;
  email: string;
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

export default function AdminLeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [messages, setMessages] = useState<LeadMessage[]>([]);
  const [replyMessage, setReplyMessage] = useState("");
  const [sendingReply, setSendingReply] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    loadLeads();
  }, []);

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
      // Insert the admin reply
      const { error: messageError } = await supabase
        .from("lead_messages")
        .insert({
          lead_id: selectedLead.id,
          sender_id: user.id,
          sender_role: "admin",
          message: replyMessage.trim(),
        });

      if (messageError) throw messageError;

      // Send email notification for guest leads
      if (!selectedLead.user_id) {
        try {
          await supabase.functions.invoke("send-lead-reply-notification", {
            body: {
              leadId: selectedLead.id,
              recipientEmail: selectedLead.email,
              recipientName: selectedLead.full_name,
              subject: selectedLead.subject,
              replyMessage: replyMessage.trim(),
            },
          });
        } catch (emailError) {
          console.error("Email notification error:", emailError);
          // Don't fail the whole operation if email fails
        }
      }

      toast({
        title: "Reply Sent",
        description: selectedLead.user_id 
          ? "Your reply has been added to the thread."
          : "Your reply has been sent via email.",
      });

      setReplyMessage("");
      await loadMessages(selectedLead.id);
      await loadLeads(); // Refresh to update status
    } catch (error: any) {
      console.error("Error sending reply:", error);
      toast({
        title: "Error",
        description: "Failed to send reply",
        variant: "destructive",
      });
    } finally {
      setSendingReply(false);
    }
  };

  const handleCloseStatus = async (status: "new" | "replied" | "closed") => {
    if (!selectedLead) return;
    
    try {
      const { error } = await supabase
        .from("leads")
        .update({ status })
        .eq("id", selectedLead.id);

      if (error) throw error;

      toast({
        title: "Status Updated",
        description: `Lead marked as ${status}`,
      });

      setSelectedLead({ ...selectedLead, status });
      await loadLeads();
    } catch (error: any) {
      console.error("Error updating status:", error);
      toast({
        title: "Error",
        description: "Failed to update status",
        variant: "destructive",
      });
    }
  };

  const filteredLeads = leads.filter((lead) => {
    const query = searchQuery.toLowerCase();
    return (
      lead.full_name.toLowerCase().includes(query) ||
      lead.email.toLowerCase().includes(query) ||
      lead.subject.toLowerCase().includes(query)
    );
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "new":
        return <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20">New</Badge>;
      case "replied":
        return <Badge className="bg-green-500/10 text-green-600 border-green-500/20">Replied</Badge>;
      case "closed":
        return <Badge variant="secondary">Closed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const calendlyLink = "https://calendly.com/exavoai-info/30min";

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Consultation Requests</h1>
        <p className="text-muted-foreground">Manage incoming consultation requests and leads</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              Lead Inbox ({leads.length})
            </CardTitle>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search leads..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredLeads.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No consultation requests yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLeads.map((lead) => (
                    <TableRow key={lead.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{lead.full_name}</p>
                          <p className="text-sm text-muted-foreground">{lead.email}</p>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {lead.subject}
                      </TableCell>
                      <TableCell>{getStatusBadge(lead.status)}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {lead.user_id ? "User" : "Guest"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(lead.created_at), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenLead(lead)}
                        >
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Lead Detail Dialog */}
      <Dialog open={!!selectedLead} onOpenChange={() => setSelectedLead(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Consultation Request</span>
              {selectedLead && getStatusBadge(selectedLead.status)}
            </DialogTitle>
          </DialogHeader>

          {selectedLead && (
            <div className="space-y-4">
              {/* Lead Info */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">{selectedLead.full_name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <a href={`mailto:${selectedLead.email}`} className="text-sm text-primary hover:underline">
                    {selectedLead.email}
                  </a>
                </div>
                <div className="flex items-center gap-2 col-span-2">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    {format(new Date(selectedLead.created_at), "PPpp")}
                  </span>
                </div>
              </div>

              {/* Original Message */}
              <div className="space-y-2">
                <h4 className="font-medium">Subject: {selectedLead.subject}</h4>
                <div className="p-4 bg-card border rounded-lg">
                  <p className="text-sm whitespace-pre-wrap">{selectedLead.message}</p>
                </div>
              </div>

              {/* Message Thread */}
              {messages.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium">Conversation</h4>
                  <ScrollArea className="h-[200px] p-4 border rounded-lg">
                    <div className="space-y-3">
                      {messages.map((msg) => (
                        <div
                          key={msg.id}
                          className={`p-3 rounded-lg ${
                            msg.sender_role === "admin"
                              ? "bg-primary/10 ml-4"
                              : "bg-muted mr-4"
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className="text-xs">
                              {msg.sender_role === "admin" ? "Admin" : "User"}
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
                </div>
              )}

              {/* Reply Section */}
              <div className="space-y-3 border-t pt-4">
                <div className="flex items-center gap-2">
                  <h4 className="font-medium">Reply</h4>
                  {!selectedLead.user_id && (
                    <Badge variant="outline" className="text-xs">
                      Will be sent via email
                    </Badge>
                  )}
                </div>
                
                <Textarea
                  placeholder="Type your reply..."
                  value={replyMessage}
                  onChange={(e) => setReplyMessage(e.target.value)}
                  className="min-h-[100px]"
                />

                <div className="flex flex-wrap gap-2">
                  <Button
                    onClick={handleSendReply}
                    disabled={!replyMessage.trim() || sendingReply}
                  >
                    <Send className="w-4 h-4 mr-2" />
                    {sendingReply ? "Sending..." : "Send Reply"}
                  </Button>
                  
                  <Button
                    variant="outline"
                    onClick={() => {
                      setReplyMessage(prev => 
                        prev + (prev ? "\n\n" : "") + 
                        `Schedule a call with us: ${calendlyLink}`
                      );
                    }}
                  >
                    <Calendar className="w-4 h-4 mr-2" />
                    Add Calendly Link
                  </Button>

                  {selectedLead.status !== "closed" && (
                    <Button
                      variant="secondary"
                      onClick={() => handleCloseStatus("closed")}
                    >
                      Mark as Closed
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
