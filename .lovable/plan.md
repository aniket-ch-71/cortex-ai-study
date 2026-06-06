
# PARIKSHA Student Intelligence System

A coherent intelligence layer on top of existing mock tests, doubts, notes, and planner. Scope is large, so this plan delivers it in **3 phases** so you can ship and validate incrementally.

---

## Phase 1 — Data foundation + Mistake Book + Readiness Score

Goal: capture every attempt at the question level, then surface mistakes and a live readiness score.

### Database (migration)
New tables (all RLS-scoped to `auth.uid()`):

- `question_attempts` — one row per question answered in a mock/practice
  - `user_id`, `attempt_id` (→ `mock_attempts`), `test_id`, `question_id` (text/uuid), `subject`, `chapter`, `topic`, `concept`, `difficulty`, `is_correct`, `is_skipped`, `time_taken_seconds`, `estimated_time_seconds`, `marked_review`, `selected_index`, `correct_index`, `created_at`
- `mistake_book` — durable mistake records (deduped per user+question)
  - `user_id`, `question_id`, `question`, `options`, `correct_index`, `explanation`, `subject`, `chapter`, `topic`, `concept`, `difficulty`, `times_wrong`, `times_attempted`, `last_wrong_at`, `status` (`open` / `mastered`), `created_at`, `updated_at`
- `topic_mastery` — per (user, subject, chapter, topic)
  - `accuracy`, `attempts`, `avg_time_seconds`, `last_studied_at`, `last_revised_at`, `retention_score` (0–100), `strength` (`weak`/`medium`/`strong`)
- `study_sessions` — for heatmap + streak (test/practice/revision/notes)
  - `user_id`, `kind`, `duration_seconds`, `questions_count`, `created_at`
- `readiness_snapshots` — daily snapshot of the readiness score for trend chart
- `daily_challenges` — `user_id`, `date`, `target_count`, `completed_count`, `kind`

`question_bank` already has `topic`, `difficulty`, `subject`. We'll add `chapter`, `concept`, `estimated_time_seconds`, `weightage` (`low|medium|high`), `frequency` (`rare|sometimes|frequent`) — nullable, backfilled lazily.

### Capture pipeline
- In `mock-test/$testId/index.tsx` submit handler: in addition to writing `mock_attempts`, batch-insert `question_attempts` and upsert `mistake_book` + `topic_mastery` via a single server fn `recordAttempt`.
- Add `study_sessions` insert on every test/practice/notes/doubt completion.

### Readiness score (client-side computation, server fn)
`computeReadiness(userId)` returns `{ overall, subjects: [{name, score}], drivers: {accuracy, coverage, consistency, mockPerf, revision} }` using:
- accuracy: rolling 30-day question accuracy
- coverage: distinct chapters attempted / total chapters in exam pattern
- consistency: streak + active days in last 14
- mockPerf: avg `score/total` over last 5 mocks
- revision: fraction of weak topics revised in last 7 days

### UI
- **Dashboard**: replace "Subject progress" widget with **Readiness Ring** (0–100) + per-subject bars + "Improve" CTA.
- New route `/_authenticated/mistakes` — Mistake Book grouped Subject → Chapter → Topic, "Most Repeated Mistakes" section, "Reattempt" button that launches a practice session with those questions.
- Results page: add "Added X questions to your Mistake Book" callout + "Review mistakes" CTA.

---

## Phase 2 — Revision Engine + Heatmap + Streak/Challenges

### Revision Engine
- SM-2 lite: `retention_score` decays daily based on `last_revised_at`; topics under threshold become "due".
- Server fn `getTodaysRevisions(userId)` → list of `{topic, reason, retention, suggestedQuestions[]}`.
- New widget on Dashboard: **Today's Revision** (top 3 due topics) with "Revise now" → launches a 5-question practice from `mistake_book` + `question_bank` for that topic.

### Heatmap
- New section on `/performance`: GitHub-style 12-week heatmap from `study_sessions` (count per day, color scale via existing token system).

### Streak + Daily Challenge
- Existing `streak` logic extended: `bump_streak` already exists. Daily challenge widget on dashboard with progress bar (e.g. "3 / 5 questions today").
- Milestone toasts at 7/30/100 days.

---

## Phase 3 — Rank Predictor + Adaptive Engine + Metadata polish

### Rank Predictor
- Server fn `predictRank(userId)` using historical mock percentile bands per exam (seeded constants in `src/lib/exam-patterns.ts`):
  - inputs: avg score %, accuracy, difficulty mix, coverage
  - output: `{ low, high, confidence, gaps: [{topic, impact}] }`
- New widget on Dashboard + dedicated section on `/performance` showing rank range, "To reach top X" suggestions, confidence chip.

### Adaptive Question Engine
- Server fn `recommendQuestions(userId, count)`:
  - 40% weak topics, 25% due revision, 20% high-weightage exam topics, 15% never-attempted
- "Smart Practice" button on `/mock-test` and `/notes` uses this.

### Metadata polish
- Update `generate-test` edge function prompt to emit `chapter`, `concept`, `estimated_time_seconds`, `weightage`, `frequency` for each question; persist into `mock_tests.questions` (already jsonb) and into `question_attempts` on submit.
- Show metadata chips on results page (Concept, Weightage, Frequency, Est. time).

---

## Out of scope
- No new auth flows, no payment gating, no real-time multiplayer.
- No cron jobs in Phase 1; retention decay is computed on read.
- Dark theme + existing design system preserved; new widgets use `ui-pro` components.

## Verification
- Take a mock test → confirm `question_attempts` rows + `mistake_book` populated + readiness score updates.
- Open `/mistakes` → reattempt flow works.
- Phase 2: heatmap renders, "Today's Revision" appears after a week of activity.
- Phase 3: rank predictor returns sane bands on seeded data.

## Confirm before I build
1. **Start with Phase 1 only** (recommended — biggest leverage, ~1 long build) or implement **all 3 phases in one go**?
2. OK to **extend `question_bank` + `mock_tests.questions`** with the new metadata fields (chapter/concept/weightage/frequency)?
3. Rank predictor bands — should I seed constants from public cutoffs (JEE/NEET/UPSC/SSC) or keep generic until you provide data?
