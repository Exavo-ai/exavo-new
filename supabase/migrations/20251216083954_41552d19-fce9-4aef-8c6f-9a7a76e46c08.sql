
-- =============================================
-- PROJECT HUB SCHEMA UPDATES
-- =============================================

-- Add new columns to existing projects table
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS workspace_id UUID,
ADD COLUMN IF NOT EXISTS client_id UUID,
ADD COLUMN IF NOT EXISTS service_id UUID REFERENCES public.services(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS title TEXT,
ADD COLUMN IF NOT EXISTS progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
ADD COLUMN IF NOT EXISTS start_date DATE,
ADD COLUMN IF NOT EXISTS due_date DATE,
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE;

-- Update existing rows: set workspace_id and client_id from user_id, and title from name
UPDATE public.projects SET 
  workspace_id = user_id,
  client_id = user_id,
  title = name,
  progress = COALESCE(progress, 0)
WHERE workspace_id IS NULL;

-- =============================================
-- MILESTONES TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  due_date DATE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
  order_index INTEGER NOT NULL DEFAULT 0,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.milestones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view milestones for their projects"
ON public.milestones FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = milestones.project_id
    AND (
      p.workspace_id = auth.uid()
      OR p.client_id = auth.uid()
      OR p.user_id = auth.uid()
    )
  )
);

CREATE POLICY "Workspace owners can manage milestones"
ON public.milestones FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = milestones.project_id
    AND (p.workspace_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
  )
);

-- =============================================
-- PROJECT COMMENTS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.project_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  author_id UUID NOT NULL,
  author_role TEXT NOT NULL CHECK (author_role IN ('client', 'team', 'admin')),
  body TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.project_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view comments for their projects"
ON public.project_comments FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = project_comments.project_id
    AND (
      p.workspace_id = auth.uid()
      OR p.client_id = auth.uid()
      OR p.user_id = auth.uid()
    )
  )
);

CREATE POLICY "Users can insert comments on their projects"
ON public.project_comments FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = project_comments.project_id
    AND p.status != 'completed'
    AND (
      p.workspace_id = auth.uid()
      OR p.client_id = auth.uid()
      OR p.user_id = auth.uid()
    )
  )
  AND author_id = auth.uid()
);

CREATE POLICY "Users can update their own comments"
ON public.project_comments FOR UPDATE
TO authenticated
USING (author_id = auth.uid())
WITH CHECK (author_id = auth.uid());

CREATE POLICY "Admins can manage all comments"
ON public.project_comments FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- =============================================
-- PROJECT FILES TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.project_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  uploader_id UUID NOT NULL,
  uploader_role TEXT NOT NULL CHECK (uploader_role IN ('client', 'team', 'admin')),
  filename TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT,
  mime_type TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.project_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view files for their projects"
ON public.project_files FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = project_files.project_id
    AND (
      p.workspace_id = auth.uid()
      OR p.client_id = auth.uid()
      OR p.user_id = auth.uid()
    )
  )
);

CREATE POLICY "Users can upload files to their projects"
ON public.project_files FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = project_files.project_id
    AND (
      p.workspace_id = auth.uid()
      OR p.client_id = auth.uid()
      OR p.user_id = auth.uid()
    )
  )
  AND uploader_id = auth.uid()
);

CREATE POLICY "Users can delete their own files"
ON public.project_files FOR DELETE
TO authenticated
USING (uploader_id = auth.uid());

CREATE POLICY "Admins can manage all project files"
ON public.project_files FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- =============================================
-- DELIVERIES TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  files JSONB DEFAULT '[]'::jsonb,
  created_by UUID NOT NULL,
  revision_requested BOOLEAN NOT NULL DEFAULT false,
  revision_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.deliveries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view deliveries for their projects"
ON public.deliveries FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = deliveries.project_id
    AND (
      p.workspace_id = auth.uid()
      OR p.client_id = auth.uid()
      OR p.user_id = auth.uid()
    )
  )
);

CREATE POLICY "Team can create deliveries"
ON public.deliveries FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = deliveries.project_id
    AND p.status != 'completed'
    AND (p.workspace_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
  )
  AND created_by = auth.uid()
);

CREATE POLICY "Clients can request revisions"
ON public.deliveries FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = deliveries.project_id
    AND p.status != 'completed'
    AND (p.client_id = auth.uid() OR p.user_id = auth.uid())
  )
);

CREATE POLICY "Admins can manage all deliveries"
ON public.deliveries FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- =============================================
-- ADD PROJECT_ID TO TICKETS TABLE
-- =============================================
ALTER TABLE public.tickets 
ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL;

-- =============================================
-- PROJECT INVOICES TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.project_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'refunded', 'cancelled')),
  stripe_invoice_id TEXT,
  pdf_url TEXT,
  hosted_invoice_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.project_invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view invoices for their projects"
ON public.project_invoices FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = project_invoices.project_id
    AND (
      p.workspace_id = auth.uid()
      OR p.client_id = auth.uid()
      OR p.user_id = auth.uid()
    )
  )
);

CREATE POLICY "Admins can manage all project invoices"
ON public.project_invoices FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- =============================================
-- UPDATE RLS POLICIES FOR PROJECTS TABLE
-- =============================================
DROP POLICY IF EXISTS "Users can view their own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can create their own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can update their own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can delete their own projects" ON public.projects;

CREATE POLICY "Users can view their workspace projects"
ON public.projects FOR SELECT
TO authenticated
USING (
  workspace_id = auth.uid() 
  OR client_id = auth.uid()
  OR user_id = auth.uid()
);

CREATE POLICY "Users can create projects"
ON public.projects FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid() 
  AND (workspace_id = auth.uid() OR workspace_id IS NULL)
  AND (client_id = auth.uid() OR client_id IS NULL)
);

CREATE POLICY "Users can update their projects"
ON public.projects FOR UPDATE
TO authenticated
USING (
  workspace_id = auth.uid() 
  OR client_id = auth.uid()
  OR user_id = auth.uid()
);

CREATE POLICY "Users can delete their projects"
ON public.projects FOR DELETE
TO authenticated
USING (
  workspace_id = auth.uid() 
  OR user_id = auth.uid()
);

CREATE POLICY "Admins can manage all projects"
ON public.projects FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================
CREATE INDEX IF NOT EXISTS idx_projects_workspace_id ON public.projects(workspace_id);
CREATE INDEX IF NOT EXISTS idx_projects_client_id ON public.projects(client_id);
CREATE INDEX IF NOT EXISTS idx_milestones_project_id ON public.milestones(project_id);
CREATE INDEX IF NOT EXISTS idx_project_comments_project_id ON public.project_comments(project_id);
CREATE INDEX IF NOT EXISTS idx_project_comments_created_at ON public.project_comments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_project_files_project_id ON public.project_files(project_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_project_id ON public.deliveries(project_id);
CREATE INDEX IF NOT EXISTS idx_tickets_project_id ON public.tickets(project_id);
CREATE INDEX IF NOT EXISTS idx_project_invoices_project_id ON public.project_invoices(project_id);

-- =============================================
-- TRIGGERS FOR UPDATED_AT
-- =============================================
DROP TRIGGER IF EXISTS update_milestones_updated_at ON public.milestones;
CREATE TRIGGER update_milestones_updated_at
  BEFORE UPDATE ON public.milestones
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_project_comments_updated_at ON public.project_comments;
CREATE TRIGGER update_project_comments_updated_at
  BEFORE UPDATE ON public.project_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_deliveries_updated_at ON public.deliveries;
CREATE TRIGGER update_deliveries_updated_at
  BEFORE UPDATE ON public.deliveries
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_project_invoices_updated_at ON public.project_invoices;
CREATE TRIGGER update_project_invoices_updated_at
  BEFORE UPDATE ON public.project_invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- ENABLE REALTIME FOR PROJECT TABLES
-- =============================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.milestones;
ALTER PUBLICATION supabase_realtime ADD TABLE public.project_comments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.deliveries;
