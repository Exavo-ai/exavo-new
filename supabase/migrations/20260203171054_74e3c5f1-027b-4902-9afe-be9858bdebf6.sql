-- Create enums for case study system
CREATE TYPE public.case_study_project_status AS ENUM ('real_client', 'demo', 'internal');
CREATE TYPE public.case_study_module_type AS ENUM ('website', 'automation', 'ai_agent', 'ai_content', 'integration', 'other');
CREATE TYPE public.case_study_delivery_type AS ENUM ('live_ui', 'background_automation', 'api', 'internal_tool');
CREATE TYPE public.case_study_module_status AS ENUM ('live', 'testing', 'disabled');

-- Create case_study_projects table
CREATE TABLE public.case_study_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_name TEXT NOT NULL,
  industry TEXT NOT NULL,
  project_status public.case_study_project_status NOT NULL DEFAULT 'demo',
  summary TEXT NOT NULL,
  overview TEXT,
  visibility BOOLEAN NOT NULL DEFAULT false,
  show_on_landing BOOLEAN NOT NULL DEFAULT false,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create case_study_modules table
CREATE TABLE public.case_study_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.case_study_projects(id) ON DELETE CASCADE,
  module_type public.case_study_module_type NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  delivery_type public.case_study_delivery_type NOT NULL DEFAULT 'live_ui',
  tech_stack TEXT[] DEFAULT '{}',
  inputs TEXT,
  outputs TEXT,
  status public.case_study_module_status NOT NULL DEFAULT 'live',
  media JSONB DEFAULT '[]',
  kpis TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_case_study_projects_visibility ON public.case_study_projects(visibility, show_on_landing);
CREATE INDEX idx_case_study_projects_display_order ON public.case_study_projects(display_order);
CREATE INDEX idx_case_study_modules_project_id ON public.case_study_modules(project_id);

-- Enable RLS
ALTER TABLE public.case_study_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.case_study_modules ENABLE ROW LEVEL SECURITY;

-- RLS Policies for case_study_projects
-- Public can view visible projects
CREATE POLICY "Public can view visible case study projects"
ON public.case_study_projects
FOR SELECT
USING (visibility = true);

-- Admins have full access
CREATE POLICY "Admins can manage case study projects"
ON public.case_study_projects
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for case_study_modules
-- Public can view modules of visible projects
CREATE POLICY "Public can view modules of visible projects"
ON public.case_study_modules
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.case_study_projects
    WHERE id = project_id AND visibility = true
  )
);

-- Admins have full access
CREATE POLICY "Admins can manage case study modules"
ON public.case_study_modules
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Create trigger for updated_at
CREATE TRIGGER update_case_study_projects_updated_at
  BEFORE UPDATE ON public.case_study_projects
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_case_study_modules_updated_at
  BEFORE UPDATE ON public.case_study_modules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add site setting for landing page section visibility
INSERT INTO public.site_settings (key, value, category, description)
VALUES (
  'show_case_studies_section',
  'true',
  'landing_page',
  'Toggle visibility of Real Work & Case Studies section on landing page'
) ON CONFLICT (key) DO NOTHING;