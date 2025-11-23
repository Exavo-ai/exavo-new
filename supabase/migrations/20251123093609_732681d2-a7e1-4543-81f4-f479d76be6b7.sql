-- Create ticket_replies table to store conversation history
CREATE TABLE public.ticket_replies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  message TEXT NOT NULL,
  is_admin BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ticket_replies ENABLE ROW LEVEL SECURITY;

-- Users can view replies for their own tickets
CREATE POLICY "Users can view replies for their tickets"
ON public.ticket_replies
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.tickets
    WHERE tickets.id = ticket_replies.ticket_id
    AND tickets.user_id = auth.uid()
  )
);

-- Admins can view all replies
CREATE POLICY "Admins can view all replies"
ON public.ticket_replies
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can insert replies
CREATE POLICY "Admins can insert replies"
ON public.ticket_replies
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Users can insert their own replies
CREATE POLICY "Users can insert their own replies"
ON public.ticket_replies
FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND is_admin = false
  AND EXISTS (
    SELECT 1 FROM public.tickets
    WHERE tickets.id = ticket_replies.ticket_id
    AND tickets.user_id = auth.uid()
  )
);

-- Create index for better query performance
CREATE INDEX idx_ticket_replies_ticket_id ON public.ticket_replies(ticket_id);
CREATE INDEX idx_ticket_replies_created_at ON public.ticket_replies(created_at DESC);