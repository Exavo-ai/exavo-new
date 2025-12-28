import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Link, Upload, Video, Image, X, Loader2, GripVertical } from "lucide-react";

export interface MediaItem {
  url: string;
  type: "image" | "video";
  source: "url" | "upload";
}

interface SingleMediaUploaderProps {
  media: MediaItem | null;
  onChange: (media: MediaItem | null) => void;
  label?: string;
}

interface MultiMediaUploaderProps {
  media: MediaItem[];
  onChange: (media: MediaItem[]) => void;
  label?: string;
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

async function uploadFile(file: File, folder: string): Promise<{ url: string; type: "image" | "video" }> {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session?.access_token) {
    throw new Error("You must be logged in to upload files");
  }

  const formData = new FormData();
  formData.append('file', file);
  formData.append('folder', folder);

  const response = await fetch(`${SUPABASE_URL}/functions/v1/upload-media`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
    },
    body: formData,
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || 'Upload failed');
  }

  return { url: result.url, type: result.type };
}

function MediaPreview({ media, onRemove }: { media: MediaItem; onRemove: () => void }) {
  return (
    <div className="relative group rounded-lg overflow-hidden border border-border bg-muted">
      {media.type === "image" ? (
        <img 
          src={media.url} 
          alt="Preview" 
          className="w-full h-32 object-cover"
          onError={(e) => {
            (e.target as HTMLImageElement).src = "/placeholder.svg";
          }}
        />
      ) : (
        <video 
          src={media.url} 
          className="w-full h-32 object-cover"
          controls
        />
      )}
      <Button
        type="button"
        variant="destructive"
        size="icon"
        className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={onRemove}
      >
        <X className="h-3 w-3" />
      </Button>
      <div className="absolute bottom-0 left-0 right-0 bg-background/80 px-2 py-1 text-xs text-muted-foreground">
        {media.type === "image" ? <Image className="h-3 w-3 inline mr-1" /> : <Video className="h-3 w-3 inline mr-1" />}
        {media.source === "upload" ? "Uploaded" : "URL"}
      </div>
    </div>
  );
}

export function SingleMediaUploader({ media, onChange, label = "Media" }: SingleMediaUploaderProps) {
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const [urlType, setUrlType] = useState<"image" | "video">("image");
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (file: File, type: "image" | "video") => {
    setUploading(true);
    try {
      const result = await uploadFile(file, type === "image" ? "images" : "videos");
      onChange({ url: result.url, type: result.type, source: "upload" });
      toast({ title: "Success", description: "File uploaded successfully" });
    } catch (error: unknown) {
      console.error("Upload error:", error);
      const message = error instanceof Error ? error.message : "Failed to upload file";
      toast({ title: "Error", description: message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleUrlSubmit = () => {
    if (!urlInput.trim()) return;
    onChange({ url: urlInput.trim(), type: urlType, source: "url" });
    setUrlInput("");
  };

  return (
    <div className="space-y-3">
      <Label>{label}</Label>
      
      {media ? (
        <MediaPreview media={media} onRemove={() => onChange(null)} />
      ) : (
        <Tabs defaultValue="url" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="url" className="text-xs">
              <Link className="h-3 w-3 mr-1" /> URL
            </TabsTrigger>
            <TabsTrigger value="image" className="text-xs">
              <Image className="h-3 w-3 mr-1" /> Image
            </TabsTrigger>
            <TabsTrigger value="video" className="text-xs">
              <Video className="h-3 w-3 mr-1" /> Video
            </TabsTrigger>
          </TabsList>

          <TabsContent value="url" className="space-y-2">
            <div className="flex gap-2">
              <Input
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://example.com/media.jpg"
                className="flex-1"
              />
              <select 
                value={urlType} 
                onChange={(e) => setUrlType(e.target.value as "image" | "video")}
                className="px-2 py-1 border rounded-md text-sm bg-background"
              >
                <option value="image">Image</option>
                <option value="video">Video</option>
              </select>
              <Button type="button" size="sm" onClick={handleUrlSubmit} disabled={!urlInput.trim()}>
                Add
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="image">
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileUpload(file, "image");
              }}
            />
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => imageInputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
              Upload Image
            </Button>
          </TabsContent>

          <TabsContent value="video">
            <input
              ref={videoInputRef}
              type="file"
              accept="video/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileUpload(file, "video");
              }}
            />
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => videoInputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
              Upload Video
            </Button>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

export function MultiMediaUploader({ media, onChange, label = "Media" }: MultiMediaUploaderProps) {
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const [urlType, setUrlType] = useState<"image" | "video">("image");
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const handleFileUpload = async (file: File, type: "image" | "video") => {
    setUploading(true);
    try {
      const result = await uploadFile(file, type === "image" ? "images" : "videos");
      onChange([...media, { url: result.url, type: result.type, source: "upload" }]);
      toast({ title: "Success", description: "File uploaded successfully" });
    } catch (error: unknown) {
      console.error("Upload error:", error);
      const message = error instanceof Error ? error.message : "Failed to upload file";
      toast({ title: "Error", description: message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleUrlSubmit = () => {
    if (!urlInput.trim()) return;
    onChange([...media, { url: urlInput.trim(), type: urlType, source: "url" }]);
    setUrlInput("");
  };

  const removeMedia = (index: number) => {
    onChange(media.filter((_, i) => i !== index));
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    
    const newMedia = [...media];
    const [removed] = newMedia.splice(draggedIndex, 1);
    newMedia.splice(index, 0, removed);
    onChange(newMedia);
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  return (
    <div className="space-y-3">
      <Label>{label}</Label>
      
      {media.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {media.map((item, index) => (
            <div
              key={index}
              draggable
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragEnd={handleDragEnd}
              className={`relative group rounded-lg overflow-hidden border border-border bg-muted cursor-move ${
                draggedIndex === index ? "opacity-50" : ""
              }`}
            >
              <div className="absolute top-2 left-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                <GripVertical className="h-4 w-4 text-foreground/70" />
              </div>
              {item.type === "image" ? (
                <img 
                  src={item.url} 
                  alt="Preview" 
                  className="w-full h-24 object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "/placeholder.svg";
                  }}
                />
              ) : (
                <video 
                  src={item.url} 
                  className="w-full h-24 object-cover"
                />
              )}
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="absolute top-2 right-2 h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => removeMedia(index)}
              >
                <X className="h-3 w-3" />
              </Button>
              <div className="absolute bottom-0 left-0 right-0 bg-background/80 px-2 py-0.5 text-xs text-muted-foreground">
                {item.type === "image" ? <Image className="h-3 w-3 inline mr-1" /> : <Video className="h-3 w-3 inline mr-1" />}
                {item.source === "upload" ? "Uploaded" : "URL"}
              </div>
            </div>
          ))}
        </div>
      )}

      <Tabs defaultValue="url" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="url" className="text-xs">
            <Link className="h-3 w-3 mr-1" /> URL
          </TabsTrigger>
          <TabsTrigger value="image" className="text-xs">
            <Image className="h-3 w-3 mr-1" /> Image
          </TabsTrigger>
          <TabsTrigger value="video" className="text-xs">
            <Video className="h-3 w-3 mr-1" /> Video
          </TabsTrigger>
        </TabsList>

        <TabsContent value="url" className="space-y-2">
          <div className="flex gap-2">
            <Input
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="https://example.com/media.jpg"
              className="flex-1"
            />
            <select 
              value={urlType} 
              onChange={(e) => setUrlType(e.target.value as "image" | "video")}
              className="px-2 py-1 border rounded-md text-sm bg-background"
            >
              <option value="image">Image</option>
              <option value="video">Video</option>
            </select>
            <Button type="button" size="sm" onClick={handleUrlSubmit} disabled={!urlInput.trim()}>
              Add
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="image">
          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFileUpload(file, "image");
            }}
          />
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => imageInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
            Upload Image
          </Button>
        </TabsContent>

        <TabsContent value="video">
          <input
            ref={videoInputRef}
            type="file"
            accept="video/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFileUpload(file, "video");
            }}
          />
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => videoInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
            Upload Video
          </Button>
        </TabsContent>
      </Tabs>
    </div>
  );
}
