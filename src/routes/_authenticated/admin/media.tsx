import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/ui-pro/PageHeader";
import { EmptyState } from "@/components/ui-pro/EmptyState";
import { Image as ImageIcon } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/media")({
  component: () => (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
      <PageHeader eyebrow="Assets" title="Media library" description="Diagrams, SVGs and uploads used across the question bank." />
      <EmptyState icon={ImageIcon} title="Ships in Stage 3" description="Centralised media manager with tags, categories and dedupe." />
    </div>
  ),
  head: () => ({ meta: [{ title: "Media · Admin" }, { name: "robots", content: "noindex,nofollow" }] }),
});
