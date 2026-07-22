import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/ui-pro/PageHeader";
import { EmptyState } from "@/components/ui-pro/EmptyState";
import { Upload } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/import")({
  component: () => (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
      <PageHeader eyebrow="Ingest" title="Bulk import" description="CSV, JSON, and XLSX pipelines with pre-flight validation." />
      <EmptyState icon={Upload} title="Ships in Stage 3" description="Import pipeline with error reporting, dedupe and rollback." />
    </div>
  ),
  head: () => ({ meta: [{ title: "Bulk Import · Admin" }, { name: "robots", content: "noindex,nofollow" }] }),
});
