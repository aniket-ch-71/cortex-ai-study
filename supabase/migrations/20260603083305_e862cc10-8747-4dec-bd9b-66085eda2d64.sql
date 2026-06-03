
-- Streak fields
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_streak_date date;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS best_streak integer NOT NULL DEFAULT 0;

-- Referral fields
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS referral_code text UNIQUE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS referral_count integer NOT NULL DEFAULT 0;

-- Backfill referral codes for existing users
UPDATE public.profiles
SET referral_code = UPPER(SUBSTRING(REPLACE(gen_random_uuid()::text, '-', ''), 1, 8))
WHERE referral_code IS NULL;

-- Referrals table
CREATE TABLE IF NOT EXISTS public.referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid NOT NULL,
  referred_id uuid NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.referrals TO authenticated;
GRANT ALL ON public.referrals TO service_role;

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view referrals where they are referrer"
ON public.referrals FOR SELECT TO authenticated
USING (auth.uid() = referrer_id OR auth.uid() = referred_id);

CREATE POLICY "Authenticated users can insert referral"
ON public.referrals FOR INSERT TO authenticated
WITH CHECK (auth.uid() = referred_id);

-- Update handle_new_user trigger to auto-generate referral_code
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
begin
  insert into public.profiles (id, full_name, target_exam, language, exams, onboarded, referral_code)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'target_exam', ''),
    coalesce(new.raw_user_meta_data->>'language', 'en'),
    '[]'::jsonb,
    false,
    UPPER(SUBSTRING(REPLACE(gen_random_uuid()::text, '-', ''), 1, 8))
  )
  on conflict (id) do nothing;

  insert into public.user_roles (user_id, role) values (new.id, 'user')
  on conflict do nothing;

  return new;
end;
$function$;

-- Update public_stats to return required fields; switch to SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.public_stats()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN json_build_object(
    'total_registered', (SELECT COUNT(*) FROM public.profiles),
    'doubts_solved_today', (SELECT COUNT(*) FROM public.doubts WHERE created_at::date = CURRENT_DATE),
    'tests_taken_this_week', (SELECT COUNT(*) FROM public.mock_attempts WHERE completed_at >= CURRENT_DATE - INTERVAL '7 days'),
    'active_today', (SELECT COUNT(DISTINCT user_id) FROM public.daily_usage WHERE usage_date = CURRENT_DATE),
    'reviews', (SELECT COUNT(*) FROM public.reviews WHERE display = true)
  );
END;
$function$;

GRANT EXECUTE ON FUNCTION public.public_stats() TO anon, authenticated;

-- Streak update helper
CREATE OR REPLACE FUNCTION public.bump_streak(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  last_date date;
  cur_streak integer;
  best integer;
  today date := CURRENT_DATE;
BEGIN
  SELECT last_streak_date, streak, best_streak
    INTO last_date, cur_streak, best
    FROM public.profiles WHERE id = _user_id;

  IF last_date = today THEN
    RETURN;
  ELSIF last_date = today - INTERVAL '1 day' THEN
    cur_streak := COALESCE(cur_streak, 0) + 1;
  ELSE
    cur_streak := 1;
  END IF;

  IF cur_streak > COALESCE(best, 0) THEN
    best := cur_streak;
  END IF;

  UPDATE public.profiles
    SET streak = cur_streak,
        best_streak = best,
        last_streak_date = today,
        last_active = today
  WHERE id = _user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.bump_streak(uuid) TO authenticated;
