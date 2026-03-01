-- Create rag-files storage bucket for RAG document uploads
INSERT INTO storage.buckets (id, name, public)
VALUES ('rag-files', 'rag-files', false)
ON CONFLICT (id) DO NOTHING;

-- RLS: authenticated users can upload to their own folder
CREATE POLICY "Users can upload RAG files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'rag-files'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- RLS: users can read their own files
CREATE POLICY "Users can read own RAG files"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'rag-files'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- RLS: users can delete their own files
CREATE POLICY "Users can delete own RAG files"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'rag-files'
  AND (storage.foldername(name))[1] = auth.uid()::text
);