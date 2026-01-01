-- Add subscription cancellation tracking + checkout session linkage
ALTER TABLE public.project_subscriptions
ADD COLUMN IF NOT EXISTS stripe_checkout_session_id text,
ADD COLUMN IF NOT EXISTS cancel_at_period_end boolean NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS canceled_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS cancel_reason text;

-- Helpful indexes (safe if already exist)
CREATE INDEX IF NOT EXISTS idx_project_subscriptions_project_id ON public.project_subscriptions (project_id);
CREATE INDEX IF NOT EXISTS idx_project_subscriptions_stripe_subscription_id ON public.project_subscriptions (stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_project_subscriptions_stripe_customer_id ON public.project_subscriptions (stripe_customer_id);