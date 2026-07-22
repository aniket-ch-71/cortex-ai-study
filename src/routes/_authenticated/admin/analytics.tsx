import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/ui-pro/PageHeader";
import { EmptyState } from "@/components/ui-pro/EmptyState";
import { BarChart3 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/analytics")({
  component: () => (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
      <PageHeader eyebrow="Insights" title="Content analytics" description="Coverage, quality and gap analysis." />
      <EmptyState icon={BarChart3} title="Ships in Stage 4" description="Question coverage, quality distribution, missing chapters and more." />
    </div>
  ),
  head: () => ({ meta: [{ title: "Analytics · Admin" }, { name: "robots", content: "noindex,nofollow" }] }),
});
