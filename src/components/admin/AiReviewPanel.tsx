import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2, AlertTriangle, Lightbulb } from "lucide-react";
import { toast } from "sonner";
import { runAiReview, type AiVerdict } from "@/lib/admin/ops";
import { QualityScoreBadge } from "./QualityScoreBadge";
import { cn } from "@/lib/utils";

const COMPONENT_LABELS: Record<string, string> = {
  question_clarity: "Clarity",
  explanation_quality: "Explanation",
  metadata_completeness: "Metadata",
  difficulty_consistency: "Difficulty",
  exam_alignment: "Exam fit",
  language_quality: "Language",
  distractor_quality: "Distractors",
  formatting: "Formatting",
};

const SEV_TONE = {
  low: "bg-muted text-muted-foreground",
  medium: "bg-amber-500/15 text-amber-500 ring-amber-500/30",
  high: "bg-rose-500/15 text-rose-500 ring-rose-500/30",
  critical: "bg-rose-600/20 text-rose-500 ring-rose-500/40",
} as const;

export function AiReviewPanel({ questionId, initial }: { questionId: string; initial?: AiVerdict | null }) {
  const [verdict, setVerdict] = useState<AiVerdict | null>(initial ?? null);
  const [busy, setBusy] = useState(false);

  async function run() {
    setBusy(true);
    try {
      const v = await runAiReview(questionId);
      setVerdict(v);
      toast.success("AI review complete");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "AI review failed");
    } finally { setBusy(false); }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-lg border border-border/60 bg-card/40 p-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <div>
            <div className="text-sm font-medium">AI QA Reviewer</div>
            <div className="text-xs text-muted-foreground">Never publishes automatically. Suggestions only.</div>
          </div>
        </div>
        <Button size="sm" onClick={run} disabled={busy} className="gap-1.5">
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
          {verdict ? "Re-run review" : "Run AI review"}
        </Button>
      </div>

      {verdict && (
        <>
          <div className="flex items-center gap-3 rounded-lg border border-border/60 bg-card/40 p-3">
            <div className="text-3xl font-bold tabular-nums">{verdict.overall_score}</div>
            <QualityScoreBadge score={verdict.overall_score} />
          </div>

          <div className="grid grid-cols-2 gap-2 rounded-lg border border-border/60 bg-card/40 p-3 sm:grid-cols-4">
            {Object.entries(verdict.components).map(([k, v]) => (
              <div key={k} className="space-y-1">
                <div className="flex items-baseline justify-between text-xs">
                  <span className="text-muted-foreground">{COMPONENT_LABELS[k] ?? k}</span>
                  <span className="font-medium tabular-nums">{v}</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                  <div className={cn("h-full rounded-full", v >= 80 ? "bg-emerald-500" : v >= 60 ? "bg-amber-500" : "bg-rose-500")} style={{ width: `${Math.max(4, Math.min(100, v))}%` }} />
                </div>
              </div>
            ))}
          </div>

          {verdict.issues.length > 0 && (
            <div className="space-y-2 rounded-lg border border-border/60 bg-card/40 p-3">
              <div className="flex items-center gap-2 text-sm font-medium"><AlertTriangle className="h-4 w-4 text-amber-500" />Issues</div>
              {verdict.issues.map((it, i) => (
                <div key={i} className="flex gap-2 text-sm">
                  <span className={cn("shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium uppercase ring-1 ring-inset", SEV_TONE[it.severity])}>{it.severity}</span>
                  <div><span className="text-xs text-muted-foreground">{it.category.replaceAll("_", " ")}: </span>{it.message}</div>
                </div>
              ))}
            </div>
          )}

          {verdict.suggestions.length > 0 && (
            <div className="space-y-2 rounded-lg border border-border/60 bg-card/40 p-3">
              <div className="flex items-center gap-2 text-sm font-medium"><Lightbulb className="h-4 w-4 text-primary" />Suggestions</div>
              <ul className="list-disc space-y-1 pl-5 text-sm">
                {verdict.suggestions.map((s, i) => <li key={i}>{s}</li>)}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
}
