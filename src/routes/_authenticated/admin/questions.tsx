import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/ui-pro/PageHeader";
import { EmptyState } from "@/components/ui-pro/EmptyState";
import { FileQuestion } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/questions")({
  component: () => (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
      <PageHeader eyebrow="Content" title="Question library" description="Search, review, edit, and publish questions." />
      <EmptyState
        icon={FileQuestion}
        title="Ships in Stage 2"
        description="Enterprise question list with server-side filters, bulk actions, keyboard shortcuts and the rich editor arrives in the next stage."
      />
    </div>
  ),
  head: () => ({ meta: [{ title: "Questions · Admin" }, { name: "robots", content: "noindex,nofollow" }] }),
});
