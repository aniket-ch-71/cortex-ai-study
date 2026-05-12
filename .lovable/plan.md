# Plan: Print Fix + Phase E (Current Affairs) + Phase F (Reviews)

Three independent workstreams. Will ship in this order so each is testable on its own.

---

## 1. Notes Print/PDF fix (mobile + desktop)

**Files**
- `src/styles.css` — replace the entire `@media print { … }` block with the new rules you provided (forces `overflow: visible`, `height: auto`, hides nav/sidebar/buttons, paginates `.print-card`, wraps `pre/code`).
- `src/routes/_authenticated/notes/$noteId/index.tsx`:
  - Wrap the full printable region (header card + article + flashcards) in a single `<div class="print-content">…</div>` so the new CSS targets it.
  - Replace `MarkdownLite` with the fenced-code-aware version (handles ```` ``` ```` blocks via `flushCode`, keeps inline `**`, `*`, `` ` ``).
  - Replace the Print button with a plain `<button onClick={() => window.print()}>` styled with the requested classes, plus a small helper line: *"Mobile: use browser Share → Print → Save as PDF."*
- Keep existing `<CopyButton />` and Back link untouched.

**Notes**
- The placeholder JSX in your message is partially mangled (`out.push(  …  );` blanks). I'll reconstruct equivalent JSX that matches the original component's classNames/structure and the behavior you described.

---

## 2. Phase E — Daily Current Affairs

**DB migration**
- New table `public.current_affairs`:
  - `id uuid pk default gen_random_uuid()`
  - `date date unique not null`
  - `items jsonb not null`
  - `generated_at timestamptz default now()`
  - RLS: `select` for `authenticated` (true). No insert/update/delete policies (edge function uses service role).
- Add column `profiles.show_current_affairs boolean not null default true`.
- Update `handle_new_user()` trigger to default `show_current_affairs` based on primary exam (default true; we'll flip in onboarding for JEE/NEET/GATE/CAT).

**Edge function** `supabase/functions/generate-current-affairs/index.ts`
- Verify JWT off; CORS on.
- On invocation: check `current_affairs` for today's row (IST date). If found, return cached.
- Otherwise call Lovable AI Gateway (`google/gemini-2.5-flash`) with structured JSON tool-call returning `items[]` shape you specified (headline, explanation, exam_tags, 2 MCQs each, 8 items).
- Insert with service-role client and return.
- Wire into `supabase/config.toml`.

**Page** `src/routes/_authenticated/current-affairs/index.tsx`
- Header (title + formatted date + Refresh button that re-invokes the function with `force=true`).
- Filter tabs: All / SSC / UPSC / Banking / Railway / CDS / Defence (filters by `exam_tags`).
- Card per item: headline, explanation, colored exam-tag chips, "Practice MCQs" expand → reveal 2 MCQs with click-to-reveal answer + explanation.
- "Download PDF" → `window.print()` (reuses the print CSS from #1).
- Loading skeleton + error state with retry.
- Mobile-first; verify at 375px.

**Sidebar** `src/components/AppSidebar.tsx`
- New entry between Study Planner and My Performance, gated on `useProfile().profile.show_current_affairs` AND user has any primary exam.

**Settings** `src/routes/_authenticated/settings/index.tsx`
- Add a Switch for "Show Current Affairs tab" bound to `profiles.show_current_affairs`.

---

## 3. Phase F — Real Reviews System

**DB migration**
- New table `public.reviews`:
  - `id uuid pk`, `user_id uuid not null`, `rating int not null check 1..5`, `review_text text`, `exam text`, `display boolean not null default false`, `created_at timestamptz default now()`.
  - RLS:
    - `insert` (authenticated) where `user_id = auth.uid()`.
    - `select` (anon + authenticated) where `display = true`.
    - `select` own reviews (authenticated, `user_id = auth.uid()`) so we can detect "already reviewed".
- Add `profiles.has_reviewed boolean default false`.

**Component** `src/components/ReviewModal.tsx`
- Dialog with interactive 5-star hover, optional textarea, exam auto-filled from `useProfile`, Submit + Skip.
- On submit: insert row, update `profiles.has_reviewed = true`, toast, confetti if rating ≥ 4 (reuse `canvas-confetti`).

**Inline review prompts**
- `mock-test/$testId/results.tsx`: small card under the score card. Hidden if `has_reviewed` or localStorage `cortex.reviewDismissed = 1`. Stars row + on 4–5★ expand textarea + Submit/Dismiss.
- `notes/$noteId/index.tsx`: same card, shown after `setTimeout(..., 30000)` if eligible.

**Dashboard** `src/routes/_authenticated/dashboard.tsx`
- Add 5th Quick Action "Rate Cortex" (Star icon) only if `!has_reviewed`. Opens `ReviewModal`.

**Landing page** `src/routes/index.tsx`
- Replace hardcoded testimonials with a fetch (anon client) of `display = true AND rating >= 4`, `order by created_at desc limit 6`.
- If `< 3` results, top up with dashed-border placeholder cards ("Be the first to review Cortex!" → CTA to `/dashboard`).
- Below testimonials add a "Join N+ students already using Cortex" line — count from a lightweight `select count` on `profiles` (need a public RPC since profiles RLS is per-user). Will add a `public_stats()` SECURITY DEFINER function returning `{ users: int, reviews: int }`.

---

## Order of execution
1. Print fix (smallest, isolated) → verify by viewing `/notes/:id` print preview.
2. Migrations for current affairs + reviews + public_stats RPC (one combined migration for approval).
3. Edge function `generate-current-affairs` + page + sidebar gate + settings toggle.
4. ReviewModal + inline prompts + dashboard card + landing page rewire.

## Open questions (will assume defaults unless you say otherwise)
- **Current affairs language**: English only for v1 (matches your "Content in English" note). OK?
- **Refresh button**: allow any user to force-regenerate, or only once per day per user? Default: allow, but it just re-reads cache unless we pass `force=true`; I'll make `force` admin-only later.
- **public_stats RPC** is the cleanest way to expose anonymous counts without loosening `profiles` RLS — going with that.
