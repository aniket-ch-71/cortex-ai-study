
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS username text,
  ADD COLUMN IF NOT EXISTS exams jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS primary_exam text,
  ADD COLUMN IF NOT EXISTS state text,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS onboarded boolean NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_lower_unique
  ON public.profiles (lower(username))
  WHERE username IS NOT NULL;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
begin
  insert into public.profiles (id, full_name, target_exam, language, exams, onboarded)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'target_exam', ''),
    coalesce(new.raw_user_meta_data->>'language', 'en'),
    '[]'::jsonb,
    false
  )
  on conflict (id) do nothing;

  insert into public.user_roles (user_id, role) values (new.id, 'user')
  on conflict do nothing;

  return new;
end;
$function$;
