
CREATE OR REPLACE FUNCTION public.bump_referral_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.profiles
    SET referral_count = COALESCE(referral_count, 0) + 1
  WHERE id = NEW.referrer_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_bump_referral_count ON public.referrals;
CREATE TRIGGER trg_bump_referral_count
AFTER INSERT ON public.referrals
FOR EACH ROW EXECUTE FUNCTION public.bump_referral_count();
