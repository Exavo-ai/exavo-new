import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { serviceSchema } from "@/lib/validation";
import { Plus, X, DollarSign, RefreshCw, Lock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ServiceImageUpload, MultiImageUpload } from "./ServiceImageUpload";
import { ServiceMultiImageUpload } from "./ServiceMultiImageUpload";

interface Service {
  id: string;
  name: string;
  name_ar: string;
  description: string;
  description_ar: string;
  price: number;
  currency: string;
  category: string;
  active: boolean;
  image_url: string | null;
  payment_model?: "one_time" | "subscription";
  build_cost?: number;
  monthly_fee?: number;
}

interface Package {
  id?: string;
  package_name: string;
  description: string;
  price: number;
  currency: string;
  features: string[];
  delivery_time: string;
  notes: string;
  package_order: number;
  images: string[];
  videos: string[];
  build_cost: number;
  monthly_fee: number;
}

interface EditServiceDialogProps {
  service: Service | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function EditServiceDialog({ service, open, onOpenChange, onSuccess }: EditServiceDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([]);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category: "",
    active: true,
    image_url: "",
    images: [] as string[],
    price: 0,
    build_cost: 0,
    monthly_fee: 0,
  });
  const [packages, setPackages] = useState<Package[]>([]);

  useEffect(() => {
    if (open) {
      fetchCategories();
      if (service) {
        fetchPackages();
      }
    }
  }, [open, service]);

  const fetchCategories = async () => {
    const { data, error } = await supabase
      .from('categories')
      .select('id, name')
      .order('name');
    
    if (!error && data) {
      setCategories(data);
    }
  };

  const fetchPackages = async () => {
    if (!service) return;
    
    const { data, error } = await supabase
      .from('service_packages')
      .select('*')
      .eq('service_id', service.id)
      .order('package_order');
    
    if (!error && data) {
      setPackages(data.map(pkg => ({
        id: pkg.id,
        package_name: pkg.package_name,
        description: pkg.description || '',
        price: pkg.price,
        currency: pkg.currency,
        features: Array.isArray(pkg.features) 
          ? pkg.features.map(f => String(f)).filter(Boolean)
          : [],
        delivery_time: pkg.delivery_time || '',
        notes: pkg.notes || '',
        package_order: pkg.package_order,
        images: Array.isArray(pkg.images) ? pkg.images as string[] : [],
        videos: Array.isArray(pkg.videos) ? pkg.videos as string[] : [],
        build_cost: (pkg as any).build_cost || 0,
        monthly_fee: (pkg as any).monthly_fee || 0,
      })));
    } else {
      setPackages([
        { package_name: "Basic", description: "", price: 0, currency: "USD", features: [""], delivery_time: "", notes: "", package_order: 0, images: [], videos: [], build_cost: 0, monthly_fee: 0 },
      ]);
    }
  };

  useEffect(() => {
    if (service) {
      // Handle images: prefer new images array, fallback to image_url
      const existingImages = (service as any).images;
      const imagesArray: string[] = Array.isArray(existingImages) && existingImages.length > 0
        ? existingImages.filter((url: string) => url && typeof url === 'string')
        : service.image_url 
          ? [service.image_url] 
          : [];
      
      setFormData({
        name: service.name || "",
        description: service.description || "",
        category: service.category || "",
        active: service.active ?? true,
        image_url: service.image_url || "",
        images: imagesArray,
        price: service.price || 0,
        build_cost: service.build_cost || 0,
        monthly_fee: service.monthly_fee || 0,
      });
    }
  }, [service]);

  const addPackage = () => {
    setPackages([...packages, {
      package_name: "",
      description: "",
      price: 0,
      currency: "USD",
      features: [""],
      delivery_time: "",
      notes: "",
      package_order: packages.length,
      images: [],
      videos: [],
      build_cost: 0,
      monthly_fee: 0,
    }]);
  };

  const removePackage = (index: number) => {
    if (packages.length > 1) {
      setPackages(packages.filter((_, i) => i !== index));
    }
  };

  const updatePackage = (index: number, field: keyof Package, value: any) => {
    const updated = [...packages];
    updated[index] = { ...updated[index], [field]: value };
    setPackages(updated);
  };

  const addFeature = (packageIndex: number) => {
    const updated = [...packages];
    updated[packageIndex].features.push("");
    setPackages(updated);
  };

  const removeFeature = (packageIndex: number, featureIndex: number) => {
    const updated = [...packages];
    updated[packageIndex].features = updated[packageIndex].features.filter((_, i) => i !== featureIndex);
    setPackages(updated);
  };

  const updateFeature = (packageIndex: number, featureIndex: number, value: string) => {
    const updated = [...packages];
    updated[packageIndex].features[featureIndex] = value;
    setPackages(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!service) return;

    const result = serviceSchema.safeParse({
      name: formData.name,
      description: formData.description,
      price: service.payment_model === "one_time" ? formData.price : formData.build_cost,
      currency: "USD",
    });
    
    if (!result.success) {
      toast({
        title: "Validation Error",
        description: result.error.errors[0].message,
        variant: "destructive",
      });
      return;
    }

    const validPackages = packages.filter(pkg => 
      pkg.package_name.trim() && pkg.features.some(f => f.trim())
    );

    // Validate package pricing based on payment model
    for (const pkg of validPackages) {
      if (paymentModel === "one_time" && pkg.price <= 0) {
        toast({
          title: "Validation Error",
          description: `Package "${pkg.package_name}" requires a one-time price greater than 0`,
          variant: "destructive",
        });
        return;
      }
      if (paymentModel === "subscription" && pkg.monthly_fee <= 0) {
        toast({
          title: "Validation Error",
          description: `Package "${pkg.package_name}" requires a monthly fee greater than 0`,
          variant: "destructive",
        });
        return;
      }
    }

    setLoading(true);
    try {
      // Normalize updates: omit empty strings, convert "" to null, only include meaningful values
      const normalizeValue = (val: any): any => {
        if (val === "" || val === undefined) return undefined;
        if (Array.isArray(val)) {
          const filtered = val.filter(v => v !== "" && v !== null && v !== undefined);
          return filtered.length > 0 ? filtered : undefined;
        }
        return val;
      };

      const rawUpdates: Record<string, any> = {
        name: formData.name,
        name_ar: formData.name,
        description: formData.description,
        description_ar: formData.description,
        price: service.payment_model === "one_time" ? formData.price : formData.build_cost,
        currency: "USD",
        category: formData.category || null,
        active: formData.active,
        image_url: formData.image_url || null,
        build_cost: service.payment_model === "subscription" ? formData.build_cost : 0,
        monthly_fee: service.payment_model === "subscription" ? formData.monthly_fee : 0,
      };

      // Filter out undefined values
      const updates: Record<string, any> = {};
      for (const [key, value] of Object.entries(rawUpdates)) {
        const normalized = normalizeValue(value);
        if (normalized !== undefined) {
          updates[key] = normalized;
        }
      }

      // Normalize packages
      const normalizedPackages = validPackages.map(pkg => {
        const normalizedPkg: Record<string, any> = {
          id: pkg.id,
          package_name: pkg.package_name,
          price: pkg.price,
          currency: pkg.currency || "USD",
          package_order: pkg.package_order,
          features: pkg.features.filter(f => f.trim()),
          build_cost: paymentModel === "subscription" ? pkg.build_cost : 0,
          monthly_fee: paymentModel === "subscription" ? pkg.monthly_fee : 0,
        };
        // Only include optional fields if they have meaningful values
        if (pkg.description?.trim()) normalizedPkg.description = pkg.description.trim();
        if (pkg.delivery_time?.trim()) normalizedPkg.delivery_time = pkg.delivery_time.trim();
        if (pkg.notes?.trim()) normalizedPkg.notes = pkg.notes.trim();
        if (pkg.images?.length > 0) normalizedPkg.images = pkg.images.filter(Boolean);
        if (pkg.videos?.length > 0) normalizedPkg.videos = pkg.videos.filter(Boolean);
        return normalizedPkg;
      });

      const { error } = await supabase.functions.invoke('admin-update-service', {
        body: {
          serviceId: service.id,
          updates,
          packages: normalizedPackages,
        },
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Service updated successfully",
      });

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error updating service:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to update service",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const paymentModel = service?.payment_model || "one_time";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Service</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name">Service Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Enter service name"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Enter service description"
              rows={3}
              required
            />
          </div>

          {/* Payment Model Display - READ ONLY */}
          <Card className="border-2 border-muted bg-muted/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                {paymentModel === "one_time" ? (
                  <DollarSign className="w-5 h-5" />
                ) : (
                  <RefreshCw className="w-5 h-5" />
                )}
                Payment Model
                <Lock className="w-4 h-4 text-muted-foreground" />
              </CardTitle>
              <CardDescription>
                Payment model is locked after service creation and cannot be changed.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3 p-4 rounded-lg border bg-background">
                <Badge variant={paymentModel === "subscription" ? "default" : "secondary"} className="text-sm">
                  {paymentModel === "one_time" ? "One-time Payment" : "Subscription"}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {paymentModel === "one_time" 
                    ? "Client pays once, owns the system" 
                    : "Build cost + monthly recurring fee"}
                </span>
              </div>

              {/* Editable Pricing Fields */}
              <div className="mt-4 space-y-4">
                {paymentModel === "one_time" && (
                  <div className="space-y-2">
                    <Label htmlFor="price">One-time Price (USD)</Label>
                    <Input
                      id="price"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                      placeholder="0.00"
                    />
                  </div>
                )}

                {paymentModel === "subscription" && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="build_cost">Build Cost (USD)</Label>
                      <Input
                        id="build_cost"
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.build_cost}
                        onChange={(e) => setFormData({ ...formData, build_cost: parseFloat(e.target.value) || 0 })}
                        placeholder="One-time build fee"
                      />
                      <p className="text-xs text-muted-foreground">Charged once at start</p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="monthly_fee">Monthly Fee (USD)</Label>
                      <Input
                        id="monthly_fee"
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.monthly_fee}
                        onChange={(e) => setFormData({ ...formData, monthly_fee: parseFloat(e.target.value) || 0 })}
                        placeholder="Recurring monthly fee"
                      />
                      <p className="text-xs text-muted-foreground">Recurring each month</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select
              value={formData.category}
              onValueChange={(value) => setFormData({ ...formData, category: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <ServiceMultiImageUpload
            values={formData.images}
            onChange={(urls) => setFormData({ ...formData, images: urls, image_url: urls[0] || "" })}
            label="Service Images"
            maxImages={10}
          />

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-lg font-semibold">Service Packages</Label>
              <Button type="button" variant="outline" size="sm" onClick={addPackage}>
                <Plus className="h-4 w-4 mr-1" /> Add Package
              </Button>
            </div>

            {packages.map((pkg, pkgIndex) => (
              <Card key={pkgIndex}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">Package {pkgIndex + 1}</CardTitle>
                    {packages.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removePackage(pkgIndex)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2">
                    <Label>Package Name</Label>
                    <Input
                      value={pkg.package_name}
                      onChange={(e) => updatePackage(pkgIndex, 'package_name', e.target.value)}
                      placeholder="e.g., Basic, Standard, Premium"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea
                      value={pkg.description}
                      onChange={(e) => updatePackage(pkgIndex, 'description', e.target.value)}
                      placeholder="Brief description of this package"
                      rows={2}
                    />
                  </div>

                  {/* Conditional Pricing based on payment_model */}
                  {paymentModel === "one_time" ? (
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label>One-time Price <span className="text-destructive">*</span></Label>
                        <Input
                          type="number"
                          min="1"
                          step="0.01"
                          value={pkg.price}
                          onChange={(e) => updatePackage(pkgIndex, 'price', parseFloat(e.target.value) || 0)}
                          placeholder="Required - must be > 0"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Currency</Label>
                        <Input
                          value={pkg.currency}
                          onChange={(e) => updatePackage(pkgIndex, 'currency', e.target.value)}
                          placeholder="USD"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label>Build Cost</Label>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={pkg.build_cost}
                            onChange={(e) => updatePackage(pkgIndex, 'build_cost', parseFloat(e.target.value) || 0)}
                            placeholder="0.00"
                          />
                          <p className="text-xs text-muted-foreground">One-time (optional)</p>
                        </div>
                        <div className="space-y-2">
                          <Label>Monthly Fee <span className="text-destructive">*</span></Label>
                          <Input
                            type="number"
                            min="1"
                            step="0.01"
                            value={pkg.monthly_fee}
                            onChange={(e) => updatePackage(pkgIndex, 'monthly_fee', parseFloat(e.target.value) || 0)}
                            placeholder="Required - must be > 0"
                          />
                          <p className="text-xs text-muted-foreground">Recurring</p>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Currency</Label>
                        <Input
                          value={pkg.currency}
                          onChange={(e) => updatePackage(pkgIndex, 'currency', e.target.value)}
                          placeholder="USD"
                        />
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label>Delivery Time</Label>
                    <Input
                      value={pkg.delivery_time}
                      onChange={(e) => updatePackage(pkgIndex, 'delivery_time', e.target.value)}
                      placeholder="e.g., 3-5 days"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Features</Label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => addFeature(pkgIndex)}
                      >
                        <Plus className="h-3 w-3 mr-1" /> Add Feature
                      </Button>
                    </div>
                    {pkg.features.map((feature, featureIndex) => (
                      <div key={featureIndex} className="flex gap-2">
                        <Input
                          value={feature}
                          onChange={(e) => updateFeature(pkgIndex, featureIndex, e.target.value)}
                          placeholder="Feature description"
                        />
                        {pkg.features.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeFeature(pkgIndex, featureIndex)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>

                  <MultiImageUpload
                    values={pkg.images}
                    onChange={(urls) => updatePackage(pkgIndex, 'images', urls)}
                    label="Package Images"
                  />

                  <div className="space-y-2">
                    <Label>Video URLs (Optional, comma-separated)</Label>
                    <Input
                      value={pkg.videos.join(', ')}
                      onChange={(e) => updatePackage(pkgIndex, 'videos', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                      placeholder="https://youtube.com/watch?v=..., https://vimeo.com/..."
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Notes (Optional)</Label>
                    <Textarea
                      value={pkg.notes}
                      onChange={(e) => updatePackage(pkgIndex, 'notes', e.target.value)}
                      placeholder="Additional information"
                      rows={2}
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="space-y-0.5">
              <Label htmlFor="active">Active Status</Label>
              <p className="text-sm text-muted-foreground">
                Make this service visible to clients
              </p>
            </div>
            <Switch
              id="active"
              checked={formData.active}
              onCheckedChange={(checked) => setFormData({ ...formData, active: checked })}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}