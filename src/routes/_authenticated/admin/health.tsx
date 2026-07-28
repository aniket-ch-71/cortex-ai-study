import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/ui-pro/PageHeader";
import { StatCard } from "@/components/ui-pro/StatCard";
import { SectionCard } from "@/components/ui-pro/SectionCard";
import { CoverageHeatmap } from "@/components/admin/CoverageHeatmap";
import { contentHealth, type ContentHealth } from "@/lib/admin/ops";
import { FileText, ClipboardCheck, CheckCircle2, Send, Archive, Flag, Sparkles, TrendingUp } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/health")({
  component: Page,
  head: () => ({ meta: [{ title: "Content health · Admin · PARIKSHA" }, { name: "robots", content: "noindex,nofollow" }] }),
});

function Page() {
  const [h, setH] = useState<ContentHealth | null>(null);
  useEffect(() => { contentHealth().then(setH).catch(() => setH(null)); }, []);
  const t = h?.totals;
  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
      <PageHeader
        eyebrow="Content Operations"
        title="Content health"
        description="Live snapshot of the question bank across workflow, coverage and quality."
        actions={<Link to="/admin/assignments" className="text-sm font-medium text-primary hover:underline">Open assignments →</Link>}
      />

      <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Drafts" value={t?.draft ?? 0} icon={FileText} />
        <StatCard label="In review" value={(t?.human_review ?? 0) + (t?.ai_review ?? 0) + (t?.fact_check ?? 0)} icon={ClipboardCheck} tone="purple" />
        <StatCard label="Approved" value={t?.approved ?? 0} icon={CheckCircle2} tone="teal" />
        <StatCard label="Scheduled" value={t?.scheduled ?? 0} icon={Send} />
        <StatCard label="Published" value={t?.published ?? 0} icon={Send} tone="teal" />
        <StatCard label="Archived" value={t?.archived ?? 0} icon={Archive} />
        <StatCard label="Open reports" value={t?.reported ?? 0} icon={Flag} tone="coral" />
        <StatCard label="Avg quality" value={t?.avg_quality ?? 0} icon={Sparkles} />
      </div>

      <SectionCard title="Coverage by exam × subject" description="Gaps (0 published) highlighted in red" className="mt-6">
        {h ? <CoverageHeatmap coverage={h.coverage} /> : <div className="text-xs text-muted-foreground">Loading…</div>}
      </SectionCard>

      <SectionCard title="Quality trend" description="Snapshot of last publish + review activity" className="mt-4">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <TrendingUp className="h-4 w-4" />
          Detailed time-series charts available in <Link to="/admin/analytics" className="text-primary underline">Analytics</Link>.
        </div>
      </SectionCard>
    </div>
  );
}
