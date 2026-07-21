import { CheckCircle2, ArrowRight, Clock, Layers, Target, ListChecks } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface GenerationSummary {
  exam: string;
  subject: string;
  topics?: string;
  count: number;
  difficultyMix: string;
  estimatedMinutes: number;
}

export function GenerationSuccess({
  open,
  summary,
  onStart,
  onClose,
}: {
  open: boolean;
  summary: GenerationSummary | null;
  onStart: () => void;
  onClose: () => void;
}) {
  if (!open || !summary) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-md animate-fade-in">
      <div className="relative mx-4 w-full max-w-md overflow-hidden rounded-2xl border border-border bg-card p-8 shadow-elev-2 animate-scale-in">
        <div className="pointer-events-none absolute -left-14 -top-14 h-40 w-40 rounded-full bg-emerald-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -right-10 -bottom-10 h-40 w-40 rounded-full bg-primary/20 blur-3xl" />

        <div className="relative">
          <div className="mb-4 flex flex-col items-center text-center">
            <div className="grid h-14 w-14 place-items-center rounded-full bg-emerald-500/15 text-emerald-500">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <h3 className="mt-3 font-display text-xl font-bold">Mock Test Ready</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Personalized for {summary.exam}
            </p>
          </div>

          <dl className="mt-4 grid grid-cols-2 gap-3 rounded-xl border border-border bg-secondary/40 p-4 text-sm">
            <SummaryRow icon={<Target className="h-3.5 w-3.5" />} label="Exam" value={summary.exam} />
            <SummaryRow icon={<Layers className="h-3.5 w-3.5" />} label="Subject" value={summary.subject} />
            <SummaryRow icon={<ListChecks className="h-3.5 w-3.5" />} label="Questions" value={String(summary.count)} />
            <SummaryRow icon={<Clock className="h-3.5 w-3.5" />} label="Est. time" value={`${summary.estimatedMinutes} min`} />
            <div className="col-span-2">
              <dt className="mb-0.5 text-xs uppercase tracking-wider text-muted-foreground">Difficulty mix</dt>
              <dd className="font-medium">{summary.difficultyMix}</dd>
            </div>
            {summary.topics && (
              <div className="col-span-2">
                <dt className="mb-0.5 text-xs uppercase tracking-wider text-muted-foreground">Topics</dt>
                <dd className="text-sm">{summary.topics}</dd>
              </div>
            )}
          </dl>

          <div className="mt-6 flex flex-col gap-2">
            <Button size="lg" onClick={onStart} className="w-full group">
              Start Test
              <ArrowRight className="ml-1.5 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Button>
            <Button variant="ghost" onClick={onClose} className="w-full">
              Review later
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SummaryRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div>
      <dt className="mb-0.5 flex items-center gap-1 text-xs uppercase tracking-wider text-muted-foreground">
        {icon} {label}
      </dt>
      <dd className="truncate font-medium">{value}</dd>
    </div>
  );
}
