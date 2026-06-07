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
  BookX,
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
  subject?: string;
  chapter?: string;
  topic?: string;
  concept?: string;
  difficulty?: string;
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

        {/* Mistake Book callout */}
        {wrong + (data.total - data.score - wrong) > 0 && (
          <Link
            to="/mistakes"
            className="flex items-center justify-between gap-3 rounded-xl border border-coral/30 bg-coral/5 px-5 py-4 transition hover:border-coral/60"
          >
            <div className="flex items-center gap-3">
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-coral/15 text-coral">
                <BookX className="h-4 w-4" />
              </span>
              <div>
                <p className="font-display text-sm font-semibold">
                  Added {data.total - data.score} question{data.total - data.score === 1 ? "" : "s"} to your Mistake Book
                </p>
                <p className="text-xs text-muted-foreground">
                  Reattempt them to lock concepts in.
                </p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1 text-sm font-medium text-coral">
              Review <ArrowLeft className="h-3.5 w-3.5 rotate-180" />
            </span>
          </Link>
        )}

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
                    {(q.section || q.chapter || q.topic || q.concept || q.difficulty) && (
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                        {q.section && (
                          <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                            {q.section}
                          </span>
                        )}
                        {q.chapter && (
                          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary ring-1 ring-inset ring-primary/20">
                            {q.chapter}
                          </span>
                        )}
                        {q.topic && q.topic !== q.section && (
                          <span className="rounded-full bg-teal/10 px-2 py-0.5 text-[10px] font-medium text-teal ring-1 ring-inset ring-teal/20">
                            {q.topic}
                          </span>
                        )}
                        {q.concept && (
                          <span className="rounded-full bg-purple/10 px-2 py-0.5 text-[10px] font-medium text-purple ring-1 ring-inset ring-purple/20">
                            {q.concept}
                          </span>
                        )}
                        {q.difficulty && (
                          <span className="rounded-full bg-amber/10 px-2 py-0.5 text-[10px] font-medium text-amber ring-1 ring-inset ring-amber/20 capitalize">
                            {q.difficulty}
                          </span>
                        )}
                      </div>
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

function ShareResultsSection({
  show,
  onToggle,
  cardRef,
  firstName,
  testName,
  finalScore,
  maxMarks,
  pct,
  gradeLabel,
  onDownload,
  downloading,
}: {
  show: boolean;
  onToggle: () => void;
  cardRef: React.RefObject<HTMLDivElement | null>;
  firstName: string;
  testName: string;
  finalScore: number;
  maxMarks: number;
  pct: number;
  gradeLabel: string;
  onDownload: () => void;
  downloading: boolean;
}) {
  const gradeColor =
    pct >= 80 ? "#00C9A7" : pct >= 60 ? "#4F8EF7" : pct >= 40 ? "#FFA63D" : "#FF6B6B";
  const dashArray = `${Math.min(339, Math.max(0, pct * 3.39)).toFixed(2)} 339`;
  const today = new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date());

  const waMessage =
    `🎉 Maine PARIKSHA pe ${testName} mein ${pct}% score kiya!\n` +
    `Kya tu beat kar sakta hai?\n` +
    `Try karo free: https://cortex-ai-study.lovable.app`;
  const waHref = `https://wa.me/?text=${encodeURIComponent(waMessage)}`;

  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-semibold">Share your result</h2>
          <p className="text-sm text-muted-foreground">
            Brag a little — challenge friends to beat your score.
          </p>
        </div>
        <Button onClick={onToggle} variant={show ? "outline" : "default"}>
          <Share2 className="mr-2 h-4 w-4" />
          {show ? "Hide card" : "Share Results"}
        </Button>
      </div>

      {show && (
        <div className="mt-6 space-y-4">
          <div className="mx-auto w-full max-w-[420px]">
            <div
              ref={cardRef}
              className="relative overflow-hidden rounded-2xl border border-white/10 p-6 text-white shadow-2xl"
              style={{
                background: "linear-gradient(135deg, #0A0E1A 0%, #141C2E 100%)",
                fontFamily: '"Inter", system-ui, sans-serif',
              }}
            >
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-bold tracking-tight" style={{ fontFamily: '"Space Grotesk", "Inter", sans-serif' }}>
                  <Zap className="h-4 w-4" style={{ color: "#4F8EF7" }} strokeWidth={2.5} />
                  <span>
                    <span
                      style={{
                        background: "linear-gradient(135deg, #4F8EF7, #00C9A7)",
                        WebkitBackgroundClip: "text",
                        WebkitTextFillColor: "transparent",
                      }}
                    >
                      P
                    </span>
                    <span>ARIKSHA</span>
                  </span>
                </div>
                <span className="text-xs text-white/60">{today}</span>
              </div>

              {/* Student */}
              <p className="mt-5 text-sm text-white/60">{firstName}'s result</p>
              <h3
                className="mt-1 line-clamp-2 text-2xl font-bold leading-tight"
                style={{ fontFamily: '"Space Grotesk", "Inter", sans-serif' }}
              >
                {testName}
              </h3>

              {/* Score circle */}
              <div className="mt-6 flex items-center justify-center">
                <div className="relative">
                  <svg width="120" height="120" viewBox="0 0 120 120">
                    <circle
                      cx="60"
                      cy="60"
                      r="54"
                      fill="none"
                      stroke="rgba(255,255,255,0.08)"
                      strokeWidth="10"
                    />
                    <circle
                      cx="60"
                      cy="60"
                      r="54"
                      fill="none"
                      stroke={gradeColor}
                      strokeWidth="10"
                      strokeLinecap="round"
                      strokeDasharray={dashArray}
                      transform="rotate(-90 60 60)"
                    />
                    <text
                      x="60"
                      y="58"
                      textAnchor="middle"
                      fill="#fff"
                      style={{ font: 'bold 26px "Space Grotesk", "Inter", sans-serif' }}
                    >
                      {pct}%
                    </text>
                    <text
                      x="60"
                      y="78"
                      textAnchor="middle"
                      fill="rgba(255,255,255,0.6)"
                      style={{ font: '11px "Inter", sans-serif' }}
                    >
                      score
                    </text>
                  </svg>
                </div>
              </div>

              {/* Score + grade */}
              <div className="mt-4 text-center">
                <p className="font-display text-xl font-bold">
                  {finalScore}
                  <span className="text-white/40"> / {maxMarks}</span>
                </p>
                <span
                  className="mt-2 inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold"
                  style={{
                    background: `${gradeColor}22`,
                    color: gradeColor,
                    border: `1px solid ${gradeColor}55`,
                  }}
                >
                  {gradeLabel}
                </span>
              </div>

              {/* Footer */}
              <p className="mt-6 text-center text-[11px] uppercase tracking-wider text-white/40">
                Powered by PARIKSHA · pariksha.ai
              </p>
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <a
              href={waHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-500/90"
            >
              Share on WhatsApp 📤
            </a>
            <button
              type="button"
              onClick={onDownload}
              disabled={downloading}
              className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
            >
              {downloading ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Rendering…</>
              ) : (
                <><Download className="h-4 w-4" /> Download Image</>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
