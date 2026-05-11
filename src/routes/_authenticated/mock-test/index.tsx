import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Brain, Loader2, Plus, Trash2, Trophy, ArrowRight, Info, Sparkles, Library } from "lucide-react";
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

const AI_TEST_DAILY_LIMIT = 3;

export const Route = createFileRoute("/_authenticated/mock-test/")({
  head: () => ({ meta: [{ title: "Mock Tests — CORTEX" }] }),
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
  const [difficulty, setDifficulty] = useState("medium");
  const [language, setLanguage] = useState("en");
  const [topic, setTopic] = useState("");
  const [numQuestions, setNumQuestions] = useState<number>(25);
  const [primarySeeded, setPrimarySeeded] = useState(false);

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
    const [{ data: t }, { data: a }] = await Promise.all([
      supabase
        .from("mock_tests")
        .select("id, title, subject, exam, difficulty, num_questions, created_at")
        .order("created_at", { ascending: false })
        .limit(20),
      supabase
        .from("mock_attempts")
        .select("id, test_id, score, total, completed_at")
        .order("completed_at", { ascending: false }),
    ]);
    setTests((t as TestRow[]) ?? []);
    const map: Record<string, AttemptRow> = {};
    for (const at of (a as AttemptRow[]) ?? []) {
      if (!map[at.test_id]) map[at.test_id] = at;
    }
    setAttempts(map);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const onGenerate = async () => {
    setGenerating(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) {
        toast.error("Please sign in");
        return;
      }

      // Build per-section requests for All Sections, else one request
      const sectionsToGenerate = allSections
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

      const allQuestions: Array<{
        question: string;
        options: string[];
        correct_index: number;
        explanation: string;
        section: string;
        marks: number;
      }> = [];

      let title = "";
      for (const sec of sectionsToGenerate) {
        const res = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-test`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            },
            body: JSON.stringify({
              subject: sec.name,
              exam: subExam,
              difficulty,
              numQuestions: sec.questions,
              language,
              topic,
              marksPerQuestion: sec.marks,
              negativeMarking: pattern.negativeMarking,
            }),
          },
        );
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          throw new Error(j.error || `HTTP ${res.status}`);
        }
        const payload = await res.json();
        if (!title) title = payload.title || `${subExam} Mock Test`;
        for (const q of payload.questions) {
          allQuestions.push({ ...q, section: sec.name, marks: sec.marks });
        }
      }

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
          questions: allQuestions,
          pattern: {
            subExam,
            category,
            timeMinutes: pattern.timeMinutes,
            negativeMarking: pattern.negativeMarking,
            sections: sectionsToGenerate,
            cutoffPct: pattern.cutoffPct,
            allSections,
          },
        })
        .select("id")
        .single();
      if (error) throw error;
      toast.success("Test generated!");
      navigate({ to: "/mock-test/$testId", params: { testId: inserted.id } });
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

      {/* Generator */}
      <section className="mt-8 rounded-xl border border-border bg-card p-6">
        <h2 className="font-display text-lg font-semibold">Create a new test</h2>
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
                  QUESTION_COUNT_OPTIONS.map((n) => (
                    <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Difficulty">
            <Select value={difficulty} onValueChange={setDifficulty}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="easy">Easy</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="hard">Hard</SelectItem>
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

        <Button onClick={onGenerate} disabled={generating} className="mt-6" size="lg">
          {generating ? (
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating…</>
          ) : (
            <><Plus className="mr-2 h-4 w-4" /> Generate test</>
          )}
        </Button>
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
