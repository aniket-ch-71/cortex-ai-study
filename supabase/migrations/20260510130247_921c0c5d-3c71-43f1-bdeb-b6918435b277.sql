
CREATE OR REPLACE FUNCTION public.username_available(uname text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE lower(username) = lower(uname)
  );
$$;

REVOKE ALL ON FUNCTION public.username_available(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.username_available(text) TO anon, authenticated;
