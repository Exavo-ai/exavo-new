-- Create enum for payment models
CREATE TYPE public.payment_model AS ENUM ('one_time', 'subscription');

-- Add payment model fields to services table
ALTER TABLE public.services
ADD COLUMN payment_model public.payment_model NOT NULL DEFAULT 'one_time',
ADD COLUMN build_cost numeric DEFAULT 0,
ADD COLUMN monthly_fee numeric DEFAULT 0;

-- Add payment model field to projects table (inherited from service, read-only)
ALTER TABLE public.projects
ADD COLUMN payment_model public.payment_model;

-- Create project_subscriptions table for subscription projects
CREATE TABLE public.project_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  stripe_subscription_id text,
  stripe_customer_id text,
  next_renewal_date timestamp with time zone,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(project_id)
);

-- Enable RLS on project_subscriptions
ALTER TABLE public.project_subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS policies for project_subscriptions
CREATE POLICY "Admins can manage all project subscriptions"
ON public.project_subscriptions FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view subscriptions for their projects"
ON public.project_subscriptions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM projects p
    WHERE p.id = project_subscriptions.project_id
    AND (p.workspace_id = auth.uid() OR p.client_id = auth.uid() OR p.user_id = auth.uid())
  )
);

CREATE POLICY "Service role can manage subscriptions"
ON public.project_subscriptions FOR ALL
USING ((auth.jwt() ->> 'role'::text) = 'service_role'::text);

-- Create trigger for updated_at
CREATE TRIGGER update_project_subscriptions_updated_at
BEFORE UPDATE ON public.project_subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add index for faster lookups
CREATE INDEX idx_project_subscriptions_project_id ON public.project_subscriptions(project_id);
CREATE INDEX idx_project_subscriptions_stripe_sub ON public.project_subscriptions(stripe_subscription_id);
CREATE INDEX idx_services_payment_model ON public.services(payment_model);
CREATE INDEX idx_projects_payment_model ON public.projects(payment_model);