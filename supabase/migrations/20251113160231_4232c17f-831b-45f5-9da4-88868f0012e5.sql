-- No-op function to trigger type generation for src/integrations/supabase/types.ts
CREATE OR REPLACE FUNCTION public._lovable_types_sync()
RETURNS boolean
LANGUAGE sql
AS $$
  SELECT true;
$$;