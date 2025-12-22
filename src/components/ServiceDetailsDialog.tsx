import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ServicePackageCard } from "./ServicePackageCard";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { GuestAuthPrompt } from "./GuestAuthPrompt";
import BookingDialog from "./BookingDialog";

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
  onSelectPackage?: (serviceId: string, serviceName: string, packageId: string, packageName: string) => void;
}

export function ServiceDetailsDialog({
  service,
  open,
  onOpenChange,
  onSelectPackage,
}: ServiceDetailsDialogProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [packages, setPackages] = useState<ServicePackage[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Auth prompt state
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);
  const [pendingPackage, setPendingPackage] = useState<{id: string; name: string} | null>(null);
  
  // Booking dialog state
  const [showBookingDialog, setShowBookingDialog] = useState(false);
  const [selectedPackageId, setSelectedPackageId] = useState('');
  const [selectedPackageName, setSelectedPackageName] = useState('');
  const [isGuestCheckout, setIsGuestCheckout] = useState(false);

  useEffect(() => {
    if (service && open) {
      fetchPackages();
      
      // Subscribe to real-time changes
      const channel = supabase
        .channel(`packages-${service.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'service_packages',
            filter: `service_id=eq.${service.id}`
          },
          () => {
            console.log('Package change detected, refetching...');
            fetchPackages();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
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
        id: pkg.id,
        package_name: pkg.package_name,
        description: pkg.description || undefined,
        price: pkg.price,
        currency: pkg.currency,
        features: Array.isArray(pkg.features) 
          ? pkg.features.map(f => String(f)).filter(Boolean)
          : [],
        delivery_time: pkg.delivery_time || undefined,
        notes: pkg.notes || undefined,
        package_order: pkg.package_order,
        images: Array.isArray(pkg.images) ? pkg.images.map(String) : undefined,
        videos: Array.isArray(pkg.videos) ? pkg.videos.map(String) : undefined,
        stripe_price_id: pkg.stripe_price_id || null,
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

  const handleSelectPackage = (packageId: string, packageName: string) => {
    if (!user) {
      // Not logged in - show auth prompt
      setPendingPackage({ id: packageId, name: packageName });
      setShowAuthPrompt(true);
    } else {
      // User is logged in - proceed directly to booking
      proceedToBooking(packageId, packageName, false);
    }
  };

  const proceedToBooking = (packageId: string, packageName: string, asGuest: boolean) => {
    setSelectedPackageId(packageId);
    setSelectedPackageName(packageName);
    setIsGuestCheckout(asGuest);
    setShowBookingDialog(true);
    onOpenChange(false);
    
    // Also call the parent callback if provided
    if (onSelectPackage && service) {
      onSelectPackage(service.id, service.name, packageId, packageName);
    }
  };

  const handleContinueAsGuest = () => {
    setShowAuthPrompt(false);
    if (pendingPackage) {
      proceedToBooking(pendingPackage.id, pendingPackage.name, true);
    }
  };

  return (
    <>
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
                    onSelect={() => handleSelectPackage(pkg.id, pkg.package_name)}
                  />
                ))}
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>

      <GuestAuthPrompt
        open={showAuthPrompt}
        onOpenChange={setShowAuthPrompt}
        onContinueAsGuest={handleContinueAsGuest}
      />

      {service && (
        <BookingDialog
          open={showBookingDialog}
          onOpenChange={setShowBookingDialog}
          serviceName={service.name}
          serviceId={service.id}
          packageId={selectedPackageId}
          packageName={selectedPackageName}
          isGuest={isGuestCheckout}
        />
      )}
    </>
  );
}
