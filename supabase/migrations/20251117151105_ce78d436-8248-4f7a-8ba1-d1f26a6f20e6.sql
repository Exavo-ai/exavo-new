-- Fix 1: Secure chat_messages table
-- First, set any NULL user_id rows to a system user (or delete them if they exist)
DELETE FROM chat_messages WHERE user_id IS NULL;

-- Make user_id NOT NULL
ALTER TABLE chat_messages ALTER COLUMN user_id SET NOT NULL;

-- Drop the permissive insert policy
DROP POLICY IF EXISTS "Users can insert their own messages" ON chat_messages;

-- Create strict insert policy
CREATE POLICY "Users can insert own messages only"
  ON chat_messages FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Fix 2: Secure activity_logs table
-- Remove the permissive insert policy
DROP POLICY IF EXISTS "System can insert activity logs" ON activity_logs;

-- Only allow inserts from service role (edge functions/triggers only)
-- No policy = only service role key can insert