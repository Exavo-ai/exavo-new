-- Create storage bucket for case study media
INSERT INTO storage.buckets (id, name, public)
VALUES ('case-study-media', 'case-study-media', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access
CREATE POLICY "Public can view case study media"
ON storage.objects FOR SELECT
USING (bucket_id = 'case-study-media');

-- Allow admins to upload/update/delete
CREATE POLICY "Admins can manage case study media"
ON storage.objects FOR ALL
USING (
  bucket_id = 'case-study-media' 
  AND EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
)
WITH CHECK (
  bucket_id = 'case-study-media' 
  AND EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);