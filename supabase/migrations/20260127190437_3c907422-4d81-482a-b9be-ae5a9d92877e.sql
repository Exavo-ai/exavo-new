-- Add pause-related columns to project_subscriptions table
ALTER TABLE public.project_subscriptions 
ADD COLUMN IF NOT EXISTS paused_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS resume_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS pause_behavior TEXT;

-- Add comment for documentation
COMMENT ON COLUMN public.project_subscriptions.paused_at IS 'Timestamp when subscription was paused';
COMMENT ON COLUMN public.project_subscriptions.resume_at IS 'Scheduled date to resume the paused subscription';
COMMENT ON COLUMN public.project_subscriptions.pause_behavior IS 'Stripe pause_collection behavior: void, keep_as_draft, mark_uncollectible';