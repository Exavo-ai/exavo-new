import { Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useGuestCheckoutGuard } from "@/hooks/useGuestCheckoutGuard";

interface ServicePackage {
  id: string;
  package_name: string;
  description?: string;
  price: number;
  currency: string;
  features: string[];
  delivery_time?: string;
  notes?: string;
  package_order: number;
  images?: string[];
  videos?: string[];
  stripe_price_id?: string | null;
  build_cost?: number;
  monthly_fee?: number;
}

interface ServicePackageCardProps {
  packageData: ServicePackage;
  paymentModel?: 'one_time' | 'subscription';
  isPopular?: boolean;
  onSelect: () => void;
  customerEmail?: string;
  customerName?: string;
}

export function ServicePackageCard({ packageData, paymentModel = 'one_time', isPopular, onSelect, customerEmail, customerName }: ServicePackageCardProps) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { guardCheckout } = useGuestCheckoutGuard();

  const isSubscription = paymentModel === 'subscription';
  const buildCost = packageData.build_cost || 0;
  const monthlyFee = packageData.monthly_fee || 0;
  const oneTimePrice = packageData.price || 0;

  // Determine if package has valid pricing
  const hasValidPricing = isSubscription 
    ? monthlyFee > 0 
    : oneTimePrice > 0;

  const handleSelectPackage = async () => {
    // Guard: redirect guest users to register first
    if (!guardCheckout({ packageId: packageData.id })) {
      return;
    }

    // Proceed to Stripe checkout
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-package-checkout', {
        body: {
          packageId: packageData.id,
          customerEmail,
          customerName,
        }
      });

      if (error) throw error;

      if (data?.url) {
        window.open(data.url, '_blank');
      } else {
        throw new Error('No checkout URL returned');
      }
    } catch (error: any) {
      console.error('Checkout error:', error);
      toast({
        title: "Checkout Error",
        description: error.message || "Failed to start checkout. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const currencySymbol = packageData.currency === 'USD' ? '$' : packageData.currency;

  return (
    <Card className={`relative ${isPopular ? 'border-primary shadow-lg scale-105' : ''}`}>
      {isPopular && (
        <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary">
          Most Popular
        </Badge>
      )}
      
      <CardHeader>
        <CardTitle className="text-2xl">{packageData.package_name}</CardTitle>
        {packageData.description && (
          <p className="text-sm text-muted-foreground mt-2">{packageData.description}</p>
        )}
        <CardDescription className="mt-3 space-y-1">
          {isSubscription ? (
            <>
              <div className="text-3xl font-bold text-foreground">
                {currencySymbol}{monthlyFee.toLocaleString()}
                <span className="text-base font-normal text-muted-foreground">/mo</span>
              </div>
              {buildCost > 0 && (
                <div className="text-sm text-muted-foreground">
                  + {currencySymbol}{buildCost.toLocaleString()} setup (one-time)
                </div>
              )}
            </>
          ) : (
            <span className="text-3xl font-bold text-foreground">
              {currencySymbol}{oneTimePrice.toLocaleString()}
            </span>
          )}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {packageData.delivery_time && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Badge variant="outline" className="text-xs">
              ⏱️ {packageData.delivery_time}
            </Badge>
          </div>
        )}

        <div className="space-y-2">
          {packageData.features.map((feature, index) => (
            <div key={index} className="flex items-start gap-2">
              <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
              <span className="text-sm">{feature}</span>
            </div>
          ))}
        </div>

        {packageData.notes && (
          <p className="text-xs text-muted-foreground pt-2 border-t">
            {packageData.notes}
          </p>
        )}
      </CardContent>

      <CardFooter>
        <Button 
          className="w-full" 
          variant={isPopular ? "default" : "outline"}
          onClick={handleSelectPackage}
          disabled={loading || !hasValidPricing}
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            "Buy Now"
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}