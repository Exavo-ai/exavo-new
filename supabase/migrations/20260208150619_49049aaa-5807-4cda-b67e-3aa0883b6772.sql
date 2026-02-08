-- Enable FORCE RLS on project_files to match other sensitive tables
ALTER TABLE public.project_files FORCE ROW LEVEL SECURITY;