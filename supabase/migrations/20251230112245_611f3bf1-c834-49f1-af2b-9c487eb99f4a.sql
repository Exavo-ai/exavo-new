-- Create enum for social post platforms
CREATE TYPE public.social_platform AS ENUM ('Instagram', 'Facebook', 'LinkedIn');

-- Create enum for social post status
CREATE TYPE public.social_post_status AS ENUM ('pending', 'approved', 'changes_requested');

-- Create social_posts table
CREATE TABLE public.social_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  platform social_platform NOT NULL,
  caption text NOT NULL,
  image_url text NOT NULL,
  status social_post_status NOT NULL DEFAULT 'pending',
  feedback text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  published_at timestamp with time zone,
  slug text UNIQUE NOT NULL
);

-- Enable RLS
ALTER TABLE public.social_posts ENABLE ROW LEVEL SECURITY;

-- Public can view approved posts only
CREATE POLICY "Anyone can view approved posts"
ON public.social_posts
FOR SELECT
TO anon, authenticated
USING (status = 'approved');

-- Admins can view all posts
CREATE POLICY "Admins can view all posts"
ON public.social_posts
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can update posts
CREATE POLICY "Admins can update posts"
ON public.social_posts
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can insert posts
CREATE POLICY "Admins can insert posts"
ON public.social_posts
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Admins can delete posts
CREATE POLICY "Admins can delete posts"
ON public.social_posts
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create index for faster slug lookups
CREATE INDEX idx_social_posts_slug ON public.social_posts(slug);

-- Create index for status filtering
CREATE INDEX idx_social_posts_status ON public.social_posts(status);

-- Create index for ordering by published_at
CREATE INDEX idx_social_posts_published_at ON public.social_posts(published_at DESC NULLS LAST);

-- Insert sample data for development
INSERT INTO public.social_posts (platform, caption, image_url, status, slug) VALUES
('Instagram', 'Discover how AI is revolutionizing small business operations. From automating customer service to predicting market trends, the future is here! 🚀

#AI #SmallBusiness #Innovation #TechTrends #BusinessGrowth', 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800', 'pending', 'ai-revolutionizing-small-business'),
('LinkedIn', 'We''re excited to announce our latest AI automation solution designed specifically for SMEs.

Key benefits:
✅ 60% reduction in manual tasks
✅ 24/7 customer support automation
✅ Predictive analytics for better decisions

Ready to transform your business? Let''s connect!', 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=800', 'pending', 'ai-automation-solution-smes'),
('Facebook', 'Behind every successful AI implementation is a team that understands your unique challenges. 

At Exavo AI, we don''t just provide tools – we partner with you to ensure seamless integration and real results.

📞 Book a free consultation today!', 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=800', 'pending', 'successful-ai-implementation-team');