
-- ============ ENUMS ============
DO $$ BEGIN
  CREATE TYPE workflow_state AS ENUM ('draft','ai_review','human_review','fact_check','approved','scheduled','published','archived','deprecated');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE assignment_status AS ENUM ('open','in_progress','submitted','completed','cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE assignment_priority AS ENUM ('low','normal','high','urgent');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE review_decision AS ENUM ('approve','reject','request_changes','note');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE notification_type AS ENUM ('assignment','review_requested','review_completed','published','import_finished','media_updated','mention');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============ QUESTION BANK EXTENSIONS ============
ALTER TABLE public.question_bank
  ADD COLUMN IF NOT EXISTS workflow_state workflow_state NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS quality_score_breakdown jsonb,
  ADD COLUMN IF NOT EXISTS scheduled_publish_at timestamptz,
  ADD COLUMN IF NOT EXISTS ai_review jsonb,
  ADD COLUMN IF NOT EXISTS assigned_to uuid,
  ADD COLUMN IF NOT EXISTS assigned_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_qb_workflow_state ON public.question_bank(workflow_state);
CREATE INDEX IF NOT EXISTS idx_qb_assigned_to ON public.question_bank(assigned_to);
CREATE INDEX IF NOT EXISTS idx_qb_scheduled ON public.question_bank(scheduled_publish_at) WHERE scheduled_publish_at IS NOT NULL;

-- ============ ASSIGNMENTS ============
CREATE TABLE IF NOT EXISTS public.question_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id uuid NOT NULL REFERENCES public.question_bank(id) ON DELETE CASCADE,
  assigned_by uuid NOT NULL,
  assigned_to uuid NOT NULL,
  due_at timestamptz,
  priority assignment_priority NOT NULL DEFAULT 'normal',
  status assignment_status NOT NULL DEFAULT 'open',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.question_assignments TO authenticated;
GRANT ALL ON public.question_assignments TO service_role;
ALTER TABLE public.question_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY qa_staff_select ON public.question_assignments FOR SELECT TO authenticated USING (public.is_staff(auth.uid()) OR assigned_to = auth.uid());
CREATE POLICY qa_staff_insert ON public.question_assignments FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY qa_staff_update ON public.question_assignments FOR UPDATE TO authenticated USING (public.is_staff(auth.uid()) OR assigned_to = auth.uid()) WITH CHECK (public.is_staff(auth.uid()) OR assigned_to = auth.uid());
CREATE POLICY qa_staff_delete ON public.question_assignments FOR DELETE TO authenticated USING (public.is_staff(auth.uid()));
CREATE INDEX IF NOT EXISTS idx_qa_assignee ON public.question_assignments(assigned_to, status);
CREATE INDEX IF NOT EXISTS idx_qa_question ON public.question_assignments(question_id);
CREATE TRIGGER trg_qa_updated BEFORE UPDATE ON public.question_assignments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ REVIEWS ============
CREATE TABLE IF NOT EXISTS public.question_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id uuid NOT NULL REFERENCES public.question_bank(id) ON DELETE CASCADE,
  reviewer_id uuid NOT NULL,
  decision review_decision NOT NULL,
  notes text,
  prev_state workflow_state,
  next_state workflow_state,
  attachments jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.question_reviews TO authenticated;
GRANT ALL ON public.question_reviews TO service_role;
ALTER TABLE public.question_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY qr_staff_select ON public.question_reviews FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY qr_staff_insert ON public.question_reviews FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()) AND reviewer_id = auth.uid());
CREATE INDEX IF NOT EXISTS idx_qr_question ON public.question_reviews(question_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_qr_reviewer ON public.question_reviews(reviewer_id, created_at DESC);

-- ============ COMMENTS ============
CREATE TABLE IF NOT EXISTS public.question_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id uuid NOT NULL REFERENCES public.question_bank(id) ON DELETE CASCADE,
  parent_id uuid REFERENCES public.question_comments(id) ON DELETE CASCADE,
  author_id uuid NOT NULL,
  body text NOT NULL,
  mentions uuid[] NOT NULL DEFAULT '{}',
  resolved_at timestamptz,
  resolved_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.question_comments TO authenticated;
GRANT ALL ON public.question_comments TO service_role;
ALTER TABLE public.question_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY qc_staff_select ON public.question_comments FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY qc_staff_insert ON public.question_comments FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()) AND author_id = auth.uid());
CREATE POLICY qc_staff_update ON public.question_comments FOR UPDATE TO authenticated USING (public.is_staff(auth.uid()) AND (author_id = auth.uid() OR public.has_any_role(auth.uid(), ARRAY['admin','super_admin']::app_role[]))) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY qc_staff_delete ON public.question_comments FOR DELETE TO authenticated USING (public.is_staff(auth.uid()) AND (author_id = auth.uid() OR public.has_any_role(auth.uid(), ARRAY['admin','super_admin']::app_role[])));
CREATE INDEX IF NOT EXISTS idx_qc_question ON public.question_comments(question_id, created_at);
CREATE TRIGGER trg_qc_updated BEFORE UPDATE ON public.question_comments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ AI REVIEWS ============
CREATE TABLE IF NOT EXISTS public.question_ai_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id uuid NOT NULL REFERENCES public.question_bank(id) ON DELETE CASCADE,
  model text NOT NULL,
  verdict jsonb NOT NULL,
  score integer,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.question_ai_reviews TO authenticated;
GRANT ALL ON public.question_ai_reviews TO service_role;
ALTER TABLE public.question_ai_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY qar_staff_select ON public.question_ai_reviews FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY qar_staff_insert ON public.question_ai_reviews FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));
CREATE INDEX IF NOT EXISTS idx_qar_question ON public.question_ai_reviews(question_id, created_at DESC);

-- ============ NOTIFICATIONS ============
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type notification_type NOT NULL,
  title text NOT NULL,
  body text,
  link text,
  entity_type text,
  entity_id text,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY n_owner_select ON public.notifications FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY n_owner_update ON public.notifications FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE INDEX IF NOT EXISTS idx_n_user_unread ON public.notifications(user_id, created_at DESC);

-- ============ SCHEDULE ============
CREATE TABLE IF NOT EXISTS public.content_schedule (
  question_id uuid PRIMARY KEY REFERENCES public.question_bank(id) ON DELETE CASCADE,
  publish_at timestamptz NOT NULL,
  timezone text NOT NULL DEFAULT 'UTC',
  created_by uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.content_schedule TO authenticated;
GRANT ALL ON public.content_schedule TO service_role;
ALTER TABLE public.content_schedule ENABLE ROW LEVEL SECURITY;
CREATE POLICY cs_staff_all ON public.content_schedule FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE INDEX IF NOT EXISTS idx_cs_pending ON public.content_schedule(publish_at) WHERE status = 'pending';
CREATE TRIGGER trg_cs_updated BEFORE UPDATE ON public.content_schedule FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ RPC: transition_question_state ============
CREATE OR REPLACE FUNCTION public.transition_question_state(_qid uuid, _to workflow_state, _note text DEFAULT NULL)
RETURNS workflow_state
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _prev workflow_state;
  _assignee uuid;
BEGIN
  IF NOT public.is_staff(_uid) THEN RAISE EXCEPTION 'forbidden'; END IF;

  SELECT workflow_state, assigned_to INTO _prev, _assignee FROM public.question_bank WHERE id = _qid FOR UPDATE;
  IF _prev IS NULL THEN RAISE EXCEPTION 'question not found'; END IF;

  UPDATE public.question_bank
    SET workflow_state = _to,
        status = CASE
          WHEN _to = 'published' THEN 'published'::question_status
          WHEN _to = 'archived' THEN 'archived'::question_status
          WHEN _to = 'approved' THEN 'approved'::question_status
          WHEN _to IN ('human_review','ai_review','fact_check') THEN 'in_review'::question_status
          WHEN _to = 'draft' THEN 'draft'::question_status
          ELSE status
        END,
        published_at = CASE WHEN _to = 'published' THEN now() ELSE published_at END,
        archived = CASE WHEN _to = 'archived' THEN true ELSE archived END,
        archived_at = CASE WHEN _to = 'archived' THEN now() ELSE archived_at END,
        updated_at = now()
    WHERE id = _qid;

  INSERT INTO public.question_reviews(question_id, reviewer_id, decision, notes, prev_state, next_state)
  VALUES (_qid, _uid,
    CASE WHEN _to = 'approved' THEN 'approve'::review_decision
         WHEN _to = 'draft' THEN 'request_changes'::review_decision
         WHEN _to = 'archived' THEN 'reject'::review_decision
         ELSE 'note'::review_decision END,
    _note, _prev, _to);

  INSERT INTO public.audit_logs(actor_id, action, entity_type, entity_id, diff)
  VALUES (_uid, 'workflow.transition', 'question', _qid::text,
          jsonb_build_object('from', _prev, 'to', _to, 'note', _note));

  IF _assignee IS NOT NULL AND _assignee <> _uid THEN
    INSERT INTO public.notifications(user_id, type, title, body, link, entity_type, entity_id)
    VALUES (_assignee, 'review_completed', 'Question state changed',
            format('Moved from %s to %s', _prev, _to),
            '/admin/questions/' || _qid::text, 'question', _qid::text);
  END IF;

  RETURN _to;
END;
$$;

-- ============ RPC: assign_question ============
CREATE OR REPLACE FUNCTION public.assign_question(_qid uuid, _to_user uuid, _due timestamptz, _priority assignment_priority, _notes text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _aid uuid;
BEGIN
  IF NOT public.is_staff(_uid) THEN RAISE EXCEPTION 'forbidden'; END IF;

  INSERT INTO public.question_assignments(question_id, assigned_by, assigned_to, due_at, priority, notes)
  VALUES (_qid, _uid, _to_user, _due, COALESCE(_priority,'normal'), _notes)
  RETURNING id INTO _aid;

  UPDATE public.question_bank SET assigned_to = _to_user, assigned_at = now(), updated_at = now() WHERE id = _qid;

  INSERT INTO public.notifications(user_id, type, title, body, link, entity_type, entity_id)
  VALUES (_to_user, 'assignment', 'New question assignment',
          COALESCE(_notes, 'You have a new question to review'),
          '/admin/questions/' || _qid::text, 'question', _qid::text);

  INSERT INTO public.audit_logs(actor_id, action, entity_type, entity_id, diff)
  VALUES (_uid, 'assignment.create', 'question', _qid::text,
          jsonb_build_object('to', _to_user, 'due', _due, 'priority', _priority));

  RETURN _aid;
END;
$$;

-- ============ RPC: schedule_question ============
CREATE OR REPLACE FUNCTION public.schedule_question(_qid uuid, _publish_at timestamptz, _tz text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
BEGIN
  IF NOT public.is_staff(_uid) THEN RAISE EXCEPTION 'forbidden'; END IF;

  INSERT INTO public.content_schedule(question_id, publish_at, timezone, created_by, status)
  VALUES (_qid, _publish_at, COALESCE(_tz,'UTC'), _uid, 'pending')
  ON CONFLICT (question_id) DO UPDATE
    SET publish_at = EXCLUDED.publish_at, timezone = EXCLUDED.timezone, status = 'pending', updated_at = now();

  UPDATE public.question_bank
    SET workflow_state = 'scheduled', scheduled_publish_at = _publish_at, updated_at = now()
    WHERE id = _qid;

  INSERT INTO public.audit_logs(actor_id, action, entity_type, entity_id, diff)
  VALUES (_uid, 'schedule.set', 'question', _qid::text, jsonb_build_object('publish_at', _publish_at, 'tz', _tz));
END;
$$;

-- ============ RPC: publish_due_scheduled ============
CREATE OR REPLACE FUNCTION public.publish_due_scheduled()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r RECORD;
  n integer := 0;
BEGIN
  FOR r IN
    SELECT cs.question_id FROM public.content_schedule cs
    WHERE cs.status = 'pending' AND cs.publish_at <= now()
    LIMIT 500
  LOOP
    UPDATE public.question_bank
      SET workflow_state='published', status='published'::question_status, published_at=now(), updated_at=now()
      WHERE id = r.question_id;
    UPDATE public.content_schedule SET status='published', updated_at=now() WHERE question_id = r.question_id;
    INSERT INTO public.audit_logs(action, entity_type, entity_id, diff)
      VALUES ('schedule.publish', 'question', r.question_id::text, jsonb_build_object('auto', true));
    n := n + 1;
  END LOOP;
  RETURN n;
END;
$$;

-- ============ RPC: mark_notifications_read ============
CREATE OR REPLACE FUNCTION public.mark_notifications_read(_ids uuid[])
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE n integer;
BEGIN
  UPDATE public.notifications SET read_at = now()
    WHERE user_id = auth.uid() AND read_at IS NULL AND id = ANY(_ids);
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END;
$$;

-- ============ REALTIME ============
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.question_comments;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.question_assignments;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============ CRON: publish_due_scheduled every minute ============
CREATE EXTENSION IF NOT EXISTS pg_cron;
DO $$ BEGIN
  PERFORM cron.unschedule('publish-scheduled-questions');
EXCEPTION WHEN OTHERS THEN NULL; END $$;
SELECT cron.schedule('publish-scheduled-questions', '* * * * *', $c$SELECT public.publish_due_scheduled();$c$);
