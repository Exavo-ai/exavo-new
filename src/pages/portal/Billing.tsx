import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CreditCard, RefreshCw, ShoppingBag, AlertCircle, FileText, ExternalLink } from "lucide-react";
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

      const { data: inv } = await supabase.functions.invoke("get-invoices");
      setInvoices(inv?.invoices || []);

      const { data: subs } = await supabase.functions.invoke("get-subscriptions");
      setSubscriptions(subs?.subscriptions || []);

      const { data: pays } = await supabase
        .from("payments")
        .select("id,amount,currency,status,created_at,description,stripe_receipt_url")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      setPurchases(pays || []);
    } catch {
      toast({
        title: "Error",
        description: "Failed to load billing data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const badge = (s: string) => <Badge variant={s === "active" || s === "paid" ? "default" : "secondary"}>{s}</Badge>;

  if (!isWorkspaceOwner) {
    return (
      <div className="flex h-full items-center justify-center">
        <AlertCircle className="w-16 h-16" />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <RefreshCw className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between">
        <h1 className="text-3xl font-bold">Billing</h1>
        <Button>
          <CreditCard className="w-4 h-4 mr-2" />
          Manage Billing
        </Button>
      </div>

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
              <CardTitle>Purchases</CardTitle>
            </CardHeader>
            <CardContent>
              {purchases.length === 0 ? (
                <p>No purchases yet</p>
              ) : (
                <Table>
                  <TableBody>
                    {purchases.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell>{format(new Date(p.created_at), "MMM d, yyyy")}</TableCell>
                        <TableCell>{p.description}</TableCell>
                        <TableCell>
                          {p.currency} {p.amount}
                        </TableCell>
                        <TableCell>{badge(p.status)}</TableCell>
                        <TableCell>
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
                  <div key={s.id} className="border p-4 rounded mb-3">
                    <p className="font-bold">{s.plan_name}</p>
                    <p>
                      {s.currency} {s.amount}/{s.interval}
                    </p>
                    <p>Renews: {format(new Date(s.current_period_end), "MMM d, yyyy")}</p>
                    {badge(s.status)}
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
                <p>No invoices</p>
              ) : (
                invoices.map((i) => (
                  <div key={i.id} className="border p-4 rounded mb-3">
                    <p>
                      {i.currency} {i.amount}
                    </p>
                    <p>{format(new Date(i.created_at), "MMM d, yyyy")}</p>
                    <div className="flex gap-2">
                      {i.hosted_invoice_url && (
                        <Button size="sm" variant="ghost" onClick={() => window.open(i.hosted_invoice_url!, "_blank")}>
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
