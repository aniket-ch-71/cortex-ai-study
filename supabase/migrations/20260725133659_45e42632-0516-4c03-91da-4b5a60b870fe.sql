
-- ============ MEDIA LIBRARY ============
CREATE TABLE public.media_library (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bucket TEXT NOT NULL DEFAULT 'media',
  path TEXT NOT NULL,
  filename TEXT NOT NULL,
  mime TEXT NOT NULL,
  size_bytes BIGINT NOT NULL,
  width INT,
  height INT,
  checksum TEXT,
  folder TEXT NOT NULL DEFAULT '/',
  tags TEXT[] NOT NULL DEFAULT '{}',
  alt TEXT,
  thumbnail_path TEXT,
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  version INT NOT NULL DEFAULT 1,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.media_library TO authenticated;
GRANT ALL ON public.media_library TO service_role;
ALTER TABLE public.media_library ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff_all_media_library" ON public.media_library FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE UNIQUE INDEX media_library_checksum_uniq ON public.media_library(checksum) WHERE deleted_at IS NULL AND checksum IS NOT NULL;
CREATE INDEX media_library_folder_idx ON public.media_library(folder, created_at DESC);
CREATE INDEX media_library_tags_idx ON public.media_library USING GIN(tags);
CREATE INDEX media_library_mime_idx ON public.media_library(mime);
CREATE TRIGGER media_library_set_updated_at BEFORE UPDATE ON public.media_library
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.media_versions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  media_id UUID NOT NULL REFERENCES public.media_library(id) ON DELETE CASCADE,
  version INT NOT NULL,
  path TEXT NOT NULL,
  checksum TEXT,
  size_bytes BIGINT,
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (media_id, version)
);
GRANT SELECT, INSERT ON public.media_versions TO authenticated;
GRANT ALL ON public.media_versions TO service_role;
ALTER TABLE public.media_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff_all_media_versions" ON public.media_versions FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

CREATE TABLE public.media_usage (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  media_id UUID NOT NULL REFERENCES public.media_library(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.question_bank(id) ON DELETE CASCADE,
  usage_kind TEXT NOT NULL CHECK (usage_kind IN ('question','option','solution','hint','explanation','diagram')),
  option_index INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (media_id, question_id, usage_kind, option_index)
);
GRANT SELECT, INSERT, DELETE ON public.media_usage TO authenticated;
GRANT ALL ON public.media_usage TO service_role;
ALTER TABLE public.media_usage ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff_all_media_usage" ON public.media_usage FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE INDEX media_usage_media_idx ON public.media_usage(media_id);
CREATE INDEX media_usage_question_idx ON public.media_usage(question_id);

-- ============ BULK IMPORT ============
CREATE TABLE public.bulk_import_jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  source_filename TEXT NOT NULL,
  source_size BIGINT NOT NULL DEFAULT 0,
  source_path TEXT,
  format TEXT NOT NULL CHECK (format IN ('csv','xlsx','json','zip')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','uploading','validating','previewing','importing','completed','failed','cancelled','rolled_back')),
  current_phase TEXT,
  progress_pct INT NOT NULL DEFAULT 0,
  rows_found INT NOT NULL DEFAULT 0,
  rows_valid INT NOT NULL DEFAULT 0,
  rows_invalid INT NOT NULL DEFAULT 0,
  rows_imported INT NOT NULL DEFAULT 0,
  rows_failed INT NOT NULL DEFAULT 0,
  duplicates INT NOT NULL DEFAULT 0,
  options JSONB NOT NULL DEFAULT '{}'::jsonb,
  column_map JSONB,
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  duration_ms INT,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bulk_import_jobs TO authenticated;
GRANT ALL ON public.bulk_import_jobs TO service_role;
ALTER TABLE public.bulk_import_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff_all_import_jobs" ON public.bulk_import_jobs FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE INDEX bulk_import_jobs_created_idx ON public.bulk_import_jobs(created_by, created_at DESC);
CREATE INDEX bulk_import_jobs_status_idx ON public.bulk_import_jobs(status);
CREATE TRIGGER bulk_import_jobs_set_updated_at BEFORE UPDATE ON public.bulk_import_jobs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.bulk_import_errors (
  id BIGSERIAL PRIMARY KEY,
  job_id UUID NOT NULL REFERENCES public.bulk_import_jobs(id) ON DELETE CASCADE,
  row_index INT NOT NULL,
  field TEXT,
  code TEXT NOT NULL,
  message TEXT NOT NULL,
  raw JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.bulk_import_errors TO authenticated;
GRANT ALL ON public.bulk_import_errors TO service_role;
ALTER TABLE public.bulk_import_errors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff_all_import_errors" ON public.bulk_import_errors FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE INDEX bulk_import_errors_job_idx ON public.bulk_import_errors(job_id, row_index);

CREATE TABLE public.bulk_import_logs (
  id BIGSERIAL PRIMARY KEY,
  job_id UUID NOT NULL REFERENCES public.bulk_import_jobs(id) ON DELETE CASCADE,
  level TEXT NOT NULL DEFAULT 'info' CHECK (level IN ('debug','info','warn','error')),
  phase TEXT,
  message TEXT NOT NULL,
  meta JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.bulk_import_logs TO authenticated;
GRANT ALL ON public.bulk_import_logs TO service_role;
ALTER TABLE public.bulk_import_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff_all_import_logs" ON public.bulk_import_logs FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE INDEX bulk_import_logs_job_idx ON public.bulk_import_logs(job_id, created_at DESC);

CREATE TABLE public.bulk_import_history (
  id BIGSERIAL PRIMARY KEY,
  job_id UUID NOT NULL REFERENCES public.bulk_import_jobs(id) ON DELETE CASCADE,
  question_id UUID,
  action TEXT NOT NULL CHECK (action IN ('inserted','updated','skipped','replaced')),
  previous_snapshot JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.bulk_import_history TO authenticated;
GRANT ALL ON public.bulk_import_history TO service_role;
ALTER TABLE public.bulk_import_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff_all_import_history" ON public.bulk_import_history FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE INDEX bulk_import_history_job_idx ON public.bulk_import_history(job_id);
CREATE INDEX bulk_import_history_qid_idx ON public.bulk_import_history(question_id);

-- ============ ROLLBACK FUNCTION ============
CREATE OR REPLACE FUNCTION public.admin_rollback_import(_job_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  h RECORD;
  reverted INT := 0;
  removed INT := 0;
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  FOR h IN
    SELECT * FROM public.bulk_import_history WHERE job_id = _job_id
  LOOP
    IF h.action = 'inserted' AND h.question_id IS NOT NULL THEN
      DELETE FROM public.question_bank WHERE id = h.question_id;
      removed := removed + 1;
    ELSIF (h.action = 'updated' OR h.action = 'replaced') AND h.question_id IS NOT NULL AND h.previous_snapshot IS NOT NULL THEN
      UPDATE public.question_bank SET
        question       = COALESCE(h.previous_snapshot->>'question', question),
        options        = COALESCE((h.previous_snapshot->'options')::jsonb, options::jsonb)::text[],
        correct_index  = COALESCE((h.previous_snapshot->>'correct_index')::int, correct_index),
        explanation    = COALESCE(h.previous_snapshot->>'explanation', explanation),
        status         = COALESCE(h.previous_snapshot->>'status', status::text)::question_status,
        updated_at     = now()
      WHERE id = h.question_id;
      reverted := reverted + 1;
    END IF;
  END LOOP;

  UPDATE public.bulk_import_jobs
    SET status = 'rolled_back', finished_at = now()
    WHERE id = _job_id;

  RETURN jsonb_build_object('removed', removed, 'reverted', reverted);
END;
$$;
REVOKE ALL ON FUNCTION public.admin_rollback_import(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_rollback_import(UUID) TO authenticated;

-- ============ REALTIME ============
ALTER PUBLICATION supabase_realtime ADD TABLE public.bulk_import_jobs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.bulk_import_logs;
