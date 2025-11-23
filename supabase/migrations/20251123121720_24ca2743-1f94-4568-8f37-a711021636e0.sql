-- Drop the existing overly broad policy
DROP POLICY IF EXISTS "Users can manage their team members" ON public.team_members;

-- Create separate policies with proper checks
CREATE POLICY "Users can insert their own team members"
  ON public.team_members
  FOR INSERT
  WITH CHECK (auth.uid() = organization_id);

CREATE POLICY "Users can update their team members"
  ON public.team_members
  FOR UPDATE
  USING (auth.uid() = organization_id);

CREATE POLICY "Users can delete their team members"
  ON public.team_members
  FOR DELETE
  USING (auth.uid() = organization_id);