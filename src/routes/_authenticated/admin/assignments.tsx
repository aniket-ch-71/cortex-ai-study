import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/ui-pro/PageHeader";
import { SectionCard } from "@/components/ui-pro/SectionCard";
import { EmptyState } from "@/components/ui-pro/EmptyState";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ClipboardList, Filter, AlertCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { listAssignments, updateAssignmentStatus, type AssignmentStatus } from "@/lib/admin/ops";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/assignments")({
  component: Page,
  head: () => ({ meta: [{ title: "Assignments · Admin · PARIKSHA" }, { name: "robots", content: "noindex,nofollow" }] }),
});

const STATUS_COLS: AssignmentStatus[] = ["open", "in_progress", "submitted", "completed"];

type Row = Awaited<ReturnType<typeof listAssignments>>[number];

function Page() {
  const [mine, setMine] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);

  async function load() {
    try { setRows(await listAssignments({ mine })); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
  }
  useEffect(() => { load(); }, [mine]);

  async function move(id: string, s: AssignmentStatus) {
    try { await updateAssignmentStatus(id, s); await load(); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
  }

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8">
      <PageHeader
        eyebrow="Content Operations"
        title="Assignments"
        description="Track question review tasks across the team."
        actions={
          <Select value={mine ? "mine" : "all"} onValueChange={(v) => setMine(v === "mine")}>
            <SelectTrigger className="w-[160px]"><Filter className="mr-1.5 h-3.5 w-3.5" /><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All assignments</SelectItem>
              <SelectItem value="mine">Assigned to me</SelectItem>
            </SelectContent>
          </Select>
        }
      />

      {rows.length === 0 ? (
        <SectionCard className="mt-6">
          <EmptyState icon={ClipboardList} title="No assignments" description="Assign a question from its editor to see it here." />
        </SectionCard>
      ) : (
        <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {STATUS_COLS.map((col) => (
            <div key={col} className="rounded-lg border border-border/60 bg-card/40 p-3">
              <div className="mb-2 flex items-center justify-between text-xs uppercase tracking-wide text-muted-foreground">
                <span>{col.replaceAll("_", " ")}</span>
                <span>{rows.filter((r) => r.status === col).length}</span>
              </div>
              <div className="space-y-2">
                {rows.filter((r) => r.status === col).map((r) => (
                  <div key={r.id} className="rounded-md border border-border/60 bg-background/60 p-2.5 text-sm shadow-sm">
                    <div className="flex items-center justify-between text-[10px] uppercase tracking-wide">
                      <span className={r.priority === "urgent" ? "text-rose-500" : r.priority === "high" ? "text-amber-500" : "text-muted-foreground"}>{r.priority}</span>
                      {r.due_at && <span className="text-muted-foreground">due {formatDistanceToNow(new Date(r.due_at), { addSuffix: true })}</span>}
                    </div>
                    <Link to="/admin/questions/$id" params={{ id: r.question_id }} className="mt-1 line-clamp-2 block font-medium hover:text-primary">
                      {r.question_bank?.question ?? r.question_id}
                    </Link>
                    <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground">
                      <span>{r.question_bank?.subject}</span>
                      {r.notes && <span title={r.notes}><AlertCircle className="h-3 w-3" /></span>}
                    </div>
                    <div className="mt-2 flex gap-1">
                      {STATUS_COLS.filter((s) => s !== r.status).map((s) => (
                        <Button key={s} size="sm" variant="ghost" className="h-6 px-2 text-[10px]" onClick={() => move(r.id, s)}>
                          →{s.replace("_", " ")}
                        </Button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
