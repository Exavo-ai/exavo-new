-- Enable realtime for appointments table
ALTER PUBLICATION supabase_realtime ADD TABLE public.appointments;

-- Enable realtime for payments table
ALTER PUBLICATION supabase_realtime ADD TABLE public.payments;