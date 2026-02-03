import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Upload, X, Loader2, Image as ImageIcon } from "lucide-react";

interface MediaItem {
  url: string;
  type: "image" | "video";
  name: string;
}

interface CaseStudyMediaUploadProps {
  media: MediaItem[];
  onMediaChange: (media: MediaItem[]) => void;
  maxFiles?: number;
}

export function CaseStudyMediaUpload({
  media,
  onMediaChange,
  maxFiles = 10,
}: CaseStudyMediaUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const uploadFile = async (file: File): Promise<MediaItem | null> => {
    const fileExt = file.name.split(".").pop()?.toLowerCase();
    const allowedExtensions = ["jpg", "jpeg", "png", "webp", "gif"];
    
    if (!fileExt || !allowedExtensions.includes(fileExt)) {
      toast.error(`Invalid file type: ${file.name}. Allowed: JPG, PNG, WEBP, GIF`);
      return null;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error(`File too large: ${file.name}. Max size: 5MB`);
      return null;
    }

    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `modules/${fileName}`;

    const { error } = await supabase.storage
      .from("case-study-media")
      .upload(filePath, file);

    if (error) {
      console.error("Upload error:", error);
      toast.error(`Failed to upload ${file.name}`);
      return null;
    }

    const { data: urlData } = supabase.storage
      .from("case-study-media")
      .getPublicUrl(filePath);

    return {
      url: urlData.publicUrl,
      type: "image",
      name: file.name,
    };
  };

  const handleFiles = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return;

      const remainingSlots = maxFiles - media.length;
      if (remainingSlots <= 0) {
        toast.error(`Maximum ${maxFiles} files allowed`);
        return;
      }

      const filesToUpload = Array.from(files).slice(0, remainingSlots);
      setUploading(true);

      try {
        const uploadPromises = filesToUpload.map(uploadFile);
        const results = await Promise.all(uploadPromises);
        const successfulUploads = results.filter((r): r is MediaItem => r !== null);

        if (successfulUploads.length > 0) {
          onMediaChange([...media, ...successfulUploads]);
          toast.success(`Uploaded ${successfulUploads.length} file(s)`);
        }
      } finally {
        setUploading(false);
      }
    },
    [media, maxFiles, onMediaChange]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles]
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const removeMedia = async (index: number) => {
    const item = media[index];
    
    // Extract the file path from the URL
    try {
      const url = new URL(item.url);
      const pathMatch = url.pathname.match(/case-study-media\/(.+)$/);
      if (pathMatch) {
        await supabase.storage
          .from("case-study-media")
          .remove([pathMatch[1]]);
      }
    } catch (e) {
      console.error("Failed to delete from storage:", e);
    }

    const newMedia = [...media];
    newMedia.splice(index, 1);
    onMediaChange(newMedia);
  };

  return (
    <div className="space-y-4">
      {/* Upload Zone */}
      <div
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
          dragOver
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25 hover:border-muted-foreground/50"
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        {uploading ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Uploading...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <Upload className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Drag & drop images here, or{" "}
              <label className="text-primary cursor-pointer hover:underline">
                browse
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => handleFiles(e.target.files)}
                  disabled={uploading}
                />
              </label>
            </p>
            <p className="text-xs text-muted-foreground">
              JPG, PNG, WEBP, GIF up to 5MB ({media.length}/{maxFiles})
            </p>
          </div>
        )}
      </div>

      {/* Image Grid */}
      {media.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {media.map((item, index) => (
            <Card key={item.url} className="relative group overflow-hidden">
              <div className="aspect-video relative">
                {item.type === "image" ? (
                  <img
                    src={item.url}
                    alt={item.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-muted">
                    <ImageIcon className="h-8 w-8 text-muted-foreground" />
                  </div>
                )}
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => removeMedia(index)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
              <div className="p-2">
                <p className="text-xs text-muted-foreground truncate">
                  {item.name}
                </p>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
