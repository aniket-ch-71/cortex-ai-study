import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Printer, Loader2, RotateCw, Info } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { CopyButton } from "@/components/CopyButton";
import { InlineReviewPrompt } from "@/components/InlineReviewPrompt";

export const Route = createFileRoute("/_authenticated/notes/$noteId/")({
  head: () => ({ meta: [{ title: "Note — PARIKSHA" }] }),
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
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-sm text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading…
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 md:px-8">
      <div className="flex flex-wrap items-center justify-between gap-3" data-print-hide>
        <Link
          to="/notes"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>
        <div className="flex items-center gap-2">
          <CopyButton text={`${note.title}\n\n${note.content}`} label="Copy notes" />
          <button
            type="button"
            onClick={onPrint}
            className="inline-flex items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm hover:bg-secondary transition"
          >
            <Printer className="h-4 w-4" />
            Print / Save PDF
          </button>
        </div>
      </div>

      <p
        className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground"
        data-print-hide
      >
        <Info className="h-3 w-3" />
        Mobile: use your browser's Share button → Print → Save as PDF.
      </p>

      <div className="print-content mt-6 space-y-6 rounded-xl bg-background p-2 md:p-6">
        <div className="print-card rounded-xl border border-border bg-card p-6">
          <h1 className="font-display text-2xl font-bold">{note.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {note.topic} · {note.subject}
          </p>
        </div>

        <article className="print-card prose-cortex no-select rounded-xl border border-border bg-card p-6">
          <MarkdownLite source={note.content} />
        </article>

        <div className="print-card rounded-xl border border-border bg-card p-6">
          <h2 className="font-display text-lg font-semibold">Flashcards</h2>
          <p className="mt-1 text-xs text-muted-foreground" data-print-hide>
            Tap a card to reveal the answer.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {note.flashcards.map((f, i) => (
              <div
                key={i}
                onClick={() => setFlipped((m) => ({ ...m, [i]: !m[i] }))}
                role="button"
                tabIndex={0}
                className="print-card group relative min-h-[140px] cursor-pointer rounded-lg border border-border bg-background p-4 text-left transition hover:border-primary/40"
              >
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Card {i + 1}</span>
                  <RotateCw
                    className="h-3 w-3 opacity-0 transition group-hover:opacity-100"
                    data-print-hide
                  />
                </div>
                <p className="mt-2 text-sm font-medium no-select print:hidden">
                  {flipped[i] ? f.answer : f.question}
                </p>
                <p
                  className="mt-2 text-[10px] uppercase tracking-wider text-muted-foreground"
                  data-print-hide
                >
                  {flipped[i] ? "Answer" : "Question"}
                </p>
                {/* Print: always show both Q and A */}
                <div className="hidden print:block">
                  <p className="mt-2 text-xs">
                    <strong>Q:</strong> {f.question}
                  </p>
                  <p className="mt-1 text-xs">
                    <strong>A:</strong> {f.answer}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div data-print-hide>
        <InlineReviewPrompt delayMs={30000} />
      </div>
    </div>
  );
}

function inline(s: string) {
  return s
    .replace(/`([^`]+)`/g, '<code class="rounded bg-secondary px-1 py-0.5 text-xs">$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>");
}

function MarkdownLite({ source }: { source: string }) {
  const lines = source.split("\n");
  const out: React.ReactNode[] = [];
  let listBuf: string[] = [];
  let codeBuf: string[] = [];
  let inCode = false;

  const flushList = () => {
    if (!listBuf.length) return;
    out.push(
      <ul key={`ul-${out.length}`} className="my-2 list-disc space-y-1 pl-5 text-sm">
        {listBuf.map((it, i) => (
          <li key={i} dangerouslySetInnerHTML={{ __html: inline(it) }} />
        ))}
      </ul>,
    );
    listBuf = [];
  };

  const flushCode = () => {
    if (!codeBuf.length) return;
    out.push(
      <pre
        key={`code-${out.length}`}
        className="my-3 overflow-x-auto rounded-md border border-border bg-secondary p-3 text-xs"
      >
        <code>{codeBuf.join("\n")}</code>
      </pre>,
    );
    codeBuf = [];
  };

  lines.forEach((raw, idx) => {
    const l = raw.trimEnd();

    if (l.startsWith("```")) {
      if (!inCode) {
        flushList();
        inCode = true;
      } else {
        inCode = false;
        flushCode();
      }
      return;
    }

    if (inCode) {
      codeBuf.push(raw);
      return;
    }

    if (l.startsWith("### ")) {
      flushList();
      out.push(
        <h3 key={idx} className="mt-4 font-display text-base font-semibold">
          {l.slice(4)}
        </h3>,
      );
    } else if (l.startsWith("## ")) {
      flushList();
      out.push(
        <h2 key={idx} className="mt-5 font-display text-lg font-semibold">
          {l.slice(3)}
        </h2>,
      );
    } else if (l.startsWith("# ")) {
      flushList();
      out.push(
        <h1 key={idx} className="mt-5 font-display text-xl font-bold">
          {l.slice(2)}
        </h1>,
      );
    } else if (/^\s*[-*]\s+/.test(l)) {
      listBuf.push(l.replace(/^\s*[-*]\s+/, ""));
    } else if (l === "") {
      flushList();
      out.push(<div key={idx} className="h-2" />);
    } else {
      flushList();
      out.push(
        <p
          key={idx}
          className="text-sm leading-relaxed text-foreground/90"
          dangerouslySetInnerHTML={{ __html: inline(l) }}
        />,
      );
    }
  });
  flushList();
  flushCode();
  return <>{out}</>;
}
