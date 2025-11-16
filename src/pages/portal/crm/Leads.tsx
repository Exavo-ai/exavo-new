import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, Star } from "lucide-react";

const leads = [
  {
    id: 1,
    name: "Sarah Johnson",
    email: "sarah.j@startup.com",
    company: "StartupXYZ",
    source: "Website",
    status: "Hot",
    score: 95,
    date: "2025-11-14",
  },
  {
    id: 2,
    name: "Michael Chen",
    email: "m.chen@enterprise.com",
    company: "Enterprise Corp",
    source: "Referral",
    status: "Warm",
    score: 78,
    date: "2025-11-13",
  },
  {
    id: 3,
    name: "Emily Davis",
    email: "emily@smallbiz.com",
    company: "Small Business LLC",
    source: "LinkedIn",
    status: "Cold",
    score: 45,
    date: "2025-11-12",
  },
];

const getStatusColor = (status: string) => {
  switch (status) {
    case "Hot": return "destructive";
    case "Warm": return "default";
    case "Cold": return "secondary";
    default: return "outline";
  }
};

export default function LeadsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Leads</h1>
          <p className="text-muted-foreground">Track and manage your sales leads</p>
        </div>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Add Lead
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search leads..." className="pl-10" />
            </div>
            <Button variant="outline">Filters</Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border text-left text-sm text-muted-foreground">
                  <th className="pb-3 font-medium">Name</th>
                  <th className="pb-3 font-medium">Company</th>
                  <th className="pb-3 font-medium">Source</th>
                  <th className="pb-3 font-medium">Score</th>
                  <th className="pb-3 font-medium">Status</th>
                  <th className="pb-3 font-medium">Date</th>
                  <th className="pb-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((lead) => (
                  <tr key={lead.id} className="border-b border-border last:border-0 hover:bg-muted/50">
                    <td className="py-4">
                      <div>
                        <p className="font-medium">{lead.name}</p>
                        <p className="text-sm text-muted-foreground">{lead.email}</p>
                      </div>
                    </td>
                    <td className="py-4">{lead.company}</td>
                    <td className="py-4">
                      <Badge variant="outline">{lead.source}</Badge>
                    </td>
                    <td className="py-4">
                      <div className="flex items-center gap-2">
                        <Star className="w-4 h-4 text-primary fill-primary" />
                        <span className="font-semibold">{lead.score}</span>
                      </div>
                    </td>
                    <td className="py-4">
                      <Badge variant={getStatusColor(lead.status)}>{lead.status}</Badge>
                    </td>
                    <td className="py-4 text-muted-foreground">{lead.date}</td>
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
