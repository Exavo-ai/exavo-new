import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, CreditCard, RefreshCw, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { StatusBadge } from "@/components/portal/StatusBadge";
import { useNavigate } from "react-router-dom";

interface Subscription {
  id: string;
  productName: string;
  plan: string;
  price: string;
  nextBilling: string;
  status: 'Active' | 'Expiring Soon' | 'Canceled';
}

interface Invoice {
  id: string;
  date: string;
  service: string;
  amount: string;
  status: string;
  invoiceUrl: string | null;
}

export default function SubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingInvoices, setLoadingInvoices] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();

  const fetchSubscriptions = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      const { data, error } = await supabase.functions.invoke("get-subscriptions", {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });

      if (error) throw error;
      setSubscriptions(data?.subscriptions || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchInvoices = async () => {
    try {
      setLoadingInvoices(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      const { data, error } = await supabase.functions.invoke("get-invoices", {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });

      if (error) throw error;
      setInvoices(data?.invoices || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoadingInvoices(false);
    }
  };

  useEffect(() => {
    fetchSubscriptions();
    fetchInvoices();
  }, []);

  const handleManageBilling = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const { data, error } = await supabase.functions.invoke("create-billing-portal", {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });

      if (error) throw error;
      
      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Subscriptions</h1>
        <p className="text-muted-foreground">Manage your active subscriptions</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : subscriptions.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              <p>No active subscriptions</p>
              <Button className="mt-4" onClick={() => navigate("/client/services/browse")}>
                Browse Services
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {subscriptions.map((sub) => (
            <Card key={sub.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="text-lg">{sub.productName}</CardTitle>
                <StatusBadge status={sub.status} className="w-fit" />
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
                  <Button variant="outline" className="w-full" onClick={handleManageBilling}>
                    <CreditCard className="w-4 h-4 mr-2" />
                    Manage Billing
                  </Button>
                  <Button variant="outline" className="w-full" onClick={handleManageBilling}>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Change Plan
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Billing History */}
      <Card>
        <CardHeader>
          <CardTitle>Billing History</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingInvoices ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : invoices.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No billing history available
            </div>
          ) : (
            <div className="space-y-4">
              {invoices.map((payment) => (
                <div key={payment.id} className="flex items-center justify-between p-4 rounded-lg border border-border">
                  <div>
                    <p className="font-medium">{payment.service}</p>
                    <p className="text-sm text-muted-foreground">{payment.date}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <p className="font-bold">{payment.amount}</p>
                    <StatusBadge status={payment.status === "Paid" ? "Active" : "Pending"} />
                    {payment.invoiceUrl && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => window.open(payment.invoiceUrl!, "_blank")}
                      >
                        Download
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
