import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
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
  Target,
  Share2,
  Download,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { InlineReviewPrompt } from "@/components/InlineReviewPrompt";

export const Route = createFileRoute("/_authenticated/mock-test/$testId/results")({
  head: () => ({ meta: [{ title: "Results — PARIKSHA" }] }),
  validateSearch: z.object({ attempt: z.string() }),
  component: ResultsPage,
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
};

type SectionStat = {
  correct: number;
  wrong: number;
  attempted: number;
  total: number;
  marks: number;
  deduction: number;
};

type Breakdown = {
  sections: Record<string, SectionStat>;
  rawScore: number;
  deduction: number;
  finalScore: number;
  correct: number;
  wrong: number;
};

function ResultsPage() {
  const { testId } = Route.useParams();
  const { attempt: attemptId } = Route.useSearch();
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [firstName, setFirstName] = useState("Student");
  const [data, setData] = useState<{
    title: string;
    subject: string;
    questions: Question[];
    answers: Record<string, number>;
    score: number;
    total: number;
    time: number;
    pattern: Pattern | null;
    breakdown: Breakdown | null;
  } | null>(null);
  const printableRef = useRef<HTMLDivElement>(null);
  const shareCardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (u.user) {
        const { data: p } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", u.user.id)
          .maybeSingle();
        const fn = (p?.full_name ?? "").trim().split(/\s+/)[0];
        if (fn) setFirstName(fn);
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      const [{ data: t }, { data: a }] = await Promise.all([
        supabase
          .from("mock_tests")
          .select("title, subject, questions, pattern")
          .eq("id", testId)
          .maybeSingle(),
        supabase
          .from("mock_attempts")
          .select("answers, score, total, time_taken_seconds, breakdown")
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
        pattern: (t.pattern as unknown as Pattern) ?? null,
        breakdown: (a.breakdown as unknown as Breakdown) ?? null,
      });
      setLoading(false);
    })();
  }, [testId, attemptId]);

  // Derive max possible marks
  const maxMarks = useMemo(() => {
    if (!data) return 0;
    return data.questions.reduce((s, q) => s + (q.marks ?? 1), 0);
  }, [data]);

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

  const downloadShareCard = async () => {
    if (!shareCardRef.current) return;
    setDownloading(true);
    try {
      const { toPng } = await import("html-to-image");
      const dataUrl = await toPng(shareCardRef.current, {
        pixelRatio: 2,
        backgroundColor: "#0A0E1A",
        cacheBust: true,
      });
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `pariksha-result-${Date.now()}.png`;
      a.click();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Image download failed");
    } finally {
      setDownloading(false);
    }
  };

  if (loading || !data) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-sm text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading results…
      </div>
    );
  }

  const neg = data.pattern?.negativeMarking ?? 0;
  const marksPerQ = data.questions[0]?.marks ?? 1;
  const rawScore = data.breakdown?.rawScore ?? data.score * marksPerQ;
  const deduction = data.breakdown?.deduction ?? 0;
  const finalScore = data.breakdown?.finalScore ?? rawScore - deduction;
  const wrong = data.breakdown?.wrong ?? 0;

  const pct = maxMarks > 0 ? Math.round((finalScore / maxMarks) * 100) : 0;
  const cutoffPct = data.pattern?.cutoffPct;
  const cutoffMarks = cutoffPct ? Math.round((cutoffPct / 100) * maxMarks) : null;
  const passed = cutoffPct ? pct >= cutoffPct : pct >= 50;

  const grade =
    pct >= 80
      ? { label: "Excellent", color: "text-teal" }
      : pct >= 60
        ? { label: "Good", color: "text-primary" }
        : pct >= 40
          ? { label: "Keep practicing", color: "text-amber" }
          : { label: "Needs work", color: "text-coral" };

  const sectionStats = data.breakdown?.sections ?? {};

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
              <p className="text-sm text-muted-foreground">
                {data.pattern?.subExam ?? data.subject}
              </p>
            </div>
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-4">
            <Stat label="Final score" value={`${finalScore}/${maxMarks}`} accent={grade.color} />
            <Stat label="Percentage" value={`${pct}%`} accent={grade.color} />
            <Stat label="Correct / Wrong" value={`${data.score} / ${wrong}`} />
            <Stat label="Time" value={formatTime(data.time)} icon={Clock} />
          </div>

          {/* Score math */}
          <div className="mt-5 grid gap-2 rounded-lg border border-border bg-background p-4 text-sm sm:grid-cols-3">
            <MathRow label="Raw score" value={`${data.score} × ${marksPerQ} = ${rawScore}`} />
            <MathRow
              label="Deduction"
              value={
                neg !== 0 ? `${wrong} × ${neg} = -${deduction}` : "No negative marking"
              }
              negative={neg !== 0 && deduction > 0}
            />
            <MathRow label="Final" value={`${finalScore}`} bold />
          </div>

          <div className={`mt-4 text-sm font-medium ${grade.color}`}>{grade.label}</div>

          {/* Cutoff */}
          {cutoffMarks !== null && (
            <div className="mt-4 flex items-center gap-3 rounded-lg border border-border bg-background p-4">
              <Target className={`h-5 w-5 ${passed ? "text-teal" : "text-coral"}`} />
              <div className="text-sm">
                <p className="font-medium">
                  Typical cutoff for {data.pattern?.subExam}: ~{cutoffMarks} marks ({cutoffPct}%)
                </p>
                <p className={passed ? "text-teal" : "text-coral"}>
                  {passed
                    ? `You're above cutoff by ${finalScore - cutoffMarks} marks 🎯`
                    : `You're ${cutoffMarks - finalScore} marks below cutoff`}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Share Results */}
        <ShareResultsSection
          show={showShare}
          onToggle={() => setShowShare((v) => !v)}
          cardRef={shareCardRef}
          firstName={firstName}
          testName={data.title}
          finalScore={finalScore}
          maxMarks={maxMarks}
          pct={pct}
          gradeLabel={grade.label}
          onDownload={downloadShareCard}
          downloading={downloading}
        />

        <InlineReviewPrompt />
        {Object.keys(sectionStats).length > 1 && (
          <div className="rounded-xl border border-border bg-card p-6">
            <h2 className="font-display text-lg font-semibold">Section-wise breakdown</h2>
            <div className="mt-4 space-y-3">
              {Object.entries(sectionStats).map(([name, s]) => {
                const net = s.marks - s.deduction;
                const max = s.total * (data.pattern?.sections.find((p) => p.name === name)?.marks ?? marksPerQ);
                const secPct = max > 0 ? Math.round((net / max) * 100) : 0;
                return (
                  <div key={name} className="rounded-lg border border-border bg-background p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-medium">{name}</p>
                      <span className="text-sm font-medium">
                        {net}/{max} <span className="text-muted-foreground">({secPct}%)</span>
                      </span>
                    </div>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-secondary">
                      <div
                        className="h-full bg-primary"
                        style={{ width: `${Math.max(0, Math.min(100, secPct))}%` }}
                      />
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {s.correct} correct · {s.wrong} wrong · {s.total - s.attempted} unattempted
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Review */}
        <h2 className="font-display text-lg font-semibold">Review</h2>
        <ol className="space-y-4">
          {data.questions.map((q, i) => {
            const userIdx = data.answers[i];
            const correct = userIdx === q.correct_index;
            const unattempted = userIdx === undefined;
            return (
              <li key={i} className="rounded-xl border border-border bg-card p-5">
                <div className="flex items-start gap-3">
                  <span
                    className={`grid h-7 w-7 shrink-0 place-items-center rounded-full ${
                      unattempted
                        ? "bg-secondary text-muted-foreground"
                        : correct
                          ? "bg-teal/15 text-teal"
                          : "bg-coral/15 text-coral"
                    }`}
                  >
                    {unattempted ? "—" : correct ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">
                      <span className="text-muted-foreground">Q{i + 1}.</span> {q.question}
                    </p>
                    {q.section && (
                      <p className="mt-1 text-xs text-muted-foreground">{q.section}</p>
                    )}
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

function MathRow({
  label,
  value,
  negative,
  bold,
}: {
  label: string;
  value: string;
  negative?: boolean;
  bold?: boolean;
}) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
      <p
        className={`mt-0.5 tabular-nums ${bold ? "font-display text-lg font-bold" : ""} ${
          negative ? "text-coral" : ""
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function formatTime(s: number) {
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}m ${r}s`;
}
