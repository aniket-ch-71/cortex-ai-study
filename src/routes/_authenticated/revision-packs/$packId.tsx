import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, CheckCircle2, Loader2, Trophy, XCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { QuestionBadges } from "@/components/QuestionBadges";
import { SaveQuestionMenu } from "@/components/SaveQuestionMenu";
import { ReportQuestionDialog } from "@/components/ReportQuestionDialog";
import {
  getRevisionPack, markPackCompleted, type RevisionPack,
} from "@/lib/revision-packs";
import type { CanonicalQuestion } from "@/lib/question-schema";
import { recordAttemptIntelligence, bumpDailyChallenge } from "@/lib/intelligence";

export const Route = createFileRoute("/_authenticated/revision-packs/$packId")({
  head: () => ({ meta: [{ title: "Revision Pack — PARIKSHA" }] }),
  component: PackPlayer,
});

function PackPlayer() {
  const { packId } = Route.useParams();
  const navigate = useNavigate();
  const [pack, setPack] = useState<RevisionPack | null>(null);
  const [loading, setLoading] = useState(true);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [reveal, setReveal] = useState<Record<number, boolean>>({});
  const [done, setDone] = useState(false);
  const [startedAt] = useState(() => Date.now());

  useEffect(() => {
    (async () => {
      const p = await getRevisionPack(packId);
      if (!p) { toast.error("Pack not found"); navigate({ to: "/revision-packs" }); return; }
      setPack(p);
      setLoading(false);
    })();
  }, [packId, navigate]);

  const questions = useMemo(() => (pack?.payload ?? []) as CanonicalQuestion[], [pack]);
  const q = questions[current];

  const score = useMemo(
    () => questions.reduce((s, qq, i) => s + (answers[i] === qq.correct_index ? 1 : 0), 0),
    [questions, answers],
  );

  const pick = (i: number) => {
    if (reveal[current]) return;
    setAnswers((a) => ({ ...a, [current]: i }));
    setReveal((r) => ({ ...r, [current]: true }));
  };

  const finish = async () => {
    if (!pack) return;
    setDone(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      await markPackCompleted(pack.id, score);
      void recordAttemptIntelligence({
        userId: u.user.id,
        attemptId: pack.id,
        testId: pack.id,
        defaultSubject: questions[0]?.subject ?? "General",
        questions,
        answers: answers as unknown as Record<string, number>,
        marked: {},
        totalTimeSeconds: Math.floor((Date.now() - startedAt) / 1000),
      }).catch(() => {});
      void bumpDailyChallenge(u.user.id, Object.keys(answers).length).catch(() => {});
    } catch (e) {
      console.error(e);
    }
  };

  if (loading || !pack || !q) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-sm text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading pack…
      </div>
    );
  }

  if (done) {
    const pct = Math.round((score / questions.length) * 100);
    return (
      <div className="mx-auto max-w-2xl px-4 py-12 md:px-8">
        <div className="rounded-2xl border border-border bg-card p-8 text-center">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-amber/15 text-amber">
            <Trophy className="h-7 w-7" />
          </span>
          <h1 className="mt-4 font-display text-2xl font-bold">Pack complete</h1>
          <p className="mt-1 text-sm text-muted-foreground">{pack.title}</p>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <Stat label="Score" value={`${score}/${questions.length}`} />
            <Stat label="Percentage" value={`${pct}%`} />
            <Stat label="Time" value={`${Math.round((Date.now() - startedAt) / 60000)}m`} />
          </div>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <Button asChild variant="outline"><Link to="/revision-packs">Back to packs</Link></Button>
            <Button asChild><Link to="/dashboard">Dashboard</Link></Button>
          </div>
        </div>
      </div>
    );
  }

  const selected = answers[current];
  const revealed = reveal[current];

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 md:px-8">
      <div className="flex items-center justify-between">
        <Link to="/revision-packs" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Exit
        </Link>
        <span className="text-xs text-muted-foreground">
          {current + 1} / {questions.length} · Score {score}
        </span>
      </div>

      <h1 className="mt-4 font-display text-xl font-bold">{pack.title}</h1>

      <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-secondary">
        <div className="h-full bg-primary transition-all" style={{ width: `${((current + 1) / questions.length) * 100}%` }} />
      </div>

      <div className="mt-6 rounded-xl border border-border bg-card p-6 no-select">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <QuestionBadges q={q} compact />
          <div className="flex gap-1.5">
            <SaveQuestionMenu q={q} compact />
            <ReportQuestionDialog q={q} compact />
          </div>
        </div>
        <p className="font-medium leading-relaxed">{q.question}</p>
        <div className="mt-4 space-y-2">
          {q.options.map((opt, i) => {
            const isCorrect = i === q.correct_index;
            const isSelected = selected === i;
            let cls = "border-border bg-background hover:border-primary/40";
            if (revealed) {
              if (isCorrect) cls = "border-teal bg-teal/10 text-teal";
              else if (isSelected) cls = "border-coral bg-coral/10 text-coral";
              else cls = "border-border bg-background text-muted-foreground";
            } else if (isSelected) cls = "border-primary bg-primary/10";
            return (
              <button
                key={i}
                onClick={() => pick(i)}
                disabled={revealed}
                className={`flex w-full items-start gap-3 rounded-lg border p-3 text-left text-sm transition ${cls}`}
              >
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full border text-xs">
                  {String.fromCharCode(65 + i)}
                </span>
                <span className="flex-1">{opt}</span>
                {revealed && isCorrect && <CheckCircle2 className="h-4 w-4 shrink-0" />}
                {revealed && isSelected && !isCorrect && <XCircle className="h-4 w-4 shrink-0" />}
              </button>
            );
          })}
        </div>
        {revealed && q.explanation && (
          <p className="mt-4 rounded-md border border-border bg-background p-3 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Why: </span>{q.explanation}
          </p>
        )}
      </div>

      <div className="mt-6 flex items-center justify-between">
        <Button variant="outline" onClick={() => setCurrent((c) => Math.max(0, c - 1))} disabled={current === 0}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Previous
        </Button>
        {current < questions.length - 1 ? (
          <Button onClick={() => setCurrent((c) => c + 1)}>
            Next <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        ) : (
          <Button onClick={finish}>
            Finish pack <Trophy className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-background p-4">
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 font-display text-2xl font-bold">{value}</div>
    </div>
  );
}
