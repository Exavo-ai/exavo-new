-- Create workspaces table to track subscription plans
CREATE TABLE IF NOT EXISTS public.workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  current_plan_product_id TEXT NOT NULL DEFAULT 'default',
  subscription_status TEXT NOT NULL DEFAULT 'free',
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(owner_id)
);

-- Enable RLS
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own workspace"
  ON public.workspaces
  FOR SELECT
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can update their own workspace"
  ON public.workspaces
  FOR UPDATE
  USING (auth.uid() = owner_id);

CREATE POLICY "System can insert workspaces"
  ON public.workspaces
  FOR INSERT
  WITH CHECK (true);

-- Create trigger to update updated_at
CREATE TRIGGER update_workspaces_updated_at
  BEFORE UPDATE ON public.workspaces
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create workspace for existing users
INSERT INTO public.workspaces (owner_id, current_plan_product_id, subscription_status)
SELECT id, 'default', 'free'
FROM auth.users
ON CONFLICT (owner_id) DO NOTHING;