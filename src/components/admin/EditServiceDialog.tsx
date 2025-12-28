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
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { serviceSchema } from "@/lib/validation";
import { Plus, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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
      })));
    } else {
      setPackages([
        { package_name: "Basic", description: "", price: 0, currency: "USD", features: [""], delivery_time: "", notes: "", package_order: 0, images: [], videos: [] },
      ]);
    }
  };

  useEffect(() => {
    if (service) {
      setFormData({
        name: service.name || "",
        description: service.description || "",
        category: service.category || "",
        active: service.active ?? true,
        image_url: service.image_url || "",
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
      price: 0,
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

    setLoading(true);
    try {
      const { error } = await supabase.functions.invoke('admin-update-service', {
        body: {
          serviceId: service.id,
          updates: {
            name: formData.name,
            name_ar: formData.name,
            description: formData.description,
            description_ar: formData.description,
            price: 0,
            currency: "USD",
            category: formData.category,
            active: formData.active,
            image_url: formData.image_url || null,
          },
          packages: validPackages.map(pkg => ({
            ...pkg,
            features: pkg.features.filter(f => f.trim()),
          })),
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

          <div className="space-y-2">
            <Label htmlFor="image_url">Image URL (Optional)</Label>
            <Input
              id="image_url"
              value={formData.image_url}
              onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
              placeholder="https://example.com/image.jpg"
            />
          </div>

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

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Price</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={pkg.price}
                        onChange={(e) => updatePackage(pkgIndex, 'price', parseFloat(e.target.value))}
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

                  <div className="space-y-2">
                    <Label>Image URLs (Optional, comma-separated)</Label>
                    <Input
                      value={pkg.images.join(', ')}
                      onChange={(e) => updatePackage(pkgIndex, 'images', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                      placeholder="https://example.com/image1.jpg, https://example.com/image2.jpg"
                    />
                  </div>

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