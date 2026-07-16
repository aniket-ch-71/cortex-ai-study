// Vault (saved_questions) + question_reports helpers.
import { supabase } from "@/integrations/supabase/client";
import { hashQuestion, type CanonicalQuestion } from "./question-schema";

export type VaultTag = "save" | "important" | "revise_later" | "favorite";
export type ReportReason =
  | "wrong_answer" | "wrong_explanation" | "wrong_diagram" | "duplicate" | "outdated";

export type SavedQuestion = CanonicalQuestion & {
  id: string;
  user_id: string;
  question_hash: string;
  tag: VaultTag;
  note: string | null;
  next_review_at: string | null;
  created_at: string;
};

export async function saveQuestion(
  userId: string,
  q: CanonicalQuestion,
  tag: VaultTag,
  note?: string,
): Promise<SavedQuestion | null> {
  const question_hash = await hashQuestion(q);
  const next_review_at =
    tag === "revise_later" ? new Date(Date.now() + 2 * 86_400_000).toISOString() : null;

  const { data, error } = await supabase
    .from("saved_questions")
    .upsert(
      {
        user_id: userId,
        question_hash,
        question: q.question,
        options: q.options as unknown as never,
        correct_index: q.correct_index,
        explanation: q.explanation ?? null,
        subject: q.subject ?? null,
        chapter: q.chapter ?? null,
        topic: q.topic ?? null,
        concept: q.concept ?? null,
        difficulty: q.difficulty ?? null,
        weightage: q.weightage ?? null,
        exam_frequency: q.exam_frequency ?? null,
        source_type: q.source_type ?? "ai_generated",
        is_pyq: !!q.is_pyq,
        pyq_year: q.pyq_year ?? null,
        tag,
        note: note ?? null,
        next_review_at,
      },
      { onConflict: "user_id,question_hash,tag" },
    )
    .select()
    .maybeSingle();
  if (error) {
    console.error("saveQuestion", error);
    return null;
  }
  return data as unknown as SavedQuestion;
}

export async function unsaveByHashTag(userId: string, question_hash: string, tag: VaultTag) {
  return supabase
    .from("saved_questions")
    .delete()
    .eq("user_id", userId)
    .eq("question_hash", question_hash)
    .eq("tag", tag);
}

export async function listVault(
  userId: string,
  opts: {
    tag?: VaultTag | "all";
    subject?: string;
    topic?: string;
    source?: "pyq" | "ai_generated" | "verified";
    difficulty?: string;
    search?: string;
    limit?: number;
  } = {},
): Promise<SavedQuestion[]> {
  let q = supabase
    .from("saved_questions")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(opts.limit ?? 100);
  if (opts.tag && opts.tag !== "all") q = q.eq("tag", opts.tag);
  if (opts.subject) q = q.eq("subject", opts.subject);
  if (opts.topic) q = q.eq("topic", opts.topic);
  if (opts.source) q = q.eq("source_type", opts.source);
  if (opts.difficulty) q = q.eq("difficulty", opts.difficulty);
  if (opts.search) q = q.ilike("question", `%${opts.search}%`);
  const { data, error } = await q;
  if (error) {
    console.error("listVault", error);
    return [];
  }
  return (data ?? []) as unknown as SavedQuestion[];
}

export async function moveTag(id: string, tag: VaultTag) {
  const next_review_at =
    tag === "revise_later" ? new Date(Date.now() + 2 * 86_400_000).toISOString() : null;
  return supabase.from("saved_questions").update({ tag, next_review_at }).eq("id", id);
}

export async function updateNote(id: string, note: string) {
  return supabase.from("saved_questions").update({ note }).eq("id", id);
}

export async function vaultCounts(userId: string): Promise<{
  total: number;
  byTag: Record<VaultTag, number>;
  dueForRevision: number;
}> {
  const { data } = await supabase
    .from("saved_questions")
    .select("tag, next_review_at")
    .eq("user_id", userId);
  const rows = (data ?? []) as { tag: VaultTag; next_review_at: string | null }[];
  const byTag: Record<VaultTag, number> = { save: 0, important: 0, revise_later: 0, favorite: 0 };
  let due = 0;
  const now = Date.now();
  rows.forEach((r) => {
    byTag[r.tag] = (byTag[r.tag] ?? 0) + 1;
    if (r.tag === "revise_later" && r.next_review_at && new Date(r.next_review_at).getTime() <= now) due++;
  });
  return { total: rows.length, byTag, dueForRevision: due };
}

export async function reportQuestion(
  userId: string,
  q: CanonicalQuestion,
  reason: ReportReason,
  details?: string,
) {
  const question_hash = await hashQuestion(q);
  return supabase.from("question_reports").insert({
    user_id: userId,
    question_hash,
    question_snapshot: q as unknown as never,
    reason,
    details: details ?? null,
  });
}
