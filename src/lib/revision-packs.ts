// Smart Revision Packs — build resumable practice packs from mistakes, weak topics,
// due saves, or a specific topic. Persists to `revision_packs`.
import { supabase } from "@/integrations/supabase/client";
import type { CanonicalQuestion } from "./question-schema";
import { getTopicConfidence } from "./intelligence";

export type SeedType = "mistakes" | "weak" | "due" | "topic" | "mixed";

export type BuildPackOpts = {
  seed: SeedType;
  count?: number; // default 10
  difficulty?: "easy" | "medium" | "hard" | "mixed";
  subject?: string;
  topic?: string;
  exam?: string;
  language?: string;
};

export type RevisionPack = {
  id: string;
  user_id: string;
  title: string;
  seed_type: SeedType;
  seed_params: Record<string, unknown>;
  question_count: number;
  estimated_minutes: number;
  payload: CanonicalQuestion[];
  score: number | null;
  completed_at: string | null;
  created_at: string;
};

const SEED_LABEL: Record<SeedType, string> = {
  mistakes: "Mistakes drill",
  weak: "Weakest topics",
  due: "Due for revision",
  topic: "Topic focus",
  mixed: "Mixed revision",
};

async function pullSeedQuestions(userId: string, opts: BuildPackOpts): Promise<CanonicalQuestion[]> {
  const cap = opts.count ?? 10;
  if (opts.seed === "mistakes") {
    const { data } = await supabase
      .from("mistake_book")
      .select("question, options, correct_index, explanation, subject, chapter, topic, difficulty")
      .eq("user_id", userId)
      .eq("status", "open")
      .order("times_wrong", { ascending: false })
      .limit(cap);
    return (data ?? []).map((m) => ({
      question: m.question,
      options: m.options as unknown as string[],
      correct_index: m.correct_index ?? 0,
      explanation: m.explanation ?? undefined,
      subject: m.subject ?? undefined,
      chapter: m.chapter ?? undefined,
      topic: m.topic ?? undefined,
      difficulty: m.difficulty ?? undefined,
      source_type: "ai_generated",
    }));
  }
  if (opts.seed === "due") {
    const nowIso = new Date().toISOString();
    const { data } = await supabase
      .from("saved_questions")
      .select("*")
      .eq("user_id", userId)
      .eq("tag", "revise_later")
      .lte("next_review_at", nowIso)
      .limit(cap);
    return (data ?? []).map((r) => ({
      question: r.question,
      options: r.options as unknown as string[],
      correct_index: r.correct_index,
      explanation: r.explanation ?? undefined,
      subject: r.subject ?? undefined,
      chapter: r.chapter ?? undefined,
      topic: r.topic ?? undefined,
      difficulty: r.difficulty ?? undefined,
      source_type: (r.source_type as CanonicalQuestion["source_type"]) ?? "ai_generated",
      is_pyq: !!r.is_pyq,
      pyq_year: r.pyq_year ?? null,
    }));
  }
  return [];
}

async function fillWithAi(
  need: number,
  opts: BuildPackOpts,
  subjectHint?: string,
  topicHint?: string,
): Promise<CanonicalQuestion[]> {
  if (need <= 0) return [];
  const { data, error } = await supabase.functions.invoke("generate-test", {
    body: {
      subject: subjectHint ?? opts.subject ?? "General",
      exam: opts.exam ?? "",
      difficulty: opts.difficulty && opts.difficulty !== "mixed" ? opts.difficulty : "medium",
      numQuestions: need,
      language: opts.language ?? "en",
      topic: topicHint ?? opts.topic ?? "",
      sourceMode: "all",
    },
  });
  if (error) {
    console.error("fillWithAi", error);
    return [];
  }
  const qs = (data as { questions?: CanonicalQuestion[] })?.questions ?? [];
  return qs.map((q) => ({ ...q, source_type: q.source_type ?? "ai_generated" }));
}

export async function buildRevisionPack(
  userId: string,
  opts: BuildPackOpts,
): Promise<RevisionPack | null> {
  const target = Math.max(5, Math.min(30, opts.count ?? 10));

  // Pull seed candidates
  let questions = await pullSeedQuestions(userId, opts);

  // For weak / topic / mixed seeds, always generate via AI from weakest topics
  if (opts.seed === "weak" || opts.seed === "mixed" || (questions.length < target && opts.seed !== "topic")) {
    const conf = await getTopicConfidence(userId);
    const weakest = conf[0];
    const subj = opts.subject ?? weakest?.subject ?? "General";
    const topic = opts.topic ?? weakest?.topic ?? "";
    const need = target - questions.length;
    const filler = await fillWithAi(need, opts, subj, topic);
    questions = [...questions, ...filler];
  }
  if (opts.seed === "topic") {
    const need = target - questions.length;
    const filler = await fillWithAi(need, opts, opts.subject, opts.topic);
    questions = [...questions, ...filler];
  }

  questions = questions.slice(0, target);
  if (!questions.length) return null;

  const estimated_minutes = Math.max(
    5,
    Math.round(
      questions.reduce((s, q) => s + (q.estimated_time_seconds ?? 60), 0) / 60,
    ),
  );

  const title =
    opts.seed === "topic" && opts.topic
      ? `${opts.topic} · ${questions.length} Qs`
      : `${SEED_LABEL[opts.seed]} · ${questions.length} Qs`;

  const { data, error } = await supabase
    .from("revision_packs")
    .insert({
      user_id: userId,
      title,
      seed_type: opts.seed,
      seed_params: opts as unknown as never,
      question_count: questions.length,
      estimated_minutes,
      payload: questions as unknown as never,
    })
    .select()
    .maybeSingle();
  if (error) {
    console.error("insert revision_pack", error);
    return null;
  }
  return data as unknown as RevisionPack;
}

export async function listRevisionPacks(userId: string): Promise<RevisionPack[]> {
  const { data } = await supabase
    .from("revision_packs")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(30);
  return (data ?? []) as unknown as RevisionPack[];
}

export async function getRevisionPack(id: string): Promise<RevisionPack | null> {
  const { data } = await supabase
    .from("revision_packs")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  return (data as unknown as RevisionPack) ?? null;
}

export async function markPackCompleted(id: string, score: number) {
  return supabase
    .from("revision_packs")
    .update({ score, completed_at: new Date().toISOString() })
    .eq("id", id);
}
