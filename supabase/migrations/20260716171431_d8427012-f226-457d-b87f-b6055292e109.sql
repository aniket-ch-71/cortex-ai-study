
-- Enums
DO $$ BEGIN
  CREATE TYPE public.vault_tag AS ENUM ('save','important','revise_later','favorite');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.report_reason AS ENUM ('wrong_answer','wrong_explanation','wrong_diagram','duplicate','outdated');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.report_status AS ENUM ('open','reviewed','dismissed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.pack_seed AS ENUM ('mistakes','weak','confidence','due','topic','mixed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 1. saved_questions
CREATE TABLE IF NOT EXISTS public.saved_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question_hash text NOT NULL,
  question text NOT NULL,
  options jsonb NOT NULL,
  correct_index int NOT NULL,
  explanation text,
  subject text,
  chapter text,
  topic text,
  concept text,
  difficulty text,
  weightage text,
  exam_frequency text,
  source_type text,
  is_pyq boolean DEFAULT false,
  pyq_year int,
  tag public.vault_tag NOT NULL DEFAULT 'save',
  note text,
  next_review_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, question_hash, tag)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.saved_questions TO authenticated;
GRANT ALL ON public.saved_questions TO service_role;
ALTER TABLE public.saved_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own saved_questions select" ON public.saved_questions
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own saved_questions insert" ON public.saved_questions
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own saved_questions update" ON public.saved_questions
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own saved_questions delete" ON public.saved_questions
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS saved_questions_user_tag_idx
  ON public.saved_questions (user_id, tag, created_at DESC);
CREATE INDEX IF NOT EXISTS saved_questions_user_topic_idx
  ON public.saved_questions (user_id, subject, topic);
CREATE INDEX IF NOT EXISTS saved_questions_due_idx
  ON public.saved_questions (user_id, tag, next_review_at)
  WHERE tag = 'revise_later';

CREATE TRIGGER saved_questions_updated_at
  BEFORE UPDATE ON public.saved_questions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 2. question_reports
CREATE TABLE IF NOT EXISTS public.question_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question_hash text NOT NULL,
  question_snapshot jsonb NOT NULL,
  reason public.report_reason NOT NULL,
  details text,
  status public.report_status NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.question_reports TO authenticated;
GRANT ALL ON public.question_reports TO service_role;
ALTER TABLE public.question_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own question_reports select" ON public.question_reports
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own question_reports insert" ON public.question_reports
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS question_reports_status_idx
  ON public.question_reports (status, created_at DESC);

-- 3. revision_packs
CREATE TABLE IF NOT EXISTS public.revision_packs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  seed_type public.pack_seed NOT NULL,
  seed_params jsonb NOT NULL DEFAULT '{}'::jsonb,
  question_count int NOT NULL,
  estimated_minutes int NOT NULL DEFAULT 0,
  payload jsonb NOT NULL,
  score int,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.revision_packs TO authenticated;
GRANT ALL ON public.revision_packs TO service_role;
ALTER TABLE public.revision_packs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own revision_packs all" ON public.revision_packs
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS revision_packs_user_idx
  ON public.revision_packs (user_id, created_at DESC);

CREATE TRIGGER revision_packs_updated_at
  BEFORE UPDATE ON public.revision_packs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 4. question_bank extensions
ALTER TABLE public.question_bank
  ADD COLUMN IF NOT EXISTS is_pyq boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS pyq_year int,
  ADD COLUMN IF NOT EXISTS source_type text NOT NULL DEFAULT 'verified',
  ADD COLUMN IF NOT EXISTS weightage text,
  ADD COLUMN IF NOT EXISTS exam_frequency text,
  ADD COLUMN IF NOT EXISTS concept_importance text,
  ADD COLUMN IF NOT EXISTS svg_diagram text,
  ADD COLUMN IF NOT EXISTS diagram_url text,
  ADD COLUMN IF NOT EXISTS question_hash text;

CREATE INDEX IF NOT EXISTS question_bank_pyq_idx
  ON public.question_bank (is_pyq, subject);

-- 5. question_attempts extensions (denormalized badges)
ALTER TABLE public.question_attempts
  ADD COLUMN IF NOT EXISTS source_type text,
  ADD COLUMN IF NOT EXISTS is_pyq boolean DEFAULT false;
