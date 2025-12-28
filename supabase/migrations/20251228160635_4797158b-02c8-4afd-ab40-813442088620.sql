-- Create daily_metrics table for time-series analytics
CREATE TABLE public.daily_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL UNIQUE,
  revenue NUMERIC NOT NULL DEFAULT 0,
  bookings INTEGER NOT NULL DEFAULT 0,
  new_users INTEGER NOT NULL DEFAULT 0,
  active_users INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create service_metrics table for service popularity tracking
CREATE TABLE public.service_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL,
  service_id UUID REFERENCES public.services(id) ON DELETE CASCADE,
  service_name TEXT NOT NULL,
  bookings_count INTEGER NOT NULL DEFAULT 0,
  revenue NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(date, service_id)
);

-- Enable RLS on both tables
ALTER TABLE public.daily_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_metrics ENABLE ROW LEVEL SECURITY;

-- RLS policies - admins can manage, read-only for analytics
CREATE POLICY "Admins can manage daily_metrics" 
ON public.daily_metrics 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage service_metrics" 
ON public.service_metrics 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create indexes for efficient querying
CREATE INDEX idx_daily_metrics_date ON public.daily_metrics(date DESC);
CREATE INDEX idx_service_metrics_date ON public.service_metrics(date DESC);
CREATE INDEX idx_service_metrics_service_id ON public.service_metrics(service_id);

-- Seed realistic mock data for the last 365 days
DO $$
DECLARE
  d DATE;
  base_revenue NUMERIC;
  base_bookings INTEGER;
BEGIN
  FOR i IN 0..364 LOOP
    d := CURRENT_DATE - i;
    -- Add seasonal variation (higher in winter months)
    base_revenue := 500 + (RANDOM() * 2000) + (CASE WHEN EXTRACT(MONTH FROM d) IN (11, 12, 1) THEN 500 ELSE 0 END);
    base_bookings := 3 + FLOOR(RANDOM() * 15);
    
    INSERT INTO public.daily_metrics (date, revenue, bookings, new_users, active_users)
    VALUES (
      d,
      ROUND(base_revenue::numeric, 2),
      base_bookings,
      FLOOR(RANDOM() * 10) + 1,
      FLOOR(RANDOM() * 50) + 20
    )
    ON CONFLICT (date) DO NOTHING;
  END LOOP;
END $$;

-- Seed service_metrics with data from existing services
DO $$
DECLARE
  d DATE;
  svc RECORD;
BEGIN
  FOR svc IN SELECT id, name FROM public.services LIMIT 10 LOOP
    FOR i IN 0..364 LOOP
      d := CURRENT_DATE - i;
      INSERT INTO public.service_metrics (date, service_id, service_name, bookings_count, revenue)
      VALUES (
        d,
        svc.id,
        svc.name,
        FLOOR(RANDOM() * 8),
        ROUND((RANDOM() * 500)::numeric, 2)
      )
      ON CONFLICT (date, service_id) DO NOTHING;
    END LOOP;
  END LOOP;
END $$;