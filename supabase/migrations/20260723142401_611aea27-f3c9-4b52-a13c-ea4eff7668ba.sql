
-- Extend question_bank with CMS-required metadata & workflow
ALTER TABLE public.question_bank
  ADD COLUMN IF NOT EXISTS chapter text,
  ADD COLUMN IF NOT EXISTS sub_topic text,
  ADD COLUMN IF NOT EXISTS concept text,
  ADD COLUMN IF NOT EXISTS question_type text NOT NULL DEFAULT 'single_correct',
  ADD COLUMN IF NOT EXISTS estimated_time_seconds integer,
  ADD COLUMN IF NOT EXISTS marks numeric(6,2) NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS negative_marks numeric(6,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS quality_score integer,
  ADD COLUMN IF NOT EXISTS author_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reviewer_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS published_at timestamptz,
  ADD COLUMN IF NOT EXISTS archived boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS archived_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS solution_image_url text,
  ADD COLUMN IF NOT EXISTS correct_indices integer[],
  ADD COLUMN IF NOT EXISTS numerical_answer numeric;

-- Constrain status & type via trigger (avoid strict CHECK for future flexibility)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'question_bank_status_chk') THEN
    ALTER TABLE public.question_bank
      ADD CONSTRAINT question_bank_status_chk
      CHECK (status IN ('draft','under_review','approved','published','archived'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'question_bank_type_chk') THEN
    ALTER TABLE public.question_bank
      ADD CONSTRAINT question_bank_type_chk
      CHECK (question_type IN ('single_correct','multiple_correct','numerical','assertion_reason','matrix_match','match_following','paragraph','diagram'));
  END IF;
END $$;

-- updated_at trigger reuse
DROP TRIGGER IF EXISTS trg_question_bank_updated_at ON public.question_bank;
CREATE TRIGGER trg_question_bank_updated_at
  BEFORE UPDATE ON public.question_bank
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Indexes for scale
CREATE INDEX IF NOT EXISTS idx_qb_status ON public.question_bank(status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_qb_exam ON public.question_bank(exam) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_qb_subject ON public.question_bank(subject) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_qb_chapter ON public.question_bank(chapter) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_qb_topic ON public.question_bank(topic) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_qb_difficulty ON public.question_bank(difficulty) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_qb_type ON public.question_bank(question_type) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_qb_pyq ON public.question_bank(is_pyq, pyq_year) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_qb_author ON public.question_bank(author_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_qb_reviewer ON public.question_bank(reviewer_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_qb_created ON public.question_bank(created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_qb_updated ON public.question_bank(updated_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_qb_tags ON public.question_bank USING GIN (tags);
CREATE INDEX IF NOT EXISTS idx_qb_fts ON public.question_bank USING GIN (to_tsvector('simple', coalesce(question,'') || ' ' || coalesce(explanation,'')));

-- Version history table
CREATE TABLE IF NOT EXISTS public.question_versions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  question_id uuid NOT NULL REFERENCES public.question_bank(id) ON DELETE CASCADE,
  version integer NOT NULL,
  snapshot jsonb NOT NULL,
  changed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  change_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (question_id, version)
);
CREATE INDEX IF NOT EXISTS idx_qv_question ON public.question_versions(question_id, version DESC);

GRANT SELECT, INSERT ON public.question_versions TO authenticated;
GRANT ALL ON public.question_versions TO service_role;

ALTER TABLE public.question_versions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff can read versions" ON public.question_versions;
CREATE POLICY "Staff can read versions" ON public.question_versions
  FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "Staff can insert versions" ON public.question_versions;
CREATE POLICY "Staff can insert versions" ON public.question_versions
  FOR INSERT TO authenticated
  WITH CHECK (public.is_staff(auth.uid()) AND changed_by = auth.uid());

-- Rewrite question_bank policies for CMS + student read
DROP POLICY IF EXISTS "Authenticated can read question bank" ON public.question_bank;

CREATE POLICY "Students read published questions" ON public.question_bank
  FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL
    AND archived = false
    AND status = 'published'
  );

CREATE POLICY "Staff read all questions" ON public.question_bank
  FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()));

CREATE POLICY "Staff insert questions" ON public.question_bank
  FOR INSERT TO authenticated
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','super_admin','moderator','content_creator']::app_role[]));

CREATE POLICY "Staff update questions" ON public.question_bank
  FOR UPDATE TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','super_admin','moderator','content_creator','reviewer']::app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','super_admin','moderator','content_creator','reviewer']::app_role[]));

CREATE POLICY "Admins delete questions" ON public.question_bank
  FOR DELETE TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','super_admin']::app_role[]));

-- Version snapshot trigger
CREATE OR REPLACE FUNCTION public.snapshot_question_version()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF NEW.version = OLD.version THEN
      NEW.version := OLD.version + 1;
    END IF;
    INSERT INTO public.question_versions(question_id, version, snapshot, changed_by)
    VALUES (OLD.id, OLD.version, to_jsonb(OLD), auth.uid());
  ELSIF TG_OP = 'INSERT' THEN
    INSERT INTO public.question_versions(question_id, version, snapshot, changed_by)
    VALUES (NEW.id, NEW.version, to_jsonb(NEW), auth.uid());
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_qb_version_update ON public.question_bank;
CREATE TRIGGER trg_qb_version_update
  BEFORE UPDATE ON public.question_bank
  FOR EACH ROW EXECUTE FUNCTION public.snapshot_question_version();

DROP TRIGGER IF EXISTS trg_qb_version_insert ON public.question_bank;
CREATE TRIGGER trg_qb_version_insert
  AFTER INSERT ON public.question_bank
  FOR EACH ROW EXECUTE FUNCTION public.snapshot_question_version();
