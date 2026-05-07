ALTER TABLE public.mock_tests ADD COLUMN IF NOT EXISTS pattern jsonb;
ALTER TABLE public.mock_attempts ADD COLUMN IF NOT EXISTS breakdown jsonb;
ALTER TABLE public.mock_attempts ADD COLUMN IF NOT EXISTS marked_for_review jsonb;