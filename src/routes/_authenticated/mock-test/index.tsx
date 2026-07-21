import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Brain, Loader2, Plus, Trash2, Trophy, ArrowRight, Info, Sparkles, Library, Zap } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { LANGUAGES } from "@/lib/cortex-data";
import {
  EXAM_CATEGORIES,
  SUB_EXAMS,
  SUB_EXAM_SUBJECTS,
  QUESTION_COUNT_OPTIONS,
  getPattern,
  isAllSections,
  type ExamCategory,
} from "@/lib/exam-patterns";
import { useProfile } from "@/hooks/useProfile";
import { GenerationOverlay } from "@/components/mock-test/GenerationOverlay";
import { GenerationSuccess, type GenerationSummary } from "@/components/mock-test/GenerationSuccess";

const AI_TEST_DAILY_LIMIT = 3;
const CHUNK_SIZE = 25; // edge function hard cap per call
const MAX_PARALLEL = 3; // gateway-friendly concurrency

// Estimated per-chunk latency (seconds) by quality tier.
const QUALITY_ETA: Record<string, number> = { standard: 6, premium: 10, advanced: 18 };

type Quality = "standard" | "premium" | "advanced";


export const Route = createFileRoute("/_authenticated/mock-test/")({
  head: () => ({ meta: [{ title: "Mock Tests — PARIKSHA" }] }),
  component: MockTestIndex,
});

type TestRow = {
  id: string;
  title: string;
  subject: string;
  exam: string | null;
  difficulty: string;
  num_questions: number;
  created_at: string;
};

type AttemptRow = {
  id: string;
  test_id: string;
  score: number;
  total: number;
  completed_at: string;
};

function MockTestIndex() {
  const navigate = useNavigate();
  const [tests, setTests] = useState<TestRow[]>([]);
  const [attempts, setAttempts] = useState<Record<string, AttemptRow>>({});
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  // form state — cascading. Pre-seeded from user's primary exam if available.
  const { primaryExam } = useProfile();
  const [category, setCategory] = useState<ExamCategory>("SSC");
  const [subExam, setSubExam] = useState<string>(SUB_EXAMS["SSC"][0]);
  const subjectsForExam = useMemo(
    () => SUB_EXAM_SUBJECTS[subExam] ?? ["All"],
    [subExam],
  );
  const [subject, setSubject] = useState<string>(subjectsForExam[0]);
  const [difficulty, setDifficulty] = useState("mixed");
  const [quality, setQuality] = useState<Quality>("premium");
  const [language, setLanguage] = useState("en");
  const [topic, setTopic] = useState("");
  const [numQuestions, setNumQuestions] = useState<number>(20);
  const [sourceMode, setSourceMode] = useState<"all" | "pyq" | "pyq_similar" | "high_weightage">("all");
  const [primarySeeded, setPrimarySeeded] = useState(false);
  const [aiUsed, setAiUsed] = useState(0);
  const aiRemaining = Math.max(0, AI_TEST_DAILY_LIMIT - aiUsed);

  // Generation progress state
  const [genProgress, setGenProgress] = useState(0);
  const [genEta, setGenEta] = useState(0);
  const [genDetail, setGenDetail] = useState<string>("");
  const [successSummary, setSuccessSummary] = useState<GenerationSummary | null>(null);
  const [pendingTestId, setPendingTestId] = useState<string | null>(null);
  const genStartRef = useRef<number>(0);


  // Seed once from profile primary exam
  useEffect(() => {
    if (!primarySeeded && primaryExam) {
      for (const c of Object.keys(SUB_EXAMS) as ExamCategory[]) {
        if (SUB_EXAMS[c].includes(primaryExam)) {
          setCategory(c);
          setSubExam(primaryExam);
          break;
        }
      }
      setPrimarySeeded(true);
    }
  }, [primaryExam, primarySeeded]);

  const pattern = useMemo(() => getPattern(subExam), [subExam]);
  const allSections = isAllSections(subject);

  // When category changes, reset sub-exam and subject
  useEffect(() => {
    const firstSub = SUB_EXAMS[category][0];
    setSubExam(firstSub);
  }, [category]);

  // When sub-exam changes, reset subject to first option
  useEffect(() => {
    const subs = SUB_EXAM_SUBJECTS[subExam] ?? ["All"];
    setSubject(subs[0]);
  }, [subExam]);

  // When "All Sections" picked, lock to real total
  useEffect(() => {
    if (allSections) setNumQuestions(pattern.totalQuestions);
  }, [allSections, pattern.totalQuestions]);

  const load = async () => {
    const { data: u } = await supabase.auth.getUser();
    const today = new Date().toISOString().slice(0, 10);
    const [{ data: t }, { data: a }, { data: usage }] = await Promise.all([
      supabase
        .from("mock_tests")
        .select("id, title, subject, exam, difficulty, num_questions, created_at")
        .order("created_at", { ascending: false })
        .limit(20),
      supabase
        .from("mock_attempts")
        .select("id, test_id, score, total, completed_at")
        .order("completed_at", { ascending: false }),
      u.user
        ? supabase
            .from("daily_usage")
            .select("ai_tests_used")
            .eq("user_id", u.user.id)
            .eq("usage_date", today)
            .maybeSingle()
        : Promise.resolve({ data: null }),
    ]);
    setTests((t as TestRow[]) ?? []);
    const map: Record<string, AttemptRow> = {};
    for (const at of (a as AttemptRow[]) ?? []) {
      if (!map[at.test_id]) map[at.test_id] = at;
    }
    setAttempts(map);
    setAiUsed((usage as { ai_tests_used?: number } | null)?.ai_tests_used ?? 0);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  // Auto-start from coach deep-links: /mock-test?subject=&topic=&count=&mode=&autostart=1
  const [autoStarted, setAutoStarted] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || autoStarted || loading) return;
    const sp = new URLSearchParams(window.location.search);
    const qTopic = sp.get("topic");
    const qSubject = sp.get("subject");
    const qCount = sp.get("count");
    const qDifficulty = sp.get("difficulty");
    const qMode = sp.get("mode");
    const qAuto = sp.get("autostart");
    if (qTopic) setTopic(qTopic);
    if (qSubject && subjectsForExam.includes(qSubject)) setSubject(qSubject);
    if (qCount) {
      const n = Math.max(5, Math.min(50, Number(qCount) || 10));
      setNumQuestions(n);
    }
    if (qDifficulty && ["easy", "medium", "hard"].includes(qDifficulty)) setDifficulty(qDifficulty);
    if (qAuto === "1" || qMode === "smart" || qMode === "revision" || qMode === "drill") {
      setAutoStarted(true);
      // Defer one tick so state updates settle
      setTimeout(() => { void onGenerate(); }, 50);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, subjectsForExam, autoStarted]);

  // Build the chunk plan: split each section into ≤CHUNK_SIZE calls.
  type ChunkTask = { section: string; marks: number; count: number; index: number };
  const planChunks = (): ChunkTask[] => {
    const sections = allSections
      ? pattern.sections
      : [
          {
            name: subject,
            questions: numQuestions,
            marks:
              pattern.sections.find((s) => s.name === subject)?.marks ??
              pattern.sections[0]?.marks ??
              1,
          },
        ];
    const chunks: ChunkTask[] = [];
    let idx = 0;
    for (const sec of sections) {
      let remaining = sec.questions;
      while (remaining > 0) {
        const c = Math.min(CHUNK_SIZE, remaining);
        chunks.push({ section: sec.name, marks: sec.marks, count: c, index: idx++ });
        remaining -= c;
      }
    }
    return chunks;
  };

  const runWithConcurrency = async <T,>(
    tasks: Array<() => Promise<T>>,
    limit: number,
    onEach: () => void,
  ): Promise<T[]> => {
    const results: T[] = new Array(tasks.length);
    let cursor = 0;
    const workers = Array.from({ length: Math.min(limit, tasks.length) }, async () => {
      while (true) {
        const i = cursor++;
        if (i >= tasks.length) return;
        results[i] = await tasks[i]();
        onEach();
      }
    });
    await Promise.all(workers);
    return results;
  };

  const onGenerate = async () => {
    if (aiRemaining <= 0) {
      toast.error("Daily limit reached. Try the Practice Bank, or come back tomorrow.");
      return;
    }
    setGenerating(true);
    setGenProgress(0);
    setGenDetail("");
    genStartRef.current = Date.now();
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) {
        toast.error("Please sign in");
        return;
      }

      const chunks = planChunks();
      const perChunkEta = QUALITY_ETA[quality] ?? 10;
      const totalEta = Math.ceil((chunks.length / Math.min(MAX_PARALLEL, chunks.length || 1)) * perChunkEta);
      setGenEta(totalEta);
      setGenDetail(
        chunks.length > 1
          ? `Generating ${chunks.length} batches in parallel · ${quality} quality`
          : `Generating ${chunks[0]?.count ?? 0} questions · ${quality} quality`,
      );

      let completed = 0;
      const bumpProgress = () => {
        completed += 1;
        const pct = Math.min(95, Math.round((completed / chunks.length) * 92));
        setGenProgress(pct);
        const elapsed = (Date.now() - genStartRef.current) / 1000;
        const remainingRatio = 1 - completed / chunks.length;
        setGenEta(Math.max(2, Math.round((elapsed / Math.max(1, completed)) * chunks.length * remainingRatio)));
      };

      // Kick a soft progress tick so the ring animates while waiting for first response.
      const softTick = setInterval(() => {
        setGenProgress((p) => (p < 88 ? Math.min(88, p + 1) : p));
      }, Math.max(400, (perChunkEta * 1000) / 30));

      const tasks = chunks.map((ch) => async () => {
        const { data: payload, error: fnErr } = await supabase.functions.invoke(
          "generate-test",
          {
            body: {
              subject: ch.section,
              exam: subExam,
              difficulty,
              numQuestions: ch.count,
              language,
              topic,
              marksPerQuestion: ch.marks,
              negativeMarking: pattern.negativeMarking,
              sourceMode,
              quality,
              chunkIndex: ch.index, // only chunk 0 charges quota
            },
          },
        );
        if (fnErr) throw new Error(fnErr.message || "Failed to generate test");
        return { chunk: ch, payload };
      });

      let results: Array<{ chunk: ChunkTask; payload: { title?: string; questions: unknown[] } }>;
      try {
        results = await runWithConcurrency(tasks, MAX_PARALLEL, bumpProgress);
      } finally {
        clearInterval(softTick);
      }

      // Assemble, de-duplicate by question text.
      const seen = new Set<string>();
      const allQuestions: Array<Record<string, unknown>> = [];
      let title = "";
      for (const { chunk, payload } of results) {
        if (!title) title = payload.title || `${subExam} Mock Test`;
        for (const q of payload.questions as Array<Record<string, unknown>>) {
          const key = String((q.question ?? "")).trim().toLowerCase().slice(0, 160);
          if (!key || seen.has(key)) continue;
          seen.add(key);
          allQuestions.push({ ...q, section: chunk.section, marks: chunk.marks });
        }
      }

      if (allQuestions.length === 0) {
        throw new Error("Generation returned no valid questions. Please retry.");
      }

      setGenProgress(97);
      setGenDetail("Saving your test…");

      const sectionsUsed = allSections
        ? pattern.sections
        : [{ name: subject, questions: numQuestions, marks: pattern.sections.find((s) => s.name === subject)?.marks ?? 1 }];

      const { data: inserted, error } = await supabase
        .from("mock_tests")
        .insert({
          user_id: u.user.id,
          title,
          subject,
          exam: subExam,
          difficulty,
          language,
          num_questions: allQuestions.length,
          questions: allQuestions as never,
          pattern: {
            subExam,
            category,
            timeMinutes: pattern.timeMinutes,
            negativeMarking: pattern.negativeMarking,
            sections: sectionsUsed,
            cutoffPct: pattern.cutoffPct,
            allSections,
          },
        })
        .select("id")
        .single();
      if (error) throw error;

      setGenProgress(100);
      setAiUsed((n) => n + 1);

      // Build difficulty-mix summary from returned metadata.
      const mix = { easy: 0, medium: 0, hard: 0 };
      for (const q of allQuestions) {
        const d = String((q as { difficulty?: string }).difficulty ?? difficulty).toLowerCase();
        if (d in mix) mix[d as keyof typeof mix] += 1;
      }
      const total = allQuestions.length;
      const mixStr =
        difficulty === "mixed"
          ? `${Math.round((mix.easy / total) * 100)}% easy · ${Math.round((mix.medium / total) * 100)}% medium · ${Math.round((mix.hard / total) * 100)}% hard`
          : difficulty.charAt(0).toUpperCase() + difficulty.slice(1);

      setPendingTestId(inserted.id);
      setSuccessSummary({
        exam: subExam,
        subject: allSections ? "All sections" : subject,
        topics: topic || undefined,
        count: total,
        difficultyMix: mixStr,
        estimatedMinutes: Math.max(
          5,
          Math.round(allSections ? pattern.timeMinutes : (total * 60) / 60),
        ),
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to generate test");
    } finally {
      setGenerating(false);
    }
  };


  const onDelete = async (id: string) => {
    if (!confirm("Delete this test and its attempts?")) return;
    const { error } = await supabase.from("mock_tests").delete().eq("id", id);
    if (error) return toast.error(error.message);
    setTests((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:px-8">
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-lg bg-primary/15 text-primary">
          <Brain className="h-5 w-5" />
        </span>
        <div>
          <h1 className="font-display text-2xl font-bold md:text-3xl">AI Mock Tests</h1>
          <p className="text-sm text-muted-foreground">
            Real exam patterns. Real timer. Real negative marking.
          </p>
        </div>
      </div>

      <Tabs defaultValue="ai" className="mt-8">
        <TabsList>
          <TabsTrigger value="ai">
            <Sparkles className="mr-1.5 h-3.5 w-3.5" /> AI Generate
          </TabsTrigger>
          <TabsTrigger value="practice">
            <Library className="mr-1.5 h-3.5 w-3.5" /> Pre-installed Practice
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ai" className="mt-6">
          {/* Smart Practice — one-tap drill from weakest concepts */}
          <a
            href="/mock-test?mode=smart&count=10&autostart=1"
            className="mb-5 flex items-center justify-between gap-3 rounded-xl border border-primary/40 bg-gradient-to-r from-primary/15 via-primary/5 to-card p-4 transition hover:border-primary/70"
          >
            <div>
              <p className="font-display text-sm font-semibold">⚡ Practice What Matters Most</p>
              <p className="text-xs text-muted-foreground">
                10 questions from your weakest topics, frequent mistakes, and high-weightage chapters.
              </p>
            </div>
            <span className="shrink-0 rounded-md bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground">
              Smart Practice →
            </span>
          </a>

          {/* AI Generator */}
          <section className="rounded-xl border border-border bg-card p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-display text-lg font-semibold">Create a new test</h2>
              <span
                className={`rounded-full border px-2.5 py-1 text-xs ${
                  aiRemaining > 0
                    ? "border-border text-muted-foreground"
                    : "border-coral/40 text-coral"
                }`}
              >
                {aiRemaining}/{AI_TEST_DAILY_LIMIT} AI tests left today
              </span>
            </div>
        <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Field label="Step 1 · Exam category">
            <Select value={category} onValueChange={(v) => setCategory(v as ExamCategory)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {EXAM_CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Step 2 · Sub-exam">
            <Select value={subExam} onValueChange={setSubExam}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {SUB_EXAMS[category].map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Step 3 · Subject / Section">
            <Select value={subject} onValueChange={setSubject}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {subjectsForExam.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Step 4 · Number of questions">
            <Select
              value={String(numQuestions)}
              onValueChange={(v) => setNumQuestions(Number(v))}
              disabled={allSections}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {allSections ? (
                  <SelectItem value={String(pattern.totalQuestions)}>
                    {pattern.totalQuestions} (full exam)
                  </SelectItem>
                ) : (
                  <>
                    {QUESTION_COUNT_OPTIONS.map((n) => (
                      <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                    ))}
                    <SelectItem value={String(pattern.totalQuestions)}>
                      Full Mock Test ({pattern.totalQuestions})
                    </SelectItem>
                  </>
                )}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Difficulty">
            <Select value={difficulty} onValueChange={setDifficulty}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="mixed">Mixed (Recommended)</SelectItem>
                <SelectItem value="easy">Easy</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="hard">Hard</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Generation quality">
            <Select value={quality} onValueChange={(v) => setQuality(v as Quality)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="standard">⚡ Standard (fastest)</SelectItem>
                <SelectItem value="premium">✨ Premium (balanced)</SelectItem>
                <SelectItem value="advanced">🎯 Advanced (highest quality)</SelectItem>
              </SelectContent>
            </Select>
          </Field>

          <Field label="Language">
            <Select value={language} onValueChange={setLanguage}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {LANGUAGES.map((l) => (
                  <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Topic (optional)">
            <Input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. Trigonometry, Mughal Empire…"
            />
          </Field>
          <Field label="Source">
            <Select value={sourceMode} onValueChange={(v) => setSourceMode(v as typeof sourceMode)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Standard (mixed)</SelectItem>
                <SelectItem value="pyq">Previous Year Questions only</SelectItem>
                <SelectItem value="pyq_similar">Similar to PYQs</SelectItem>
                <SelectItem value="high_weightage">High-weightage chapters</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </div>

        {/* Pattern info card */}
        <div className="mt-5 flex items-start gap-3 rounded-lg border border-primary/20 bg-primary/5 p-4">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <div className="text-sm">
            <p className="font-medium text-foreground">{subExam} Pattern</p>
            <p className="mt-0.5 text-muted-foreground">
              {pattern.totalQuestions} Questions · {pattern.timeMinutes} Minutes ·{" "}
              {pattern.negativeMarking !== 0
                ? `${pattern.negativeMarking} Negative Marking`
                : "No Negative Marking"}{" "}
              · {pattern.sections.length} Section{pattern.sections.length > 1 ? "s" : ""}
            </p>
            {allSections && (
              <p className="mt-1 text-xs text-muted-foreground">
                Sections: {pattern.sections.map((s) => `${s.name} (${s.questions})`).join(" · ")}
              </p>
            )}
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Button onClick={onGenerate} disabled={generating} size="lg" className="group">
            {generating ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating…</>
            ) : (
              <><Plus className="mr-2 h-4 w-4" /> Generate test</>
            )}
          </Button>
          <p className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <Zap className="h-3.5 w-3.5 text-primary" />
            Estimated ~
            {(() => {
              const total = allSections ? pattern.totalQuestions : numQuestions;
              const chunks = Math.max(1, Math.ceil(total / CHUNK_SIZE));
              const eta = Math.ceil((chunks / Math.min(MAX_PARALLEL, chunks)) * (QUALITY_ETA[quality] ?? 10));
              return `${eta}s`;
            })()} · {allSections ? pattern.totalQuestions : numQuestions} Qs · {quality}
          </p>
        </div>
      </section>


      {/* History */}
      <section className="mt-10">
        <h2 className="font-display text-lg font-semibold">Your tests</h2>
        <div className="mt-4">
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-20 animate-pulse rounded-lg bg-secondary" />
              ))}
            </div>
          ) : tests.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
              No tests yet. Generate your first one above.
            </div>
          ) : (
            <ul className="grid gap-3 md:grid-cols-2">
              {tests.map((t) => {
                const a = attempts[t.id];
                return (
                  <li
                    key={t.id}
                    className="group rounded-xl border border-border bg-card p-5 transition hover:border-primary/40"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="truncate font-medium">{t.title}</h3>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {t.subject} · {t.exam} · {t.difficulty} · {t.num_questions} Qs
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(t.created_at).toLocaleString()}
                        </p>
                      </div>
                      <button
                        onClick={() => onDelete(t.id)}
                        className="text-muted-foreground hover:text-destructive"
                        aria-label="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="mt-4 flex items-center justify-between">
                      {a ? (
                        <span className="inline-flex items-center gap-1.5 text-sm">
                          <Trophy className="h-4 w-4 text-amber" />
                          <span className="font-medium">{a.score}/{a.total}</span>
                          <span className="text-xs text-muted-foreground">
                            ({Math.round((a.score / a.total) * 100)}%)
                          </span>
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">Not attempted</span>
                      )}
                      <Link
                        to="/mock-test/$testId"
                        params={{ testId: t.id }}
                        className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                      >
                        {a ? "Retake" : "Start"} <ArrowRight className="h-3 w-3" />
                      </Link>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>
        </TabsContent>

        <TabsContent value="practice" className="mt-6">
          <section className="rounded-xl border border-border bg-card p-6">
            <div className="flex items-start gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-teal/15 text-teal">
                <Library className="h-5 w-5" />
              </span>
              <div>
                <h2 className="font-display text-lg font-semibold">Practice Bank</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Hand-curated questions with instant feedback. No timer, unlimited attempts.
                </p>
              </div>
            </div>
            <Link
              to="/mock-test/practice"
              className="mt-5 inline-flex items-center gap-1.5 rounded-md bg-teal px-4 py-2.5 text-sm font-medium text-background transition hover:bg-teal/90"
            >
              Open Practice Bank <ArrowRight className="h-4 w-4" />
            </Link>
          </section>
        </TabsContent>
      </Tabs>

      <GenerationOverlay
        open={generating}
        progress={genProgress}
        etaSeconds={genEta}
        detail={genDetail}
      />
      <GenerationSuccess
        open={!!successSummary && !generating}
        summary={successSummary}
        onStart={() => {
          if (pendingTestId) {
            navigate({ to: "/mock-test/$testId", params: { testId: pendingTestId } });
          }
        }}
        onClose={() => {
          setSuccessSummary(null);
          setPendingTestId(null);
          void load();
        }}
      />
    </div>
  );
}


function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs uppercase tracking-wider text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
