import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ServicePackageCard } from "./ServicePackageCard";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface ServicePackage {
  id: string;
  package_name: string;
  price: number;
  currency: string;
  features: string[];
  delivery_time?: string;
  notes?: string;
  package_order: number;
}

interface Service {
  id: string;
  name: string;
  description: string;
  image_url?: string | null;
}

interface ServiceDetailsDialogProps {
  service: Service | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectPackage: (serviceId: string, packageId: string) => void;
}

export function ServiceDetailsDialog({
  service,
  open,
  onOpenChange,
  onSelectPackage,
}: ServiceDetailsDialogProps) {
  const { toast } = useToast();
  const [packages, setPackages] = useState<ServicePackage[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (service && open) {
      fetchPackages();
    }
  }, [service, open]);

  const fetchPackages = async () => {
    if (!service) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('service_packages')
        .select('*')
        .eq('service_id', service.id)
        .order('package_order', { ascending: true });

      if (error) throw error;
      
      setPackages(data.map(pkg => ({
        ...pkg,
        features: Array.isArray(pkg.features) 
          ? pkg.features.map(f => String(f)).filter(Boolean)
          : [],
      })));
    } catch (error: any) {
      console.error('Error fetching packages:', error);
      toast({
        title: "Error",
        description: "Failed to load service packages",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPackage = (packageId: string) => {
    if (service) {
      onSelectPackage(service.id, packageId);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="text-2xl">{service?.name}</DialogTitle>
          <p className="text-muted-foreground">{service?.description}</p>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : packages.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            No packages available for this service
          </div>
        ) : (
          <ScrollArea className="h-[calc(90vh-200px)]">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-4">
              {packages.map((pkg, index) => (
                <ServicePackageCard
                  key={pkg.id}
                  packageData={pkg}
                  isPopular={index === 1}
                  onSelect={() => handleSelectPackage(pkg.id)}
                />
              ))}
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}