-- Add invitation token column to team_members table
ALTER TABLE public.team_members 
ADD COLUMN IF NOT EXISTS invite_token TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS token_expires_at TIMESTAMP WITH TIME ZONE;

-- Create index for faster token lookups
CREATE INDEX IF NOT EXISTS idx_team_members_invite_token 
ON public.team_members(invite_token) 
WHERE invite_token IS NOT NULL;