import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { KPICard } from "@/components/portal/KPICard";
import { StatusBadge } from "@/components/portal/StatusBadge";
import { DollarSign, Bot, Zap } from "lucide-react";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { mockApi, KPIData, UsageData, Ticket, Order } from "@/lib/mockApi";
import { useNavigate } from "react-router-dom";

export default function DashboardPage() {
  const [kpiData, setKpiData] = useState<KPIData | null>(null);
  const [usageData, setUsageData] = useState<UsageData | null>(null);
  const [usageType, setUsageType] = useState<'apiCalls' | 'automations' | 'assistants'>('apiCalls');
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const [kpi, usage, ticketData, orderData] = await Promise.all([
        mockApi.getKPIData(),
        mockApi.getUsageData(),
        mockApi.getTickets(5),
        mockApi.getOrders(5),
      ]);
      setKpiData(kpi);
      setUsageData(usage);
      setTickets(ticketData);
      setOrders(orderData);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !kpiData || !usageData) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const chartData = usageData.labels.map((label, index) => ({
    name: label,
    value: usageData[usageType][index],
  }));

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="px-2 sm:px-0">
        <h1 className="text-2xl sm:text-3xl font-bold">Dashboard</h1>
        <p className="text-sm sm:text-base text-muted-foreground">Welcome to your AI workspace overview</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        <KPICard
          title="Total Spending"
          value={`$${kpiData.totalSpending.amount.toLocaleString()}`}
          trend={kpiData.totalSpending.trend}
          chartData={kpiData.totalSpending.chartData}
          icon={<DollarSign className="w-5 h-5 sm:w-6 sm:h-6 text-white" />}
        />
        <KPICard
          title="Active AI Tools"
          value={kpiData.activeTools.count}
          trend={kpiData.activeTools.trend}
          icon={<Bot className="w-5 h-5 sm:w-6 sm:h-6 text-white" />}
        />
        <KPICard
          title="Running Automations"
          value={kpiData.runningAutomations.count}
          trend={kpiData.runningAutomations.trend}
          icon={<Zap className="w-5 h-5 sm:w-6 sm:h-6 text-white" />}
        />
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
            <CardTitle className="text-lg sm:text-xl">Usage Analytics</CardTitle>
            <Select value={usageType} onValueChange={(value: any) => setUsageType(value)}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="apiCalls">API Calls</SelectItem>
                <SelectItem value="automations">Automations</SelectItem>
                <SelectItem value="assistants">AI Assistants</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-64 sm:h-80 -mx-2 sm:mx-0">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
                <Line type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={3} dot={{ fill: 'hsl(var(--primary))', r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-lg sm:text-xl">Recent Support Tickets</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => navigate('/client/tickets')} className="text-xs sm:text-sm h-8 sm:h-9">View All</Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <div className="inline-block min-w-full align-middle px-4 sm:px-0">
              <div className="space-y-3 sm:space-y-4">
                {tickets.map((ticket) => (
                  <div
                    key={ticket.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors gap-2 sm:gap-0"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium mb-1 text-sm sm:text-base truncate">{ticket.subject}</p>
                      <p className="text-xs sm:text-sm text-muted-foreground">{ticket.created}</p>
                    </div>
                    <StatusBadge status={ticket.status} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <CardTitle className="text-lg sm:text-xl">Recent Orders</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => navigate('/client/orders')} className="text-xs sm:text-sm h-8 sm:h-9">View All</Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 sm:space-y-4">
              {orders.map((order) => (
                <div
                  key={order.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors gap-2 sm:gap-0"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium mb-1 text-sm sm:text-base truncate">{order.service}</p>
                    <p className="text-xs sm:text-sm text-muted-foreground">{order.startDate}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm sm:text-base">${order.amount}</p>
                    <StatusBadge status={order.status} />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
