import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Trophy,
  Clock,
  FileDown,
  Loader2,
  RotateCcw,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/mock-test/$testId/results")({
  head: () => ({ meta: [{ title: "Results — CORTEX" }] }),
  validateSearch: z.object({ attempt: z.string() }),
  component: ResultsPage,
});

type Question = {
  question: string;
  options: string[];
  correct_index: number;
  explanation: string;
};

function ResultsPage() {
  const { testId } = Route.useParams();
  const { attempt: attemptId } = Route.useSearch();
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [data, setData] = useState<{
    title: string;
    subject: string;
    questions: Question[];
    answers: Record<string, number>;
    score: number;
    total: number;
    time: number;
  } | null>(null);
  const printableRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      const [{ data: t }, { data: a }] = await Promise.all([
        supabase
          .from("mock_tests")
          .select("title, subject, questions")
          .eq("id", testId)
          .maybeSingle(),
        supabase
          .from("mock_attempts")
          .select("answers, score, total, time_taken_seconds")
          .eq("id", attemptId)
          .maybeSingle(),
      ]);
      if (!t || !a) {
        toast.error("Results not found");
        return;
      }
      setData({
        title: t.title,
        subject: t.subject,
        questions: t.questions as unknown as Question[],
        answers: a.answers as Record<string, number>,
        score: a.score,
        total: a.total,
        time: a.time_taken_seconds,
      });
      setLoading(false);
    })();
  }, [testId, attemptId]);

  const exportPdf = async () => {
    if (!printableRef.current || !data) return;
    setExporting(true);
    try {
      const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
        import("html2canvas"),
        import("jspdf"),
      ]);
      const canvas = await html2canvas(printableRef.current, {
        backgroundColor: "#0A0E1A",
        scale: 2,
      });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pageWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;
      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }
      pdf.save(`${data.title.replace(/[^a-z0-9]+/gi, "_")}_results.pdf`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "PDF export failed");
    } finally {
      setExporting(false);
    }
  };

  if (loading || !data) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-sm text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading results…
      </div>
    );
  }

  const pct = Math.round((data.score / data.total) * 100);
  const grade =
    pct >= 80 ? { label: "Excellent", color: "text-teal" } :
    pct >= 60 ? { label: "Good", color: "text-primary" } :
    pct >= 40 ? { label: "Keep practicing", color: "text-amber" } :
    { label: "Needs work", color: "text-coral" };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 md:px-8">
      <div className="flex items-center justify-between gap-4">
        <Link
          to="/mock-test"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back to tests
        </Link>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportPdf} disabled={exporting}>
            {exporting ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Exporting…</>
            ) : (
              <><FileDown className="mr-2 h-4 w-4" /> Export PDF</>
            )}
          </Button>
          <Button asChild size="sm">
            <Link to="/mock-test/$testId" params={{ testId }}>
              <RotateCcw className="mr-2 h-4 w-4" /> Retake
            </Link>
          </Button>
        </div>
      </div>

      <div ref={printableRef} className="mt-6 space-y-6 rounded-xl bg-background p-6">
        {/* Score card */}
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-lg bg-amber/15 text-amber">
              <Trophy className="h-5 w-5" />
            </span>
            <div>
              <h1 className="font-display text-xl font-bold">{data.title}</h1>
              <p className="text-sm text-muted-foreground">{data.subject}</p>
            </div>
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <Stat label="Score" value={`${data.score}/${data.total}`} />
            <Stat label="Percentage" value={`${pct}%`} accent={grade.color} />
            <Stat label="Time" value={formatTime(data.time)} icon={Clock} />
          </div>
          <div className={`mt-4 text-sm font-medium ${grade.color}`}>{grade.label}</div>
        </div>

        {/* Review */}
        <h2 className="font-display text-lg font-semibold">Review</h2>
        <ol className="space-y-4">
          {data.questions.map((q, i) => {
            const userIdx = data.answers[i];
            const correct = userIdx === q.correct_index;
            return (
              <li key={i} className="rounded-xl border border-border bg-card p-5">
                <div className="flex items-start gap-3">
                  <span
                    className={`grid h-7 w-7 shrink-0 place-items-center rounded-full ${
                      correct ? "bg-teal/15 text-teal" : "bg-coral/15 text-coral"
                    }`}
                  >
                    {correct ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : (
                      <XCircle className="h-4 w-4" />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">
                      <span className="text-muted-foreground">Q{i + 1}.</span> {q.question}
                    </p>
                    <ul className="mt-3 space-y-1.5 text-sm">
                      {q.options.map((opt, oi) => {
                        const isUser = oi === userIdx;
                        const isAns = oi === q.correct_index;
                        return (
                          <li
                            key={oi}
                            className={`rounded-md px-3 py-1.5 ${
                              isAns
                                ? "bg-teal/10 text-teal"
                                : isUser
                                  ? "bg-coral/10 text-coral"
                                  : "text-muted-foreground"
                            }`}
                          >
                            <span className="font-mono text-xs">
                              {String.fromCharCode(65 + oi)}.
                            </span>{" "}
                            {opt}
                            {isAns && " ✓"}
                            {isUser && !isAns && " (your answer)"}
                          </li>
                        );
                      })}
                    </ul>
                    {q.explanation && (
                      <p className="mt-3 rounded-md border border-border bg-background p-3 text-sm text-muted-foreground">
                        <span className="font-medium text-foreground">Explanation: </span>
                        {q.explanation}
                      </p>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
  icon: Icon,
}: {
  label: string;
  value: string;
  accent?: string;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="rounded-lg border border-border bg-background p-4">
      <div className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-muted-foreground">
        {Icon && <Icon className="h-3 w-3" />} {label}
      </div>
      <div className={`mt-1 font-display text-2xl font-bold ${accent ?? ""}`}>{value}</div>
    </div>
  );
}

function formatTime(s: number) {
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}m ${r}s`;
}
