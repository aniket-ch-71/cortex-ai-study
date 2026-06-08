
# PARIKSHA AI — Coach Mode Upgrade

Turn the dashboard into a personal AI exam coach. Every insight links to an action. No new decorative pages.

---

## 1. "Today's Mission" — Mission Control (top of dashboard)

A single premium hero section that replaces the current top row on `src/routes/_authenticated/dashboard.tsx`. New component `src/components/MissionControl.tsx`.

Eight tiles in a responsive grid (4 × 2 on desktop, 2 × 4 on tablet, stacked on mobile):

| Tile | Source | Action button |
|---|---|---|
| 🔥 Streak | `profiles.streak` / `best_streak` | "Protect streak" → today's challenge |
| 📚 Revision Due | `getTodaysRevisions()` count | "Start revision" → `/mistakes` or revision flow |
| 🎯 Daily Challenge | `daily_challenges` progress | "Continue" → practice |
| 📈 Readiness | `computeReadiness().overall` + 7-day delta | "View drivers" → `/performance` |
| ⚠ Weakest Topic | lowest accuracy from `topic_mastery` | "Practice 10 Qs" → seeded practice |
| 🏆 Exam Goal | new `profiles.exam_goal` (see §5) | "Edit goal" → settings |
| ⏳ Exam Countdown | new `profiles.exam_date` | "Open planner" → `/planner` |
| 📍 Recommended Action | top item from `recommendTopics()` | Primary CTA (deep-link to practice) |

The Recommended Action tile is visually emphasized (gradient ring, larger) and is always the single most important next click.

Readiness delta uses a new helper that snapshots into `readiness_snapshots` once per day on dashboard load (table already exists).

---

## 2. Action-First Insight Pattern

Refactor existing widgets so every analytics surface carries a CTA:

- `RecommendedTopics` → each row gets "Practice 10" button that pre-seeds `/mock-test` with `{subject, topic, count: 10}`.
- `RevisionWidget` → "Revise now" launches a 5-question mini drill on that topic, then auto-calls `markRevised`.
- `ReadinessRing` → if drop ≥ 5 pts in 7 days, surfaces "Recovery Plan" banner that opens a 3-step checklist (weakest topic practice + one mock + 2 revisions).
- `RankPredictor` → "Close the gap" CTA jumps to the highest-priority weak topic.

New small util `src/lib/coach-actions.ts` centralizes deep-link builders so CTAs stay consistent.

Mock-test route accepts new query params `?subject=&topic=&count=&mode=practice|revision|drill` and auto-generates via existing `generate-test` edge function.

---

## 3. Question Bank Intelligence — Extended Metadata

Extend the generated-question schema (already has subject/chapter/topic/concept/difficulty/estimated_time) with:

- `weightage`: "low" | "medium" | "high"
- `exam_frequency`: "low" | "medium" | "high" | "very_high"
- `concept_importance`: "supporting" | "important" | "core"

Changes:

- `supabase/functions/generate-test/index.ts` — extend JSON schema + prompt so every question carries these three fields.
- `question_attempts` table — add columns `weightage`, `exam_frequency`, `concept_importance` (text, nullable). **Migration required.**
- `src/lib/intelligence.ts` — propagate fields when persisting attempts; surface in `results.tsx` chips.
- `recommendTopics()` priority becomes: `weakness*0.45 + retention_decay*0.30 + weightage*0.15 + exam_frequency*0.10`.

---

## 4. "Practice What Matters Most" — Adaptive Practice

New section on dashboard (replaces or augments current `RecommendedTopics`) and a single CTA on `/mock-test`:

- One-tap "Smart Practice" button generates a 10-Q set drawn from: weakest topic, most-repeated mistakes (from `mistake_book.times_wrong`), highest-weightage chapters, very-high-frequency concepts.
- Implemented as a new server fn / direct call that builds the prompt for `generate-test` with these constraints. No new route — uses existing test player.

---

## 5. Confidence Score per Topic

Add computed `confidence` (0–100) per `topic_mastery` row:

```
confidence = round(
  accuracy * 0.45 +
  retention_score * 0.25 +
  recencyBoost * 0.15 +     // 100 if studied <3d, decays
  recentTestPct * 0.15      // last 3 attempts on this topic
)
```

- Add column `confidence_score int default 0` to `topic_mastery`. **Migration required.**
- Update in `recordAttemptIntelligence` and `markRevised`.
- Display:
  - New "Confidence Map" panel on `/performance` (sorted list with colored bars: red <50, amber 50–74, green ≥75).
  - Inline confidence chip on every topic in `RecommendedTopics` and `RevisionWidget`.

---

## 6. Exam Goals

Let students declare a target outcome.

- New columns on `profiles`: `exam_goal_type` (text: percentile|marks|rank|qualify), `exam_goal_value` (numeric), `exam_date` (date). **Migration required.**
- Settings page (`src/routes/_authenticated/settings/index.tsx`) gets a "Exam Goal" card to set/edit.
- Onboarding picks them up too (`src/routes/onboarding.tsx`).
- `predictRank()` extended to return `gapToGoal` (e.g., "+6 percentile to reach 99"). Mission Control's Exam Goal tile shows this gap.
- Recommendations weight increases for subjects that hurt goal attainment the most.

---

## 7. Retention System (professional, no childish gamification)

- **Streak Protection**: if user has a streak ≥ 7 and misses a day, grant one auto-freeze per week. New `profiles.streak_freezes_used_week` + `streak_freeze_week_start`. Subtle banner on dashboard: "Streak protected — practice today to extend."
- **Weekly Goals**: new `weekly_goals` table (user_id, week_start, target_questions, target_mocks, target_minutes, completed_*). Mission Control collapses into a "This Week" mini-ring on Sundays.
- **Achievement Milestones**: derived, not stored — render on dashboard when crossed (10/50/100/500 questions, 1/5/10 mocks, 7/30/100-day streaks). Toast + persistent "Recent milestone" chip for 48h.
- **Consistency Tracking**: already have heatmap; add a "Consistency" stat (active days / last 14) under it.
- **Progress Celebrations**: refined toast (no confetti spam) when readiness crosses 60/75/90 or weak topic moves to medium/strong.

All retention UI uses existing design tokens. No mascots, no badges with cartoon art — text + iconography only.

---

## 8. Performance Hygiene

- Mission Control loads via a single `Promise.all` aggregator in `src/lib/intelligence.ts` (`getMissionControl(userId)`) to avoid 8 round-trips.
- Memoize readiness for 60s on the client.
- Lazy-load `/performance` charts (already heavy).
- No new routes; no decorative pages added.

---

## Technical Section

### Files to create
- `src/components/MissionControl.tsx`
- `src/components/ConfidenceMap.tsx`
- `src/components/SmartPracticeCard.tsx`
- `src/lib/coach-actions.ts`

### Files to edit
- `src/routes/_authenticated/dashboard.tsx` — replace top section with Mission Control; reorder
- `src/routes/_authenticated/performance/index.tsx` — add Confidence Map
- `src/routes/_authenticated/settings/index.tsx` — add Exam Goal card
- `src/routes/onboarding.tsx` — capture exam_date + goal
- `src/routes/_authenticated/mock-test/index.tsx` and `practice.tsx` — accept deep-link params, add Smart Practice button
- `src/routes/_authenticated/mock-test/$testId/results.tsx` — show new metadata chips
- `src/components/RecommendedTopics.tsx`, `RevisionWidget.tsx`, `RankPredictor.tsx`, `ReadinessRing.tsx` — action CTAs
- `src/lib/intelligence.ts` — `getMissionControl`, `computeConfidence`, snapshot helper, updated `recommendTopics` scoring, streak-freeze logic
- `supabase/functions/generate-test/index.ts` — extended metadata in schema + prompt

### Migration (single)
- `profiles`: add `exam_goal_type text`, `exam_goal_value numeric`, `exam_date date`, `streak_freezes_used_week int default 0`, `streak_freeze_week_start date`
- `topic_mastery`: add `confidence_score int default 0`
- `question_attempts`: add `weightage text`, `exam_frequency text`, `concept_importance text`
- new `weekly_goals` table with full GRANT + RLS (auth.uid() = user_id)

### Out of scope
- No new top-level routes
- No badge art, mascots, or confetti systems
- No changes to auth, billing, or edge-function infra beyond the generate-test schema

---

Approve and I'll implement in this order: migration → intelligence helpers → Mission Control → action CTAs → confidence + goals → retention layer.
