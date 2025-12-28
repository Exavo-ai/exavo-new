-- Create user_credits table for tracking credit balance
CREATE TABLE public.user_credits (
  user_id UUID PRIMARY KEY,
  balance INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_credits ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_credits
CREATE POLICY "Users can view their own credits"
  ON public.user_credits
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage credits"
  ON public.user_credits
  FOR ALL
  USING ((auth.jwt() ->> 'role'::text) = 'service_role');

-- Create credit_ledger table for tracking credit transactions
CREATE TABLE public.credit_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  delta INTEGER NOT NULL,
  reason TEXT NOT NULL,
  source TEXT NOT NULL,
  stripe_event_id TEXT UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.credit_ledger ENABLE ROW LEVEL SECURITY;

-- RLS policies for credit_ledger
CREATE POLICY "Users can view their own ledger"
  ON public.credit_ledger
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage ledger"
  ON public.credit_ledger
  FOR ALL
  USING ((auth.jwt() ->> 'role'::text) = 'service_role');

-- Create subscriptions table for tracking user subscriptions
CREATE TABLE public.subscriptions (
  user_id UUID PRIMARY KEY,
  stripe_customer_id TEXT NOT NULL,
  stripe_subscription_id TEXT NOT NULL,
  price_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  current_period_end TIMESTAMP WITH TIME ZONE NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS policies for subscriptions
CREATE POLICY "Users can view their own subscription"
  ON public.subscriptions
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage subscriptions"
  ON public.subscriptions
  FOR ALL
  USING ((auth.jwt() ->> 'role'::text) = 'service_role');

-- Create webhook_events table for idempotency
CREATE TABLE public.webhook_events (
  event_id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;

-- Only service role can access webhook_events
CREATE POLICY "Service role can manage webhook events"
  ON public.webhook_events
  FOR ALL
  USING ((auth.jwt() ->> 'role'::text) = 'service_role');

-- Create index for faster lookups
CREATE INDEX idx_credit_ledger_user_id ON public.credit_ledger(user_id);
CREATE INDEX idx_credit_ledger_stripe_event ON public.credit_ledger(stripe_event_id) WHERE stripe_event_id IS NOT NULL;