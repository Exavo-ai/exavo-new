import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, CreditCard, RefreshCw } from "lucide-react";

const subscriptions = [
  {
    id: 1,
    name: "AI Content Generator Pro",
    plan: "Premium",
    price: "$99/month",
    nextBilling: "2025-12-01",
    status: "Active",
  },
  {
    id: 2,
    name: "Predictive Analytics Suite",
    plan: "Enterprise",
    price: "$299/month",
    nextBilling: "2025-12-15",
    status: "Active",
  },
  {
    id: 3,
    name: "Marketing Automation",
    plan: "Starter",
    price: "$49/month",
    nextBilling: "2025-11-20",
    status: "Expiring Soon",
  },
];

export default function SubscriptionsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Subscriptions</h1>
          <p className="text-muted-foreground">Manage your active subscriptions</p>
        </div>
        <Button>Browse Services</Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {subscriptions.map((sub) => (
          <Card key={sub.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="text-lg">{sub.name}</CardTitle>
              <Badge variant={sub.status === "Active" ? "default" : "destructive"} className="w-fit">
                {sub.status}
              </Badge>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Plan</span>
                  <span className="font-medium">{sub.plan}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground text-sm">Price</span>
                  <span className="text-2xl font-bold">{sub.price}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Next billing:</span>
                  <span className="font-medium">{sub.nextBilling}</span>
                </div>
              </div>
              <div className="space-y-2 pt-4 border-t">
                <Button variant="outline" className="w-full">
                  <CreditCard className="w-4 h-4 mr-2" />
                  Manage Billing
                </Button>
                <Button variant="outline" className="w-full">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Change Plan
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Billing History */}
      <Card>
        <CardHeader>
          <CardTitle>Billing History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[
              { date: "2025-11-01", service: "AI Content Generator Pro", amount: "$99.00", status: "Paid" },
              { date: "2025-10-15", service: "Predictive Analytics Suite", amount: "$299.00", status: "Paid" },
              { date: "2025-10-01", service: "AI Content Generator Pro", amount: "$99.00", status: "Paid" },
            ].map((payment, idx) => (
              <div key={idx} className="flex items-center justify-between p-4 rounded-lg border border-border">
                <div>
                  <p className="font-medium">{payment.service}</p>
                  <p className="text-sm text-muted-foreground">{payment.date}</p>
                </div>
                <div className="flex items-center gap-4">
                  <p className="font-bold">{payment.amount}</p>
                  <Badge variant="secondary">{payment.status}</Badge>
                  <Button variant="ghost" size="sm">Download</Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
