import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, Zap, Sparkles, Rocket, Crown, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import SEO from "@/components/SEO";

// Credit packs (one-time purchases)
const creditPacks = [
  {
    id: "10-credits",
    name: "10 Credits",
    price: 9.99,
    credits: 10,
    priceId: "price_1SjKxLBcggXTMoM3EqEMUlMR",
    icon: Zap,
    description: "Perfect for trying out our AI services",
    popular: false,
  },
  {
    id: "50-credits",
    name: "50 Credits",
    price: 24.99,
    credits: 50,
    priceId: "price_1SjKxYBcggXTMoM3Vfo4WZ8i",
    icon: Sparkles,
    description: "Great value for regular users",
    popular: true,
    savings: "Save 50%",
  },
  {
    id: "150-credits",
    name: "150 Credits",
    price: 49.99,
    credits: 150,
    priceId: "price_1SjKy0BcggXTMoM3dmx5Y4tK",
    icon: Rocket,
    description: "Best value for power users",
    popular: false,
    savings: "Save 67%",
  },
];

// Subscription plans (monthly)
const subscriptionPlans = [
  {
    id: "starter",
    name: "Starter",
    price: 19.99,
    credits: 25,
    priceId: "price_1SjKy6BcggXTMoM3GnREMyak",
    icon: Zap,
    description: "For individuals getting started",
    features: ["25 credits/month", "Basic AI tools", "Email support", "1 project"],
    popular: false,
  },
  {
    id: "pro",
    name: "Pro",
    price: 49.99,
    credits: 100,
    priceId: "price_1SjKy7BcggXTMoM3BuHnFJph",
    icon: Crown,
    description: "For growing businesses",
    features: ["100 credits/month", "All AI tools", "Priority support", "5 projects", "API access"],
    popular: true,
  },
  {
    id: "business",
    name: "Business",
    price: 99.99,
    credits: 300,
    priceId: "price_1SjKy9BcggXTMoM3pPSS37h1",
    icon: Rocket,
    description: "For teams and enterprises",
    features: ["300 credits/month", "All AI tools", "Dedicated support", "Unlimited projects", "API access", "Custom integrations"],
    popular: false,
  },
];

export default function Pricing() {
  const { user, session } = useAuth();
  const navigate = useNavigate();
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const handlePurchase = async (priceId: string, mode: "payment" | "subscription", itemId: string) => {
    if (!user || !session) {
      toast.error("Please sign in to purchase");
      navigate("/login?redirect=/pricing");
      return;
    }

    setLoadingId(itemId);

    try {
      const { data, error } = await supabase.functions.invoke("create-credits-checkout", {
        body: { priceId, mode },
      });

      if (error) throw error;

      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error("No checkout URL returned");
      }
    } catch (err) {
      console.error("Checkout error:", err);
      toast.error("Failed to start checkout. Please try again.");
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SEO 
        title="Pricing - Exavo AI"
        description="Choose the perfect plan for your AI needs. Buy credits or subscribe for monthly access."
      />
      <Navigation />
      
      <main className="flex-1 container mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-16">
          <Badge variant="outline" className="mb-4">Flexible Pricing</Badge>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Choose Your <span className="text-primary">Plan</span>
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Purchase credits for one-time use or subscribe for monthly access to our AI-powered services.
          </p>
        </div>

        {/* Credit Packs Section */}
        <section className="mb-20">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold mb-2 flex items-center justify-center gap-2">
              <CreditCard className="h-6 w-6 text-primary" />
              Credit Packs
            </h2>
            <p className="text-muted-foreground">One-time purchase, no commitment</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {creditPacks.map((pack) => {
              const Icon = pack.icon;
              return (
                <Card 
                  key={pack.id} 
                  className={`relative flex flex-col transition-all hover:shadow-lg ${
                    pack.popular ? "border-primary shadow-md scale-105" : ""
                  }`}
                >
                  {pack.popular && (
                    <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">Most Popular</Badge>
                  )}
                  {pack.savings && (
                    <Badge variant="secondary" className="absolute -top-3 right-4">{pack.savings}</Badge>
                  )}
                  <CardHeader className="text-center pb-4">
                    <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                      <Icon className="h-6 w-6 text-primary" />
                    </div>
                    <CardTitle className="text-xl">{pack.name}</CardTitle>
                    <CardDescription>{pack.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="text-center flex-1">
                    <div className="mb-4">
                      <span className="text-4xl font-bold">${pack.price}</span>
                      <span className="text-muted-foreground ml-1">one-time</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      ${(pack.price / pack.credits).toFixed(2)} per credit
                    </p>
                  </CardContent>
                  <CardFooter>
                    <Button 
                      className="w-full" 
                      variant={pack.popular ? "default" : "outline"}
                      onClick={() => handlePurchase(pack.priceId, "payment", pack.id)}
                      disabled={loadingId === pack.id}
                    >
                      {loadingId === pack.id ? "Processing..." : "Buy Now"}
                    </Button>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        </section>

        {/* Subscription Plans Section */}
        <section>
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold mb-2 flex items-center justify-center gap-2">
              <Crown className="h-6 w-6 text-primary" />
              Monthly Subscriptions
            </h2>
            <p className="text-muted-foreground">Get credits every month with exclusive benefits</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {subscriptionPlans.map((plan) => {
              const Icon = plan.icon;
              return (
                <Card 
                  key={plan.id} 
                  className={`relative flex flex-col transition-all hover:shadow-lg ${
                    plan.popular ? "border-primary shadow-md scale-105" : ""
                  }`}
                >
                  {plan.popular && (
                    <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">Best Value</Badge>
                  )}
                  <CardHeader className="text-center pb-4">
                    <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                      <Icon className="h-6 w-6 text-primary" />
                    </div>
                    <CardTitle className="text-xl">{plan.name}</CardTitle>
                    <CardDescription>{plan.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="flex-1">
                    <div className="text-center mb-6">
                      <span className="text-4xl font-bold">${plan.price}</span>
                      <span className="text-muted-foreground ml-1">/month</span>
                    </div>
                    <ul className="space-y-3">
                      {plan.features.map((feature, idx) => (
                        <li key={idx} className="flex items-center gap-2 text-sm">
                          <Check className="h-4 w-4 text-primary flex-shrink-0" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                  <CardFooter>
                    <Button 
                      className="w-full" 
                      variant={plan.popular ? "default" : "outline"}
                      onClick={() => handlePurchase(plan.priceId, "subscription", plan.id)}
                      disabled={loadingId === plan.id}
                    >
                      {loadingId === plan.id ? "Processing..." : "Subscribe"}
                    </Button>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        </section>

        {/* FAQ Note */}
        <div className="text-center mt-16 text-muted-foreground">
          <p>Have questions? <a href="/faq" className="text-primary hover:underline">Check our FAQ</a> or <a href="/contact" className="text-primary hover:underline">contact us</a>.</p>
        </div>
      </main>

      <Footer />
    </div>
  );
}
