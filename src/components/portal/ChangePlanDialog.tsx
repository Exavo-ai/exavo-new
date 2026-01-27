import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { ArrowUp, ArrowDown, Check, Loader2, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ServicePackage {
  id: string;
  package_name: string;
  monthly_fee: number;
  build_cost: number;
  currency: string;
  description: string | null;
  features: string[];
}

interface ChangePlanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  serviceId: string;
  currentPackageId: string | null;
  currentMonthlyFee: number;
  onPlanChanged: () => void;
}

export function ChangePlanDialog({
  open,
  onOpenChange,
  projectId,
  serviceId,
  currentPackageId,
  currentMonthlyFee,
  onPlanChanged,
}: ChangePlanDialogProps) {
  const [packages, setPackages] = useState<ServicePackage[]>([]);
  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [changing, setChanging] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open && serviceId) {
      loadPackages();
    }
  }, [open, serviceId]);

  const loadPackages = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("service_packages")
        .select("id, package_name, monthly_fee, build_cost, currency, description, features")
        .eq("service_id", serviceId)
        .gt("monthly_fee", 0)
        .order("monthly_fee", { ascending: true });

      if (error) throw error;
      
      // Parse features from JSON
      const parsedPackages = (data || []).map(pkg => ({
        ...pkg,
        features: Array.isArray(pkg.features) 
          ? pkg.features.filter((f): f is string => typeof f === "string")
          : [],
      }));
      
      setPackages(parsedPackages);
    } catch (err: any) {
      console.error("Error loading packages:", err);
      toast({
        title: "Error",
        description: "Failed to load available plans",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChangePlan = async () => {
    if (!selectedPackageId || selectedPackageId === currentPackageId) return;

    setChanging(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const { data, error } = await supabase.functions.invoke("update-subscription-plan", {
        body: {
          project_id: projectId,
          new_package_id: selectedPackageId,
          proration_behavior: "create_prorations",
        },
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });

      if (error) throw error;
      
      if (data?.ok === false) {
        throw new Error(data.message || "Failed to change plan");
      }

      toast({
        title: "Plan Changed",
        description: data?.message || "Your subscription has been updated successfully.",
      });

      onPlanChanged();
      onOpenChange(false);
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to change subscription plan",
        variant: "destructive",
      });
    } finally {
      setChanging(false);
    }
  };

  const selectedPackage = packages.find(p => p.id === selectedPackageId);
  const isUpgrade = selectedPackage && selectedPackage.monthly_fee > currentMonthlyFee;
  const isDowngrade = selectedPackage && selectedPackage.monthly_fee < currentMonthlyFee;
  const priceDiff = selectedPackage ? selectedPackage.monthly_fee - currentMonthlyFee : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Change Your Plan
          </DialogTitle>
          <DialogDescription>
            Select a new plan to upgrade or downgrade your subscription. Changes take effect immediately.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : packages.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No alternative plans available for this service.
          </div>
        ) : (
          <div className="space-y-4">
            <RadioGroup
              value={selectedPackageId || ""}
              onValueChange={setSelectedPackageId}
              className="space-y-3"
            >
              {packages.map((pkg) => {
                const isCurrent = pkg.id === currentPackageId;
                const isSelected = pkg.id === selectedPackageId;
                const isUpgradeOption = pkg.monthly_fee > currentMonthlyFee;
                const isDowngradeOption = pkg.monthly_fee < currentMonthlyFee;

                return (
                  <Card
                    key={pkg.id}
                    className={`relative p-4 cursor-pointer transition-all ${
                      isCurrent 
                        ? "border-primary/50 bg-primary/5" 
                        : isSelected 
                        ? "border-primary ring-2 ring-primary/20" 
                        : "hover:border-muted-foreground/30"
                    } ${isCurrent ? "cursor-not-allowed opacity-75" : ""}`}
                    onClick={() => !isCurrent && setSelectedPackageId(pkg.id)}
                  >
                    <div className="flex items-start gap-4">
                      <RadioGroupItem
                        value={pkg.id}
                        id={pkg.id}
                        disabled={isCurrent}
                        className="mt-1"
                      />
                      <Label
                        htmlFor={pkg.id}
                        className={`flex-1 cursor-pointer ${isCurrent ? "cursor-not-allowed" : ""}`}
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-semibold text-base">
                                {pkg.package_name}
                              </span>
                              {isCurrent && (
                                <Badge variant="default" className="text-xs">
                                  Current Plan
                                </Badge>
                              )}
                              {!isCurrent && isUpgradeOption && (
                                <Badge variant="secondary" className="text-xs bg-green-500/10 text-green-600">
                                  <ArrowUp className="w-3 h-3 mr-1" />
                                  Upgrade
                                </Badge>
                              )}
                              {!isCurrent && isDowngradeOption && (
                                <Badge variant="secondary" className="text-xs bg-yellow-500/10 text-yellow-600">
                                  <ArrowDown className="w-3 h-3 mr-1" />
                                  Downgrade
                                </Badge>
                              )}
                            </div>
                            {pkg.description && (
                              <p className="text-sm text-muted-foreground mb-2">
                                {pkg.description}
                              </p>
                            )}
                            {pkg.features.length > 0 && (
                              <ul className="space-y-1">
                                {pkg.features.slice(0, 4).map((feature, idx) => (
                                  <li key={idx} className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <Check className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                                    <span>{feature}</span>
                                  </li>
                                ))}
                                {pkg.features.length > 4 && (
                                  <li className="text-xs text-muted-foreground pl-5">
                                    +{pkg.features.length - 4} more features
                                  </li>
                                )}
                              </ul>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold">
                              ${pkg.monthly_fee.toFixed(2)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              per month
                            </p>
                          </div>
                        </div>
                      </Label>
                    </div>
                  </Card>
                );
              })}
            </RadioGroup>

            {/* Summary section */}
            {selectedPackage && selectedPackageId !== currentPackageId && (
              <div className="mt-6 p-4 rounded-lg border bg-muted/30">
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  {isUpgrade ? (
                    <>
                      <ArrowUp className="w-4 h-4 text-green-500" />
                      Upgrade Summary
                    </>
                  ) : (
                    <>
                      <ArrowDown className="w-4 h-4 text-yellow-500" />
                      Downgrade Summary
                    </>
                  )}
                </h4>
                <div className="space-y-1 text-sm">
                  <p>
                    <span className="text-muted-foreground">New plan:</span>{" "}
                    <span className="font-medium">{selectedPackage.package_name}</span>
                  </p>
                  <p>
                    <span className="text-muted-foreground">New monthly rate:</span>{" "}
                    <span className="font-medium">${selectedPackage.monthly_fee.toFixed(2)}/mo</span>
                  </p>
                  <p>
                    <span className="text-muted-foreground">Price difference:</span>{" "}
                    <span className={`font-medium ${priceDiff > 0 ? "text-green-600" : "text-yellow-600"}`}>
                      {priceDiff > 0 ? "+" : ""}{priceDiff.toFixed(2)}/mo
                    </span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    {isUpgrade
                      ? "You'll be charged a prorated amount for the remaining days in your billing cycle."
                      : "Your next invoice will reflect the reduced rate."}
                  </p>
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="flex-1"
                disabled={changing}
              >
                Cancel
              </Button>
              <Button
                onClick={handleChangePlan}
                disabled={!selectedPackageId || selectedPackageId === currentPackageId || changing}
                className="flex-1"
              >
                {changing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Changing Plan...
                  </>
                ) : isUpgrade ? (
                  <>
                    <ArrowUp className="w-4 h-4 mr-2" />
                    Upgrade Plan
                  </>
                ) : isDowngrade ? (
                  <>
                    <ArrowDown className="w-4 h-4 mr-2" />
                    Downgrade Plan
                  </>
                ) : (
                  "Confirm Change"
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
