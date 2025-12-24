import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  CreditCard,
  Receipt,
  RefreshCw,
  ExternalLink,
  Download,
  ShoppingBag,
  AlertCircle,
  FileText,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useTeam } from "@/contexts/TeamContext";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface Invoice {
  id: string;
  amount: number;
  currency: string;
  status: string;
  created_at: string;
  pdf_url?: string;
  hosted_invoice_url?: string;
  plan_name?: string;
}

interface Subscription {
  id: string;
  status: string;
  plan_name: string;
  amount: number;
  currency: string;
  interval: string;
  current_period_end: string;
}

interface Payment {
  id: string;
  amount: number;
  currency: string;
  status: string;
  created_at: string;
  description: string | null;
  stripe_receipt_url: string | null;
  service_id: string | null;
  package_id: string | null;
  services?: { name: string } | null;
  service_packages?: { package_name: string } | null;
}

export default function BillingPage() {
  const { user } = useAuth();
  const { isWorkspaceOwner } = useTeam();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [purchases, setPurchases] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [portalLoading, setPortalLoading] = useState(false);

  useEffect(() => {
    if (!isWorkspaceOwner) {
      navigate("/client");
      return;
    }
    loadBillingData();
  }, [isWorkspaceOwner]);

  const loadBillingData = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Invoices
      const { data: invoicesData, error: invoicesError } = await supabase.functions.invoke("get-invoices");
      if (invoicesError) throw invoicesError;
      setInvoices(invoicesData?.invoices || []);

      // Subscriptions
      const { data: subsData, error: subsError } = await supabase.functions.invoke("get-subscriptions");
      if (subsError) throw subsError;
      setSubscriptions(subsData?.subscriptions || []);

      // Payments (IMPORTANT FIX)
      const { data: paymentsData, error: paymentsError } = await supabase
        .from("payments")
        .select(
          `
          id,
          amount,
          currency,
          status,
          created_at,
          description,
          stripe_receipt_url,
          service_id,
          package_id,
          services:service_id(name),
          service_packages:package_id(package_name)
        `,
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (paymentsError) throw paymentsError;
      setPurchases(paymentsData || []);
    } catch (error) {
      console.error(error);
      toast({
        title: "Error",
        description: "Failed to load billing data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleManageBilling = async () => {
    try {
      setPortalLoading(true);
      const { data, error } = await supabase.functions.invoke("create-billing-portal");
      if (error) throw error;
      if (data?.url) window.open(data.url, "_blank");
    } catch {
      toast({
        title: "Error",
        description: "Failed to open billing portal",
        variant: "destructive",
      });
    } finally {
      setPortalLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
      case "paid":
        return <Badge className="bg-green-500/10 text-green-600">Paid</Badge>;
      case "pending":
        return <Badge variant="secondary">Pending</Badge>;
      case "failed":
        return <Badge variant="destructive">Failed</Badge>;
      case "active":
        return <Badge className="bg-green-500/10 text-green-600">Active</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (!isWorkspaceOwner) {
    return (
      <div className="flex h-full items-center justify-center">
        <AlertCircle className="w-16 h-16 text-muted-foreground" />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <RefreshCw className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  const totalSpent = purchases
    .filter((p) => p.status === "completed" || p.status === "paid")
    .reduce((sum, p) => sum + Number(p.amount), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Billing</h1>
          <p className="text-muted-foreground">Manage your subscriptions and payments</p>
        </div>
        <Button onClick={handleManageBilling} disabled={portalLoading}>
          {portalLoading ? (
            <RefreshCw className="w-4 h-4 animate-spin mr-2" />
          ) : (
            <CreditCard className="w-4 h-4 mr-2" />
          )}
          Manage Billing
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Total Spent</CardTitle>
          </CardHeader>
          <CardContent>${totalSpent.toFixed(2)}</CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Active Subscriptions</CardTitle>
          </CardHeader>
          <CardContent>{subscriptions.filter((s) => s.status === "active").length}</CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Total Purchases</CardTitle>
          </CardHeader>
          <CardContent>{purchases.length}</CardContent>
        </Card>
      </div>

      <Tabs defaultValue="history">
        <TabsList>
          <TabsTrigger value="history">Purchase History</TabsTrigger>
          <TabsTrigger value="subscriptions">Subscriptions</TabsTrigger>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
        </TabsList>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Purchase History</CardTitle>
              <CardDescription>All your payments</CardDescription>
            </CardHeader>
            <CardContent>
              {purchases.length === 0 ? (
                <p>No purchases yet</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Receipt</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {purchases.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell>{format(new Date(p.created_at), "MMM d, yyyy")}</TableCell>
                        <TableCell>{p.services?.name || p.description}</TableCell>
                        <TableCell>
                          {p.currency} {Number(p.amount).toFixed(2)}
                        </TableCell>
                        <TableCell>{getStatusBadge(p.status)}</TableCell>
                        <TableCell className="text-right">
                          {p.stripe_receipt_url && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => window.open(p.stripe_receipt_url!, "_blank")}
                            >
                              <FileText className="w-4 h-4" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
