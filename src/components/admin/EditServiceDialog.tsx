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
    price: 0,
    currency: "USD",
    category: "",
    active: true,
    image_url: "",
  });

  useEffect(() => {
    if (open) {
      fetchCategories();
    }
  }, [open]);

  const fetchCategories = async () => {
    const { data, error } = await supabase
      .from('categories')
      .select('id, name')
      .order('name');
    
    if (!error && data) {
      setCategories(data);
    }
  };

  useEffect(() => {
    if (service) {
      setFormData({
        name: service.name || "",
        description: service.description || "",
        price: service.price || 0,
        currency: service.currency || "USD",
        category: service.category || "",
        active: service.active ?? true,
        image_url: service.image_url || "",
      });
    }
  }, [service]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!service) return;

    // Validate input
    const result = serviceSchema.safeParse({
      name: formData.name,
      description: formData.description,
      price: formData.price,
      currency: formData.currency,
    });
    
    if (!result.success) {
      toast({
        title: "Validation Error",
        description: result.error.errors[0].message,
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Call edge function for admin operation
      const { error } = await supabase.functions.invoke('admin-update-service', {
        body: {
          serviceId: service.id,
          updates: {
            name: formData.name,
            name_ar: formData.name,
            description: formData.description,
            description_ar: formData.description,
            price: formData.price,
            currency: formData.currency,
            category: formData.category,
            active: formData.active,
            image_url: formData.image_url || null,
          },
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
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Service</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
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

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="price">Price</Label>
              <Input
                id="price"
                type="number"
                min="0"
                step="0.01"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) })}
                placeholder="0.00"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="currency">Currency</Label>
              <Input
                id="currency"
                value={formData.currency}
                onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                placeholder="USD"
                required
              />
            </div>
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
