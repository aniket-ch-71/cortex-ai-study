import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, FileDown, Loader2, RotateCw } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

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
  const [exporting, setExporting] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

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

  const exportPdf = async () => {
    if (!printRef.current || !note) return;
    setExporting(true);
    try {
      const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
        import("html2canvas"), import("jspdf"),
      ]);
      const canvas = await html2canvas(printRef.current, { backgroundColor: "#0A0E1A", scale: 2 });
      const img = canvas.toDataURL("image/png");
      const pdf = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
      const pw = pdf.internal.pageSize.getWidth();
      const ph = pdf.internal.pageSize.getHeight();
      const ih = (canvas.height * pw) / canvas.width;
      let left = ih, pos = 0;
      pdf.addImage(img, "PNG", 0, pos, pw, ih);
      left -= ph;
      while (left > 0) {
        pos = left - ih;
        pdf.addPage();
        pdf.addImage(img, "PNG", 0, pos, pw, ih);
        left -= ph;
      }
      pdf.save(`${note.title.replace(/[^a-z0-9]+/gi, "_")}.pdf`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Export failed");
    } finally {
      setExporting(false);
    }
  };

  if (loading || !note) {
    return <div className="flex min-h-[60vh] items-center justify-center text-sm text-muted-foreground"><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading…</div>;
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 md:px-8">
      <div className="flex items-center justify-between gap-4">
        <Link to="/notes" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Back</Link>
        <Button variant="outline" size="sm" onClick={exportPdf} disabled={exporting}>
          {exporting ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Exporting…</>) : (<><FileDown className="mr-2 h-4 w-4" /> Export PDF</>)}
        </Button>
      </div>

      <div ref={printRef} className="mt-6 space-y-6 rounded-xl bg-background p-6">
        <div className="rounded-xl border border-border bg-card p-6">
          <h1 className="font-display text-2xl font-bold">{note.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{note.topic} · {note.subject}</p>
        </div>

        <article className="prose-cortex rounded-xl border border-border bg-card p-6">
          <MarkdownLite source={note.content} />
        </article>

        <div className="rounded-xl border border-border bg-card p-6">
          <h2 className="font-display text-lg font-semibold">Flashcards</h2>
          <p className="mt-1 text-xs text-muted-foreground">Tap a card to reveal the answer.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {note.flashcards.map((f, i) => (
              <button
                key={i}
                onClick={() => setFlipped((m) => ({ ...m, [i]: !m[i] }))}
                className="group relative min-h-[140px] rounded-lg border border-border bg-background p-4 text-left transition hover:border-primary/40"
              >
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Card {i + 1}</span>
                  <RotateCw className="h-3 w-3 opacity-0 transition group-hover:opacity-100" />
                </div>
                <p className="mt-2 text-sm font-medium">
                  {flipped[i] ? f.answer : f.question}
                </p>
                <p className="mt-2 text-[10px] uppercase tracking-wider text-muted-foreground">
                  {flipped[i] ? "Answer" : "Question"}
                </p>
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
