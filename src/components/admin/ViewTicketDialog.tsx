import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Clock, User, FileText, AlertCircle } from "lucide-react";

interface Ticket {
  id: string;
  subject: string;
  description: string;
  status: string;
  priority: string;
  service: string | null;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
  user_id: string;
}

interface ViewTicketDialogProps {
  ticket: Ticket | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const getPriorityColor = (priority: string) => {
  switch (priority.toLowerCase()) {
    case "high":
      return "destructive";
    case "medium":
      return "default";
    case "low":
      return "secondary";
    default:
      return "secondary";
  }
};

const getStatusColor = (status: string) => {
  switch (status.toLowerCase()) {
    case "open":
      return "default";
    case "pending":
      return "secondary";
    case "closed":
      return "outline";
    default:
      return "secondary";
  }
};

export function ViewTicketDialog({ ticket, open, onOpenChange }: ViewTicketDialogProps) {
  if (!ticket) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Ticket Details
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold mb-2">{ticket.subject}</h3>
            <div className="flex items-center gap-2 mb-4">
              <Badge variant={getPriorityColor(ticket.priority)}>
                {ticket.priority}
              </Badge>
              <Badge variant={getStatusColor(ticket.status)}>
                {ticket.status}
              </Badge>
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <h4 className="text-sm font-medium">Description</h4>
              </div>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap pl-6">
                {ticket.description}
              </p>
            </div>

            {ticket.service && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <h4 className="text-sm font-medium">Service</h4>
                </div>
                <p className="text-sm text-muted-foreground pl-6">
                  {ticket.service}
                </p>
              </div>
            )}

            <div>
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <h4 className="text-sm font-medium">Created</h4>
              </div>
              <p className="text-sm text-muted-foreground pl-6">
                {new Date(ticket.created_at).toLocaleString()}
              </p>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <h4 className="text-sm font-medium">Last Updated</h4>
              </div>
              <p className="text-sm text-muted-foreground pl-6">
                {new Date(ticket.updated_at).toLocaleString()}
              </p>
            </div>

            {ticket.closed_at && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <h4 className="text-sm font-medium">Closed</h4>
                </div>
                <p className="text-sm text-muted-foreground pl-6">
                  {new Date(ticket.closed_at).toLocaleString()}
                </p>
              </div>
            )}

            <div>
              <div className="flex items-center gap-2 mb-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <h4 className="text-sm font-medium">User ID</h4>
              </div>
              <p className="text-sm text-muted-foreground font-mono pl-6">
                {ticket.user_id}
              </p>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <h4 className="text-sm font-medium">Ticket ID</h4>
              </div>
              <p className="text-sm text-muted-foreground font-mono pl-6">
                {ticket.id}
              </p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
