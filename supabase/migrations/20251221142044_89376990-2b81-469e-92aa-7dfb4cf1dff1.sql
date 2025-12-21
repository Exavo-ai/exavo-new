-- =============================================
-- LEADS TABLE (Consultation Requests)
-- =============================================

CREATE TABLE public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'replied', 'closed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable and force RLS
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads FORCE ROW LEVEL SECURITY;

-- Anyone can insert (guests + authenticated)
CREATE POLICY "leads_insert_anyone"
ON public.leads
FOR INSERT
WITH CHECK (true);

-- Authenticated users can view their own leads
CREATE POLICY "leads_select_owner"
ON public.leads
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Admins can view all leads
CREATE POLICY "leads_select_admin"
ON public.leads
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Admins can update all leads
CREATE POLICY "leads_update_admin"
ON public.leads
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Admins can delete leads
CREATE POLICY "leads_delete_admin"
ON public.leads
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- =============================================
-- LEAD MESSAGES TABLE (Thread)
-- =============================================

CREATE TABLE public.lead_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  sender_role TEXT NOT NULL CHECK (sender_role IN ('admin', 'user', 'guest')),
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable and force RLS
ALTER TABLE public.lead_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_messages FORCE ROW LEVEL SECURITY;

-- Authenticated users can view messages for their own leads
CREATE POLICY "lead_messages_select_owner"
ON public.lead_messages
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.leads
    WHERE leads.id = lead_messages.lead_id
    AND leads.user_id = auth.uid()
  )
);

-- Admins can view all messages
CREATE POLICY "lead_messages_select_admin"
ON public.lead_messages
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Admins can insert messages (replies)
CREATE POLICY "lead_messages_insert_admin"
ON public.lead_messages
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Users can insert messages for their own leads
CREATE POLICY "lead_messages_insert_owner"
ON public.lead_messages
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.leads
    WHERE leads.id = lead_messages.lead_id
    AND leads.user_id = auth.uid()
  )
  AND sender_id = auth.uid()
);

-- Trigger to update leads.updated_at on message insert
CREATE OR REPLACE FUNCTION public.update_lead_on_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.leads
  SET updated_at = now(),
      status = CASE 
        WHEN NEW.sender_role = 'admin' THEN 'replied'
        ELSE status
      END
  WHERE id = NEW.lead_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_lead_message_insert
AFTER INSERT ON public.lead_messages
FOR EACH ROW
EXECUTE FUNCTION public.update_lead_on_message();