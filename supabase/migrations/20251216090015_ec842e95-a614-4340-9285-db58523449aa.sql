-- Add foreign key constraint from project_files.uploader_id to profiles.id
ALTER TABLE public.project_files
ADD CONSTRAINT project_files_uploader_id_fkey
FOREIGN KEY (uploader_id) REFERENCES public.profiles(id) ON DELETE CASCADE;