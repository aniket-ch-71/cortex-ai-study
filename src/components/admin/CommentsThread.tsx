import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2, Reply } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { addComment, listComments, resolveComment, type CommentRow } from "@/lib/admin/ops";

export function CommentsThread({ questionId }: { questionId: string }) {
  const [rows, setRows] = useState<CommentRow[]>([]);
  const [body, setBody] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function refresh() {
    try { setRows(await listComments(questionId)); } catch { /* noop */ }
  }
  useEffect(() => { refresh(); }, [questionId]);

  async function send() {
    if (!body.trim()) return;
    setBusy(true);
    try {
      await addComment({ questionId, parentId: replyTo, body: body.trim() });
      setBody(""); setReplyTo(null);
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to comment");
    } finally { setBusy(false); }
  }

  async function resolve(id: string) {
    try { await resolveComment(id); await refresh(); toast.success("Resolved"); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Failed to resolve"); }
  }

  const roots = rows.filter((r) => !r.parent_id);

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-border/60 bg-card/40 p-3 space-y-2">
        {replyTo && (
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Replying to a thread</span>
            <button className="underline" onClick={() => setReplyTo(null)}>cancel</button>
          </div>
        )}
        <Textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Write a comment (use @ to mention staff)" className="min-h-[70px]" />
        <div className="flex justify-end">
          <Button size="sm" onClick={send} disabled={busy || !body.trim()}>{busy ? "Sending…" : "Post"}</Button>
        </div>
      </div>

      <div className="space-y-2">
        {roots.length === 0 && <div className="rounded-md border border-dashed border-border/70 p-4 text-center text-xs text-muted-foreground">No discussion yet.</div>}
        {roots.map((r) => {
          const replies = rows.filter((c) => c.parent_id === r.id);
          return (
            <div key={r.id} className={`rounded-md border p-3 ${r.resolved_at ? "border-border/40 bg-muted/30 opacity-70" : "border-border/60"}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] text-muted-foreground">{formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}</div>
                  <div className="mt-0.5 whitespace-pre-wrap text-sm">{r.body}</div>
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => setReplyTo(r.id)}><Reply className="h-3.5 w-3.5" /></Button>
                  {!r.resolved_at && <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => resolve(r.id)}><CheckCircle2 className="h-3.5 w-3.5" /></Button>}
                </div>
              </div>
              {replies.length > 0 && (
                <div className="mt-2 space-y-2 border-l border-border/60 pl-3">
                  {replies.map((c) => (
                    <div key={c.id} className="text-sm">
                      <div className="text-[11px] text-muted-foreground">{formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}</div>
                      <div className="whitespace-pre-wrap">{c.body}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
