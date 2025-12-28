-- Create storage bucket for service media
INSERT INTO storage.buckets (id, name, public)
VALUES ('service-media', 'service-media', true)
ON CONFLICT (id) DO NOTHING;

-- Create RLS policy for admins to upload to service-media bucket
CREATE POLICY "Admins can upload service media"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'service-media' 
  AND has_role(auth.uid(), 'admin'::app_role)
);

-- Create RLS policy for admins to update service media
CREATE POLICY "Admins can update service media"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'service-media' 
  AND has_role(auth.uid(), 'admin'::app_role)
);

-- Create RLS policy for admins to delete service media
CREATE POLICY "Admins can delete service media"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'service-media' 
  AND has_role(auth.uid(), 'admin'::app_role)
);

-- Create RLS policy for public to view service media
CREATE POLICY "Anyone can view service media"
ON storage.objects
FOR SELECT
USING (bucket_id = 'service-media');

-- Add media column to services table (for single media per service)
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS media jsonb DEFAULT NULL;

-- Migrate existing image_url to new media structure
UPDATE public.services 
SET media = jsonb_build_object('url', image_url, 'type', 'image', 'source', 'url')
WHERE image_url IS NOT NULL AND image_url != '' AND media IS NULL;