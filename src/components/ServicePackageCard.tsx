import { Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

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
}

interface ServicePackageCardProps {
  packageData: ServicePackage;
  isPopular?: boolean;
  onSelect: () => void;
  customerEmail?: string;
  customerName?: string;
}

export function ServicePackageCard({ packageData, isPopular, onSelect, customerEmail, customerName }: ServicePackageCardProps) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSelectPackage = async () => {
    // If package has a Stripe price, go directly to checkout
    if (packageData.stripe_price_id && packageData.price > 0) {
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
        // Fallback to booking form
        onSelect();
      } finally {
        setLoading(false);
      }
    } else {
      // No Stripe price - use booking form for custom quote
      onSelect();
    }
  };

  const hasStripeCheckout = packageData.stripe_price_id && packageData.price > 0;

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
        <CardDescription className="mt-3">
          {packageData.price > 0 ? (
            <span className="text-3xl font-bold text-foreground">
              {packageData.currency === 'USD' ? '$' : packageData.currency}
              {packageData.price}
            </span>
          ) : (
            <span className="text-xl font-semibold text-muted-foreground">Contact for Quote</span>
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
          disabled={loading}
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : hasStripeCheckout ? (
            "Buy Now"
          ) : (
            "Request Quote"
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}