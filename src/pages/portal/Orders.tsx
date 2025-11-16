import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search } from "lucide-react";

const orders = [
  {
    id: "ORD-001",
    service: "AI Content Generator Pro",
    type: "Subscription",
    startDate: "2025-11-01",
    endDate: "2025-12-01",
    status: "Ongoing",
    amount: "$99.00",
  },
  {
    id: "ORD-002",
    service: "Predictive Analytics Suite",
    type: "One-time",
    startDate: "2025-10-15",
    endDate: "2025-11-15",
    status: "Completed",
    amount: "$299.00",
  },
  {
    id: "ORD-003",
    service: "Marketing Automation Basic",
    type: "Subscription",
    startDate: "2025-11-10",
    endDate: "2025-12-10",
    status: "Review",
    amount: "$49.00",
  },
  {
    id: "ORD-004",
    service: "Custom AI Model Training",
    type: "One-time",
    startDate: "2025-10-01",
    endDate: "2025-11-01",
    status: "Completed",
    amount: "$1,500.00",
  },
  {
    id: "ORD-005",
    service: "Workflow Automation Pro",
    type: "Subscription",
    startDate: "2025-11-05",
    endDate: "2025-12-05",
    status: "Pending",
    amount: "$149.00",
  },
];

const getStatusColor = (status: string) => {
  switch (status) {
    case "Ongoing": return "default";
    case "Completed": return "secondary";
    case "Review": return "outline";
    case "Pending": return "outline";
    default: return "secondary";
  }
};

export default function OrdersPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Orders</h1>
          <p className="text-muted-foreground">Track your service orders and purchases</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search orders..." className="pl-10" />
            </div>
            <Button variant="outline">Filters</Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border text-left text-sm text-muted-foreground">
                  <th className="pb-3 font-medium">Order ID</th>
                  <th className="pb-3 font-medium">Service Name</th>
                  <th className="pb-3 font-medium">Billing Type</th>
                  <th className="pb-3 font-medium">Start Date</th>
                  <th className="pb-3 font-medium">End Date</th>
                  <th className="pb-3 font-medium">Amount</th>
                  <th className="pb-3 font-medium">Status</th>
                  <th className="pb-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id} className="border-b border-border last:border-0 hover:bg-muted/50">
                    <td className="py-4 font-mono text-sm">{order.id}</td>
                    <td className="py-4 font-medium">{order.service}</td>
                    <td className="py-4">
                      <Badge variant="outline">{order.type}</Badge>
                    </td>
                    <td className="py-4 text-muted-foreground">{order.startDate}</td>
                    <td className="py-4 text-muted-foreground">{order.endDate}</td>
                    <td className="py-4 font-semibold">{order.amount}</td>
                    <td className="py-4">
                      <Badge variant={getStatusColor(order.status)}>{order.status}</Badge>
                    </td>
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
