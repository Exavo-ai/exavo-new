-- Add service field to tickets table
ALTER TABLE public.tickets 
ADD COLUMN IF NOT EXISTS service TEXT;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_tickets_user_id ON public.tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON public.tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_created_at ON public.tickets(created_at DESC);