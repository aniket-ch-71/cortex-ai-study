import { supabase } from "@/integrations/supabase/client";

export type QuestionStatus =
  | "draft"
  | "under_review"
  | "approved"
  | "published"
  | "archived";

export type QuestionType =
  | "single_correct"
  | "multiple_correct"
  | "numerical"
  | "assertion_reason"
  | "matrix_match"
  | "match_following"
  | "paragraph"
  | "diagram";

export const QUESTION_STATUSES: QuestionStatus[] = [
  "draft",
  "under_review",
  "approved",
  "published",
  "archived",
];

export const QUESTION_TYPES: { value: QuestionType; label: string }[] = [
  { value: "single_correct", label: "Single Correct MCQ" },
  { value: "multiple_correct", label: "Multiple Correct" },
  { value: "numerical", label: "Numerical Answer" },
  { value: "assertion_reason", label: "Assertion & Reason" },
  { value: "matrix_match", label: "Matrix Match" },
  { value: "match_following", label: "Match the Following" },
  { value: "paragraph", label: "Paragraph Based" },
  { value: "diagram", label: "Diagram Based" },
];

export type Question = {
  id: string;
  exam: string;
  sub_exam: string;
  subject: string;
  chapter: string | null;
  topic: string | null;
  sub_topic: string | null;
  concept: string | null;
  difficulty: string;
  question_type: QuestionType;
  language: string;
  question: string;
  options: string[];
  correct_index: number;
  correct_indices: number[] | null;
  numerical_answer: number | null;
  explanation: string;
  is_pyq: boolean;
  pyq_year: number | null;
  source_type: string;
  weightage: string | null;
  exam_frequency: string | null;
  concept_importance: string | null;
  svg_diagram: string | null;
  diagram_url: string | null;
  solution_image_url: string | null;
  question_hash: string | null;
  estimated_time_seconds: number | null;
  marks: number;
  negative_marks: number;
  tags: string[];
  quality_score: number | null;
  author_id: string | null;
  reviewer_id: string | null;
  status: QuestionStatus;
  version: number;
  archived: boolean;
  archived_at: string | null;
  deleted_at: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

export type QuestionFilters = {
  q?: string;
  exam?: string;
  subject?: string;
  chapter?: string;
  topic?: string;
  concept?: string;
  difficulty?: string;
  question_type?: QuestionType;
  status?: QuestionStatus;
  is_pyq?: boolean;
  pyq_year?: number;
  weightage?: string;
  author_id?: string;
  reviewer_id?: string;
  tag?: string;
  include_deleted?: boolean;
  include_archived?: boolean;
};

export type SortField =
  | "created_at"
  | "updated_at"
  | "question"
  | "status"
  | "difficulty"
  | "quality_score";

export type ListParams = {
  filters?: QuestionFilters;
  page?: number;
  pageSize?: number;
  sort?: SortField;
  order?: "asc" | "desc";
};

const TABLE = "question_bank";

function applyFilters<T extends { or: Function }>(
  q: T,
  f: QuestionFilters = {},
): T {
  const b = q as any;
  if (f.exam) b.eq("exam", f.exam);
  if (f.subject) b.eq("subject", f.subject);
  if (f.chapter) b.eq("chapter", f.chapter);
  if (f.topic) b.eq("topic", f.topic);
  if (f.concept) b.eq("concept", f.concept);
  if (f.difficulty) b.eq("difficulty", f.difficulty);
  if (f.question_type) b.eq("question_type", f.question_type);
  if (f.status) b.eq("status", f.status);
  if (typeof f.is_pyq === "boolean") b.eq("is_pyq", f.is_pyq);
  if (f.pyq_year) b.eq("pyq_year", f.pyq_year);
  if (f.weightage) b.eq("weightage", f.weightage);
  if (f.author_id) b.eq("author_id", f.author_id);
  if (f.reviewer_id) b.eq("reviewer_id", f.reviewer_id);
  if (f.tag) b.contains("tags", [f.tag]);
  if (!f.include_deleted) b.is("deleted_at", null);
  if (!f.include_archived) b.eq("archived", false);
  if (f.q && f.q.trim()) {
    const term = f.q.trim().replace(/[%_]/g, "");
    // Search across id (uuid prefix), question text and explanation
    b.or(`question.ilike.%${term}%,explanation.ilike.%${term}%`);
  }
  return q;
}

export async function listQuestions(params: ListParams = {}) {
  const {
    filters = {},
    page = 1,
    pageSize = 25,
    sort = "updated_at",
    order = "desc",
  } = params;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let q = supabase
    .from(TABLE)
    .select("*", { count: "exact" })
    .order(sort, { ascending: order === "asc" })
    .range(from, to);
  q = applyFilters(q as any, filters);

  const { data, error, count } = await q;
  if (error) throw error;
  return { rows: (data ?? []) as Question[], total: count ?? 0 };
}

export async function getQuestion(id: string) {
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data as Question | null;
}

export type QuestionInput = Partial<
  Omit<Question, "id" | "created_at" | "updated_at" | "version">
> & {
  question: string;
  options: string[];
  correct_index: number;
  explanation: string;
  exam: string;
  sub_exam: string;
  subject: string;
  difficulty: string;
  language: string;
  question_type: QuestionType;
  source_type: string;
};

export async function createQuestion(input: QuestionInput) {
  const { data: sess } = await supabase.auth.getSession();
  const uid = sess.session?.user.id;
  const { data, error } = await supabase
    .from(TABLE)
    .insert({ ...input, author_id: uid ?? input.author_id ?? null })
    .select("*")
    .single();
  if (error) throw error;
  return data as Question;
}

export async function updateQuestion(
  id: string,
  patch: Partial<QuestionInput>,
) {
  const { data, error } = await supabase
    .from(TABLE)
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return data as Question;
}

export async function bulkUpdate(
  ids: string[],
  patch: Partial<QuestionInput>,
) {
  if (!ids.length) return;
  const { error } = await supabase.from(TABLE).update(patch).in("id", ids);
  if (error) throw error;
}

export async function archiveQuestions(ids: string[]) {
  await bulkUpdate(ids, {
    archived: true,
    archived_at: new Date().toISOString(),
    status: "archived",
  } as any);
}

export async function restoreQuestions(ids: string[]) {
  await bulkUpdate(ids, {
    archived: false,
    archived_at: null,
    status: "draft",
  } as any);
}

export async function softDeleteQuestions(ids: string[]) {
  await bulkUpdate(ids, { deleted_at: new Date().toISOString() } as any);
}

export async function publishQuestions(ids: string[]) {
  await bulkUpdate(ids, {
    status: "published",
    published_at: new Date().toISOString(),
    archived: false,
  } as any);
}

export async function duplicateQuestion(id: string) {
  const src = await getQuestion(id);
  if (!src) throw new Error("Question not found");
  const {
    id: _id,
    created_at,
    updated_at,
    version,
    published_at,
    archived_at,
    deleted_at,
    ...rest
  } = src;
  return createQuestion({
    ...(rest as any),
    status: "draft",
    archived: false,
    question: `${src.question} (Copy)`,
  });
}

export async function listVersions(questionId: string) {
  const { data, error } = await supabase
    .from("question_versions")
    .select("*")
    .eq("question_id", questionId)
    .order("version", { ascending: false });
  if (error) throw error;
  return data as Array<{
    id: string;
    question_id: string;
    version: number;
    snapshot: Question;
    changed_by: string | null;
    change_note: string | null;
    created_at: string;
  }>;
}

export async function restoreVersion(questionId: string, version: number) {
  const versions = await listVersions(questionId);
  const v = versions.find((x) => x.version === version);
  if (!v) throw new Error("Version not found");
  const s = v.snapshot;
  return updateQuestion(questionId, {
    question: s.question,
    options: s.options,
    correct_index: s.correct_index,
    correct_indices: s.correct_indices ?? undefined,
    numerical_answer: s.numerical_answer ?? undefined,
    explanation: s.explanation,
    exam: s.exam,
    sub_exam: s.sub_exam,
    subject: s.subject,
    chapter: s.chapter ?? undefined,
    topic: s.topic ?? undefined,
    sub_topic: s.sub_topic ?? undefined,
    concept: s.concept ?? undefined,
    difficulty: s.difficulty,
    question_type: s.question_type,
    language: s.language,
    is_pyq: s.is_pyq,
    pyq_year: s.pyq_year ?? undefined,
    source_type: s.source_type,
    weightage: s.weightage ?? undefined,
    exam_frequency: s.exam_frequency ?? undefined,
    concept_importance: s.concept_importance ?? undefined,
    svg_diagram: s.svg_diagram ?? undefined,
    diagram_url: s.diagram_url ?? undefined,
    solution_image_url: s.solution_image_url ?? undefined,
    estimated_time_seconds: s.estimated_time_seconds ?? undefined,
    marks: s.marks,
    negative_marks: s.negative_marks,
    tags: s.tags,
    quality_score: s.quality_score ?? undefined,
  });
}

export type ValidationResult = { ok: boolean; errors: string[] };

export function validateForPublish(q: Partial<Question>): ValidationResult {
  const errors: string[] = [];
  if (!q.question || q.question.trim().length < 5)
    errors.push("Question text is required (min 5 chars)");
  if (!q.exam) errors.push("Exam is required");
  if (!q.subject) errors.push("Subject is required");
  if (!q.difficulty) errors.push("Difficulty is required");
  if (!q.question_type) errors.push("Question type is required");
  if (!q.topic) errors.push("Topic is required");
  if (!q.explanation || q.explanation.trim().length < 5)
    errors.push("Explanation is required");

  const type = q.question_type;
  if (type === "numerical") {
    if (q.numerical_answer == null || Number.isNaN(q.numerical_answer))
      errors.push("Numerical answer is required");
  } else if (type === "multiple_correct") {
    if (!q.options || q.options.filter((o) => o.trim()).length < 2)
      errors.push("At least 2 non-empty options required");
    if (!q.correct_indices || q.correct_indices.length < 1)
      errors.push("Select at least one correct option");
  } else {
    if (!q.options || q.options.filter((o) => o.trim()).length < 2)
      errors.push("At least 2 non-empty options required");
    if (
      q.correct_index == null ||
      q.correct_index < 0 ||
      q.correct_index >= (q.options?.length ?? 0)
    )
      errors.push("Correct answer must be selected");
  }
  if (type === "diagram" && !q.svg_diagram && !q.diagram_url)
    errors.push("Diagram (SVG or image) required for diagram type");
  return { ok: errors.length === 0, errors };
}

export async function distinctValues(column: keyof Question, limit = 500) {
  // Best-effort distinct list, client-side dedupe
  const { data, error } = await supabase
    .from(TABLE)
    .select(column as string)
    .not(column as string, "is", null)
    .limit(limit);
  if (error) throw error;
  const s = new Set<string>();
  for (const r of data ?? []) {
    const v = (r as any)[column];
    if (v) s.add(String(v));
  }
  return Array.from(s).sort();
}
