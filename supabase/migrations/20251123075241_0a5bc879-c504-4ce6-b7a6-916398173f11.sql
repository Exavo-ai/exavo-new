-- Create categories table
CREATE TABLE public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  name_ar text NOT NULL,
  icon text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- Anyone can view categories
CREATE POLICY "Anyone can view categories"
ON public.categories
FOR SELECT
USING (true);

-- Admins can manage categories
CREATE POLICY "Admins can manage categories"
ON public.categories
FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- Insert default categories first
INSERT INTO public.categories (name, name_ar, icon) VALUES
  ('AI Services', 'خدمات الذكاء الاصطناعي', 'Brain'),
  ('Automation', 'الأتمتة', 'Workflow'),
  ('Analytics', 'التحليلات', 'BarChart3'),
  ('Marketing', 'التسويق', 'Mail'),
  ('Content', 'المحتوى', 'FileText');

-- Drop the old constraint
ALTER TABLE public.services DROP CONSTRAINT IF EXISTS services_category_check;

-- Store old values temporarily
ALTER TABLE public.services ADD COLUMN category_old text;
UPDATE public.services SET category_old = category;

-- Drop default and make nullable
ALTER TABLE public.services ALTER COLUMN category DROP DEFAULT;
ALTER TABLE public.services ALTER COLUMN category DROP NOT NULL;

-- Change column type to uuid
ALTER TABLE public.services ALTER COLUMN category TYPE uuid USING NULL;

-- Update with proper category IDs based on old values
UPDATE public.services 
SET category = (
  CASE 
    WHEN category_old = 'ai' THEN (SELECT id FROM public.categories WHERE name = 'AI Services')
    WHEN category_old = 'automation' THEN (SELECT id FROM public.categories WHERE name = 'Automation')
    WHEN category_old = 'analytics' THEN (SELECT id FROM public.categories WHERE name = 'Analytics')
    WHEN category_old = 'marketing' THEN (SELECT id FROM public.categories WHERE name = 'Marketing')
    WHEN category_old = 'content' THEN (SELECT id FROM public.categories WHERE name = 'Content')
    ELSE (SELECT id FROM public.categories WHERE name = 'AI Services')
  END
);

-- Drop temporary column
ALTER TABLE public.services DROP COLUMN category_old;

-- Add foreign key constraint
ALTER TABLE public.services 
ADD CONSTRAINT services_category_fkey 
FOREIGN KEY (category) REFERENCES public.categories(id) ON DELETE SET NULL;

-- Create trigger for updated_at
CREATE TRIGGER update_categories_updated_at
BEFORE UPDATE ON public.categories
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();