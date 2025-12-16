-- Storage RLS policies for project files in bucket: user-files
-- Supports:
-- 1) Admin portal uploads to path: admin/{projectId}/...
-- 2) Client uploads to path: {userId}/projects/{projectId}/...

DO $$
BEGIN
  CREATE POLICY "Admins can upload admin project files"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'user-files'
    AND (storage.foldername(name))[1] = 'admin'
    AND public.has_role(auth.uid(), 'admin'::public.app_role)
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY "Admins can read admin project files"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'user-files'
    AND (storage.foldername(name))[1] = 'admin'
    AND public.has_role(auth.uid(), 'admin'::public.app_role)
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY "Users can read team project files"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'user-files'
    AND (storage.foldername(name))[1] = 'admin'
    AND EXISTS (
      SELECT 1
      FROM public.projects p
      WHERE p.id::text = (storage.foldername(name))[2]
        AND (
          p.workspace_id = auth.uid()
          OR p.client_id = auth.uid()
          OR p.user_id = auth.uid()
        )
    )
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY "Users can upload their project files"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'user-files'
    AND (storage.foldername(name))[1] = auth.uid()::text
    AND (storage.foldername(name))[2] = 'projects'
    AND EXISTS (
      SELECT 1
      FROM public.projects p
      WHERE p.id::text = (storage.foldername(name))[3]
        AND (
          p.workspace_id = auth.uid()
          OR p.client_id = auth.uid()
          OR p.user_id = auth.uid()
        )
    )
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY "Users can read their project files"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'user-files'
    AND (storage.foldername(name))[1] = auth.uid()::text
    AND (storage.foldername(name))[2] = 'projects'
    AND EXISTS (
      SELECT 1
      FROM public.projects p
      WHERE p.id::text = (storage.foldername(name))[3]
        AND (
          p.workspace_id = auth.uid()
          OR p.client_id = auth.uid()
          OR p.user_id = auth.uid()
        )
    )
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
