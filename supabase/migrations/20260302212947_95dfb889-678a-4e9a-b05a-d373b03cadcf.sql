
-- Table for tracking daily blog generation usage
CREATE TABLE public.user_daily_blog_usage (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  usage_date DATE NOT NULL DEFAULT CURRENT_DATE,
  generation_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, usage_date)
);

-- Enable RLS
ALTER TABLE public.user_daily_blog_usage ENABLE ROW LEVEL SECURITY;

-- Users can view their own usage
CREATE POLICY "Users can view their own blog usage"
ON public.user_daily_blog_usage
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Service role can manage all usage (for edge function)
CREATE POLICY "Service role can manage blog usage"
ON public.user_daily_blog_usage
FOR ALL
USING ((auth.jwt() ->> 'role'::text) = 'service_role'::text);

-- Trigger for updated_at
CREATE TRIGGER update_user_daily_blog_usage_updated_at
BEFORE UPDATE ON public.user_daily_blog_usage
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
