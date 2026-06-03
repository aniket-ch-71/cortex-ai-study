import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Library, Loader2, CheckCircle2, XCircle, ArrowRight, RotateCw } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/mock-test/practice")({
  head: () => ({ meta: [{ title: "Practice Bank — PARIKSHA" }] }),
  component: PracticePage,
});

type Q = {
  id: string;
  question: string;
  options: string[];
  correct_index: number;
  explanation: string;
  subject: string;
  topic: string | null;
  difficulty: string;
};

type Filters = { sub_exam: string; subject: string; difficulty: string };

function PracticePage() {
  const [filters, setFilters] = useState<Filters>({
    sub_exam: "SSC CGL",
    subject: "All",
    difficulty: "all",
  });
  const [available, setAvailable] = useState<{ subExams: string[]; subjects: string[] }>({
    subExams: [],
    subjects: [],
  });
  const [questions, setQuestions] = useState<Q[]>([]);
  const [loading, setLoading] = useState(false);
  const [started, setStarted] = useState(false);
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [revealed, setRevealed] = useState<boolean[]>([]);

  // Fetch distinct sub-exams + subjects for filter dropdowns
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("question_bank")
        .select("sub_exam, subject")
        .limit(2000);
      const subExams = Array.from(new Set((data ?? []).map((r) => r.sub_exam))).sort();
      const subjects = Array.from(
        new Set((data ?? []).filter((r) => r.sub_exam === filters.sub_exam).map((r) => r.subject)),
      ).sort();
      setAvailable({ subExams, subjects: ["All", ...subjects] });
    })();
  }, [filters.sub_exam]);

  const start = async () => {
    setLoading(true);
    try {
      let q = supabase.from("question_bank").select("*").eq("sub_exam", filters.sub_exam);
      if (filters.subject !== "All") q = q.eq("subject", filters.subject);
      if (filters.difficulty !== "all") q = q.eq("difficulty", filters.difficulty);
      const { data, error } = await q.limit(200);
      if (error) throw error;
      const rows = (data ?? []) as Q[];
      if (rows.length === 0) {
        toast.error("No questions match those filters yet.");
        return;
      }
      // Random sample up to 25
      const shuffled = [...rows].sort(() => Math.random() - 0.5).slice(0, 25);
      setQuestions(shuffled);
      setRevealed(new Array(shuffled.length).fill(false));
      setIdx(0);
      setScore(0);
      setPicked(null);
      setStarted(true);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load questions");
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setStarted(false);
    setQuestions([]);
    setIdx(0);
    setPicked(null);
    setScore(0);
  };

  const current = questions[idx];
  const finished = started && idx >= questions.length;

  const choose = (i: number) => {
    if (revealed[idx]) return;
    setPicked(i);
    const correct = i === current.correct_index;
    if (correct) setScore((s) => s + 1);
    setRevealed((r) => {
      const c = [...r];
      c[idx] = true;
      return c;
    });
  };

  const next = () => {
    setPicked(null);
    setIdx((i) => i + 1);
  };

  // ---------- views ----------
  if (!started) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8 md:px-8">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-lg bg-teal/15 text-teal">
            <Library className="h-5 w-5" />
          </span>
          <div>
            <h1 className="font-display text-2xl font-bold md:text-3xl">Practice Bank</h1>
            <p className="text-sm text-muted-foreground">
              Pre-loaded questions. Instant feedback. No timer, no limit.
            </p>
          </div>
        </div>

        <div className="mt-8 rounded-xl border border-border bg-card p-6">
          <h2 className="font-display text-lg font-semibold">Pick what you want to practice</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            <Field label="Sub-exam">
              <Select
                value={filters.sub_exam}
                onValueChange={(v) => setFilters((f) => ({ ...f, sub_exam: v, subject: "All" }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(available.subExams.length ? available.subExams : ["SSC CGL"]).map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Subject">
              <Select
                value={filters.subject}
                onValueChange={(v) => setFilters((f) => ({ ...f, subject: v }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {available.subjects.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Difficulty">
              <Select
                value={filters.difficulty}
                onValueChange={(v) => setFilters((f) => ({ ...f, difficulty: v }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All levels</SelectItem>
                  <SelectItem value="easy">Easy</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="hard">Hard</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>
          <Button onClick={start} disabled={loading} size="lg" className="mt-6">
            {loading ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading…</>
            ) : (
              <>Start practice</>
            )}
          </Button>
          <p className="mt-3 text-xs text-muted-foreground">
            Loads up to 25 random questions matching your filters.
          </p>
        </div>
      </div>
    );
  }

  if (finished) {
    const pct = Math.round((score / questions.length) * 100);
    return (
      <div className="mx-auto max-w-2xl px-4 py-12 md:px-8">
        <div className="rounded-2xl border border-border bg-card p-8 text-center">
          <h1 className="font-display text-3xl font-bold">Practice complete</h1>
          <p className="mt-2 text-muted-foreground">Nice work — here's how you did.</p>
          <div className="mt-6 font-display text-6xl font-bold text-primary tabular-nums">
            {score}<span className="text-3xl text-muted-foreground">/{questions.length}</span>
          </div>
          <div className="mt-2 text-sm text-muted-foreground">{pct}% accuracy</div>
          <div className="mt-8 flex justify-center gap-3">
            <Button onClick={reset} variant="outline">
              <RotateCw className="mr-2 h-4 w-4" /> New session
            </Button>
            <Button onClick={start}>Practice again</Button>
          </div>
        </div>
      </div>
    );
  }

  // Active question runner
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 md:px-8">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">
          Question <span className="font-medium text-foreground">{idx + 1}</span> of {questions.length}
        </span>
        <span className="text-muted-foreground">
          Score: <span className="font-medium text-foreground">{score}</span>
        </span>
      </div>
      <div className="mt-2 h-1 overflow-hidden rounded-full bg-secondary">
        <div
          className="h-full bg-primary transition-all"
          style={{ width: `${((idx + 1) / questions.length) * 100}%` }}
        />
      </div>

      <div className="no-select mt-6 rounded-xl border border-border bg-card p-6 animate-fade-up">
        <div className="mb-3 flex flex-wrap gap-2 text-xs">
          <span className="rounded-full border border-border px-2 py-0.5 text-muted-foreground">
            {current.subject}
          </span>
          {current.topic && (
            <span className="rounded-full border border-border px-2 py-0.5 text-muted-foreground">
              {current.topic}
            </span>
          )}
          <span className="rounded-full border border-border px-2 py-0.5 text-muted-foreground capitalize">
            {current.difficulty}
          </span>
        </div>
        <h2 className="text-base font-medium leading-relaxed md:text-lg">{current.question}</h2>

        <div className="mt-5 grid gap-2">
          {current.options.map((opt, i) => {
            const reveal = revealed[idx];
            const isCorrect = i === current.correct_index;
            const isPicked = picked === i;
            let cls = "border-border bg-background hover:border-primary/40";
            if (reveal && isCorrect) cls = "border-teal/50 bg-teal/10";
            else if (reveal && isPicked && !isCorrect) cls = "border-coral/50 bg-coral/10";
            return (
              <button
                key={i}
                onClick={() => choose(i)}
                disabled={reveal}
                className={`flex items-center justify-between rounded-lg border px-4 py-3 text-left text-sm transition ${cls}`}
              >
                <span className="flex items-center gap-3">
                  <span className="grid h-6 w-6 place-items-center rounded-full border border-border text-xs font-semibold">
                    {String.fromCharCode(65 + i)}
                  </span>
                  <span>{opt}</span>
                </span>
                {reveal && isCorrect && <CheckCircle2 className="h-4 w-4 text-teal" />}
                {reveal && isPicked && !isCorrect && <XCircle className="h-4 w-4 text-coral" />}
              </button>
            );
          })}
        </div>

        {revealed[idx] && (
          <div className="mt-5 rounded-lg border border-primary/20 bg-primary/5 p-4 text-sm animate-fade-up">
            <p className="font-medium text-primary">Explanation</p>
            <p className="mt-1 text-foreground/90">{current.explanation}</p>
          </div>
        )}
      </div>

      <div className="mt-5 flex justify-end">
        <Button onClick={next} disabled={!revealed[idx]} size="lg">
          {idx + 1 === questions.length ? "Finish" : "Next"} <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
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
