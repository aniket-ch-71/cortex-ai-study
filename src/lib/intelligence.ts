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
  weightage?: string;
  exam_frequency?: string;
  concept_importance?: string;
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
      weightage: q.weightage ?? null,
      exam_frequency: q.exam_frequency ?? null,
      concept_importance: q.concept_importance ?? null,
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

// ---------- Revision Engine (SM-2 lite) ----------
// retention_score decays ~5 pts per day since last_studied_at; revising resets it.
export type RevisionItem = {
  id: string;
  subject: string;
  chapter: string | null;
  topic: string;
  accuracy: number;
  strength: string;
  retention: number;
  lastStudiedAt: string | null;
  lastRevisedAt: string | null;
  dueScore: number; // higher = more urgent
};

export async function getTodaysRevisions(userId: string, limit = 6): Promise<RevisionItem[]> {
  const { data } = await supabase
    .from("topic_mastery")
    .select("id, subject, chapter, topic, accuracy, strength, retention_score, last_studied_at, last_revised_at")
    .eq("user_id", userId);

  const now = Date.now();
  const items: RevisionItem[] = (data ?? []).map((r) => {
    const lastRef = r.last_revised_at ?? r.last_studied_at;
    const daysSince = lastRef ? (now - new Date(lastRef).getTime()) / 86_400_000 : 30;
    const baseRet = Math.max(0, Math.min(100, Number(r.retention_score ?? 100) - Math.floor(daysSince * 5)));
    // Weak topics + old retention are most due
    const weakness = 100 - Number(r.accuracy ?? 0);
    const dueScore = Math.round(weakness * 0.5 + (100 - baseRet) * 0.5);
    return {
      id: r.id,
      subject: r.subject,
      chapter: r.chapter,
      topic: r.topic,
      accuracy: Math.round(Number(r.accuracy ?? 0)),
      strength: r.strength ?? "medium",
      retention: baseRet,
      lastStudiedAt: r.last_studied_at,
      lastRevisedAt: r.last_revised_at,
      dueScore,
    };
  });

  return items.sort((a, b) => b.dueScore - a.dueScore).slice(0, limit);
}

export async function markRevised(masteryId: string) {
  await supabase
    .from("topic_mastery")
    .update({ last_revised_at: new Date().toISOString(), retention_score: 100 })
    .eq("id", masteryId);
}

// ---------- Heatmap ----------
export type HeatCell = { date: string; count: number; minutes: number };

export async function getActivityHeatmap(userId: string, weeks = 12): Promise<HeatCell[]> {
  const days = weeks * 7;
  const since = new Date(Date.now() - days * 86_400_000);
  since.setHours(0, 0, 0, 0);
  const { data } = await supabase
    .from("study_sessions")
    .select("created_at, duration_seconds, questions_count")
    .eq("user_id", userId)
    .gte("created_at", since.toISOString());

  const map = new Map<string, HeatCell>();
  for (let i = 0; i < days; i++) {
    const d = new Date(since.getTime() + i * 86_400_000);
    const key = d.toISOString().slice(0, 10);
    map.set(key, { date: key, count: 0, minutes: 0 });
  }
  (data ?? []).forEach((r) => {
    const key = r.created_at.slice(0, 10);
    const cell = map.get(key);
    if (!cell) return;
    cell.count += r.questions_count ?? 0;
    cell.minutes += Math.round((r.duration_seconds ?? 0) / 60);
  });
  return [...map.values()];
}

// ---------- Daily Challenge ----------
export type DailyChallenge = {
  id: string;
  target_count: number;
  completed_count: number;
  kind: string;
  challenge_date: string;
};

export async function getOrCreateDailyChallenge(userId: string): Promise<DailyChallenge | null> {
  const today = new Date().toISOString().slice(0, 10);
  const { data: existing } = await supabase
    .from("daily_challenges")
    .select("*")
    .eq("user_id", userId)
    .eq("challenge_date", today)
    .maybeSingle();
  if (existing) return existing as DailyChallenge;

  const { data: created } = await supabase
    .from("daily_challenges")
    .insert({ user_id: userId, challenge_date: today, kind: "questions", target_count: 10 })
    .select()
    .maybeSingle();
  return (created as DailyChallenge) ?? null;
}

export async function bumpDailyChallenge(userId: string, increment: number) {
  const today = new Date().toISOString().slice(0, 10);
  const ch = await getOrCreateDailyChallenge(userId);
  if (!ch) return null;
  const next = Math.min(ch.target_count, ch.completed_count + increment);
  await supabase
    .from("daily_challenges")
    .update({ completed_count: next })
    .eq("user_id", userId)
    .eq("challenge_date", today);
  return { ...ch, completed_count: next };
}

// ---------- Rank Predictor ----------
// Uses readiness + mock avg to map to percentile bands per exam category.
export type RankPrediction = {
  exam: string;
  percentile: number; // 0..100
  band: string; // e.g. "Top 5%"
  estimatedRankRange: string; // e.g. "1,200 – 3,500"
  confidence: "low" | "medium" | "high";
  insight: string;
};

// Seeded approx. candidate pools per exam (typical recent cycles)
const EXAM_POOLS: Record<string, number> = {
  JEE: 1_200_000,
  NEET: 2_000_000,
  UPSC: 1_000_000,
  SSC: 3_000_000,
  Bank: 2_500_000,
  Railway: 12_000_000,
  GATE: 800_000,
  CAT: 300_000,
  "NDA/CDS": 500_000,
  Board: 1_500_000,
};

function poolFor(exam: string): number {
  const k = Object.keys(EXAM_POOLS).find((e) => exam.toUpperCase().includes(e.toUpperCase()));
  return k ? EXAM_POOLS[k] : 500_000;
}

export async function predictRank(userId: string, targetExam: string): Promise<RankPrediction> {
  const readiness = await computeReadiness(userId);
  const { data: mocks } = await supabase
    .from("mock_attempts")
    .select("score, total")
    .eq("user_id", userId)
    .order("completed_at", { ascending: false })
    .limit(10);
  const m = mocks ?? [];
  const mockPct = m.length
    ? m.reduce((s, r) => s + (r.total ? (r.score / r.total) * 100 : 0), 0) / m.length
    : 0;

  // Blend: readiness 60% + mock 40%
  const composite = Math.round(readiness.overall * 0.6 + mockPct * 0.4);
  // Map composite (0..100) to percentile via a soft curve.
  // 50 → 50th, 70 → 85th, 80 → 95th, 90 → 99th
  const percentile = Math.min(
    99.5,
    Math.max(1, Math.round(100 - Math.pow(1 - composite / 100, 1.8) * 100)),
  );

  const pool = poolFor(targetExam || "");
  const topFraction = (100 - percentile) / 100;
  const rankCenter = Math.max(1, Math.round(pool * topFraction));
  const lo = Math.max(1, Math.round(rankCenter * 0.7));
  const hi = Math.round(rankCenter * 1.3);

  const band =
    percentile >= 99
      ? "Top 1%"
      : percentile >= 95
        ? "Top 5%"
        : percentile >= 90
          ? "Top 10%"
          : percentile >= 75
            ? "Top 25%"
            : percentile >= 50
              ? "Top 50%"
              : "Below median";

  const confidence: RankPrediction["confidence"] =
    m.length >= 5 ? "high" : m.length >= 2 ? "medium" : "low";

  const insight =
    composite >= 80
      ? "Exam-ready. Maintain mock frequency and refine weak chapters."
      : composite >= 60
        ? "On track. Push accuracy on weak topics to climb percentile."
        : composite >= 40
          ? "Building up. Daily revision + targeted practice will move you fast."
          : "Foundations first — focus on coverage and consistency.";

  return {
    exam: targetExam || "your exam",
    percentile,
    band,
    estimatedRankRange: `${lo.toLocaleString()} – ${hi.toLocaleString()}`,
    confidence,
    insight,
  };
}

// ---------- Adaptive Recommendation Engine ----------
export type RecommendedTopic = {
  subject: string;
  topic: string;
  chapter: string | null;
  reason: "weak" | "due-revision" | "never-attempted" | "high-weightage";
  accuracy: number;
  priority: number; // higher = recommend sooner
};

export async function recommendTopics(
  userId: string,
  limit = 6,
): Promise<RecommendedTopic[]> {
  const { data: mastery } = await supabase
    .from("topic_mastery")
    .select("subject, chapter, topic, accuracy, strength, last_revised_at, last_studied_at, retention_score")
    .eq("user_id", userId);

  const m = mastery ?? [];
  const now = Date.now();
  const items: RecommendedTopic[] = m.map((r) => {
    const acc = Number(r.accuracy ?? 0);
    const lastRef = r.last_revised_at ?? r.last_studied_at;
    const daysSince = lastRef ? (now - new Date(lastRef).getTime()) / 86_400_000 : 30;
    const retention = Math.max(0, Number(r.retention_score ?? 100) - Math.floor(daysSince * 5));
    const isDue = retention < 60;
    const isWeak = (r.strength ?? "medium") === "weak" || acc < 50;
    const reason: RecommendedTopic["reason"] = isWeak
      ? "weak"
      : isDue
        ? "due-revision"
        : "high-weightage";
    // Priority: weakness + decay
    const priority = Math.round((100 - acc) * 0.6 + (100 - retention) * 0.4);
    return {
      subject: r.subject,
      topic: r.topic,
      chapter: r.chapter ?? null,
      reason,
      accuracy: Math.round(acc),
      priority,
    };
  });

  return items.sort((a, b) => b.priority - a.priority).slice(0, limit);
}


