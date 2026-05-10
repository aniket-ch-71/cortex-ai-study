import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Printer, Loader2, RotateCw } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/CopyButton";

export const Route = createFileRoute("/_authenticated/notes/$noteId/")({
  head: () => ({ meta: [{ title: "Note — CORTEX" }] }),
  component: NoteView,
});

type Flashcard = { question: string; answer: string };
type Note = {
  title: string;
  topic: string;
  subject: string;
  content: string;
  flashcards: Flashcard[];
};

function NoteView() {
  const { noteId } = Route.useParams();
  const [note, setNote] = useState<Note | null>(null);
  const [loading, setLoading] = useState(true);
  const [flipped, setFlipped] = useState<Record<number, boolean>>({});

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("notes")
        .select("title, topic, subject, content, flashcards")
        .eq("id", noteId)
        .maybeSingle();
      if (!data) toast.error("Note not found");
      else setNote({ ...(data as any), flashcards: (data.flashcards as Flashcard[]) ?? [] });
      setLoading(false);
    })();
  }, [noteId]);

  const onPrint = () => window.print();

  if (loading || !note) {
    return <div className="flex min-h-[60vh] items-center justify-center text-sm text-muted-foreground"><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading…</div>;
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 md:px-8">
      <div className="flex items-center justify-between gap-4" data-print-hide>
        <Link to="/notes" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Back</Link>
        <div className="flex items-center gap-2">
          <CopyButton text={`${note.title}\n\n${note.content}`} label="Copy notes" />
          <Button variant="outline" size="sm" onClick={onPrint}>
            <Printer className="mr-2 h-4 w-4" /> Print / PDF
          </Button>
        </div>
      </div>

      <div className="print-area mt-6 space-y-6 rounded-xl bg-background p-6">
        <div className="print-card rounded-xl border border-border bg-card p-6">
          <h1 className="font-display text-2xl font-bold">{note.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{note.topic} · {note.subject}</p>
        </div>

        <article className="print-card prose-cortex no-select rounded-xl border border-border bg-card p-6">
          <MarkdownLite source={note.content} />
        </article>

        <div className="print-card rounded-xl border border-border bg-card p-6">
          <h2 className="font-display text-lg font-semibold">Flashcards</h2>
          <p className="mt-1 text-xs text-muted-foreground" data-print-hide>Tap a card to reveal the answer.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {note.flashcards.map((f, i) => (
              <button
                key={i}
                onClick={() => setFlipped((m) => ({ ...m, [i]: !m[i] }))}
                className="print-card group relative min-h-[140px] rounded-lg border border-border bg-background p-4 text-left transition hover:border-primary/40"
              >
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Card {i + 1}</span>
                  <RotateCw className="h-3 w-3 opacity-0 transition group-hover:opacity-100" data-print-hide />
                </div>
                <p className="mt-2 text-sm font-medium no-select">
                  {flipped[i] ? f.answer : f.question}
                </p>
                <p className="mt-2 text-[10px] uppercase tracking-wider text-muted-foreground" data-print-hide>
                  {flipped[i] ? "Answer" : "Question"}
                </p>
                {/* Print: always show both Q and A */}
                <div className="hidden print:block">
                  <p className="mt-2 text-xs"><strong>Q:</strong> {f.question}</p>
                  <p className="mt-1 text-xs"><strong>A:</strong> {f.answer}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// Tiny Markdown renderer: headings, bold, code, lists. Avoids extra deps.
function MarkdownLite({ source }: { source: string }) {
  const lines = source.split("\n");
  const out: React.ReactNode[] = [];
  let listBuf: string[] = [];
  const flushList = () => {
    if (!listBuf.length) return;
    out.push(
      <ul key={out.length} className="my-2 list-disc space-y-1 pl-5 text-sm">
        {listBuf.map((it, i) => <li key={i} dangerouslySetInnerHTML={{ __html: inline(it) }} />)}
      </ul>,
    );
    listBuf = [];
  };
  const inline = (s: string) =>
    s
      .replace(/`([^`]+)`/g, '<code class="rounded bg-secondary px-1 py-0.5 text-xs">$1</code>')
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/\*([^*]+)\*/g, "<em>$1</em>");

  lines.forEach((raw, idx) => {
    const l = raw.trimEnd();
    if (l.startsWith("### ")) {
      flushList();
      out.push(<h3 key={idx} className="mt-4 font-display text-base font-semibold">{l.slice(4)}</h3>);
    } else if (l.startsWith("## ")) {
      flushList();
      out.push(<h2 key={idx} className="mt-5 font-display text-lg font-semibold">{l.slice(3)}</h2>);
    } else if (l.startsWith("# ")) {
      flushList();
      out.push(<h1 key={idx} className="mt-5 font-display text-xl font-bold">{l.slice(2)}</h1>);
    } else if (/^\s*[-*]\s+/.test(l)) {
      listBuf.push(l.replace(/^\s*[-*]\s+/, ""));
    } else if (l === "") {
      flushList();
      out.push(<div key={idx} className="h-2" />);
    } else {
      flushList();
      out.push(<p key={idx} className="text-sm leading-relaxed text-foreground/90" dangerouslySetInnerHTML={{ __html: inline(l) }} />);
    }
  });
  flushList();
  return <>{out}</>;
}
