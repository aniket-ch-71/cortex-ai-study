-- Current affairs cache
CREATE TABLE public.current_affairs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL UNIQUE,
  items jsonb NOT NULL,
  generated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.current_affairs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read current_affairs"
  ON public.current_affairs FOR SELECT TO authenticated USING (true);

-- Reviews
CREATE TABLE public.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  rating int NOT NULL CHECK (rating BETWEEN 1 AND 5),
  review_text text,
  exam text,
  display boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Insert own review"
  ON public.reviews FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Anyone reads approved reviews"
  ON public.reviews FOR SELECT TO anon, authenticated
  USING (display = true);

CREATE POLICY "Users read own reviews"
  ON public.reviews FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Profile flags
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS show_current_affairs boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS has_reviewed boolean NOT NULL DEFAULT false;

-- Public stats RPC
CREATE OR REPLACE FUNCTION public.public_stats()
RETURNS TABLE(users bigint, reviews bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    (SELECT count(*) FROM public.profiles) AS users,
    (SELECT count(*) FROM public.reviews WHERE display = true) AS reviews;
$$;
GRANT EXECUTE ON FUNCTION public.public_stats() TO anon, authenticated;