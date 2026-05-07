
-- Roles enum + table (kept separate from profiles to prevent privilege escalation)
create type public.app_role as enum ('admin', 'user');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role app_role not null default 'user',
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create policy "Users can view own roles" on public.user_roles
  for select to authenticated using (auth.uid() = user_id);

-- Profiles
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  target_exam text,
  language text not null default 'en',
  streak int not null default 0,
  last_active date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can view own profile" on public.profiles
  for select to authenticated using (auth.uid() = id);
create policy "Users can insert own profile" on public.profiles
  for insert to authenticated with check (auth.uid() = id);
create policy "Users can update own profile" on public.profiles
  for update to authenticated using (auth.uid() = id);

-- Doubts (chat history)
create table public.doubts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  subject text,
  language text not null default 'en',
  question text not null,
  answer text not null,
  created_at timestamptz not null default now()
);

alter table public.doubts enable row level security;

create index doubts_user_created_idx on public.doubts(user_id, created_at desc);

create policy "Users can view own doubts" on public.doubts
  for select to authenticated using (auth.uid() = user_id);
create policy "Users can insert own doubts" on public.doubts
  for insert to authenticated with check (auth.uid() = user_id);
create policy "Users can delete own doubts" on public.doubts
  for delete to authenticated using (auth.uid() = user_id);

-- Daily usage tracking
create table public.daily_usage (
  user_id uuid references auth.users(id) on delete cascade not null,
  usage_date date not null default current_date,
  doubts_used int not null default 0,
  primary key (user_id, usage_date)
);

alter table public.daily_usage enable row level security;

create policy "Users can view own usage" on public.daily_usage
  for select to authenticated using (auth.uid() = user_id);
create policy "Users can insert own usage" on public.daily_usage
  for insert to authenticated with check (auth.uid() = user_id);
create policy "Users can update own usage" on public.daily_usage
  for update to authenticated using (auth.uid() = user_id);

-- updated_at trigger for profiles
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- Auto-create profile + default role on new auth user
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, target_exam, language)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'target_exam', ''),
    coalesce(new.raw_user_meta_data->>'language', 'en')
  )
  on conflict (id) do nothing;

  insert into public.user_roles (user_id, role) values (new.id, 'user')
  on conflict do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
