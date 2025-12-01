import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

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
}

interface ServicePackageCardProps {
  packageData: ServicePackage;
  isPopular?: boolean;
  onSelect: () => void;
}

export function ServicePackageCard({ packageData, isPopular, onSelect }: ServicePackageCardProps) {
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
          <span className="text-3xl font-bold text-foreground">
            {packageData.currency === 'USD' ? '$' : packageData.currency}
            {packageData.price}
          </span>
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
          onClick={onSelect}
        >
          Select Package
        </Button>
      </CardFooter>
    </Card>
  );
}