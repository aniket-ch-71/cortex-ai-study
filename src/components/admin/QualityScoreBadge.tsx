import { cn } from "@/lib/utils";
import { verdictLabel } from "@/lib/admin/permissions";

export function QualityScoreBadge({ score, className }: { score: number | null | undefined; className?: string }) {
  const v = verdictLabel(score ?? null);
  const tone = v.tone === "green" ? "bg-emerald-500/15 text-emerald-500 ring-emerald-500/30"
    : v.tone === "amber" ? "bg-amber-500/15 text-amber-500 ring-amber-500/30"
    : v.tone === "red" ? "bg-rose-500/15 text-rose-500 ring-rose-500/30"
    : "bg-muted text-muted-foreground ring-border";
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset", tone, className)}>
      <span>{v.label}</span>
      {typeof score === "number" && <span className="tabular-nums opacity-80">{score}</span>}
    </span>
  );
}
