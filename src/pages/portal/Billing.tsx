import { useState } from "react";
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
import { CreditCard, Receipt, RefreshCw, ExternalLink, Download, ShoppingBag, AlertCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useTeam } from "@/contexts/TeamContext";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
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

export default function BillingPage() {
  const { user } = useAuth();
  const { isWorkspaceOwner } = useTeam();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
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
      
      // Load invoices
      const { data: invoicesData, error: invoicesError } = await supabase.functions.invoke(
        "get-invoices"
      );
      if (invoicesError) throw invoicesError;
      setInvoices(invoicesData?.invoices || []);

      // Load subscriptions
      const { data: subsData, error: subsError } = await supabase.functions.invoke(
        "get-subscriptions"
      );
      if (subsError) throw subsError;
      setSubscriptions(subsData?.subscriptions || []);
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Billing</h1>
          <p className="text-muted-foreground">Manage your subscriptions and view invoices</p>
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

      <Tabs defaultValue="subscriptions" className="space-y-6">
        <TabsList>
          <TabsTrigger value="subscriptions">Subscriptions</TabsTrigger>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
          <TabsTrigger value="history">Purchase History</TabsTrigger>
        </TabsList>

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
                <div className="text-center py-8">
                  <ShoppingBag className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No active subscriptions</p>
                  <Button className="mt-4" onClick={() => navigate("/client/services/browse")}>
                    Browse Services
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
                      <Badge variant={sub.status === "active" ? "default" : "secondary"}>
                        {sub.status}
                      </Badge>
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
              <CardDescription>Your billing history</CardDescription>
            </CardHeader>
            <CardContent>
              {invoices.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No invoices yet</p>
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
                        <TableCell>
                          {invoice.currency.toUpperCase()} {invoice.amount.toFixed(2)}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              invoice.status === "paid"
                                ? "default"
                                : invoice.status === "pending"
                                ? "secondary"
                                : "destructive"
                            }
                          >
                            {invoice.status}
                          </Badge>
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

        {/* Purchase History Tab */}
        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5" />
                Purchase History
              </CardTitle>
              <CardDescription>All your service purchases</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-center text-muted-foreground py-8">
                Purchase history from orders will appear here. View your{" "}
                <Button variant="link" className="p-0 h-auto" onClick={() => navigate("/client/projects")}>
                  projects
                </Button>{" "}
                for active service orders.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
