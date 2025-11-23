import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Ticket {
  id: string;
  subject: string;
  status: string;
  priority: string;
}

interface TicketReplyDialogProps {
  ticket: Ticket | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function TicketReplyDialog({ ticket, open, onOpenChange, onSuccess }: TicketReplyDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [reply, setReply] = useState("");
  const [status, setStatus] = useState("open");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticket || !reply.trim()) {
      toast({
        title: "Error",
        description: "Please enter a reply message",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Get current admin user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      // Save the reply to ticket_replies table
      const { error: replyError } = await supabase
        .from("ticket_replies")
        .insert({
          ticket_id: ticket.id,
          user_id: user.id,
          message: reply,
          is_admin: true,
        });

      if (replyError) throw replyError;

      // Update ticket status
      const { error: updateError } = await supabase
        .from("tickets")
        .update({
          status: status,
          updated_at: new Date().toISOString(),
          ...(status === "closed" && { closed_at: new Date().toISOString() }),
        })
        .eq("id", ticket.id);

      if (updateError) throw updateError;

      // Send email notification to user
      const { error: emailError } = await supabase.functions.invoke(
        "send-ticket-reply-notification",
        {
          body: {
            ticketId: ticket.id,
            replyMessage: reply,
            adminUserId: user.id,
          },
        }
      );

      if (emailError) {
        console.error("Error sending email notification:", emailError);
        // Don't fail the whole operation if email fails
        toast({
          title: "Warning",
          description: "Reply saved but email notification failed",
          variant: "destructive",
        });
      }

      toast({
        title: "Success",
        description: "Reply sent and user notified via email",
      });

      onSuccess();
      onOpenChange(false);
      setReply("");
      setStatus("open");
    } catch (error: any) {
      console.error("Error sending reply:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to send reply",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Reply to Ticket</DialogTitle>
          <p className="text-sm text-muted-foreground">{ticket?.subject}</p>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="reply">Reply Message</Label>
            <Textarea
              id="reply"
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              placeholder="Type your reply here..."
              rows={5}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Update Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Sending..." : "Send Reply"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
