// Client library for Phase 6.4 Content Operations.
// All mutations go through Supabase RPCs (SECURITY DEFINER with is_staff checks)
// or direct writes gated by RLS. AI review goes through the edge function.
import { supabase } from "@/integrations/supabase/client";
import type { WorkflowState } from "./permissions";

export type AssignmentStatus = "open" | "in_progress" | "submitted" | "completed" | "cancelled";
export type AssignmentPriority = "low" | "normal" | "high" | "urgent";
export type ReviewDecision = "approve" | "reject" | "request_changes" | "note";
export type NotificationType =
  | "assignment" | "review_requested" | "review_completed" | "published"
  | "import_finished" | "media_updated" | "mention";

export type Assignment = {
  id: string;
  question_id: string;
  assigned_by: string;
  assigned_to: string;
  due_at: string | null;
  priority: AssignmentPriority;
  status: AssignmentStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type ReviewRow = {
  id: string;
  question_id: string;
  reviewer_id: string;
  decision: ReviewDecision;
  notes: string | null;
  prev_state: WorkflowState | null;
  next_state: WorkflowState | null;
  attachments: unknown[];
  created_at: string;
};

export type CommentRow = {
  id: string;
  question_id: string;
  parent_id: string | null;
  author_id: string;
  body: string;
  mentions: string[];
  resolved_at: string | null;
  resolved_by: string | null;
  created_at: string;
  updated_at: string;
};

export type NotificationRow = {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  link: string | null;
  entity_type: string | null;
  entity_id: string | null;
  read_at: string | null;
  created_at: string;
};

export type AiVerdict = {
  overall_score: number;
  components: Record<string, number>;
  issues: { severity: "low" | "medium" | "high" | "critical"; category: string; message: string }[];
  suggestions: string[];
  verdict: "excellent" | "good" | "needs_review" | "critical";
};

/* -------------------- assignments -------------------- */

export async function listAssignments(opts: { mine?: boolean; status?: AssignmentStatus } = {}) {
  let q = supabase
    .from("question_assignments")
    .select("*, question_bank!inner(id,question,subject,workflow_state,quality_score)")
    .order("created_at", { ascending: false })
    .limit(500);
  if (opts.status) q = q.eq("status", opts.status);
  if (opts.mine) {
    const { data: sess } = await supabase.auth.getSession();
    if (sess.session) q = q.eq("assigned_to", sess.session.user.id);
  }
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as unknown as (Assignment & { question_bank: { id: string; question: string; subject: string; workflow_state: WorkflowState; quality_score: number | null } })[];
}

export async function assignQuestion(input: { questionId: string; toUserId: string; dueAt?: string | null; priority?: AssignmentPriority; notes?: string | null }) {
  const { data, error } = await (supabase.rpc as unknown as (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>)(
    "assign_question",
    {
      _qid: input.questionId,
      _to_user: input.toUserId,
      _due: input.dueAt ?? null,
      _priority: input.priority ?? "normal",
      _notes: input.notes ?? null,
    },
  );
  if (error) throw error;
  return data as string;
}

export async function updateAssignmentStatus(id: string, status: AssignmentStatus) {
  const { error } = await supabase.from("question_assignments").update({ status }).eq("id", id);
  if (error) throw error;
}

/* -------------------- workflow -------------------- */

export async function transitionState(questionId: string, to: WorkflowState, note?: string) {
  const { data, error } = await (supabase.rpc as unknown as (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>)(
    "transition_question_state",
    { _qid: questionId, _to: to, _note: note ?? null },
  );
  if (error) throw error;
  return data as WorkflowState;
}


/* -------------------- reviews -------------------- */

export async function listReviews(questionId: string) {
  const { data, error } = await supabase
    .from("question_reviews").select("*").eq("question_id", questionId)
    .order("created_at", { ascending: false }).limit(200);
  if (error) throw error;
  return (data ?? []) as ReviewRow[];
}

export async function submitReview(input: { questionId: string; decision: ReviewDecision; notes?: string; attachments?: unknown[] }) {
  const { data: sess } = await supabase.auth.getSession();
  if (!sess.session) throw new Error("not authenticated");
  const { error } = await supabase.from("question_reviews").insert({
    question_id: input.questionId,
    reviewer_id: sess.session.user.id,
    decision: input.decision,
    notes: input.notes ?? null,
    attachments: input.attachments ?? [],
  });
  if (error) throw error;
}

/* -------------------- comments -------------------- */

export async function listComments(questionId: string) {
  const { data, error } = await supabase
    .from("question_comments").select("*").eq("question_id", questionId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as CommentRow[];
}

export async function addComment(input: { questionId: string; parentId?: string | null; body: string; mentions?: string[] }) {
  const { data: sess } = await supabase.auth.getSession();
  if (!sess.session) throw new Error("not authenticated");
  const { error } = await supabase.from("question_comments").insert({
    question_id: input.questionId,
    parent_id: input.parentId ?? null,
    author_id: sess.session.user.id,
    body: input.body,
    mentions: input.mentions ?? [],
  });
  if (error) throw error;
}

export async function resolveComment(id: string) {
  const { data: sess } = await supabase.auth.getSession();
  if (!sess.session) throw new Error("not authenticated");
  const { error } = await supabase.from("question_comments").update({
    resolved_at: new Date().toISOString(), resolved_by: sess.session.user.id,
  }).eq("id", id);
  if (error) throw error;
}

/* -------------------- schedule -------------------- */

export async function scheduleQuestion(questionId: string, publishAt: string, timezone: string) {
  const { error } = await supabase.rpc("schedule_question", {
    _qid: questionId, _publish_at: publishAt, _tz: timezone,
  });
  if (error) throw error;
}

export async function cancelSchedule(questionId: string) {
  const { error } = await supabase.from("content_schedule").update({ status: "cancelled" }).eq("question_id", questionId);
  if (error) throw error;
}

/* -------------------- AI review -------------------- */

export async function runAiReview(questionId: string): Promise<AiVerdict> {
  const { data, error } = await supabase.functions.invoke("ai-review", {
    body: { question_id: questionId },
  });
  if (error) throw error;
  if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);
  return data as AiVerdict;
}

/* -------------------- notifications -------------------- */

export async function listNotifications(limit = 50) {
  const { data, error } = await supabase.from("notifications").select("*")
    .order("created_at", { ascending: false }).limit(limit);
  if (error) throw error;
  return (data ?? []) as NotificationRow[];
}

export async function markNotificationsRead(ids: string[]) {
  if (!ids.length) return 0;
  const { data, error } = await supabase.rpc("mark_notifications_read", { _ids: ids });
  if (error) throw error;
  return (data as number) ?? 0;
}

/* -------------------- content health -------------------- */

export type ContentHealth = {
  totals: Record<WorkflowState | "reported" | "avg_quality", number>;
  coverage: { exam: string; subject: string; published: number; drafts: number }[];
};

export async function contentHealth(): Promise<ContentHealth> {
  const { data: rows, error } = await supabase
    .from("question_bank")
    .select("exam, subject, workflow_state, quality_score")
    .limit(50000);
  if (error) throw error;
  const totals: Record<string, number> = {
    draft:0, ai_review:0, human_review:0, fact_check:0, approved:0, scheduled:0, published:0, archived:0, deprecated:0, reported:0, avg_quality:0,
  };
  const coverageMap = new Map<string, { exam: string; subject: string; published: number; drafts: number }>();
  let qSum = 0, qN = 0;
  for (const r of (rows ?? []) as { exam: string; subject: string; workflow_state: WorkflowState; quality_score: number | null }[]) {
    totals[r.workflow_state] = (totals[r.workflow_state] ?? 0) + 1;
    if (typeof r.quality_score === "number") { qSum += r.quality_score; qN += 1; }
    const k = `${r.exam}::${r.subject}`;
    const c = coverageMap.get(k) ?? { exam: r.exam, subject: r.subject, published: 0, drafts: 0 };
    if (r.workflow_state === "published") c.published += 1; else c.drafts += 1;
    coverageMap.set(k, c);
  }
  totals.avg_quality = qN ? Math.round(qSum / qN) : 0;
  const { count: reports } = await supabase.from("question_reports").select("*", { count: "exact", head: true }).eq("status", "open");
  totals.reported = reports ?? 0;
  return { totals: totals as ContentHealth["totals"], coverage: Array.from(coverageMap.values()).sort((a,b)=>a.exam.localeCompare(b.exam)||a.subject.localeCompare(b.subject)) };
}

/* -------------------- staff directory (for @mentions & assign picker) -------------------- */

export async function listStaff(): Promise<{ id: string; name: string; username: string | null }[]> {
  const { data: r } = await supabase.from("user_roles").select("user_id, role").neq("role", "user");
  const ids = Array.from(new Set(((r ?? []) as { user_id: string }[]).map((x) => x.user_id)));
  if (!ids.length) return [];
  const { data: p } = await supabase.from("profiles").select("id, full_name, username").in("id", ids);
  return ((p ?? []) as { id: string; full_name: string | null; username: string | null }[]).map((x) => ({
    id: x.id, name: x.full_name || x.username || x.id.slice(0, 8), username: x.username,
  }));
}

/* -------------------- reviewer analytics -------------------- */

export type ReviewerStat = { reviewer_id: string; approvals: number; rejections: number; changes: number; total: number };
export async function reviewerAnalytics(sinceDays = 30): Promise<ReviewerStat[]> {
  const since = new Date(Date.now() - sinceDays * 86400000).toISOString();
  const { data, error } = await supabase.from("question_reviews").select("reviewer_id, decision").gte("created_at", since).limit(20000);
  if (error) throw error;
  const map = new Map<string, ReviewerStat>();
  for (const r of (data ?? []) as { reviewer_id: string; decision: ReviewDecision }[]) {
    const cur = map.get(r.reviewer_id) ?? { reviewer_id: r.reviewer_id, approvals: 0, rejections: 0, changes: 0, total: 0 };
    if (r.decision === "approve") cur.approvals += 1;
    else if (r.decision === "reject") cur.rejections += 1;
    else if (r.decision === "request_changes") cur.changes += 1;
    cur.total += 1;
    map.set(r.reviewer_id, cur);
  }
  return Array.from(map.values()).sort((a, b) => b.total - a.total);
}
