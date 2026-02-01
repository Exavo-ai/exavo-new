-- Make user-files bucket public for delivery attachments to work
UPDATE storage.buckets 
SET public = true 
WHERE id = 'user-files';