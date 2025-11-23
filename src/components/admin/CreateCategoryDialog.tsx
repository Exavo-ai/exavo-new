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
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import * as LucideIcons from "lucide-react";

interface CreateCategoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CreateCategoryDialog({ open, onOpenChange, onSuccess }: CreateCategoryDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [generatingIcon, setGeneratingIcon] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    icon: "Folder",
  });

  // Auto-generate icon when category name changes
  useEffect(() => {
    const generateIcon = async () => {
      if (formData.name.length < 3) {
        setFormData(prev => ({ ...prev, icon: "Folder" }));
        return;
      }

      setGeneratingIcon(true);
      try {
        const { data, error } = await supabase.functions.invoke('suggest-category-icon', {
          body: { categoryName: formData.name }
        });

        if (error) throw error;

        if (data?.icon) {
          setFormData(prev => ({ ...prev, icon: data.icon }));
        }
      } catch (error) {
        console.error('Error generating icon:', error);
        // Keep default icon on error
      } finally {
        setGeneratingIcon(false);
      }
    };

    const debounce = setTimeout(generateIcon, 800);
    return () => clearTimeout(debounce);
  }, [formData.name]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase
        .from('categories')
        .insert({
          name: formData.name,
          name_ar: formData.name,
          icon: formData.icon,
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Category created successfully",
      });

      // Reset form
      setFormData({
        name: "",
        icon: "Folder",
      });

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error creating category:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create category",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add New Category</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Category Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Enter category name"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="icon">Icon Preview</Label>
            <div className="flex items-center gap-3 p-3 border rounded-md bg-muted/50">
              {generatingIcon ? (
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              ) : (() => {
                const IconComponent = (LucideIcons as any)[formData.icon] || LucideIcons.Folder;
                return <IconComponent className="h-8 w-8 text-primary" />;
              })()}
              <div className="flex-1">
                <p className="font-medium">{formData.icon}</p>
                <p className="text-xs text-muted-foreground">
                  {generatingIcon ? "Generating..." : "Auto-generated based on category name"}
                </p>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || generatingIcon}>
              {loading ? "Creating..." : generatingIcon ? "Generating Icon..." : "Create Category"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}