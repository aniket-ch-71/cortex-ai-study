import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { CheckCircle2, XCircle, RotateCcw, MessageSquare } from "lucide-react";
import { listReviews, submitReview, type ReviewRow, type ReviewDecision } from "@/lib/admin/ops";

const ICONS: Record<ReviewDecision, React.ComponentType<{ className?: string }>> = {
  approve: CheckCircle2, reject: XCircle, request_changes: RotateCcw, note: MessageSquare,
};

export function ReviewPanel({ questionId }: { questionId: string }) {
  const [rows, setRows] = useState<ReviewRow[]>([]);
  const [decision, setDecision] = useState<ReviewDecision>("approve");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => { listReviews(questionId).then(setRows).catch(() => {}); }, [questionId]);

  async function send() {
    setBusy(true);
    try {
      await submitReview({ questionId, decision, notes: notes.trim() || undefined });
      toast.success("Review recorded");
      setNotes("");
      setRows(await listReviews(questionId));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to submit review");
    } finally { setBusy(false); }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border/60 bg-card/40 p-3 space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <Select value={decision} onValueChange={(v) => setDecision(v as ReviewDecision)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="approve">Approve</SelectItem>
              <SelectItem value="request_changes">Request changes</SelectItem>
              <SelectItem value="reject">Reject</SelectItem>
              <SelectItem value="note">Note</SelectItem>
            </SelectContent>
          </Select>
          <Button size="sm" onClick={send} disabled={busy}>{busy ? "Sending…" : "Submit review"}</Button>
        </div>
        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Review notes" className="min-h-[80px]" />
      </div>

      <div className="space-y-2">
        {rows.length === 0 ? (
          <div className="rounded-md border border-dashed border-border/70 p-4 text-center text-xs text-muted-foreground">
            No reviews yet.
          </div>
        ) : rows.map((r) => {
          const Icon = ICONS[r.decision];
          const tone = r.decision === "approve" ? "text-emerald-500" : r.decision === "reject" ? "text-rose-500" : r.decision === "request_changes" ? "text-amber-500" : "text-muted-foreground";
          return (
            <div key={r.id} className="flex gap-3 rounded-md border border-border/60 p-3 text-sm">
              <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${tone}`} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">{r.decision.replaceAll("_", " ")}</span>
                  {r.prev_state && r.next_state && (
                    <span>{r.prev_state} → {r.next_state}</span>
                  )}
                  <span>· {formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}</span>
                </div>
                {r.notes && <div className="mt-1 whitespace-pre-wrap text-sm">{r.notes}</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
