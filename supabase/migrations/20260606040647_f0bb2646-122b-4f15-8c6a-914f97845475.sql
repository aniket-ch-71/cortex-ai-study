
-- question_attempts
CREATE TABLE public.question_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  attempt_id uuid,
  test_id uuid,
  question_id text NOT NULL,
  subject text,
  chapter text,
  topic text,
  concept text,
  difficulty text,
  is_correct boolean NOT NULL DEFAULT false,
  is_skipped boolean NOT NULL DEFAULT false,
  time_taken_seconds integer NOT NULL DEFAULT 0,
  estimated_time_seconds integer,
  marked_review boolean NOT NULL DEFAULT false,
  selected_index integer,
  correct_index integer,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.question_attempts TO authenticated;
GRANT ALL ON public.question_attempts TO service_role;
ALTER TABLE public.question_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own attempts select" ON public.question_attempts FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own attempts insert" ON public.question_attempts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own attempts delete" ON public.question_attempts FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX ON public.question_attempts (user_id, created_at DESC);
CREATE INDEX ON public.question_attempts (user_id, subject, topic);

-- mistake_book
CREATE TABLE public.mistake_book (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  question_id text NOT NULL,
  question text NOT NULL,
  options jsonb NOT NULL DEFAULT '[]'::jsonb,
  correct_index integer,
  explanation text DEFAULT '',
  subject text,
  chapter text,
  topic text,
  concept text,
  difficulty text,
  times_wrong integer NOT NULL DEFAULT 1,
  times_attempted integer NOT NULL DEFAULT 1,
  last_wrong_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, question_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mistake_book TO authenticated;
GRANT ALL ON public.mistake_book TO service_role;
ALTER TABLE public.mistake_book ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own mistakes select" ON public.mistake_book FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own mistakes insert" ON public.mistake_book FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own mistakes update" ON public.mistake_book FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own mistakes delete" ON public.mistake_book FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE TRIGGER mistake_book_set_updated_at BEFORE UPDATE ON public.mistake_book FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- topic_mastery
CREATE TABLE public.topic_mastery (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  subject text NOT NULL,
  chapter text,
  topic text NOT NULL,
  accuracy numeric NOT NULL DEFAULT 0,
  attempts integer NOT NULL DEFAULT 0,
  correct integer NOT NULL DEFAULT 0,
  avg_time_seconds numeric NOT NULL DEFAULT 0,
  last_studied_at timestamptz,
  last_revised_at timestamptz,
  retention_score integer NOT NULL DEFAULT 100,
  strength text NOT NULL DEFAULT 'medium',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, subject, topic)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.topic_mastery TO authenticated;
GRANT ALL ON public.topic_mastery TO service_role;
ALTER TABLE public.topic_mastery ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own mastery select" ON public.topic_mastery FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own mastery insert" ON public.topic_mastery FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own mastery update" ON public.topic_mastery FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own mastery delete" ON public.topic_mastery FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE TRIGGER topic_mastery_set_updated_at BEFORE UPDATE ON public.topic_mastery FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- study_sessions
CREATE TABLE public.study_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  kind text NOT NULL,
  duration_seconds integer NOT NULL DEFAULT 0,
  questions_count integer NOT NULL DEFAULT 0,
  meta jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.study_sessions TO authenticated;
GRANT ALL ON public.study_sessions TO service_role;
ALTER TABLE public.study_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own sessions select" ON public.study_sessions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own sessions insert" ON public.study_sessions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own sessions delete" ON public.study_sessions FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX ON public.study_sessions (user_id, created_at DESC);

-- readiness_snapshots
CREATE TABLE public.readiness_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  snapshot_date date NOT NULL DEFAULT CURRENT_DATE,
  overall integer NOT NULL DEFAULT 0,
  subjects jsonb NOT NULL DEFAULT '[]'::jsonb,
  drivers jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, snapshot_date)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.readiness_snapshots TO authenticated;
GRANT ALL ON public.readiness_snapshots TO service_role;
ALTER TABLE public.readiness_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own readiness select" ON public.readiness_snapshots FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own readiness upsert" ON public.readiness_snapshots FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own readiness update" ON public.readiness_snapshots FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- daily_challenges
CREATE TABLE public.daily_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  challenge_date date NOT NULL DEFAULT CURRENT_DATE,
  kind text NOT NULL DEFAULT 'questions',
  target_count integer NOT NULL DEFAULT 5,
  completed_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, challenge_date, kind)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.daily_challenges TO authenticated;
GRANT ALL ON public.daily_challenges TO service_role;
ALTER TABLE public.daily_challenges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own challenges select" ON public.daily_challenges FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own challenges insert" ON public.daily_challenges FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own challenges update" ON public.daily_challenges FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE TRIGGER daily_challenges_set_updated_at BEFORE UPDATE ON public.daily_challenges FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
