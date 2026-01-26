-- Add delivery approval columns to deliveries table
ALTER TABLE public.deliveries 
ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending' 
CHECK (status IN ('pending', 'approved', 'changes_requested'));

ALTER TABLE public.deliveries 
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE public.deliveries 
ADD COLUMN IF NOT EXISTS approved_by UUID;

-- Create index for faster status queries
CREATE INDEX IF NOT EXISTS idx_deliveries_status ON public.deliveries(status);

-- Update existing deliveries: if revision_requested is true, set status to 'changes_requested'
UPDATE public.deliveries 
SET status = 'changes_requested' 
WHERE revision_requested = true AND status = 'pending';

-- Create a function to auto-complete project when all deliveries are approved
CREATE OR REPLACE FUNCTION public.check_project_completion()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if all deliveries for this project are approved
  IF NEW.status = 'approved' THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.deliveries 
      WHERE project_id = NEW.project_id 
      AND status != 'approved'
    ) THEN
      -- All deliveries are approved, mark project as completed
      UPDATE public.projects 
      SET status = 'completed', 
          completed_at = NOW(),
          updated_at = NOW()
      WHERE id = NEW.project_id 
      AND status != 'completed';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger to check project completion when delivery status changes
DROP TRIGGER IF EXISTS trigger_check_project_completion ON public.deliveries;
CREATE TRIGGER trigger_check_project_completion
AFTER UPDATE OF status ON public.deliveries
FOR EACH ROW
EXECUTE FUNCTION public.check_project_completion();