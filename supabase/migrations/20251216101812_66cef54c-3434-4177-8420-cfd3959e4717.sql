-- Add storage policy for admins to upload delivery files
CREATE POLICY "Admins can upload delivery files"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'user-files' 
  AND (storage.foldername(name))[1] = 'deliveries'
  AND public.has_role(auth.uid(), 'admin'::public.app_role)
);

-- Add storage policy for admins to read delivery files
CREATE POLICY "Admins can read delivery files"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'user-files' 
  AND (storage.foldername(name))[1] = 'deliveries'
  AND public.has_role(auth.uid(), 'admin'::public.app_role)
);

-- Add storage policy for project owners/clients to read delivery files
CREATE POLICY "Users can read their project delivery files"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'user-files' 
  AND (storage.foldername(name))[1] = 'deliveries'
  AND EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id::text = (storage.foldername(name))[2]
    AND (p.workspace_id = auth.uid() OR p.client_id = auth.uid() OR p.user_id = auth.uid())
  )
);