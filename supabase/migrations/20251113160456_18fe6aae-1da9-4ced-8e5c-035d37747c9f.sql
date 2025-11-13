-- Secure the function by setting search_path
CREATE OR REPLACE FUNCTION public._lovable_types_sync()
RETURNS boolean
LANGUAGE sql
SET search_path = public
AS $$
  SELECT true;
$$;