import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Upload, X, Image as ImageIcon, Loader2, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp"];
const MAX_IMAGES = 10;

interface ServiceMultiImageUploadProps {
  values: string[];
  onChange: (urls: string[]) => void;
  label?: string;
  maxImages?: number;
  className?: string;
}

export function ServiceMultiImageUpload({
  values,
  onChange,
  label = "Service Images",
  maxImages = MAX_IMAGES,
  className,
}: ServiceMultiImageUploadProps) {
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): string | null => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return "Invalid file type. Please upload PNG, JPG, or WEBP images.";
    }
    if (file.size > MAX_FILE_SIZE) {
      return "File size exceeds 2MB limit.";
    }
    return null;
  };

  const uploadFile = async (file: File) => {
    const error = validateFile(file);
    if (error) {
      toast({
        title: "Upload Error",
        description: error,
        variant: "destructive",
      });
      return;
    }

    if (values.length >= maxImages) {
      toast({
        title: "Limit Reached",
        description: `Maximum ${maxImages} images allowed`,
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
      const filePath = `services/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('service-media')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('service-media')
        .getPublicUrl(filePath);

      onChange([...values, publicUrl]);
      
      toast({
        title: "Success",
        description: "Image uploaded successfully",
      });
    } catch (error: any) {
      console.error("Upload error:", error);
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to upload image",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      // Upload multiple files sequentially
      Array.from(files).forEach(file => uploadFile(file));
    }
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const files = e.dataTransfer.files;
    if (files) {
      Array.from(files).forEach(file => uploadFile(file));
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleRemove = (index: number) => {
    onChange(values.filter((_, i) => i !== index));
  };

  // Reordering via drag
  const handleImageDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleImageDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    
    const newValues = [...values];
    const draggedItem = newValues[draggedIndex];
    newValues.splice(draggedIndex, 1);
    newValues.splice(index, 0, draggedItem);
    onChange(newValues);
    setDraggedIndex(index);
  };

  const handleImageDragEnd = () => {
    setDraggedIndex(null);
  };

  const validImages = values.filter(v => v && (v.startsWith('http://') || v.startsWith('https://')));

  return (
    <div className={cn("space-y-3", className)}>
      <Label>
        {label} <span className="text-muted-foreground">(Optional, max {maxImages})</span>
      </Label>

      {/* Preview grid with reordering */}
      {validImages.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {validImages.map((url, index) => (
            <div 
              key={`${url}-${index}`} 
              className={cn(
                "relative group aspect-video rounded-lg overflow-hidden border border-border bg-muted cursor-move",
                draggedIndex === index && "opacity-50"
              )}
              draggable
              onDragStart={() => handleImageDragStart(index)}
              onDragOver={(e) => handleImageDragOver(e, index)}
              onDragEnd={handleImageDragEnd}
            >
              <img
                src={url}
                alt={`Service image ${index + 1}`}
                className="w-full h-full object-cover"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = '/placeholder.svg';
                }}
              />
              {/* Overlay controls */}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <div className="absolute top-2 left-2 p-1 bg-black/50 rounded text-white">
                  <GripVertical className="h-4 w-4" />
                </div>
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="h-8 w-8"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemove(index);
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              {/* Position indicator */}
              <div className="absolute bottom-2 right-2 px-2 py-0.5 bg-black/70 text-white text-xs rounded">
                {index + 1}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload button */}
      {validImages.length < maxImages && (
        <div
          className={cn(
            "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors",
            dragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/50",
            uploading && "pointer-events-none opacity-50"
          )}
          onClick={() => fileInputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          <div className="flex flex-col items-center gap-2">
            {uploading ? (
              <Loader2 className="h-10 w-10 text-muted-foreground animate-spin" />
            ) : (
              <ImageIcon className="h-10 w-10 text-muted-foreground" />
            )}
            <div className="text-sm text-muted-foreground">
              {uploading ? (
                "Uploading..."
              ) : (
                <>
                  <span className="text-primary font-medium">Click to upload</span> or drag and drop
                </>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              PNG, JPG or WEBP (max 2MB each) • {validImages.length}/{maxImages} images
            </p>
          </div>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept=".png,.jpg,.jpeg,.webp"
        multiple
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
}
