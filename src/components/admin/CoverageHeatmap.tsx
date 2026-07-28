import { cn } from "@/lib/utils";
import type { ContentHealth } from "@/lib/admin/ops";

export function CoverageHeatmap({ coverage }: { coverage: ContentHealth["coverage"] }) {
  if (!coverage.length) return <div className="text-xs text-muted-foreground">No coverage data yet.</div>;
  const max = Math.max(1, ...coverage.map((c) => c.published + c.drafts));
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="text-left text-muted-foreground">
            <th className="py-1.5 pr-3">Exam</th>
            <th className="py-1.5 pr-3">Subject</th>
            <th className="py-1.5 pr-3 text-right">Published</th>
            <th className="py-1.5 pr-3 text-right">Drafts</th>
            <th className="py-1.5">Coverage</th>
          </tr>
        </thead>
        <tbody>
          {coverage.map((c) => {
            const total = c.published + c.drafts;
            const pubPct = total ? (c.published / max) * 100 : 0;
            const draftPct = total ? (c.drafts / max) * 100 : 0;
            const gap = c.published === 0;
            return (
              <tr key={`${c.exam}::${c.subject}`} className="border-t border-border/50">
                <td className="py-1.5 pr-3 font-medium">{c.exam}</td>
                <td className="py-1.5 pr-3">{c.subject}</td>
                <td className={cn("py-1.5 pr-3 text-right tabular-nums", gap ? "text-rose-500" : "text-emerald-500")}>{c.published}</td>
                <td className="py-1.5 pr-3 text-right tabular-nums text-muted-foreground">{c.drafts}</td>
                <td className="py-1.5">
                  <div className="flex h-2 w-40 overflow-hidden rounded-full bg-muted">
                    <div className="bg-emerald-500" style={{ width: `${pubPct}%` }} />
                    <div className="bg-amber-500/70" style={{ width: `${draftPct}%` }} />
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
