-- Create reviews table for client testimonials
CREATE TABLE public.reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  delivery_id UUID REFERENCES public.deliveries(id) ON DELETE SET NULL,
  service_id UUID REFERENCES public.services(id) ON DELETE SET NULL,
  client_id UUID NOT NULL,
  service_type TEXT,
  client_name TEXT NOT NULL,
  client_company TEXT,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  show_on_home BOOLEAN NOT NULL DEFAULT false,
  priority INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for efficient querying
CREATE INDEX idx_reviews_status ON public.reviews(status);
CREATE INDEX idx_reviews_service_id ON public.reviews(service_id);
CREATE INDEX idx_reviews_show_on_home ON public.reviews(show_on_home) WHERE show_on_home = true;
CREATE INDEX idx_reviews_client_id ON public.reviews(client_id);
CREATE INDEX idx_reviews_delivery_id ON public.reviews(delivery_id);

-- Enable RLS
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can view approved reviews (for public display)
CREATE POLICY "Anyone can view approved reviews"
ON public.reviews
FOR SELECT
USING (status = 'approved');

-- Policy: Clients can view their own reviews (any status)
CREATE POLICY "Clients can view their own reviews"
ON public.reviews
FOR SELECT
USING (auth.uid() = client_id);

-- Policy: Clients can insert their own reviews
CREATE POLICY "Clients can insert their own reviews"
ON public.reviews
FOR INSERT
WITH CHECK (auth.uid() = client_id);

-- Policy: Admins can manage all reviews
CREATE POLICY "Admins can manage all reviews"
ON public.reviews
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_reviews_updated_at
BEFORE UPDATE ON public.reviews
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();