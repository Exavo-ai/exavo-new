import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TrendingUp, TrendingDown, DollarSign, Zap, Activity, AlertCircle } from "lucide-react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const statsData = {
  spending: {
    amount: "$12,540",
    trend: "+12.5%",
    trendUp: true,
    chartData: [
      { month: "Jan", value: 2400 },
      { month: "Feb", value: 1398 },
      { month: "Mar", value: 9800 },
      { month: "Apr", value: 3908 },
      { month: "May", value: 4800 },
      { month: "Jun", value: 3800 },
    ],
  },
  activeTools: {
    count: 24,
    trend: "+8.2%",
    trendUp: true,
  },
  automations: {
    count: 12,
    trend: "+15%",
    trendUp: true,
  },
};

const usageData = [
  { month: "Jan", apiCalls: 4000, automations: 2400, aiAssistants: 2400 },
  { month: "Feb", apiCalls: 3000, automations: 1398, aiAssistants: 2210 },
  { month: "Mar", apiCalls: 2000, automations: 9800, aiAssistants: 2290 },
  { month: "Apr", apiCalls: 2780, automations: 3908, aiAssistants: 2000 },
  { month: "May", apiCalls: 1890, automations: 4800, aiAssistants: 2181 },
  { month: "Jun", apiCalls: 2390, automations: 3800, aiAssistants: 2500 },
];

const tickets = [
  {
    id: "TKT-001",
    subject: "API Integration Issue",
    priority: "High",
    service: "AI Chatbot",
    status: "In Progress",
    created: "2025-11-14",
  },
  {
    id: "TKT-002",
    subject: "Billing Question",
    priority: "Medium",
    service: "Subscription",
    status: "Open",
    created: "2025-11-13",
  },
  {
    id: "TKT-003",
    subject: "Feature Request",
    priority: "Low",
    service: "Workflow Automation",
    status: "Pending",
    created: "2025-11-12",
  },
];

const orders = [
  {
    id: "ORD-001",
    service: "AI Content Generator",
    type: "Subscription",
    startDate: "2025-11-01",
    endDate: "2025-12-01",
    status: "Ongoing",
  },
  {
    id: "ORD-002",
    service: "Predictive Analytics",
    type: "One-time",
    startDate: "2025-10-15",
    endDate: "2025-11-15",
    status: "Completed",
  },
  {
    id: "ORD-003",
    service: "Marketing Automation",
    type: "Subscription",
    startDate: "2025-11-10",
    endDate: "2025-12-10",
    status: "Review",
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
    case "Ongoing": return "default";
    case "Completed": return "secondary";
    case "Review": return "outline";
    case "Pending": return "secondary";
    case "In Progress": return "default";
    case "Open": return "destructive";
    default: return "outline";
  }
};

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Total Spending */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Spending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-3xl font-bold">{statsData.spending.amount}</p>
                  <div className="flex items-center gap-2 mt-2">
                    {statsData.spending.trendUp ? (
                      <TrendingUp className="w-4 h-4 text-accent" />
                    ) : (
                      <TrendingDown className="w-4 h-4 text-destructive" />
                    )}
                    <span className="text-sm text-accent font-medium">{statsData.spending.trend}</span>
                    <span className="text-xs text-muted-foreground">vs last month</span>
                  </div>
                </div>
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-primary" />
                </div>
              </div>
              <ResponsiveContainer width="100%" height={60}>
                <LineChart data={statsData.spending.chartData}>
                  <Line type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Active AI Tools */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active AI Tools</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold">{statsData.activeTools.count}</p>
                <div className="flex items-center gap-2 mt-2">
                  <TrendingUp className="w-4 h-4 text-accent" />
                  <span className="text-sm text-accent font-medium">{statsData.activeTools.trend}</span>
                  <span className="text-xs text-muted-foreground">this month</span>
                </div>
              </div>
              <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center">
                <Zap className="w-6 h-6 text-accent" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Running Automations */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Running Automations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold">{statsData.automations.count}</p>
                <div className="flex items-center gap-2 mt-2">
                  <TrendingUp className="w-4 h-4 text-accent" />
                  <span className="text-sm text-accent font-medium">{statsData.automations.trend}</span>
                  <span className="text-xs text-muted-foreground">active now</span>
                </div>
              </div>
              <div className="w-12 h-12 rounded-full bg-secondary/10 flex items-center justify-center">
                <Activity className="w-6 h-6 text-secondary" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Usage Analytics Chart */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>AI Tools Usage Overview</CardTitle>
            <Select defaultValue="apiCalls">
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="apiCalls">API Calls</SelectItem>
                <SelectItem value="automations">Automations</SelectItem>
                <SelectItem value="aiAssistants">AI Assistants</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={usageData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" />
              <YAxis stroke="hsl(var(--muted-foreground))" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                }}
              />
              <Bar dataKey="apiCalls" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Support Tickets & Recent Orders */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Support Tickets */}
        <Card>
          <CardHeader>
            <CardTitle>Support Tickets</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {tickets.map((ticket) => (
                <div
                  key={ticket.id}
                  className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                >
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-muted-foreground" />
                      <p className="font-medium">{ticket.subject}</p>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{ticket.id}</span>
                      <span>•</span>
                      <span>{ticket.service}</span>
                      <span>•</span>
                      <span>{ticket.created}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={getPriorityColor(ticket.priority)}>{ticket.priority}</Badge>
                    <Badge variant={getStatusColor(ticket.status)}>{ticket.status}</Badge>
                  </div>
                </div>
              ))}
            </div>
            <Button variant="outline" className="w-full mt-4">
              View All Tickets
            </Button>
          </CardContent>
        </Card>

        {/* Recent Orders */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {orders.map((order) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                >
                  <div className="space-y-1 flex-1">
                    <p className="font-medium">{order.service}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{order.id}</span>
                      <span>•</span>
                      <span>{order.type}</span>
                      <span>•</span>
                      <span>{order.startDate}</span>
                    </div>
                  </div>
                  <Badge variant={getStatusColor(order.status)}>{order.status}</Badge>
                </div>
              ))}
            </div>
            <Button variant="outline" className="w-full mt-4">
              View All Orders
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
