// Student Intelligence helpers — capture attempts, mistakes, mastery, sessions
// and compute the readiness score on the client.
import { supabase } from "@/integrations/supabase/client";

export type AttemptQuestion = {
  question: string;
  options: string[];
  correct_index: number;
  explanation?: string;
  section?: string;
  marks?: number;
  // Optional metadata (may be missing on older tests)
  subject?: string;
  chapter?: string;
  topic?: string;
  concept?: string;
  difficulty?: string;
  estimated_time_seconds?: number;
};

export type RecordAttemptInput = {
  userId: string;
  attemptId: string;
  testId: string;
  defaultSubject: string;
  questions: AttemptQuestion[];
  answers: Record<string, number>;
  marked: Record<string, boolean>;
  totalTimeSeconds: number;
};

/**
 * Persist question_attempts, upsert mistake_book + topic_mastery,
 * and log a study_sessions row. Best-effort: errors are logged, not thrown,
 * so failures don't block the user seeing their results.
 */
export async function recordAttemptIntelligence(input: RecordAttemptInput) {
  const {
    userId,
    attemptId,
    testId,
    defaultSubject,
    questions,
    answers,
    marked,
    totalTimeSeconds,
  } = input;
  if (!questions.length) return;

  const perQuestionSec = Math.max(
    5,
    Math.floor(totalTimeSeconds / Math.max(1, questions.length)),
  );

  const attemptRows = questions.map((q, i) => {
    const key = String(i);
    const selected = answers[key] ?? answers[i as unknown as string];
    const isSkipped = selected === undefined || selected === null;
    const isCorrect = !isSkipped && selected === q.correct_index;
    return {
      user_id: userId,
      attempt_id: attemptId,
      test_id: testId,
      question_id: `${testId}:${i}`,
      subject: q.subject ?? defaultSubject ?? null,
      chapter: q.chapter ?? null,
      topic: q.topic ?? q.section ?? null,
      concept: q.concept ?? null,
      difficulty: q.difficulty ?? null,
      is_correct: isCorrect,
      is_skipped: isSkipped,
      time_taken_seconds: perQuestionSec,
      estimated_time_seconds: q.estimated_time_seconds ?? null,
      marked_review: !!marked[key] || !!marked[i as unknown as string],
      selected_index: isSkipped ? null : (selected as number),
      correct_index: q.correct_index,
    };
  });

  // Insert all attempts (batched)
  const { error: attErr } = await supabase
    .from("question_attempts")
    .insert(attemptRows);
  if (attErr) console.error("question_attempts insert", attErr);

  // Mistake book — wrong or skipped
  const mistakes = questions
    .map((q, i) => ({ q, i, sel: answers[String(i)] }))
    .filter(({ q, sel }) => sel === undefined || sel !== q.correct_index);

  for (const { q, i } of mistakes) {
    const question_id = `${testId}:${i}`;
    // Try update first
    const { data: existing } = await supabase
      .from("mistake_book")
      .select("id, times_wrong, times_attempted")
      .eq("user_id", userId)
      .eq("question_id", question_id)
      .maybeSingle();

    if (existing) {
      await supabase
        .from("mistake_book")
        .update({
          times_wrong: (existing.times_wrong ?? 0) + 1,
          times_attempted: (existing.times_attempted ?? 0) + 1,
          last_wrong_at: new Date().toISOString(),
          status: "open",
        })
        .eq("id", existing.id);
    } else {
      await supabase.from("mistake_book").insert({
        user_id: userId,
        question_id,
        question: q.question,
        options: q.options as unknown as never,
        correct_index: q.correct_index,
        explanation: q.explanation ?? "",
        subject: q.subject ?? defaultSubject ?? null,
        chapter: q.chapter ?? null,
        topic: q.topic ?? q.section ?? null,
        concept: q.concept ?? null,
        difficulty: q.difficulty ?? null,
      });
    }
  }

  // Topic mastery — aggregate per (subject, topic)
  const grouped = new Map<
    string,
    { subject: string; topic: string; chapter: string | null; attempts: number; correct: number; time: number }
  >();
  attemptRows.forEach((r) => {
    if (!r.subject || !r.topic) return;
    const key = `${r.subject}|||${r.topic}`;
    const g = grouped.get(key) ?? {
      subject: r.subject,
      topic: r.topic,
      chapter: r.chapter ?? null,
      attempts: 0,
      correct: 0,
      time: 0,
    };
    g.attempts += 1;
    if (r.is_correct) g.correct += 1;
    g.time += r.time_taken_seconds;
    grouped.set(key, g);
  });

  for (const g of grouped.values()) {
    const { data: existing } = await supabase
      .from("topic_mastery")
      .select("id, attempts, correct, avg_time_seconds")
      .eq("user_id", userId)
      .eq("subject", g.subject)
      .eq("topic", g.topic)
      .maybeSingle();

    if (existing) {
      const totalAttempts = (existing.attempts ?? 0) + g.attempts;
      const totalCorrect = (existing.correct ?? 0) + g.correct;
      const newAvgTime =
        ((existing.avg_time_seconds ?? 0) * (existing.attempts ?? 0) + g.time) /
        Math.max(1, totalAttempts);
      const accuracy = totalAttempts ? (totalCorrect / totalAttempts) * 100 : 0;
      const strength = accuracy >= 75 ? "strong" : accuracy >= 50 ? "medium" : "weak";
      await supabase
        .from("topic_mastery")
        .update({
          attempts: totalAttempts,
          correct: totalCorrect,
          accuracy,
          avg_time_seconds: newAvgTime,
          last_studied_at: new Date().toISOString(),
          strength,
        })
        .eq("id", existing.id);
    } else {
      const accuracy = g.attempts ? (g.correct / g.attempts) * 100 : 0;
      const strength = accuracy >= 75 ? "strong" : accuracy >= 50 ? "medium" : "weak";
      await supabase.from("topic_mastery").insert({
        user_id: userId,
        subject: g.subject,
        chapter: g.chapter,
        topic: g.topic,
        attempts: g.attempts,
        correct: g.correct,
        accuracy,
        avg_time_seconds: g.attempts ? g.time / g.attempts : 0,
        last_studied_at: new Date().toISOString(),
        strength,
      });
    }
  }

  // Study session log
  await supabase.from("study_sessions").insert({
    user_id: userId,
    kind: "mock_test",
    duration_seconds: totalTimeSeconds,
    questions_count: questions.length,
    meta: { test_id: testId, attempt_id: attemptId },
  });
}

// ---------- Readiness Score ----------
export type ReadinessResult = {
  overall: number;
  subjects: { name: string; score: number }[];
  drivers: {
    accuracy: number;
    coverage: number;
    consistency: number;
    mockPerf: number;
    revision: number;
  };
};

export async function computeReadiness(userId: string): Promise<ReadinessResult> {
  const since = new Date(Date.now() - 30 * 86_400_000).toISOString();

  const [{ data: attempts }, { data: mocks }, { data: mastery }, { data: sessions }] =
    await Promise.all([
      supabase
        .from("question_attempts")
        .select("subject, is_correct, is_skipped, created_at")
        .eq("user_id", userId)
        .gte("created_at", since),
      supabase
        .from("mock_attempts")
        .select("score, total, completed_at")
        .eq("user_id", userId)
        .order("completed_at", { ascending: false })
        .limit(5),
      supabase
        .from("topic_mastery")
        .select("subject, accuracy, strength, last_revised_at, last_studied_at")
        .eq("user_id", userId),
      supabase
        .from("study_sessions")
        .select("created_at")
        .eq("user_id", userId)
        .gte("created_at", since),
    ]);

  const a = attempts ?? [];
  const answered = a.filter((r) => !r.is_skipped);
  const accuracy = answered.length
    ? (answered.filter((r) => r.is_correct).length / answered.length) * 100
    : 0;

  const m = mastery ?? [];
  const coverage = m.length ? Math.min(100, m.length * 5) : 0; // ~20 topics → 100%

  const s = sessions ?? [];
  const activeDays = new Set(s.map((r) => r.created_at.slice(0, 10))).size;
  const consistency = Math.min(100, (activeDays / 14) * 100);

  const mk = mocks ?? [];
  const mockPerf = mk.length
    ? (mk.reduce((sum, r) => sum + (r.total ? (r.score / r.total) * 100 : 0), 0) /
        mk.length)
    : 0;

  const weak = m.filter((r) => r.strength === "weak");
  const revisedRecently = weak.filter(
    (r) =>
      r.last_revised_at &&
      Date.now() - new Date(r.last_revised_at).getTime() < 7 * 86_400_000,
  ).length;
  const revision = weak.length ? (revisedRecently / weak.length) * 100 : 75;

  const overall = Math.round(
    accuracy * 0.3 + coverage * 0.2 + consistency * 0.15 + mockPerf * 0.25 + revision * 0.1,
  );

  // Per-subject scores from mastery accuracy
  const bySubj = new Map<string, { sum: number; n: number }>();
  m.forEach((r) => {
    if (!r.subject) return;
    const g = bySubj.get(r.subject) ?? { sum: 0, n: 0 };
    g.sum += Number(r.accuracy ?? 0);
    g.n += 1;
    bySubj.set(r.subject, g);
  });
  const subjects = [...bySubj.entries()]
    .map(([name, v]) => ({ name, score: Math.round(v.sum / Math.max(1, v.n)) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 6);

  return {
    overall,
    subjects,
    drivers: {
      accuracy: Math.round(accuracy),
      coverage: Math.round(coverage),
      consistency: Math.round(consistency),
      mockPerf: Math.round(mockPerf),
      revision: Math.round(revision),
    },
  };
}
