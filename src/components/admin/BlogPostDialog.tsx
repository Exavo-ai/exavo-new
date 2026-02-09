import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Upload, X, Image, Video, Sparkles } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type BlogPost = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string | null;
  featured_image: string | null;
  gallery_images: string[];
  uploaded_video: string | null;
  video_poster: string | null;
  video_url: string | null;
  status: string;
  created_at: string;
  updated_at: string;
};

interface BlogPostDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  post: BlogPost | null;
}

export function BlogPostDialog({ open, onOpenChange, post }: BlogPostDialogProps) {
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [content, setContent] = useState("");
  const [featuredImage, setFeaturedImage] = useState<string | null>(null);
  const [galleryImages, setGalleryImages] = useState<string[]>([]);
  const [uploadedVideo, setUploadedVideo] = useState<string | null>(null);
  const [videoPoster, setVideoPoster] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState("");
  const [status, setStatus] = useState("draft");
  const [uploading, setUploading] = useState(false);
  const [aiTitle, setAiTitle] = useState("");
  const [aiGenerating, setAiGenerating] = useState(false);
  const [showOverwriteConfirm, setShowOverwriteConfirm] = useState(false);
  const [pendingAiContent, setPendingAiContent] = useState("");
  const queryClient = useQueryClient();

  useEffect(() => {
    if (post) {
      setTitle(post.title);
      setSlug(post.slug);
      setContent(post.content || "");
      setFeaturedImage(post.featured_image);
      setGalleryImages(post.gallery_images || []);
      setUploadedVideo(post.uploaded_video);
      setVideoPoster(post.video_poster);
      setVideoUrl(post.video_url || "");
      setStatus(post.status);
    } else {
      setTitle("");
      setSlug("");
      setContent("");
      setFeaturedImage(null);
      setGalleryImages([]);
      setUploadedVideo(null);
      setVideoPoster(null);
      setVideoUrl("");
      setStatus("draft");
    }
  }, [post, open]);

  const generateSlug = (text: string) => {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .trim();
  };

  const handleTitleChange = (value: string) => {
    setTitle(value);
    if (!post) {
      setSlug(generateSlug(value));
    }
  };

  const generateExcerpt = (text: string) => {
    const plainText = text.replace(/<[^>]*>/g, "").replace(/\n+/g, " ");
    return plainText.substring(0, 200).trim() + (plainText.length > 200 ? "..." : "");
  };

  const uploadFile = async (file: File, folder: string) => {
    const fileExt = file.name.split(".").pop();
    const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`;

    const { error } = await supabase.storage
      .from("blog-media")
      .upload(fileName, file);

    if (error) throw error;

    const { data: urlData } = supabase.storage
      .from("blog-media")
      .getPublicUrl(fileName);

    return urlData.publicUrl;
  };

  const handleFeaturedImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }

    setUploading(true);
    try {
      const url = await uploadFile(file, "featured");
      setFeaturedImage(url);
      toast.success("Featured image uploaded");
    } catch (error) {
      toast.error("Failed to upload image");
    } finally {
      setUploading(false);
    }
  };

  const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    setUploading(true);
    try {
      const urls: string[] = [];
      for (const file of Array.from(files)) {
        if (file.type.startsWith("image/")) {
          const url = await uploadFile(file, "gallery");
          urls.push(url);
        }
      }
      setGalleryImages([...galleryImages, ...urls]);
      toast.success(`${urls.length} image(s) uploaded`);
    } catch (error) {
      toast.error("Failed to upload images");
    } finally {
      setUploading(false);
    }
  };

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("video/")) {
      toast.error("Please upload a video file");
      return;
    }

    if (file.size > 100 * 1024 * 1024) {
      toast.error("Video file must be under 100MB");
      return;
    }

    setUploading(true);
    try {
      const url = await uploadFile(file, "videos");
      setUploadedVideo(url);
      toast.success("Video uploaded");
    } catch (error) {
      toast.error("Failed to upload video");
    } finally {
      setUploading(false);
    }
  };

  const handleVideoPosterUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }

    setUploading(true);
    try {
      const url = await uploadFile(file, "posters");
      setVideoPoster(url);
      toast.success("Video thumbnail uploaded");
    } catch (error) {
      toast.error("Failed to upload thumbnail");
    } finally {
      setUploading(false);
    }
  };

  const removeGalleryImage = (index: number) => {
    setGalleryImages(galleryImages.filter((_, i) => i !== index));
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const postData = {
        title,
        slug,
        excerpt: generateExcerpt(content),
        content,
        featured_image: featuredImage,
        gallery_images: galleryImages,
        uploaded_video: uploadedVideo,
        video_poster: videoPoster,
        video_url: videoUrl || null,
        status,
      };

      if (post) {
        const { error } = await supabase
          .from("blog_posts")
          .update(postData)
          .eq("id", post.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("blog_posts").insert(postData);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-blog-posts"] });
      toast.success(post ? "Blog post updated" : "Blog post created");
      onOpenChange(false);
    },
    onError: (error: Error) => {
      if (error.message.includes("duplicate")) {
        toast.error("A post with this slug already exists");
      } else {
        toast.error("Failed to save blog post");
      }
    },
  });

  const handleSave = () => {
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }
    if (!slug.trim()) {
      toast.error("Slug is required");
      return;
    }
    saveMutation.mutate();
  };

  const applyAiContent = (generatedContent: string) => {
    setContent(generatedContent);
    setStatus("draft");
    toast.success("AI content inserted as draft");
  };

  const handleGenerateContent = async () => {
    if (!aiTitle.trim()) return;
    setAiGenerating(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) {
        throw new Error("You must be logged in to generate content");
      }
      const res = await supabase.functions.invoke("ai-generate-blog", {
        body: { title: aiTitle.trim() },
      });
      if (res.error) {
        throw new Error(res.error.message || "Failed to generate content");
      }
      if (res.data?.error) {
        throw new Error(res.data.error);
      }
      const generatedContent = res.data?.content;
      if (!generatedContent || typeof generatedContent !== "string") {
        throw new Error("No content returned from generation service");
      }
      if (content.trim()) {
        setPendingAiContent(generatedContent);
        setShowOverwriteConfirm(true);
      } else {
        applyAiContent(generatedContent);
      }
    } catch (error: any) {
      toast.error(error?.message || "Failed to generate content");
    } finally {
      setAiGenerating(false);
    }
  };

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{post ? "Edit Blog Post" : "Create Blog Post"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              placeholder="Enter post title"
            />
          </div>

          {/* Slug */}
          <div className="space-y-2">
            <Label htmlFor="slug">Slug</Label>
            <Input
              id="slug"
              value={slug}
              onChange={(e) => setSlug(generateSlug(e.target.value))}
              placeholder="post-url-slug"
              className="font-mono text-sm"
            />
          </div>

          {/* Featured Image */}
          <div className="space-y-2">
            <Label>Featured Image</Label>
            {featuredImage ? (
              <div className="relative inline-block">
                <img
                  src={featuredImage}
                  alt="Featured"
                  className="w-full max-w-md h-48 object-cover rounded-lg"
                />
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2"
                  onClick={() => setFeaturedImage(null)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                <Image className="w-8 h-8 text-muted-foreground mb-2" />
                <span className="text-sm text-muted-foreground">
                  Click to upload featured image
                </span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFeaturedImageUpload}
                  className="hidden"
                  disabled={uploading}
                />
              </label>
            )}
          </div>

          {/* AI Content Generation */}
          <div className="space-y-3 p-4 border border-dashed border-primary/30 rounded-lg bg-primary/5">
            <Label className="flex items-center gap-2 text-sm font-semibold">
              <Sparkles className="w-4 h-4 text-primary" />
              AI Article Title
            </Label>
            <div className="flex gap-2">
              <Input
                value={aiTitle}
                onChange={(e) => setAiTitle(e.target.value)}
                placeholder="Enter a title to generate article content..."
                className="flex-1"
              />
              <Button
                type="button"
                variant="secondary"
                disabled={!aiTitle.trim() || aiGenerating}
                onClick={handleGenerateContent}
              >
                {aiGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Generate Content (AI)
                  </>
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Generates draft content only — does not save or publish.
            </p>
          </div>

          {/* Content */}
          <div className="space-y-2">
            <Label htmlFor="content">Content</Label>
            <Textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write your blog post content here... Use markdown for formatting."
              className="min-h-[200px] font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Supports basic formatting: **bold**, *italic*, # headings, - lists, &gt; quotes
            </p>
          </div>

          {/* Gallery Images */}
          <div className="space-y-2">
            <Label>Gallery Images (Optional)</Label>
            <div className="grid grid-cols-4 gap-2">
              {galleryImages.map((url, index) => (
                <div key={index} className="relative">
                  <img
                    src={url}
                    alt=""
                    className="w-full h-20 object-cover rounded"
                  />
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute -top-2 -right-2 w-6 h-6"
                    onClick={() => removeGalleryImage(index)}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              ))}
              <label className="flex flex-col items-center justify-center h-20 border-2 border-dashed rounded cursor-pointer hover:bg-muted/50 transition-colors">
                <Upload className="w-4 h-4 text-muted-foreground" />
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleGalleryUpload}
                  className="hidden"
                  disabled={uploading}
                />
              </label>
            </div>
          </div>

          {/* Video Upload */}
          <div className="space-y-2">
            <Label>Video (Optional)</Label>
            {uploadedVideo ? (
              <div className="relative space-y-2">
                <video
                  key={uploadedVideo}
                  className="w-full max-w-md rounded-lg"
                  controls
                  playsInline
                  preload="metadata"
                  poster={videoPoster || undefined}
                >
                  <source 
                    src={uploadedVideo} 
                    type={uploadedVideo.toLowerCase().includes('.webm') ? 'video/webm' : 'video/mp4'} 
                  />
                  Your browser does not support the video tag.
                </video>
                <div className="flex items-center gap-2">
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => {
                      setUploadedVideo(null);
                      setVideoPoster(null);
                    }}
                  >
                    <X className="w-4 h-4 mr-1" />
                    Remove
                  </Button>
                  <a 
                    href={uploadedVideo} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-xs text-muted-foreground hover:text-primary underline"
                  >
                    Open video in new tab
                  </a>
                </div>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                <Video className="w-6 h-6 text-muted-foreground mb-1" />
                <span className="text-sm text-muted-foreground">
                  Upload video (mp4, webm - max 100MB)
                </span>
                <input
                  type="file"
                  accept="video/mp4,video/webm"
                  onChange={handleVideoUpload}
                  className="hidden"
                  disabled={uploading}
                />
              </label>
            )}
          </div>

          {/* Video Thumbnail/Poster */}
          {uploadedVideo && (
            <div className="space-y-2">
              <Label>Video Thumbnail (Optional)</Label>
              <p className="text-xs text-muted-foreground">
                This image will be displayed before the video plays
              </p>
              {videoPoster ? (
                <div className="relative inline-block">
                  <img
                    src={videoPoster}
                    alt="Video thumbnail"
                    className="w-full max-w-xs h-32 object-cover rounded-lg border"
                  />
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2 w-6 h-6"
                    onClick={() => setVideoPoster(null)}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center w-full max-w-xs h-24 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                  <Image className="w-5 h-5 text-muted-foreground mb-1" />
                  <span className="text-sm text-muted-foreground">
                    Upload thumbnail image
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleVideoPosterUpload}
                    className="hidden"
                    disabled={uploading}
                  />
                </label>
              )}
            </div>
          )}

          {/* Video URL */}
          <div className="space-y-2">
            <Label htmlFor="videoUrl">External Video URL (Optional)</Label>
            <Input
              id="videoUrl"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder="https://youtube.com/watch?v=... or https://vimeo.com/..."
            />
          </div>

          {/* Status */}
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="published">Published</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saveMutation.isPending || uploading}>
              {saveMutation.isPending || uploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                post ? "Update Post" : "Create Post"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>

    <AlertDialog open={showOverwriteConfirm} onOpenChange={setShowOverwriteConfirm}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Overwrite existing content?</AlertDialogTitle>
          <AlertDialogDescription>
            The content field already has text. Generating new content will replace it. This cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => setPendingAiContent("")}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={() => {
            applyAiContent(pendingAiContent);
            setPendingAiContent("");
            setShowOverwriteConfirm(false);
          }}>
            Replace Content
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
