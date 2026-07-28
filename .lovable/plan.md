# Phase 6.4 — Enterprise Content Operations

Extends the existing Admin CMS (6.1–6.3) without touching current modules. Adds workflow, assignments, human + AI review, quality scoring, notifications, scheduling, comments, exports, and a Content Health dashboard.

## Scope guardrails

- Do NOT alter `question_bank` core columns, `question_versions`, `bulk_import_*`, or `media_*`. Extend via new tables and additive columns only.
- Keep PARIKSHA design tokens (semantic Tailwind, existing `ui-pro/*` components).
- All mutations flow through `createServerFn` with `requireSupabaseAuth` + role checks via `has_any_role`. Every mutation writes to `audit_logs`.

## Database (single migration)

New enums:
- `workflow_state`: draft, ai_review, human_review, fact_check, approved, scheduled, published, archived, deprecated
- `assignment_status`: open, in_progress, submitted, completed, cancelled
- `assignment_priority`: low, normal, high, urgent
- `review_decision`: approve, reject, request_changes, note
- `notification_type`: assignment, review_requested, review_completed, published, import_finished, media_updated, mention

New columns on `question_bank` (additive):
- `workflow_state workflow_state not null default 'draft'`
- `quality_score_breakdown jsonb`
- `scheduled_publish_at timestamptz`
- `ai_review jsonb` (last AI verdict cache)
- `assigned_to uuid`, `assigned_at timestamptz`

New tables (all with GRANTs + RLS + staff-only policies via `is_staff`):
- `question_assignments` — question_id, assigned_by, assigned_to, due_at, priority, status, notes
- `question_reviews` — question_id, reviewer_id, decision, notes, prev_state, next_state, attachments jsonb
- `question_comments` — question_id, parent_id, author_id, body, mentions uuid[], resolved_at, resolved_by
- `question_ai_reviews` — question_id, model, verdict jsonb (grammar, ambiguity, duplicates, difficulty_delta, metadata_gaps, distractor_quality, suggestions), score int, created_at
- `notifications` — user_id, type notification_type, title, body, link, entity_type, entity_id, read_at
- `content_schedule` — question_id unique, publish_at, timezone, created_by, status (pending/published/cancelled)

New RPCs (security definer, staff-gated):
- `transition_question_state(_qid uuid, _to workflow_state, _note text)` — validates legal transitions, updates `question_bank.workflow_state` and `status`, snapshots via existing trigger, writes to `question_reviews` + `audit_logs`, creates notification for `assigned_to`.
- `assign_question(_qid, _to_user, _due, _priority, _notes)` — inserts assignment, updates question, notifies assignee.
- `publish_due_scheduled()` — cron target; sets state `scheduled`→`published` where `publish_at <= now()`.
- `mark_notifications_read(_ids uuid[])`.

Cron: `select cron.schedule('publish-scheduled', '* * * * *', $$select public.publish_due_scheduled()$$)`.

Realtime: `alter publication supabase_realtime add table notifications, question_comments, question_assignments`.

## Server functions (`src/lib/admin/ops.functions.ts`)

Thin wrappers around RPCs + reads. All `.middleware([requireSupabaseAuth])` with role gate helper `assertStaff(context)`.

- `listAssignments({ mine?, status?, priority? })`
- `assignQuestion({ questionId, toUserId, dueAt, priority, notes })`
- `transitionState({ questionId, to, note })`
- `submitReview({ questionId, decision, notes, attachments })`
- `listReviews({ questionId })`
- `listComments({ questionId })`, `addComment({ questionId, parentId?, body, mentions })`, `resolveThread({ threadId })`
- `runAiReview({ questionId })` — Gemini via Lovable AI Gateway using `google/gemini-3.6-flash`. Structured output schema returning issues + per-component scores + suggestions. Persists to `question_ai_reviews`, updates `question_bank.ai_review` + `quality_score` + `quality_score_breakdown`.
- `scheduleQuestion({ questionId, publishAt, timezone })`, `cancelSchedule({ questionId })`
- `contentHealth()` — aggregate counts + coverage matrices (exam × subject × chapter, gaps = subject/chapter with zero published).
- `reviewerAnalytics({ range })` — approvals, avg review time, throughput per reviewer.
- `exportQuestions({ filters, format: csv|xlsx|json })` — streams via papaparse/xlsx already installed; returns signed URL from `imports` bucket.
- `listNotifications()`, `markNotificationsRead({ ids })`.

AI review server helper in `src/lib/admin/ai-review.server.ts` — builds prompt, calls Gateway, validates with Zod, returns normalized verdict.

## Client library (`src/lib/admin/ops.ts`)

Zod schemas + query keys + typed wrappers used by UI. React Query hooks for lists; mutations invalidate keys.

## Routes / UI (under `/_authenticated/admin/`)

All pages use existing `PageHeader`, `SectionCard`, `StatCard`.

- `admin/health.tsx` — Content Health Dashboard. Grid of StatCards (totals per workflow_state, reported, duplicates, avg quality). Coverage heatmap table (exam × subject) with gaps highlighted.
- `admin/assignments.tsx` — Kanban (open / in_progress / submitted / completed) + table toggle. Filter by mine, priority, due window. Assign dialog (question search + user picker + due date + priority).
- `admin/questions.$id.tsx` (EXTEND, don't replace):
  - New right rail tabs: Workflow, AI Review, Reviews, Comments, Schedule, History.
  - Workflow tab: state stepper + transition buttons gated by role/permission matrix.
  - AI Review tab: "Run AI Review" button → shows verdict, per-component score bars, suggestions with "Apply to field" actions where applicable.
  - Reviews tab: timeline of `question_reviews`, decision form (approve / reject / request changes) with notes + attachment upload to `media`.
  - Comments tab: threaded discussions, @mentions autocomplete (staff users), resolve.
  - Schedule tab: datetime picker with timezone, shows next cron run.
- `admin/notifications.tsx` — Realtime inbox; bell in `AdminSidebar` shows unread count.
- `admin/analytics.tsx` (EXTEND): add Reviewer Productivity, Approval Rate, Avg Review Time, Quality Trend, Publishing Trend charts (recharts already used).
- `admin/export.tsx` — Filter builder → format select → job runs → download link.

## Permissions matrix

Central `src/lib/admin/permissions.ts`:

```
super_admin: all
admin:       all except role management for super_admin
content_manager: assign, transition ≤ approved, schedule, comment, export
subject_expert:  transition draft↔human_review↔fact_check, comment
reviewer:        submit reviews, transition to approved / request_changes, comment
moderator:       archive / deprecate / handle reports, comment
translator:      edit translation fields, comment
media_manager:   media only (already handled)
qa_manager:      run AI review, override quality_score, comment, export analytics
viewer:          read-only
```

Enforced server-side in each server fn and mirrored client-side to hide controls.

## Notifications delivery

- Insert into `notifications` from RPCs and server fns.
- Client subscribes via Supabase Realtime channel on `notifications` filtered by `user_id = auth.uid()`; toast + bell badge update.

## Scheduling

- `scheduleQuestion` sets `workflow_state='scheduled'`, `scheduled_publish_at`, inserts `content_schedule`.
- `pg_cron` every minute → `publish_due_scheduled()` → transitions to `published`, writes audit + notification to author + assignee.

## Exports

Server fn assembles filtered rows (cap 100k per job), writes file to `imports` bucket via `supabaseAdmin` (loaded inside handler), returns signed URL (24h). CSV/JSON inline; XLSX via `xlsx` (already installed); PDF summary via lightweight HTML → skip binary PDF, generate printable HTML route `admin/reports/print` the user prints to PDF (Worker-safe).

## Audit

Reuse existing `audit_logs`. Add helper `writeAudit(context, action, entity_type, entity_id, diff)` called from every mutation server fn and inside RPCs (via `insert into public.audit_logs`).

## Files created

```
supabase migration (single)
src/lib/admin/ops.functions.ts
src/lib/admin/ops.ts
src/lib/admin/permissions.ts
src/lib/admin/ai-review.server.ts
src/lib/admin/notifications.ts
src/hooks/useNotifications.ts
src/components/admin/WorkflowStepper.tsx
src/components/admin/AssignDialog.tsx
src/components/admin/ReviewPanel.tsx
src/components/admin/AiReviewPanel.tsx
src/components/admin/CommentsThread.tsx
src/components/admin/SchedulePanel.tsx
src/components/admin/NotificationBell.tsx
src/components/admin/QualityScoreBadge.tsx
src/components/admin/CoverageHeatmap.tsx
src/routes/_authenticated/admin/health.tsx
src/routes/_authenticated/admin/assignments.tsx
src/routes/_authenticated/admin/notifications.tsx
src/routes/_authenticated/admin/export.tsx
src/routes/_authenticated/admin/reports.print.tsx
```

Files EXTENDED (not replaced): `AdminSidebar.tsx`, `admin/route.tsx`, `admin/questions.$id.tsx`, `admin/analytics.tsx`, `admin/index.tsx`.

## Delivery order

1. Migration (schema + RPCs + cron + realtime + GRANTs/RLS).
2. Permissions module + server fns + AI review helper.
3. Notifications hook + bell.
4. Health dashboard + Assignments page.
5. Question detail extensions (Workflow / AI / Reviews / Comments / Schedule).
6. Analytics extensions + Export page + printable report route.
7. Sidebar wiring, smoke check via server-fn invocation.

## Non-goals for this phase

- No changes to landing page, student-facing routes, mock test engine, or existing edge functions.
- No changes to `question_bank` core fields or existing question editor logic (only new side panels).
- No new dependencies — reuse recharts, papaparse, xlsx, @tanstack/react-virtual.
