
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS exam_goal_type text,
  ADD COLUMN IF NOT EXISTS exam_goal_value numeric,
  ADD COLUMN IF NOT EXISTS exam_date date,
  ADD COLUMN IF NOT EXISTS streak_freezes_used_week int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS streak_freeze_week_start date;

ALTER TABLE public.topic_mastery
  ADD COLUMN IF NOT EXISTS confidence_score int NOT NULL DEFAULT 0;

ALTER TABLE public.question_attempts
  ADD COLUMN IF NOT EXISTS weightage text,
  ADD COLUMN IF NOT EXISTS exam_frequency text,
  ADD COLUMN IF NOT EXISTS concept_importance text;

CREATE TABLE IF NOT EXISTS public.weekly_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  week_start date NOT NULL,
  target_questions int NOT NULL DEFAULT 50,
  target_mocks int NOT NULL DEFAULT 2,
  target_minutes int NOT NULL DEFAULT 300,
  completed_questions int NOT NULL DEFAULT 0,
  completed_mocks int NOT NULL DEFAULT 0,
  completed_minutes int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, week_start)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.weekly_goals TO authenticated;
GRANT ALL ON public.weekly_goals TO service_role;

ALTER TABLE public.weekly_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own weekly_goals select" ON public.weekly_goals
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own weekly_goals insert" ON public.weekly_goals
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own weekly_goals update" ON public.weekly_goals
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER set_weekly_goals_updated_at
  BEFORE UPDATE ON public.weekly_goals
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
