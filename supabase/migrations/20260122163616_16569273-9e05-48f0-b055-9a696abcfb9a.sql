-- Create blog_posts table
CREATE TABLE public.blog_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  excerpt TEXT,
  content TEXT,
  featured_image TEXT,
  gallery_images JSONB DEFAULT '[]'::jsonb,
  uploaded_video TEXT,
  video_url TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;

-- Admins can manage all blog posts
CREATE POLICY "Admins can manage blog posts"
ON public.blog_posts
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Anyone can view published posts
CREATE POLICY "Anyone can view published blog posts"
ON public.blog_posts
FOR SELECT
USING (status = 'published');

-- Create updated_at trigger
CREATE TRIGGER update_blog_posts_updated_at
BEFORE UPDATE ON public.blog_posts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for blog media
INSERT INTO storage.buckets (id, name, public) VALUES ('blog-media', 'blog-media', true);

-- Storage policies for blog media
CREATE POLICY "Anyone can view blog media"
ON storage.objects
FOR SELECT
USING (bucket_id = 'blog-media');

CREATE POLICY "Admins can upload blog media"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'blog-media' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update blog media"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'blog-media' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete blog media"
ON storage.objects
FOR DELETE
USING (bucket_id = 'blog-media' AND has_role(auth.uid(), 'admin'::app_role));