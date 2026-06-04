
-- 1. Fix reviews self-approval: enforce display=false on insert
DROP POLICY IF EXISTS "Insert own review" ON public.reviews;
DROP POLICY IF EXISTS "Users can insert own reviews" ON public.reviews;
DROP POLICY IF EXISTS "Authenticated users can insert their own reviews" ON public.reviews;

CREATE POLICY "Users can insert own reviews (unpublished)"
  ON public.reviews FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND display = false);

-- 2. Server-side daily quota enforcement (atomic)
CREATE OR REPLACE FUNCTION public.bump_daily_usage(_user_id uuid, _kind text, _limit int)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cur int;
BEGIN
  INSERT INTO public.daily_usage(user_id, usage_date) VALUES (_user_id, CURRENT_DATE)
    ON CONFLICT (user_id, usage_date) DO NOTHING;

  IF _kind = 'doubts' THEN
    SELECT doubts_used INTO cur FROM public.daily_usage
      WHERE user_id = _user_id AND usage_date = CURRENT_DATE FOR UPDATE;
    IF cur >= _limit THEN RETURN false; END IF;
    UPDATE public.daily_usage SET doubts_used = doubts_used + 1
      WHERE user_id = _user_id AND usage_date = CURRENT_DATE;
    RETURN true;
  ELSIF _kind = 'tests' THEN
    SELECT ai_tests_used INTO cur FROM public.daily_usage
      WHERE user_id = _user_id AND usage_date = CURRENT_DATE FOR UPDATE;
    IF cur >= _limit THEN RETURN false; END IF;
    UPDATE public.daily_usage SET ai_tests_used = ai_tests_used + 1
      WHERE user_id = _user_id AND usage_date = CURRENT_DATE;
    RETURN true;
  END IF;
  RETURN false;
END;
$$;

-- Only the service role (edge functions) may invoke this.
REVOKE ALL ON FUNCTION public.bump_daily_usage(uuid, text, int) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.bump_daily_usage(uuid, text, int) TO service_role;

-- 3. Lock down SECURITY DEFINER helpers — revoke broad EXECUTE, grant only to roles that need them.

-- Trigger-only functions: nobody should call directly.
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.bump_referral_count() FROM PUBLIC, anon, authenticated;

-- Used in RLS policies / by signed-in users.
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.bump_streak(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bump_streak(uuid) TO authenticated, service_role;

-- Public/anonymous reads: landing page stats + signup username check.
REVOKE ALL ON FUNCTION public.public_stats() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.public_stats() TO anon, authenticated, service_role;

REVOKE ALL ON FUNCTION public.username_available(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.username_available(text) TO anon, authenticated, service_role;
