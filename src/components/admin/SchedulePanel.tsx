import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CalendarClock, X } from "lucide-react";
import { toast } from "sonner";
import { cancelSchedule, scheduleQuestion } from "@/lib/admin/ops";

export function SchedulePanel({ questionId, current }: { questionId: string; current: string | null }) {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const [when, setWhen] = useState<string>(current ? new Date(current).toISOString().slice(0, 16) : "");
  const [busy, setBusy] = useState(false);

  async function save() {
    if (!when) { toast.error("Pick a date and time"); return; }
    setBusy(true);
    try {
      await scheduleQuestion(questionId, new Date(when).toISOString(), tz);
      toast.success(`Scheduled for ${new Date(when).toLocaleString()}`);
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
    finally { setBusy(false); }
  }
  async function cancel() {
    setBusy(true);
    try { await cancelSchedule(questionId); toast.success("Schedule cancelled"); setWhen(""); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
    finally { setBusy(false); }
  }

  return (
    <div className="space-y-3 rounded-lg border border-border/60 bg-card/40 p-3">
      <div className="flex items-center gap-2 text-sm">
        <CalendarClock className="h-4 w-4 text-primary" />
        <span className="font-medium">Schedule publish</span>
        <span className="text-xs text-muted-foreground">({tz})</span>
      </div>
      <Input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} />
      <div className="flex justify-between">
        {current ? <Button size="sm" variant="ghost" onClick={cancel} disabled={busy} className="gap-1.5"><X className="h-3.5 w-3.5" />Cancel schedule</Button> : <span />}
        <Button size="sm" onClick={save} disabled={busy}>{busy ? "Saving…" : "Save schedule"}</Button>
      </div>
      <div className="text-[11px] text-muted-foreground">Publishes automatically every minute via cron.</div>
    </div>
  );
}
