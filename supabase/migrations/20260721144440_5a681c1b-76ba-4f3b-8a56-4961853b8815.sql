
-- 1. Remove client write access to daily_usage
DROP POLICY IF EXISTS "Users can insert own usage" ON public.daily_usage;
DROP POLICY IF EXISTS "Users can update own usage" ON public.daily_usage;
REVOKE INSERT, UPDATE, DELETE ON public.daily_usage FROM authenticated, anon;
GRANT SELECT ON public.daily_usage TO authenticated;
GRANT ALL ON public.daily_usage TO service_role;

-- 2. Referrals: remove client insert policy, add secure RPC
DROP POLICY IF EXISTS "Authenticated users can insert referral" ON public.referrals;
REVOKE INSERT ON public.referrals FROM authenticated, anon;

CREATE OR REPLACE FUNCTION public.redeem_referral(_code text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _referrer uuid;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;
  IF _code IS NULL OR length(btrim(_code)) = 0 THEN
    RETURN false;
  END IF;

  SELECT id INTO _referrer
  FROM public.profiles
  WHERE referral_code = upper(btrim(_code))
  LIMIT 1;

  IF _referrer IS NULL OR _referrer = _uid THEN
    RETURN false;
  END IF;

  INSERT INTO public.referrals (referrer_id, referred_id)
  VALUES (_referrer, _uid)
  ON CONFLICT (referred_id) DO NOTHING;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.redeem_referral(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.redeem_referral(text) TO authenticated;
