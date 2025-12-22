import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CreditCard, Receipt, RefreshCw, ExternalLink, Download, ShoppingBag, AlertCircle, FileText } from "lucide-react";
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
  period_start?: string;
  period_end?: string;
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
  services?: {
    name: string;
  } | null;
  service_packages?: {
    package_name: string;
  } | null;
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
  }, [isWorkspaceOwner, navigate]);

  const loadBillingData = async () => {
    try {
      setLoading(true);
      
      // Load invoices from Stripe
      const { data: invoicesData, error: invoicesError } = await supabase.functions.invoke(
        "get-invoices"
      );
      if (invoicesError) throw invoicesError;
      setInvoices(invoicesData?.invoices || []);

      // Load subscriptions from Stripe
      const { data: subsData, error: subsError } = await supabase.functions.invoke(
        "get-subscriptions"
      );
      if (subsError) throw subsError;
      setSubscriptions(subsData?.subscriptions || []);

      // Load purchase history from database
      const { data: paymentsData, error: paymentsError } = await supabase
        .from("payments")
        .select(`
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
        `)
        .order("created_at", { ascending: false });
      
      if (paymentsError) throw paymentsError;
      setPurchases(paymentsData || []);

    } catch (error: any) {
      console.error("Error loading billing data:", error);
      toast({
        title: "Error",
        description: "Failed to load billing information",
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
      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } catch (error: any) {
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
    switch (status.toLowerCase()) {
      case "completed":
      case "paid":
        return <Badge className="bg-green-500/10 text-green-600 border-green-500/20">Paid</Badge>;
      case "pending":
        return <Badge variant="secondary">Pending</Badge>;
      case "failed":
        return <Badge variant="destructive">Failed</Badge>;
      case "active":
        return <Badge className="bg-green-500/10 text-green-600 border-green-500/20">Active</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (!isWorkspaceOwner) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center space-y-4">
          <AlertCircle className="w-16 h-16 text-muted-foreground mx-auto" />
          <div>
            <p className="text-lg font-semibold">Access Denied</p>
            <p className="text-muted-foreground">Only workspace owners can access billing.</p>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading billing information...</p>
        </div>
      </div>
    );
  }

  const totalSpent = purchases
    .filter(p => p.status === "completed" || p.status === "paid")
    .reduce((sum, p) => sum + Number(p.amount), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Billing</h1>
          <p className="text-muted-foreground">Manage your subscriptions and view purchase history</p>
        </div>
        <Button onClick={handleManageBilling} disabled={portalLoading}>
          {portalLoading ? (
            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <CreditCard className="w-4 h-4 mr-2" />
          )}
          Manage Billing
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Spent</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalSpent.toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Subscriptions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{subscriptions.filter(s => s.status === "active").length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Purchases</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{purchases.length}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="history" className="space-y-6">
        <TabsList>
          <TabsTrigger value="history">Purchase History</TabsTrigger>
          <TabsTrigger value="subscriptions">Subscriptions</TabsTrigger>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
        </TabsList>

        {/* Purchase History Tab */}
        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5" />
                Purchase History
              </CardTitle>
              <CardDescription>All your one-time purchases and service orders</CardDescription>
            </CardHeader>
            <CardContent>
              {purchases.length === 0 ? (
                <div className="text-center py-12">
                  <ShoppingBag className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-lg font-medium">No purchases yet</p>
                  <p className="text-muted-foreground mb-4">Your purchase history will appear here</p>
                  <Button onClick={() => navigate("/client/services/browse")}>
                    Browse Services
                  </Button>
                </div>
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
                    {purchases.map((purchase) => (
                      <TableRow key={purchase.id}>
                        <TableCell className="whitespace-nowrap">
                          {format(new Date(purchase.created_at), "MMM d, yyyy")}
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">
                            {purchase.services?.name || purchase.description || "Payment"}
                          </div>
                          {purchase.service_packages?.package_name && (
                            <div className="text-xs text-muted-foreground">
                              {purchase.service_packages.package_name}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="font-semibold">
                          {purchase.currency} {Number(purchase.amount).toFixed(2)}
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(purchase.status)}
                        </TableCell>
                        <TableCell className="text-right">
                          {purchase.stripe_receipt_url ? (
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => window.open(purchase.stripe_receipt_url!, '_blank')}
                              >
                                <FileText className="w-4 h-4 mr-1" />
                                View
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => window.open(purchase.stripe_receipt_url!, '_blank')}
                              >
                                <Download className="w-4 h-4" />
                              </Button>
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">—</span>
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

        {/* Subscriptions Tab */}
        <TabsContent value="subscriptions">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <RefreshCw className="w-5 h-5" />
                Active Subscriptions
              </CardTitle>
              <CardDescription>Your current subscription plans</CardDescription>
            </CardHeader>
            <CardContent>
              {subscriptions.length === 0 ? (
                <div className="text-center py-12">
                  <CreditCard className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-lg font-medium">No active subscriptions</p>
                  <p className="text-muted-foreground mb-4">Subscribe to a plan to get started</p>
                  <Button onClick={() => navigate("/client/services/browse")}>
                    Browse Plans
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {subscriptions.map((sub) => (
                    <div key={sub.id} className="p-4 rounded-lg border flex items-center justify-between">
                      <div>
                        <h4 className="font-semibold">{sub.plan_name}</h4>
                        <p className="text-sm text-muted-foreground">
                          {sub.currency.toUpperCase()} {sub.amount.toFixed(2)} / {sub.interval}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Renews: {format(new Date(sub.current_period_end), "MMM d, yyyy")}
                        </p>
                      </div>
                      {getStatusBadge(sub.status)}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Invoices Tab */}
        <TabsContent value="invoices">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Receipt className="w-5 h-5" />
                Invoices
              </CardTitle>
              <CardDescription>Your billing history from subscriptions</CardDescription>
            </CardHeader>
            <CardContent>
              {invoices.length === 0 ? (
                <div className="text-center py-12">
                  <Receipt className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No invoices yet</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Plan</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoices.map((invoice) => (
                      <TableRow key={invoice.id}>
                        <TableCell>
                          {format(new Date(invoice.created_at), "MMM d, yyyy")}
                        </TableCell>
                        <TableCell className="font-semibold">
                          {invoice.currency.toUpperCase()} {invoice.amount.toFixed(2)}
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(invoice.status)}
                        </TableCell>
                        <TableCell>{invoice.plan_name || "—"}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            {invoice.hosted_invoice_url && (
                              <Button variant="ghost" size="sm" asChild>
                                <a
                                  href={invoice.hosted_invoice_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  <ExternalLink className="w-4 h-4" />
                                </a>
                              </Button>
                            )}
                            {invoice.pdf_url && (
                              <Button variant="ghost" size="sm" asChild>
                                <a
                                  href={invoice.pdf_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  <Download className="w-4 h-4" />
                                </a>
                              </Button>
                            )}
                          </div>
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