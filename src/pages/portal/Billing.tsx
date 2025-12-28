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
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

/* ================= TYPES ================= */

interface Invoice {
  id: string;
  amount: number;
  currency: string;
  status: string;
  created: number;
  hosted_invoice_url?: string;
  invoice_pdf?: string;
}

interface Subscription {
  id: string;
  status: string;
  planName: string;
  price: string;
  nextBilling: string;
  currency: string;
}

interface Payment {
  id: string;
  amount: number;
  currency: string;
  status: string;
  created_at: string;
  description: string | null;
  stripe_receipt_url: string | null;
  services?: { name: string } | null;
  service_packages?: { package_name: string } | null;
}

/* ================= COMPONENT ================= */

export default function BillingPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [purchases, setPurchases] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [portalLoading, setPortalLoading] = useState(false);

  useEffect(() => {
    if (user) {
      loadBillingData();
    }
  }, [user]);

  /* ================= DATA LOADING ================= */

  const loadBillingData = async () => {
    if (!user) return;

    try {
      setLoading(true);

      const { data: invoicesData } = await supabase.functions.invoke("get-invoices");
      setInvoices(invoicesData?.invoices || []);

      const { data: subsData } = await supabase.functions.invoke("get-subscriptions");
      setSubscriptions(subsData?.subscriptions || []);

      const { data: paymentsData, error } = await supabase
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
          services:service_id(name),
          service_packages:package_id(package_name)
        `,
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPurchases(paymentsData || []);
    } catch (err) {
      console.error(err);
      toast({
        title: "Error",
        description: "Failed to load billing data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  /* ================= ACTIONS ================= */

  const handleManageBilling = async () => {
    try {
      setPortalLoading(true);
      const { data } = await supabase.functions.invoke("create-billing-portal");
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
    switch (status.toLowerCase()) {
      case "paid":
      case "completed":
        return <Badge className="bg-green-500/10 text-green-600">Paid</Badge>;
      case "active":
        return <Badge className="bg-green-500/10 text-green-600">Active</Badge>;
      case "failed":
        return <Badge variant="destructive">Failed</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  /* ================= GUARDS ================= */

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <RefreshCw className="w-10 h-10 animate-spin" />
      </div>
    );
  }

  const totalSpent = purchases
    .filter((p) => p.status === "paid" || p.status === "completed")
    .reduce((sum, p) => sum + Number(p.amount), 0);

  /* ================= UI ================= */

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Billing</h1>
          <p className="text-muted-foreground">Manage your subscriptions and payments</p>
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

      {/* SUMMARY */}
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
          <CardContent>{subscriptions.length}</CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Total Purchases</CardTitle>
          </CardHeader>
          <CardContent>{purchases.length}</CardContent>
        </Card>
      </div>

      {/* TABS */}
      <Tabs defaultValue="history">
        <TabsList>
          <TabsTrigger value="history">Purchase History</TabsTrigger>
          <TabsTrigger value="subscriptions">Subscriptions</TabsTrigger>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
        </TabsList>

        {/* PURCHASES */}
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
                        <TableCell>{p.description}</TableCell>
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

        {/* SUBSCRIPTIONS */}
        <TabsContent value="subscriptions">
          <Card>
            <CardHeader>
              <CardTitle>Subscriptions</CardTitle>
            </CardHeader>
            <CardContent>
              {subscriptions.length === 0 ? (
                <p>No active subscriptions</p>
              ) : (
                subscriptions.map((s) => (
                  <div key={s.id} className="p-4 border rounded mb-2">
                    <div className="font-semibold">{s.planName}</div>
                    <div className="text-sm text-muted-foreground">{s.price}</div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* INVOICES */}
        <TabsContent value="invoices">
          <Card>
            <CardHeader>
              <CardTitle>Invoices</CardTitle>
            </CardHeader>
            <CardContent>
              {invoices.length === 0 ? (
                <p>No invoices yet</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoices.map((inv) => (
                      <TableRow key={inv.id}>
                        <TableCell>{format(new Date(inv.created * 1000), "MMM d, yyyy")}</TableCell>
                        <TableCell>
                          {inv.currency.toUpperCase()} {(inv.amount / 100).toFixed(2)}
                        </TableCell>
                        <TableCell>{getStatusBadge(inv.status)}</TableCell>
                        <TableCell className="text-right">
                          {inv.hosted_invoice_url && (
                            <Button size="sm" variant="ghost" asChild>
                              <a href={inv.hosted_invoice_url} target="_blank">
                                <ExternalLink className="w-4 h-4" />
                              </a>
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
