import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { assignQuestion, listStaff } from "@/lib/admin/ops";
import { UserPlus } from "lucide-react";

export function AssignDialog({ questionId, trigger }: { questionId: string; trigger?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [staff, setStaff] = useState<{ id: string; name: string }[]>([]);
  const [toUser, setToUser] = useState<string>("");
  const [due, setDue] = useState<string>("");
  const [priority, setPriority] = useState<"low" | "normal" | "high" | "urgent">("normal");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (open) listStaff().then(setStaff); }, [open]);

  async function submit() {
    if (!toUser) { toast.error("Pick a reviewer"); return; }
    setBusy(true);
    try {
      await assignQuestion({
        questionId, toUserId: toUser,
        dueAt: due ? new Date(due).toISOString() : null,
        priority, notes: notes.trim() || null,
      });
      toast.success("Assigned");
      setOpen(false); setToUser(""); setDue(""); setNotes(""); setPriority("normal");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to assign");
    } finally { setBusy(false); }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger ?? <Button size="sm" variant="outline" className="gap-1.5"><UserPlus className="h-3.5 w-3.5" />Assign</Button>}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Assign question</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <label className="block text-xs font-medium text-muted-foreground">Reviewer
            <Select value={toUser} onValueChange={setToUser}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Pick a staff member" /></SelectTrigger>
              <SelectContent>
                {staff.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </label>
          <label className="block text-xs font-medium text-muted-foreground">Due date
            <Input type="datetime-local" value={due} onChange={(e) => setDue(e.target.value)} className="mt-1" />
          </label>
          <label className="block text-xs font-medium text-muted-foreground">Priority
            <Select value={priority} onValueChange={(v) => setPriority(v as typeof priority)}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
              </SelectContent>
            </Select>
          </label>
          <label className="block text-xs font-medium text-muted-foreground">Notes
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional context" className="mt-1 min-h-[80px]" />
          </label>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={submit} disabled={busy}>{busy ? "Assigning…" : "Assign"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
