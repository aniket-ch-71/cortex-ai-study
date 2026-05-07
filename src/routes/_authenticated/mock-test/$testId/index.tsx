import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Loader2, Clock, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/mock-test/$testId/")({
  head: () => ({ meta: [{ title: "Take Test — CORTEX" }] }),
  component: TakeTestPage,
});

type Question = {
  question: string;
  options: string[];
  correct_index: number;
  explanation: string;
};

type Test = {
  id: string;
  title: string;
  subject: string;
  num_questions: number;
  questions: Question[];
};

function TakeTestPage() {
  const { testId } = Route.useParams();
  const navigate = useNavigate();
  const [test, setTest] = useState<Test | null>(null);
  const [loading, setLoading] = useState(true);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [current, setCurrent] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [startedAt] = useState(() => Date.now());
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("mock_tests")
        .select("id, title, subject, num_questions, questions")
        .eq("id", testId)
        .maybeSingle();
      if (error || !data) {
        toast.error("Test not found");
        navigate({ to: "/mock-test" });
        return;
      }
      setTest(data as unknown as Test);
      setLoading(false);
    })();
  }, [testId, navigate]);

  useEffect(() => {
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - startedAt) / 1000)), 1000);
    return () => clearInterval(id);
  }, [startedAt]);

  const totalAnswered = Object.keys(answers).length;
  const progressPct = useMemo(
    () => (test ? Math.round((totalAnswered / test.questions.length) * 100) : 0),
    [test, totalAnswered],
  );

  const onSubmit = async () => {
    if (!test) return;
    setSubmitting(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not signed in");
      let score = 0;
      test.questions.forEach((q, i) => {
        if (answers[i] === q.correct_index) score++;
      });
      const { data: attempt, error } = await supabase
        .from("mock_attempts")
        .insert({
          user_id: u.user.id,
          test_id: test.id,
          answers,
          score,
          total: test.questions.length,
          time_taken_seconds: Math.floor((Date.now() - startedAt) / 1000),
        })
        .select("id")
        .single();
      if (error) throw error;
      navigate({
        to: "/mock-test/$testId/results",
        params: { testId: test.id },
        search: { attempt: attempt.id },
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to submit");
      setSubmitting(false);
    }
  };

  if (loading || !test) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-sm text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading test…
      </div>
    );
  }

  const q = test.questions[current];
  const selected = answers[current];

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 md:px-8">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <Link
          to="/mock-test"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Exit
        </Link>
        <div className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-sm">
          <Clock className="h-3.5 w-3.5 text-muted-foreground" />
          {formatTime(elapsed)}
        </div>
      </div>

      <h1 className="mt-4 font-display text-xl font-bold md:text-2xl">{test.title}</h1>
      <p className="text-sm text-muted-foreground">{test.subject}</p>

      {/* Progress */}
      <div className="mt-6">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">
            Question {current + 1} of {test.questions.length}
          </span>
          <span className="text-muted-foreground">{totalAnswered} answered · {progressPct}%</span>
        </div>
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-secondary">
          <div className="h-full bg-primary transition-all" style={{ width: `${progressPct}%` }} />
        </div>
      </div>

      {/* Question */}
      <div className="mt-8 rounded-xl border border-border bg-card p-6">
        <p className="font-medium leading-relaxed">{q.question}</p>
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
      </div>

      {/* Nav */}
      <div className="mt-6 flex items-center justify-between">
        <Button
          variant="outline"
          onClick={() => setCurrent((c) => Math.max(0, c - 1))}
          disabled={current === 0}
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Previous
        </Button>
        {current === test.questions.length - 1 ? (
          <Button onClick={onSubmit} disabled={submitting}>
            {submitting ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting…</>
            ) : (
              <><CheckCircle2 className="mr-2 h-4 w-4" /> Submit test</>
            )}
          </Button>
        ) : (
          <Button onClick={() => setCurrent((c) => Math.min(test.questions.length - 1, c + 1))}>
            Next <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Question grid */}
      <div className="mt-8">
        <p className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">Jump to</p>
        <div className="flex flex-wrap gap-2">
          {test.questions.map((_, i) => {
            const answered = answers[i] !== undefined;
            const isCurrent = i === current;
            return (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className={`grid h-8 w-8 place-items-center rounded-md border text-xs transition ${
                  isCurrent
                    ? "border-primary bg-primary text-primary-foreground"
                    : answered
                      ? "border-primary/40 bg-primary/10 text-primary"
                      : "border-border bg-card text-muted-foreground hover:border-primary/40"
                }`}
              >
                {i + 1}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function formatTime(s: number) {
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, "0")}`;
}
