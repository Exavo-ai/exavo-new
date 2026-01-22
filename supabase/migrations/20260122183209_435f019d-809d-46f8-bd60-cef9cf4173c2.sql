-- Add video poster column to blog_posts
ALTER TABLE public.blog_posts 
ADD COLUMN video_poster TEXT NULL;