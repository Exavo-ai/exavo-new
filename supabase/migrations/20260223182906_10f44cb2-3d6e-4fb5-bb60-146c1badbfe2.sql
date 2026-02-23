
-- Create scheduled_blog_posts table
CREATE TABLE public.scheduled_blog_posts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  slug text NOT NULL UNIQUE,
  scheduled_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'published', 'failed')),
  generated_content text,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes for scheduler queries
CREATE INDEX idx_scheduled_blog_posts_status ON public.scheduled_blog_posts (status);
CREATE INDEX idx_scheduled_blog_posts_scheduled_at ON public.scheduled_blog_posts (scheduled_at);
CREATE INDEX idx_scheduled_blog_posts_status_scheduled ON public.scheduled_blog_posts (status, scheduled_at) WHERE status = 'pending';

-- Enable RLS
ALTER TABLE public.scheduled_blog_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheduled_blog_posts FORCE ROW LEVEL SECURITY;

-- Admin-only access
CREATE POLICY "Admins can manage scheduled blog posts"
  ON public.scheduled_blog_posts
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Block anonymous access
CREATE POLICY "Block anonymous access to scheduled_blog_posts"
  ON public.scheduled_blog_posts
  FOR ALL
  TO anon
  USING (false)
  WITH CHECK (false);

-- Updated_at trigger
CREATE TRIGGER update_scheduled_blog_posts_updated_at
  BEFORE UPDATE ON public.scheduled_blog_posts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
