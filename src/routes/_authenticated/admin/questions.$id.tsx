import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { QuestionEditor } from "@/components/admin/QuestionEditor";
import { WorkflowStepper } from "@/components/admin/WorkflowStepper";
import { AiReviewPanel } from "@/components/admin/AiReviewPanel";
import { ReviewPanel } from "@/components/admin/ReviewPanel";
import { CommentsThread } from "@/components/admin/CommentsThread";
import { SchedulePanel } from "@/components/admin/SchedulePanel";
import { AssignDialog } from "@/components/admin/AssignDialog";
import { QualityScoreBadge } from "@/components/admin/QualityScoreBadge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useStaffRole } from "@/hooks/useStaffRole";
import type { WorkflowState, Role } from "@/lib/admin/permissions";
import type { AiVerdict } from "@/lib/admin/ops";

function Page() {
  const { id } = Route.useParams();
  const { roles } = useStaffRole();
  const [meta, setMeta] = useState<{ workflow_state: WorkflowState; ai_review: AiVerdict | null; quality_score: number | null; scheduled_publish_at: string | null } | null>(null);

  async function refresh() {
    const { data } = await supabase
      .from("question_bank")
      .select("workflow_state, ai_review, quality_score, scheduled_publish_at")
      .eq("id", id).maybeSingle();
    if (data) setMeta(data as never);
  }
  useEffect(() => { refresh(); }, [id]);

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8">
      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="min-w-0">
          <QuestionEditor mode="edit" questionId={id} />
        </div>
        <aside className="min-w-0 space-y-3">
          <div className="flex items-center justify-between rounded-lg border border-border/60 bg-card/40 p-3">
            <div className="flex items-center gap-2">
              <QualityScoreBadge score={meta?.quality_score} />
              <span className="text-xs text-muted-foreground">{meta?.workflow_state?.replaceAll("_"," ") ?? "—"}</span>
            </div>
            <AssignDialog questionId={id} />
          </div>
          <Tabs defaultValue="workflow" className="rounded-lg border border-border/60 bg-card/40 p-3">
            <TabsList className="grid grid-cols-5">
              <TabsTrigger value="workflow">Flow</TabsTrigger>
              <TabsTrigger value="ai">AI</TabsTrigger>
              <TabsTrigger value="reviews">Reviews</TabsTrigger>
              <TabsTrigger value="comments">Chat</TabsTrigger>
              <TabsTrigger value="schedule">Sched</TabsTrigger>
            </TabsList>
            <TabsContent value="workflow" className="pt-3">
              {meta && <WorkflowStepper state={meta.workflow_state} roles={roles as Role[]} questionId={id} onChange={() => refresh()} />}
            </TabsContent>
            <TabsContent value="ai" className="pt-3">
              <AiReviewPanel questionId={id} initial={meta?.ai_review ?? null} />
            </TabsContent>
            <TabsContent value="reviews" className="pt-3">
              <ReviewPanel questionId={id} />
            </TabsContent>
            <TabsContent value="comments" className="pt-3">
              <CommentsThread questionId={id} />
            </TabsContent>
            <TabsContent value="schedule" className="pt-3">
              <SchedulePanel questionId={id} current={meta?.scheduled_publish_at ?? null} />
            </TabsContent>
          </Tabs>
        </aside>
      </div>
    </div>
  );
}

export const Route = createFileRoute("/_authenticated/admin/questions/$id")({
  component: Page,
  head: () => ({ meta: [{ title: "Edit question · Admin · Pariksha" }, { name: "robots", content: "noindex,nofollow" }] }),
});
