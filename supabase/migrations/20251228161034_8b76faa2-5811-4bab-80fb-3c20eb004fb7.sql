-- Add new metrics tables to realtime publication (payments and appointments already added)
ALTER PUBLICATION supabase_realtime ADD TABLE public.daily_metrics;
ALTER PUBLICATION supabase_realtime ADD TABLE public.service_metrics;