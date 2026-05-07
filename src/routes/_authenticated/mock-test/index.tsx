import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Brain, Loader2, Plus, Trash2, Trophy, ArrowRight } from "lucide-react";
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
import { EXAMS, SUBJECTS, LANGUAGES } from "@/lib/cortex-data";

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

  // form state
  const [subject, setSubject] = useState<string>(SUBJECTS[0]);
  const [exam, setExam] = useState<string>("JEE");
  const [difficulty, setDifficulty] = useState("medium");
  const [language, setLanguage] = useState("en");
  const [topic, setTopic] = useState("");
  const [numQuestions, setNumQuestions] = useState(10);

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
      // keep latest only
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
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-test`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ subject, exam, difficulty, numQuestions, language, topic }),
        },
      );
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `HTTP ${res.status}`);
      }
      const payload = await res.json();
      const { data: inserted, error } = await supabase
        .from("mock_tests")
        .insert({
          user_id: u.user.id,
          title: payload.title || `${subject} Test`,
          subject,
          exam,
          difficulty,
          language,
          num_questions: payload.questions.length,
          questions: payload.questions,
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
            Generate exam-style MCQ tests in seconds.
          </p>
        </div>
      </div>

      {/* Generator */}
      <section className="mt-8 rounded-xl border border-border bg-card p-6">
        <h2 className="font-display text-lg font-semibold">Create a new test</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Field label="Subject">
            <Select value={subject} onValueChange={setSubject}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {SUBJECTS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Exam">
            <Select value={exam} onValueChange={setExam}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {EXAMS.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}
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
                {LANGUAGES.map((l) => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Number of questions">
            <Select
              value={String(numQuestions)}
              onValueChange={(v) => setNumQuestions(Number(v))}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {[5, 10, 15, 20, 25].map((n) => (
                  <SelectItem key={n} value={String(n)}>{n}</SelectItem>
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
        <Button
          onClick={onGenerate}
          disabled={generating}
          className="mt-6"
          size="lg"
        >
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
                          <span className="font-medium">
                            {a.score}/{a.total}
                          </span>
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
