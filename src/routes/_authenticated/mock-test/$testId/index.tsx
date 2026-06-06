import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Loader2, Clock, CheckCircle2, Flag, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { recordAttemptIntelligence } from "@/lib/intelligence";

export const Route = createFileRoute("/_authenticated/mock-test/$testId/")({
  head: () => ({ meta: [{ title: "Take Test — PARIKSHA" }] }),
  component: TakeTestPage,
});

type Question = {
  question: string;
  options: string[];
  correct_index: number;
  explanation: string;
  section?: string;
  marks?: number;
};

type Pattern = {
  subExam?: string;
  timeMinutes: number;
  negativeMarking: number;
  sections: { name: string; questions: number; marks: number }[];
  cutoffPct?: number;
  allSections?: boolean;
};

type Test = {
  id: string;
  title: string;
  subject: string;
  num_questions: number;
  questions: Question[];
  pattern: Pattern | null;
};

function TakeTestPage() {
  const { testId } = Route.useParams();
  const navigate = useNavigate();
  const [test, setTest] = useState<Test | null>(null);
  const [loading, setLoading] = useState(true);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [marked, setMarked] = useState<Record<number, boolean>>({});
  const [visited, setVisited] = useState<Record<number, boolean>>({ 0: true });
  const [activeSection, setActiveSection] = useState<string>("");
  const [current, setCurrent] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [startedAt] = useState(() => Date.now());
  const [now, setNow] = useState(Date.now());
  const submittedRef = useRef(false);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("mock_tests")
        .select("id, title, subject, num_questions, questions, pattern")
        .eq("id", testId)
        .maybeSingle();
      if (error || !data) {
        toast.error("Test not found");
        navigate({ to: "/mock-test" });
        return;
      }
      const t = data as unknown as Test;
      setTest(t);
      // pick initial section from first question
      const firstSec = t.questions[0]?.section ?? t.pattern?.sections[0]?.name ?? "";
      setActiveSection(firstSec);
      setLoading(false);
    })();
  }, [testId, navigate]);

  // Timer tick
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const totalMs = (test?.pattern?.timeMinutes ?? 60) * 60 * 1000;
  const elapsedMs = now - startedAt;
  const remainingMs = Math.max(0, totalMs - elapsedMs);
  const remainingSec = Math.floor(remainingMs / 1000);
  const lowTime = remainingMs > 0 && remainingMs <= 10 * 60 * 1000;

  // Sections list (deduped from questions, ordered by first appearance)
  const sections = useMemo(() => {
    if (!test) return [] as string[];
    const seen: string[] = [];
    test.questions.forEach((q) => {
      const s = q.section ?? "All";
      if (!seen.includes(s)) seen.push(s);
    });
    return seen;
  }, [test]);

  const showSectionTabs = sections.length > 1;

  // Indices belonging to active section
  const sectionIndices = useMemo(() => {
    if (!test) return [] as number[];
    if (!showSectionTabs) return test.questions.map((_, i) => i);
    return test.questions
      .map((q, i) => ((q.section ?? "All") === activeSection ? i : -1))
      .filter((i) => i >= 0);
  }, [test, activeSection, showSectionTabs]);

  const totalAnswered = Object.keys(answers).length;

  const onSubmit = useCallback(
    async (auto = false) => {
      if (!test || submittedRef.current) return;
      submittedRef.current = true;
      setSubmitting(true);
      try {
        const { data: u } = await supabase.auth.getUser();
        if (!u.user) throw new Error("Not signed in");

        const neg = test.pattern?.negativeMarking ?? 0;
        let correct = 0;
        let wrong = 0;
        let rawScore = 0;
        let deduction = 0;

        // Section breakdown
        const breakdown: Record<
          string,
          { correct: number; wrong: number; attempted: number; total: number; marks: number; deduction: number }
        > = {};
        test.questions.forEach((q, i) => {
          const sec = q.section ?? "All";
          if (!breakdown[sec])
            breakdown[sec] = { correct: 0, wrong: 0, attempted: 0, total: 0, marks: 0, deduction: 0 };
          breakdown[sec].total++;
          const m = q.marks ?? 1;
          const ans = answers[i];
          if (ans === undefined) return;
          breakdown[sec].attempted++;
          if (ans === q.correct_index) {
            correct++;
            rawScore += m;
            breakdown[sec].correct++;
            breakdown[sec].marks += m;
          } else {
            wrong++;
            deduction += Math.abs(neg);
            breakdown[sec].wrong++;
            breakdown[sec].deduction += Math.abs(neg);
          }
        });

        const finalScore = rawScore - deduction;

        const { data: attempt, error } = await supabase
          .from("mock_attempts")
          .insert({
            user_id: u.user.id,
            test_id: test.id,
            answers,
            marked_for_review: marked,
            score: correct,
            total: test.questions.length,
            time_taken_seconds: Math.floor((Date.now() - startedAt) / 1000),
            breakdown: { sections: breakdown, rawScore, deduction, finalScore, wrong, correct },
          })
          .select("id")
          .single();
        if (error) throw error;

        // Fire-and-forget intelligence capture (don't block navigation)
        void recordAttemptIntelligence({
          userId: u.user.id,
          attemptId: attempt.id,
          testId: test.id,
          defaultSubject: test.subject,
          questions: test.questions,
          answers: answers as unknown as Record<string, number>,
          marked: marked as unknown as Record<string, boolean>,
          totalTimeSeconds: Math.floor((Date.now() - startedAt) / 1000),
        }).catch((e) => console.error("intelligence capture failed", e));

        if (auto) toast.message("Time's up — test auto-submitted");
        navigate({
          to: "/mock-test/$testId/results",
          params: { testId: test.id },
          search: { attempt: attempt.id },
        });
      } catch (e) {
        submittedRef.current = false;
        toast.error(e instanceof Error ? e.message : "Failed to submit");
        setSubmitting(false);
      }
    },
    [test, answers, marked, startedAt, navigate],
  );

  // Auto-submit when timer hits 0
  useEffect(() => {
    if (!test || submittedRef.current) return;
    if (remainingMs <= 0 && elapsedMs > 0) {
      void onSubmit(true);
    }
  }, [remainingMs, elapsedMs, test, onSubmit]);

  // Mark visited
  useEffect(() => {
    setVisited((v) => (v[current] ? v : { ...v, [current]: true }));
    // sync activeSection to current question
    if (test) {
      const sec = test.questions[current]?.section ?? "All";
      if (sec !== activeSection) setActiveSection(sec);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current, test]);

  if (loading || !test) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-sm text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading test…
      </div>
    );
  }

  const q = test.questions[current];
  const selected = answers[current];
  const neg = test.pattern?.negativeMarking ?? 0;
  const sectionPos = sectionIndices.indexOf(current);

  const goPrev = () => {
    if (sectionPos > 0) setCurrent(sectionIndices[sectionPos - 1]);
  };
  const goNext = () => {
    if (sectionPos >= 0 && sectionPos < sectionIndices.length - 1) {
      setCurrent(sectionIndices[sectionPos + 1]);
    }
  };

  const switchSection = (sec: string) => {
    setActiveSection(sec);
    const firstIdx = test.questions.findIndex((qq) => (qq.section ?? "All") === sec);
    if (firstIdx >= 0) setCurrent(firstIdx);
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 md:px-8">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <Link
          to="/mock-test"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Exit
        </Link>
        <div className="flex items-center gap-2">
          {neg !== 0 && (
            <span className="inline-flex items-center gap-1 rounded-full border border-coral/40 bg-coral/10 px-2.5 py-1 text-xs font-medium text-coral">
              <AlertTriangle className="h-3 w-3" />
              {neg} per wrong
            </span>
          )}
          <div
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-medium tabular-nums ${
              lowTime
                ? "border-coral/50 bg-coral/15 text-coral animate-pulse"
                : "border-border bg-card text-foreground"
            }`}
          >
            <Clock className="h-3.5 w-3.5" />
            {formatHMS(remainingSec)}
          </div>
        </div>
      </div>

      <h1 className="mt-4 font-display text-xl font-bold md:text-2xl">{test.title}</h1>
      <p className="text-sm text-muted-foreground">
        {test.pattern?.subExam ?? test.subject}
      </p>

      {/* Section tabs */}
      {showSectionTabs && (
        <div className="mt-5 flex flex-wrap gap-1.5 border-b border-border">
          {sections.map((s) => {
            const active = s === activeSection;
            return (
              <button
                key={s}
                onClick={() => switchSection(s)}
                className={`-mb-px border-b-2 px-3 py-2 text-sm transition ${
                  active
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {s}
              </button>
            );
          })}
        </div>
      )}

      {/* Progress */}
      <div className="mt-6">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Question {sectionPos + 1} of {sectionIndices.length}
            {showSectionTabs ? ` · ${activeSection}` : ""}
          </span>
          <span>
            {totalAnswered}/{test.questions.length} answered
          </span>
        </div>
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-secondary">
          <div
            className="h-full bg-primary transition-all"
            style={{ width: `${(totalAnswered / test.questions.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Question */}
      <div className="no-select mt-6 rounded-xl border border-border bg-card p-6">
        <div className="flex items-start justify-between gap-4">
          <p className="font-medium leading-relaxed">{q.question}</p>
          {q.marks ? (
            <span className="shrink-0 rounded-md border border-border bg-background px-2 py-0.5 text-xs text-muted-foreground">
              +{q.marks}
            </span>
          ) : null}
        </div>
        <div className="mt-5 space-y-2">
          {q.options.map((opt, i) => {
            const active = selected === i;
            return (
              <button
                key={i}
                onClick={() => setAnswers((a) => ({ ...a, [current]: i }))}
                className={`flex w-full items-start gap-3 rounded-lg border p-3 text-left text-sm transition ${
                  active
                    ? "border-primary bg-primary/10"
                    : "border-border bg-background hover:border-primary/40"
                }`}
              >
                <span
                  className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border text-xs ${
                    active ? "border-primary bg-primary text-primary-foreground" : "border-border"
                  }`}
                >
                  {String.fromCharCode(65 + i)}
                </span>
                <span className="flex-1">{opt}</span>
              </button>
            );
          })}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setAnswers((a) => {
              const next = { ...a };
              delete next[current];
              return next;
            })}
            disabled={selected === undefined}
          >
            Clear answer
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setMarked((m) => ({ ...m, [current]: !m[current] }))}
            className={marked[current] ? "border-amber/60 text-amber" : ""}
          >
            <Flag className="mr-1.5 h-3.5 w-3.5" />
            {marked[current] ? "Unmark" : "Mark for review"}
          </Button>
        </div>
      </div>

      {/* Nav */}
      <div className="mt-6 flex items-center justify-between gap-3">
        <Button variant="outline" onClick={goPrev} disabled={sectionPos <= 0}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Previous
        </Button>
        <Button onClick={() => onSubmit(false)} disabled={submitting} variant="default">
          {submitting ? (
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting…</>
          ) : (
            <><CheckCircle2 className="mr-2 h-4 w-4" /> Submit test</>
          )}
        </Button>
        <Button onClick={goNext} disabled={sectionPos >= sectionIndices.length - 1}>
          Next <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>

      {/* Question grid */}
      <div className="mt-8">
        <div className="mb-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
          <Legend color="bg-teal" label="Answered" />
          <Legend color="bg-amber" label="Marked" />
          <Legend color="bg-primary" label="Current" />
          <Legend color="bg-secondary" label="Not visited" />
        </div>
        <div className="flex flex-wrap gap-2">
          {sectionIndices.map((i) => {
            const answered = answers[i] !== undefined;
            const isMarked = marked[i];
            const isCurrent = i === current;
            const wasVisited = visited[i];
            let cls = "border-border bg-secondary text-muted-foreground";
            if (isCurrent) cls = "border-primary bg-primary text-primary-foreground";
            else if (isMarked) cls = "border-amber/50 bg-amber/15 text-amber";
            else if (answered) cls = "border-teal/50 bg-teal/15 text-teal";
            else if (wasVisited) cls = "border-coral/40 bg-coral/10 text-coral";
            return (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className={`grid h-8 w-8 place-items-center rounded-md border text-xs transition hover:opacity-90 ${cls}`}
              >
                {sectionIndices.indexOf(i) + 1}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-muted-foreground">
      <span className={`h-2.5 w-2.5 rounded-sm ${color}`} /> {label}
    </span>
  );
}

function formatHMS(s: number) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
  return `${m}:${String(r).padStart(2, "0")}`;
}
