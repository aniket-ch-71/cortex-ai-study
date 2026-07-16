# Phase 4 — Question Quality System

Goal: turn PARIKSHA from an AI mock-test site into a proper exam-prep platform by giving every question durable metadata, letting students save/report/revise from any test, and generating one-click revision packs from their own weak areas.

No new analytics dashboards, no decorative UI. Everything plugs into surfaces that already exist (Mission Control, Mistake Book, Revision Engine, Daily Challenge, Results, Practice).

---

## 1. Data model (single migration)

New tables (all with GRANT + RLS on `auth.uid() = user_id`):

- `saved_questions` — user's vault
  - `id, user_id, question_hash, question, options jsonb, correct_index, explanation`
  - `subject, chapter, topic, concept, difficulty, weightage, exam_frequency, source_type`
  - `tag` — `save | important | revise_later | favorite` (enum)
  - `note` (optional user note), `next_review_at` (for revise_later), `created_at`
  - unique(`user_id, question_hash, tag`)
- `question_reports` — moderation queue
  - `id, user_id, question_hash, question_snapshot jsonb`
  - `reason` — `wrong_answer | wrong_explanation | wrong_diagram | duplicate | outdated`
  - `details text, status` (`open|reviewed|dismissed`), `created_at`
- `revision_packs` — generated packs (so users can resume)
  - `id, user_id, title, seed_type` (`mistakes|weak|confidence|due|mixed`), `question_count`, `estimated_minutes`, `payload jsonb` (the seeded questions), `completed_at`, `created_at`

Extend existing tables:

- `question_bank`: add `is_pyq bool default false`, `pyq_year int`, `source_type text default 'verified'`, `weightage text`, `exam_frequency text`, `concept_importance text` (nullable — bulk import fills later).
- `question_attempts`: add `source_type text`, `is_pyq bool` (denormalized so results & mistake book can show badges cheaply).

`question_hash` is a stable sha256 of `lower(trim(question)) || correct_index` — used to dedupe saves, link reports, and match a saved AI question back if it's regenerated.

Indexes: `saved_questions(user_id, tag, created_at desc)`, `saved_questions(user_id, subject, topic)`, `question_reports(status, created_at)`, `question_bank(is_pyq, subject)`.

## 2. AI generator (PYQ mode + full metadata)

`supabase/functions/generate-test/index.ts`:

- Accept new params: `sourceMode` (`all|pyq|pyq_similar|high_weightage`), and pass through to the prompt.
- Extend the tool schema so every question also carries `source_type` (`pyq|ai_generated|verified`), `is_pyq`, `pyq_year` (nullable). `weightage / exam_frequency / concept_importance` are already there.
- When `sourceMode = pyq` or `pyq_similar`, prompt instructs the model to mirror past-paper style for the selected exam and mark `is_pyq=true` / `pyq_year` when the question is a direct PYQ, `false` for similar.
- When `high_weightage`, restrict to chapters marked high weightage.

Practice tab (`question_bank`) gets the same source filter (SQL where `is_pyq = true` etc.).

## 3. Question metadata surfacing

Small shared `QuestionBadges` component renders chips from any question:
- `PYQ 2022` (if `is_pyq`)
- `High Weightage` / `Very Frequent`
- `Core Concept`
- `Verified` (if `source_type = verified`)

Used in:
- Mock test player (below the question)
- Results review
- Mistake Book row
- Vault list
- Revision pack player

## 4. Vault (save / important / revise later / favorite)

New route: `/vault` (under `_authenticated`), sidebar link under Insights.

- Top: tag tabs — All · ⭐ Saved · 🔺 Important · 🕘 Revise Later · ❤ Favorite.
- Filters: subject, chapter, topic, difficulty, source (PYQ / AI / Verified), sort (recent, difficulty, weightage).
- Search box (server ilike on question + topic + concept).
- Row actions: Preview, Add note, Change tag, Remove, "Practice these" (seeds a revision pack from current filter).

New `saveQuestion(userId, q, tag)` helper in `src/lib/intelligence.ts` (upsert by hash+tag). Also `unsaveQuestion`, `listVault`, `moveTag`.

Save UI:
- In test player: star icon next to each question with a small popover (Save / Important / Revise later / Favorite).
- Same popover on results review + mistake book row.

Mission Control gets a new tile "🗂 Vault" showing `savedCount` + `dueForRevision` (saves tagged `revise_later` where `next_review_at <= now()`), CTA "Start revision" → seeds a revision pack from those.

## 5. Report a question

Icon (flag) next to save in every question surface (test player, results, vault, mistake book).

Modal with radio list (5 reasons) + optional details textarea. Inserts into `question_reports` with a snapshot of the question so moderation isn't broken if the source changes. Toast "Thanks — we'll review this."

No admin UI this phase; reports sit in the moderation queue for later.

## 6. Smart Revision Packs

New page: `/revision-packs` (Insights sidebar).

Top: "Generate a pack" card with seed selector:
- From my mistakes (uses `mistake_book` sorted by `times_wrong`)
- From weak topics (lowest confidence)
- From due revisions (`saved_questions` with `tag=revise_later, next_review_at<=now`)
- From a specific topic (subject/topic picker)

Options: question count (10/20/30), difficulty (easy/mixed/hard), time budget (auto = count × avg estimated_time).

`buildRevisionPack(userId, opts)` in intelligence.ts:
- Pulls candidate question hashes from the seed source.
- Uses `generate-test` in "revision" mode passing the topics + weightage constraints when there aren't enough saved originals.
- Persists pack in `revision_packs` with the full question payload so it's resumable.

Pack player reuses the mock-test question UI (no separate component) but with per-question feedback + "Save to vault" always visible. On complete: writes attempts as usual, marks pack `completed_at`, updates SM-2 fields on any `revise_later` saves it consumed.

Below the generator: list of user's packs (title, seed, count, status, resume/replay).

Mission Control's existing revision tile shows next pack instead of the raw revision list once packs exist.

## 7. Integration touch points

- Mission Control: add Vault tile; existing Revision tile now links to `/revision-packs` when saved-revise-later items exist.
- Daily Challenge: when a challenge is topic-scoped and the user has due saves for that topic, prefer them.
- Mistake Book row: add Save-to-Vault, Report, and "Add to next pack" buttons.
- Results: after submit, if ≥3 wrong answers, banner "Build a revision pack from today's mistakes →".

## 8. Bulk import readiness (architecture only, no admin UI this phase)

- Question shape standardized (single TS type `CanonicalQuestion` in `src/lib/question-schema.ts`) — used by AI generator output, saved_questions, revision_packs payload, and future bulk import.
- Add `svg_diagram text` and `diagram_url text` columns to `question_bank` so future imports can carry diagrams; renderer already renders markdown, we just pass through raw SVG when present (sanitized via DOMPurify — new dep).
- Storage bucket `question-diagrams` (public read) created via storage tool — for future diagram uploads. No UI wired to it this phase.
- Utility `parseBulkQuestions(json | csv): CanonicalQuestion[]` (pure function, no route) so an admin importer can be added later without reshaping data.

## 9. Out of scope this phase

- Admin moderation UI for reports & bulk import UI (arch is ready, no page).
- Community-shared vaults / social features.
- Diagram editor.
- Rewriting analytics dashboards, Rank Predictor, Mission Control layout.

---

## Technical section

### New files
- `src/lib/question-schema.ts` — `CanonicalQuestion` type, `hashQuestion()`, `parseBulkQuestions()`.
- `src/components/QuestionBadges.tsx`
- `src/components/SaveQuestionMenu.tsx`
- `src/components/ReportQuestionDialog.tsx`
- `src/routes/_authenticated/vault/index.tsx`
- `src/routes/_authenticated/revision-packs/index.tsx`
- `src/routes/_authenticated/revision-packs/$packId.tsx` (player)

### Edited files
- `src/lib/intelligence.ts` — vault helpers, `buildRevisionPack`, extend `getMissionControl` with vault counts.
- `src/routes/_authenticated/mock-test/index.tsx` — source-mode selector for AI + PYQ filter for Practice.
- `src/routes/_authenticated/mock-test/$testId/index.tsx` and `results.tsx` — save/report buttons, badges, revision-pack banner.
- `src/routes/_authenticated/mistakes/index.tsx` — save/report/add-to-pack.
- `src/components/MissionControl.tsx` — Vault tile, updated Revision tile.
- `src/components/AppSidebar.tsx` — Vault + Revision Packs links.
- `supabase/functions/generate-test/index.ts` — `sourceMode`, PYQ prompt, extended schema.

### Migrations
Single migration for the three new tables + `question_bank` / `question_attempts` column additions + indexes + policies + GRANTs.

### New deps
- `dompurify` (SVG sanitization for future diagrams)

Ship order: migration → schema/helpers → save/report components → vault route → PYQ generator → revision packs → integrations.

Approve and I'll build it in that order.
