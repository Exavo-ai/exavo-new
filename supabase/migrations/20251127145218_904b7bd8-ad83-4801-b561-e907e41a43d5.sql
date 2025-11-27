-- Create service_packages table
CREATE TABLE IF NOT EXISTS public.service_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  package_name TEXT NOT NULL,
  price NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  features JSONB NOT NULL DEFAULT '[]'::jsonb,
  delivery_time TEXT,
  notes TEXT,
  package_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.service_packages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for service_packages
CREATE POLICY "Anyone can view packages for active services"
ON public.service_packages
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.services
    WHERE services.id = service_packages.service_id
    AND services.active = true
  )
);

CREATE POLICY "Admins can manage packages"
ON public.service_packages
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create index for better query performance
CREATE INDEX idx_service_packages_service_id ON public.service_packages(service_id);

-- Add trigger for updated_at
CREATE TRIGGER update_service_packages_updated_at
  BEFORE UPDATE ON public.service_packages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();