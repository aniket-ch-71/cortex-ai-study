import { useState } from "react";
import { Check, ChevronRight, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { allowedTransitions, WORKFLOW_ORDER, type WorkflowState } from "@/lib/admin/permissions";
import { transitionState } from "@/lib/admin/ops";

export function WorkflowStepper({ state, roles, questionId, onChange }: {
  state: WorkflowState;
  roles: string[];
  questionId: string;
  onChange?: (next: WorkflowState) => void;
}) {
  const [busy, setBusy] = useState<WorkflowState | null>(null);
  const [note, setNote] = useState("");
  const nexts = allowedTransitions(roles, state);

  const activeIdx = WORKFLOW_ORDER.indexOf(state);

  async function move(to: WorkflowState) {
    setBusy(to);
    try {
      const next = await transitionState(questionId, to, note.trim() || undefined);
      toast.success(`Moved to ${next}`);
      setNote("");
      onChange?.(next);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to transition");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-4">
      <ol className="flex flex-wrap items-center gap-1.5 text-xs">
        {WORKFLOW_ORDER.filter((s) => s !== "deprecated").map((s, i) => {
          const done = i < activeIdx;
          const active = i === activeIdx;
          return (
            <li key={s} className="flex items-center gap-1.5">
              <span className={cn(
                "flex items-center gap-1 rounded-md px-2 py-1 ring-1 ring-inset",
                active ? "bg-primary/15 text-primary ring-primary/30 font-medium"
                  : done ? "bg-emerald-500/10 text-emerald-500 ring-emerald-500/20"
                  : "bg-muted/60 text-muted-foreground ring-border",
              )}>
                {done && <Check className="h-3 w-3" />}
                {s.replaceAll("_", " ")}
              </span>
              {i < WORKFLOW_ORDER.length - 2 && <ChevronRight className="h-3 w-3 text-muted-foreground/50" />}
            </li>
          );
        })}
      </ol>

      {nexts.length ? (
        <div className="space-y-2 rounded-lg border border-border/60 bg-card/40 p-3">
          <div className="text-xs font-medium text-muted-foreground">Transition to</div>
          <div className="flex flex-wrap gap-2">
            {nexts.map((t) => (
              <Button
                key={t} size="sm" variant="secondary"
                disabled={busy != null}
                onClick={() => move(t)}
                className="h-8 gap-1.5"
              >
                {busy === t ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ChevronRight className="h-3.5 w-3.5" />}
                {t.replaceAll("_", " ")}
              </Button>
            ))}
          </div>
          <Textarea
            value={note} onChange={(e) => setNote(e.target.value)}
            placeholder="Optional note recorded with the transition"
            className="min-h-[60px] text-sm"
          />
        </div>
      ) : (
        <div className="rounded-md border border-dashed border-border/70 bg-muted/30 p-3 text-xs text-muted-foreground">
          No transitions available from <span className="font-medium">{state}</span> for your role.
        </div>
      )}
    </div>
  );
}
