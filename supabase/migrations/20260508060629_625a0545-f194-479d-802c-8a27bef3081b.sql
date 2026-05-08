-- Notes Generator
create table public.notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  title text not null,
  topic text not null,
  subject text not null,
  exam text,
  language text not null default 'en',
  style text not null default 'flashcards_notes',
  content text not null,
  flashcards jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);
alter table public.notes enable row level security;
create policy "view own notes" on public.notes for select to authenticated using (auth.uid() = user_id);
create policy "insert own notes" on public.notes for insert to authenticated with check (auth.uid() = user_id);
create policy "delete own notes" on public.notes for delete to authenticated using (auth.uid() = user_id);

-- Notes Analyser
create table public.note_analyses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  topic text not null,
  subject text,
  input_text text not null,
  score integer not null,
  feedback jsonb not null,
  created_at timestamptz not null default now()
);
alter table public.note_analyses enable row level security;
create policy "view own analyses" on public.note_analyses for select to authenticated using (auth.uid() = user_id);
create policy "insert own analyses" on public.note_analyses for insert to authenticated with check (auth.uid() = user_id);
create policy "delete own analyses" on public.note_analyses for delete to authenticated using (auth.uid() = user_id);

-- Study Planner
create table public.study_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  title text not null,
  exam text not null,
  exam_date date,
  hours_per_day numeric not null default 4,
  subjects jsonb not null default '[]'::jsonb,
  plan jsonb not null,
  created_at timestamptz not null default now()
);
alter table public.study_plans enable row level security;
create policy "view own plans" on public.study_plans for select to authenticated using (auth.uid() = user_id);
create policy "insert own plans" on public.study_plans for insert to authenticated with check (auth.uid() = user_id);
create policy "delete own plans" on public.study_plans for delete to authenticated using (auth.uid() = user_id);