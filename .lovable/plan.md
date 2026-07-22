
# Phase 6 — Enterprise Admin CMS

Scope is very large. I'll ship it in 4 sequenced stages so each stage lands stable, secure, and reviewable. Nothing student-facing changes.

---

## Stage 1 — Foundation: RBAC + Admin Shell + Audit Log

**Database**
- Extend `app_role` enum: add `super_admin`, `moderator`, `content_creator`, `reviewer` (keep existing `admin`, `user`).
- `audit_logs` table: actor_id, action, entity_type, entity_id, diff (jsonb), ip, ua, created_at. Indexed on (entity_type, entity_id), (actor_id, created_at).
- Helper fns: `has_any_role(uuid, app_role[])`, `is_staff(uuid)` (any non-`user` role).
- Grants + RLS: only `super_admin`/`admin` can read audit_logs.

**Routes / UI**
- New gate `src/routes/_authenticated/_admin/route.tsx` — `beforeLoad` checks `is_staff` via server fn; else redirect to `/dashboard`.
- Admin shell: sidebar (Overview, Questions, Media, Reports, Imports, Users & Roles, Audit Log), topbar, breadcrumbs. Reuses existing tokens/`ui-pro`.
- `/admin` overview page (empty stats scaffolded).
- `/admin/users` — list staff, grant/revoke roles (super_admin only).
- `/admin/audit` — paginated audit log viewer with filters.

**Server**
- `logAudit` helper used by all admin server fns.
- `requireStaff` / `requireRole([...])` server-fn middleware built on `requireSupabaseAuth`.

---

## Stage 2 — Question Management + Editor + Advanced Search

**Database**
- Extend `question_bank`: `status` enum (`draft`,`under_review`,`approved`,`published`,`archived`), `author_id`, `reviewer_id`, `version`, `quality_score` (0–100), `question_type` (`mcq`,`multi`,`numerical`,`assertion_reason`,`matrix_match`,`paragraph`,`diagram`), `tags text[]`, `parent_id` (for paragraph groups), `latex jsonb` optional.
- `question_versions` table (immutable snapshots on edit/publish).
- `question_comments` table (review comments/change requests).
- Composite indexes: (exam, subject, status), (status, updated_at), GIN on tags, trigram on question text for search.
- RLS: staff-only writes; students only see `status='published'` (student queries already filter — will confirm).

**Editor**
- `/admin/questions` — enterprise list: server-side pagination (cursor), column filters (exam/subject/chapter/topic/difficulty/status/type/weightage/frequency/PYQ/tags/quality/author/date), full-text search, bulk actions (publish, unpublish, archive, delete, tag, assign reviewer), keyboard shortcuts (`/` focus search, `j/k` nav, `e` edit, `p` preview, `⌘K` command palette).
- `/admin/questions/new`, `/admin/questions/$id/edit` — rich editor:
  - Markdown + LaTeX (KaTeX render), Mermaid/SVG paste, chem via `mhchem` KaTeX extension, code blocks.
  - Image/SVG upload → Media Library (Stage 3), inline preview.
  - Type-aware forms (MCQ, multi-correct, numerical range, assertion-reason, matrix match, paragraph with children, diagram-based).
  - Live student-view preview pane.
  - Version history drawer, draft/publish/unpublish/archive, duplicate.

---

## Stage 3 — Media Library + Bulk Import + Review Workflow

**Media Library**
- Supabase Storage bucket `cms-media` (private, signed URLs). Table `media_assets`: url, kind, tags, categories, alt, uploaded_by, size, width, height, sha256 (dedupe).
- `/admin/media` — grid with search, tag filter, category filter, click-to-insert into editor, reuse-existing surfacing via sha256.

**Bulk Import**
- `/admin/import` — upload CSV/JSON/XLSX (client parse via `papaparse` + `xlsx`).
- Pre-validate: schema check, required fields, duplicate detection (question hash), warnings.
- Preview grid with row-level errors; user confirms.
- Server fn imports in a single transaction (`import_batches` table); rollback = mark batch reverted + soft-delete rows.
- Import summary UI (success/warn/error counts, download error CSV).

**Review Workflow**
- Status transitions gated by role:
  - Content Creator: draft → under_review
  - Reviewer/Moderator: under_review → approved / rejected / changes_requested (+ comment)
  - Admin/Super Admin: approved → published; any → archived
- Comments panel in editor. All transitions audited.

---

## Stage 4 — Reports Moderation + Quality Score + Analytics + AI Assistant

**Report Moderation**
- `/admin/reports` — list `question_reports` with filters, inline question preview, actions: resolve, reject, edit-question, merge-duplicate (points hash → canonical id).

**Quality Score**
- Server fn recomputes on edit/report/attempt aggregate:
  - explanation length/structure, has diagram, metadata completeness, student accuracy from `question_attempts`, open reports, PYQ status, difficulty validation (predicted vs observed accuracy).
- Badge on lists + filter.

**Content Analytics**
- `/admin/analytics` — totals, per-exam, per-subject, drafts vs published, reported, top weak topics (from `topic_mastery`/`mistake_book`), missing chapters (patterns vs coverage), quality distribution histogram.
- Materialized view refreshed by trigger + on-demand button.

**AI Content Assistant**
- Panel inside editor, admin-only server fn using Lovable AI Gateway:
  - Generate similar, improve explanation, rewrite options, adjust difficulty, generate diagram prompt, hint, alternate solution.
- Output stages as suggestions requiring human approval before saving; audited.

---

## Technical section

- Server functions live in `src/lib/admin/*.functions.ts`; admin-only middleware via `requireSupabaseAuth` + role check calling `has_any_role` RPC through `context.supabase` (never `supabaseAdmin` for authz). `supabaseAdmin` only for role grants + import transaction control.
- All admin tables: explicit `GRANT` to `authenticated` + `service_role`, RLS scoped via `has_any_role`.
- Student reads unchanged: existing routes already filter to published/AI-generated content; will add `status='published'` filter where reading `question_bank` directly.
- Pagination: keyset (created_at, id) for questions list; server-side sort/filter only.
- Indexes tuned for 100k+ rows; `EXPLAIN` verified on filter combos.
- Cache: React Query with 30s stale on list views, invalidated on mutations.
- Keyboard shortcuts via a small hook; `⌘K` command palette using `cmdk`.
- No changes to student UI or existing edge functions.

---

## Delivery order & approvals

I'll implement stage by stage and pause for approval between stages (each stage is itself large). Stage 1 lands first: RBAC roles, admin shell, users/roles page, audit log — nothing user-visible outside `/admin`.

Reply "go" to start Stage 1, or tell me to re-scope (e.g. skip AI assistant, defer analytics).
