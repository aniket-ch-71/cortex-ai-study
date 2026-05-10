# Cortex Improvement Plan

This is a large batch of work. To keep risk low and review easy, I'll ship it in 6 phases. Each phase is independently testable. I'll pause after Phase 1 + 2 for you to verify before continuing.

---

## Phase A — Critical Fixes (Priority 1)

1. **Disable text selection** on content surfaces
   - Add a `.no-select` utility in `src/styles.css` (`user-select: none`).
   - Apply to doubt-solver messages, notes content + flashcards, mock test question cards.
   - Add a small `CopyButton` component (shadcn `Button` + sonner toast "Copied!") to each surface.

2. **Fix Notes PDF export** with `window.print()`
   - Remove `html2canvas` + `jsPDF` path; replace export button with print trigger.
   - Add `@media print` rules in `src/styles.css`: hide sidebar/header (`[data-print-hide]`), force white bg, dark text, page-break rules for flashcards, expand the `.print-area`.
   - Wrap printable area in `<div className="print-area">`. Mark layout chrome with `data-print-hide`.

3. **Mock test question cap**
   - In `supabase/functions/generate-test/index.ts`: clamp `n` to `min(numQuestions, 25)` for AI generation.
   - After parsing tool call, `args.questions = args.questions.slice(0, n)` before returning.
   - Frontend: never request > 25 in a single AI call (sections loop already handles totals).

---

## Phase B — Profile + Onboarding (Priority 2)

4. **Schema migration**
   - `profiles`: add `username text unique`, `exams jsonb default '[]'`, `primary_exam text`, `state text`, `city text`, `onboarded boolean default false`.
   - Index on `lower(username)` for unique lookup.
   - Update `handle_new_user()` trigger to default new fields.

5. **`useProfile` hook** at `src/hooks/useProfile.ts`
   - React Query `useQuery(['profile', userId])` — single source of truth.
   - Returns `{ profile, primaryExam, examCategory, subExam, loading, refetch }`.
   - Maps `primary_exam` → category/sub-exam via `EXAM_PATTERNS`.

6. **3-step onboarding** at `src/routes/onboarding.tsx` (gated route)
   - Step 1: name, email, password (show/hide), username with debounced availability check.
   - Step 2: searchable chip grid (uses existing `SUB_EXAMS`), min 3, primary = first selected (star icon).
   - Step 3: state dropdown (29 states + 8 UTs), city input, language radio. "Complete" → write profile, fire `canvas-confetti` (CDN dynamic import), redirect to dashboard.
   - Existing `/auth` flow redirects new users to `/onboarding` until `profile.onboarded = true`.
   - `_authenticated` layout: if `!onboarded`, redirect to `/onboarding`.

7. **Global pre-selection**
   - `ExamPicker` accepts `defaultFromProfile` flag; pages (Mock Test, Notes, Analyser, Planner, Settings) initialize picker from `useProfile().primaryExam`.

---

## Phase C — UI Polish (Priority 3)

8. **Dashboard**: count-up stat cards (`requestAnimationFrame`, 800ms), daily quote (20-quote array, deterministic by `dayOfYear`), hover-lift on quick actions, fade-in for activity, fire emoji + CSS flicker if `streak > 0`.

9. **Doubt Solver**: smooth `scrollIntoView`, 3-dot typing keyframe, message bubble fade+slide-up, `:focus-visible` ring, no-select + per-message copy button.

10. **Sidebar**: animated active indicator (left border via pseudo-element), 0.15s bg transition on hover, 0.3s width on collapse, tooltip on collapsed icons (already partially supported by shadcn sidebar).

11. **Page transitions**: add `animate-page-enter` (200ms fade + 8px translate) on the `_authenticated` layout `<main>`, keyed on `location.pathname`.

---

## Phase D — Mock Test Tabs + Question Bank (Priority 4)

12. **Schema**: new table `question_bank(id, exam, sub_exam, subject, topic, difficulty, question, options jsonb, correct_index int, explanation, language, created_at)` — public read for authenticated users; insert-only for service role.

13. **Schema**: `daily_usage` add `ai_tests_used int default 0`. Free user limit = 3 AI tests/day (you said "10 questions" but listed "2/3 AI tests remaining" — defaulting to **3 AI tests/day**, will switch on confirmation).

14. **Mock test page**: shadcn `Tabs` — "AI Generate" (existing flow + counter banner) and "Pre-installed Practice" (filter → load 25 random rows → instant-feedback runner).

15. **Practice runner**: new route `/_authenticated/mock-test/practice`. Reuses question card component; reveals answer + explanation immediately; "Next" button; final score summary.

16. **Seed data**: migration inserts 50 SSC CGL General Awareness questions (English, mixed difficulty).

---

## Phase E — Current Affairs (Priority 5)

17. **Schema**: `daily_current_affairs(date, language, items jsonb, generated_at)`, primary key `(date, language)`.

18. **Edge function** `generate-current-affairs`: cache-check by `(today, lang)`; otherwise call AI Gateway with the prompt you specified (10 items, headline + explanation + tags + 2 MCQs), persist, return.

19. **Page** `/_authenticated/current-affairs`: date header, `[All|SSC|UPSC|Bank|Railway]` filter, item cards with inline MCQ reveal, EN/HI toggle, "Print PDF" via `window.print()`.

20. **Sidebar visibility**: show link only if `profile.exams` includes any of UPSC / SSC / Bank / Railway exams, OR a `settings.show_current_affairs` toggle is on.

---

## Phase F — Reviews (Priority 6)

21. **Schema**: `reviews(id, user_id, rating int check 1-5, text, exam, display boolean default false, created_at)`. RLS: insert own, select where `display=true` (public), select own.

22. **Landing page**: replace hardcoded testimonials with query (`display=true AND rating >= 4 LIMIT 6`); fallback to "Be the first to review!" placeholders if < 3.

23. **Rating modal**: shows once after mock test results and once after notes generation (per-session flag in component state). Submit → insert; auto-set `display=true` when `rating >= 4`.

---

## Open Questions

- **Free AI test limit**: prompt says "max 10 questions per day" but counter says "2/3 AI tests". I'll implement as **3 AI-generated tests per day** (each test up to 25 questions). Tell me if you want strict 10-question total instead.
- **Onboarding for existing users**: I'll route any signed-in user with `onboarded=false` through `/onboarding` once. Existing accounts will see it on next login.

---

## Execution Order

I'll do **Phase A + B in this turn** (critical fixes block everything else, and useProfile is required by later phases). Then I'll pause for your verification before Phase C–F.

**Total**: ~3 migrations, 2 new edge functions, 1 new hook, 1 new route group, ~15 file edits. No new npm deps (canvas-confetti loaded from CDN).
