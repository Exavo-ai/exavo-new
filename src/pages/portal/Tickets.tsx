import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, AlertCircle } from "lucide-react";

const tickets = [
  {
    id: "TKT-001",
    subject: "API Integration Issue with Chatbot",
    priority: "High",
    service: "AI Chatbot Pro",
    status: "In Progress",
    created: "2025-11-14",
    updated: "2025-11-15",
  },
  {
    id: "TKT-002",
    subject: "Billing Question - Subscription Renewal",
    priority: "Medium",
    service: "Subscription Management",
    status: "Open",
    created: "2025-11-13",
    updated: "2025-11-13",
  },
  {
    id: "TKT-003",
    subject: "Feature Request - Export Data",
    priority: "Low",
    service: "Analytics Dashboard",
    status: "Pending",
    created: "2025-11-12",
    updated: "2025-11-14",
  },
  {
    id: "TKT-004",
    subject: "Login Issue - Can't Access Dashboard",
    priority: "High",
    service: "Portal Access",
    status: "Resolved",
    created: "2025-11-10",
    updated: "2025-11-11",
  },
];

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case "High": return "destructive";
    case "Medium": return "default";
    case "Low": return "secondary";
    default: return "outline";
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case "In Progress": return "default";
    case "Open": return "destructive";
    case "Pending": return "secondary";
    case "Resolved": return "outline";
    default: return "outline";
  }
};

export default function TicketsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Support Tickets</h1>
          <p className="text-muted-foreground">Track and manage your support requests</p>
        </div>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Create Ticket
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search tickets..." className="pl-10" />
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
                {tickets.map((ticket) => (
                  <tr key={ticket.id} className="border-b border-border last:border-0 hover:bg-muted/50">
                    <td className="py-4">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-muted-foreground" />
                        <span className="font-medium">{ticket.subject}</span>
                      </div>
                    </td>
                    <td className="py-4">
                      <Badge variant={getPriorityColor(ticket.priority)}>{ticket.priority}</Badge>
                    </td>
                    <td className="py-4 text-muted-foreground">{ticket.service}</td>
                    <td className="py-4 font-mono text-sm">{ticket.id}</td>
                    <td className="py-4">
                      <Badge variant={getStatusColor(ticket.status)}>{ticket.status}</Badge>
                    </td>
                    <td className="py-4 text-muted-foreground">{ticket.created}</td>
                    <td className="py-4">
                      <Button variant="ghost" size="sm">View</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
