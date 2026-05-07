create table public.mock_tests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  title text not null,
  subject text not null,
  exam text,
  difficulty text not null default 'medium',
  language text not null default 'en',
  num_questions integer not null,
  questions jsonb not null,
  created_at timestamptz not null default now()
);
alter table public.mock_tests enable row level security;
create policy "view own tests" on public.mock_tests for select to authenticated using (auth.uid() = user_id);
create policy "insert own tests" on public.mock_tests for insert to authenticated with check (auth.uid() = user_id);
create policy "delete own tests" on public.mock_tests for delete to authenticated using (auth.uid() = user_id);

create table public.mock_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  test_id uuid not null references public.mock_tests(id) on delete cascade,
  answers jsonb not null,
  score integer not null,
  total integer not null,
  time_taken_seconds integer not null default 0,
  completed_at timestamptz not null default now()
);
alter table public.mock_attempts enable row level security;
create policy "view own attempts" on public.mock_attempts for select to authenticated using (auth.uid() = user_id);
create policy "insert own attempts" on public.mock_attempts for insert to authenticated with check (auth.uid() = user_id);
create policy "delete own attempts" on public.mock_attempts for delete to authenticated using (auth.uid() = user_id);

create index mock_tests_user_idx on public.mock_tests(user_id, created_at desc);
create index mock_attempts_user_idx on public.mock_attempts(user_id, completed_at desc);
create index mock_attempts_test_idx on public.mock_attempts(test_id);