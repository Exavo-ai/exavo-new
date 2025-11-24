import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Calendar, CreditCard, RefreshCw, Loader2, Lock, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { StatusBadge } from "@/components/portal/StatusBadge";
import { useNavigate } from "react-router-dom";
import { useTeam } from "@/contexts/TeamContext";

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

interface Plan {
  id: string;
  name: string;
  price: string;
  priceId: string;
  productId: string;
  features: string[];
  teamMembers: number;
  teamEnabled: boolean;
}

const AVAILABLE_PLANS: Plan[] = [
  {
    id: "starter",
    name: "Starter",
    price: "$29",
    priceId: "price_1SWde1QqlubRO0xEoGU02LU3",
    productId: "prod_TTapRptmEkLouu",
    features: [
      "Basic AI tools access",
      "Up to 5 team members",
      "Standard support",
      "5 GB storage",
    ],
    teamMembers: 5,
    teamEnabled: true,
  },
  {
    id: "pro",
    name: "Pro",
    price: "$99",
    priceId: "price_1SWde9QqlubRO0xEZz1QHJhH",
    productId: "prod_TTapq8rgy3dmHT",
    features: [
      "Full AI tools suite",
      "Up to 10 team members",
      "Priority support",
      "50 GB storage",
      "Advanced analytics",
    ],
    teamMembers: 10,
    teamEnabled: true,
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: "$299",
    priceId: "price_1SWdeAQqlubRO0xE8nmhqQNF",
    productId: "prod_TTapwaC6qD21xi",
    features: [
      "All Pro features",
      "Up to 20 team members",
      "24/7 dedicated support",
      "Unlimited storage",
      "Custom integrations",
      "SLA guarantee",
    ],
    teamMembers: 20,
    teamEnabled: true,
  },
];

export default function SubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingInvoices, setLoadingInvoices] = useState(true);
  const [currentProductId, setCurrentProductId] = useState<string>("");
  const [upgradingPlan, setUpgradingPlan] = useState<string | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { canManageBilling, currentUserRole, isAdmin, refreshTeam, loading: teamLoading, workspaceId } = useTeam();

  useEffect(() => {
    // Check if returning from successful checkout
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('checkout') === 'success') {
      toast({
        title: "Plan updated successfully",
        description: "Your subscription has been activated.",
      });
      // Clean up URL
      window.history.replaceState({}, '', '/client/subscriptions');
    }
    
    fetchSubscriptions();
    fetchInvoices();
  }, []);

  const fetchSubscriptions = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      const { data, error } = await supabase.functions.invoke("get-subscriptions", {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });

      if (error) throw error;
      setSubscriptions(data?.subscriptions || []);
      
      // Get current product ID from check-team-limits
      const { data: limitsData, error: limitsError } = await supabase.functions.invoke("check-team-limits", {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      
      if (!limitsError && limitsData?.productId) {
        setCurrentProductId(limitsData.productId);
        console.log("Current product ID:", limitsData.productId);
      }
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
    
    // Check for checkout=success param from Stripe redirect
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get("checkout") === "success") {
      toast({
        title: "Success!",
        description: "Your plan has been updated",
      });
      // Refresh team data to get new limits
      refreshTeam();
      // Clean up URL
      window.history.replaceState({}, "", "/client/subscriptions");
    }
  }, []);

  // Show loading while subscriptions are loading
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span className="ml-2 text-muted-foreground">Loading subscriptions...</span>
      </div>
    );
  }

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

  const handleUpgrade = async (planId: string, priceId: string) => {
    if (!canManageBilling) {
      toast({
        title: "Access Denied",
        description: "Only workspace administrators can manage subscriptions",
        variant: "destructive",
      });
      return;
    }

    try {
      setUpgradingPlan(planId);
      
      const { data: { session } } = await supabase.auth.getSession();
      
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { 
          priceId,
          mode: "subscription"
        },
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      
      if (error) throw error;
      
      if (data?.url) {
        // Redirect to Stripe Checkout
        window.open(data.url, "_blank");
        
        toast({
          title: "Redirecting to checkout",
          description: "Complete your payment in the new window",
        });
      } else {
        throw new Error("No checkout URL received");
      }
      
    } catch (error: any) {
      console.error("Upgrade error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to start checkout. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUpgradingPlan(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Subscriptions</h1>
        <p className="text-muted-foreground">
          Manage your active subscriptions {currentUserRole && `(Your role: ${currentUserRole})`}
        </p>
      </div>

      {!canManageBilling && (
        <Alert>
          <Lock className="h-4 w-4" />
          <AlertDescription>
            Only workspace administrators can manage subscriptions and billing.
            {isAdmin ? "" : " Contact your workspace admin if you need to make changes."}
          </AlertDescription>
        </Alert>
      )}

      {/* Available Plans */}
      <div>
        <h2 className="text-2xl font-bold mb-4">Available Plans</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {AVAILABLE_PLANS.map((plan) => {
            const isCurrent = plan.productId === currentProductId;
            return (
              <Card
                key={plan.id} 
                className={`relative hover:shadow-lg transition-shadow ${
                  isCurrent ? "border-primary border-2" : ""
                }`}
              >
                {isCurrent && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-semibold">
                    Current Plan
                  </div>
                )}
                <CardHeader>
                  <CardTitle className="text-2xl">{plan.name}</CardTitle>
                  <div className="text-3xl font-bold mt-2">
                    {plan.price}
                    <span className="text-base font-normal text-muted-foreground">/month</span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ul className="space-y-2">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    className="w-full"
                    variant={isCurrent ? "outline" : "default"}
                    disabled={isCurrent || !canManageBilling || upgradingPlan !== null}
                    onClick={() => handleUpgrade(plan.id, plan.priceId)}
                  >
                    {upgradingPlan === plan.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : isCurrent ? (
                      "Current Plan"
                    ) : (
                      "Upgrade"
                    )}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Current Subscriptions */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : subscriptions.length > 0 && (
        <div>
          <h2 className="text-2xl font-bold mb-4">Active Subscriptions</h2>
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
                    <Button 
                      variant="outline" 
                      className="w-full" 
                      onClick={handleManageBilling}
                      disabled={!canManageBilling}
                    >
                      <CreditCard className="w-4 h-4 mr-2" />
                      Manage Billing
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
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
