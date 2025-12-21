-- Create admin_notes table for private notes on users
CREATE TABLE public.admin_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  admin_id UUID NOT NULL,
  note TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add index for faster lookups
CREATE INDEX idx_admin_notes_user_id ON public.admin_notes(user_id);
CREATE INDEX idx_admin_notes_admin_id ON public.admin_notes(admin_id);

-- Enable Row Level Security
ALTER TABLE public.admin_notes ENABLE ROW LEVEL SECURITY;

-- Only admins can view all notes
CREATE POLICY "Admins can view all notes"
ON public.admin_notes
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Only admins can create notes
CREATE POLICY "Admins can create notes"
ON public.admin_notes
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) AND admin_id = auth.uid());

-- Admins can update their own notes
CREATE POLICY "Admins can update their own notes"
ON public.admin_notes
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role) AND admin_id = auth.uid());

-- Admins can delete their own notes
CREATE POLICY "Admins can delete their own notes"
ON public.admin_notes
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role) AND admin_id = auth.uid());

-- Trigger for updated_at
CREATE TRIGGER update_admin_notes_updated_at
BEFORE UPDATE ON public.admin_notes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();