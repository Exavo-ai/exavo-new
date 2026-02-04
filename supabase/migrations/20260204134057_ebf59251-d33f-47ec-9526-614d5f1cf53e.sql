-- Add FORCE ROW LEVEL SECURITY to remaining sensitive tables for complete hardening

ALTER TABLE public.tickets FORCE ROW LEVEL SECURITY;
ALTER TABLE public.notifications FORCE ROW LEVEL SECURITY;
ALTER TABLE public.user_files FORCE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles FORCE ROW LEVEL SECURITY;
ALTER TABLE public.deliveries FORCE ROW LEVEL SECURITY;