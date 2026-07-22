import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/ui-pro/PageHeader";
import { EmptyState } from "@/components/ui-pro/EmptyState";
import { Flag } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/reports")({
  component: () => (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
      <PageHeader eyebrow="Moderation" title="Question reports" description="Triage student-submitted flags." />
      <EmptyState icon={Flag} title="Ships in Stage 4" description="Full moderation workflow: resolve, reject, edit, merge duplicates." />
    </div>
  ),
  head: () => ({ meta: [{ title: "Reports · Admin" }, { name: "robots", content: "noindex,nofollow" }] }),
});
