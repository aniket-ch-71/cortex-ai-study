import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Newspaper,
  RefreshCw,
  Loader2,
  Printer,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/current-affairs/")({
  head: () => ({
    meta: [
      { title: "Current Affairs — CORTEX" },
      { name: "description", content: "Today's top current affairs for SSC, UPSC, Banking, Railway, CDS." },
    ],
  }),
  component: CurrentAffairsPage,
});

type Question = {
  question: string;
  options: string[];
  correct_index: number;
  explanation: string;
};
type Affair = {
  headline: string;
  explanation: string;
  exam_tags: string[];
  questions: Question[];
};

const TAB_FILTERS = ["All", "SSC", "UPSC", "Banking", "Railway", "CDS", "Defence"] as const;
type Tab = (typeof TAB_FILTERS)[number];

const TAG_COLOR: Record<string, string> = {
  SSC: "bg-primary/15 text-primary border-primary/30",
  UPSC: "bg-purple/15 text-purple border-purple/30",
  Banking: "bg-teal/15 text-teal border-teal/30",
  Railway: "bg-amber/15 text-amber border-amber/30",
  CDS: "bg-coral/15 text-coral border-coral/30",
  Defence: "bg-coral/15 text-coral border-coral/30",
};

function CurrentAffairsPage() {
  const [items, setItems] = useState<Affair[] | null>(null);
  const [date, setDate] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("All");

  const load = async (force = false) => {
    setError(null);
    if (force) setRefreshing(true);
    else setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-current-affairs", {
        body: { force },
      });
      if (error) throw error;
      setItems((data?.items as Affair[]) ?? []);
      setDate(data?.date ?? null);
    } catch (e: any) {
      console.error(e);
      setError(e?.message ?? "Failed to load");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    load(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    if (!items) return [];
    if (tab === "All") return items;
    return items.filter((i) =>
      (i.exam_tags ?? []).some((t) => t.toLowerCase().includes(tab.toLowerCase())),
    );
  }, [items, tab]);

  const fmtDate = date
    ? new Date(date + "T00:00:00").toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      })
    : "";

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 md:px-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between" data-print-hide>
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-lg bg-primary/15 text-primary">
            <Newspaper className="h-5 w-5" />
          </span>
          <div>
            <h1 className="font-display text-2xl font-bold md:text-3xl">Current Affairs</h1>
            <p className="text-sm text-muted-foreground">{fmtDate || "Today's digest"}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="mr-2 h-4 w-4" /> Download PDF
          </Button>
          <Button size="sm" onClick={() => load(true)} disabled={refreshing}>
            {refreshing ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Refresh
          </Button>
        </div>
      </div>

      <div className="mt-6" data-print-hide>
        <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)}>
          <TabsList className="flex w-full flex-wrap gap-1 overflow-x-auto">
            {TAB_FILTERS.map((t) => (
              <TabsTrigger key={t} value={t} className="text-xs sm:text-sm">
                {t}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      <p className="mt-3 text-xs text-muted-foreground" data-print-hide>
        Content in English.
      </p>

      <div className="print-content mt-6 space-y-4">
        {loading ? (
          <SkeletonList />
        ) : error ? (
          <ErrorState onRetry={() => load(false)} message={error} />
        ) : filtered.length === 0 ? (
          <EmptyState onRefresh={() => load(true)} />
        ) : (
          filtered.map((a, idx) => <AffairCard key={idx} affair={a} />)
        )}
      </div>
    </div>
  );
}

function AffairCard({ affair }: { affair: Affair }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="print-card rounded-xl border border-border bg-card p-5">
      <h2 className="font-display text-lg font-bold leading-snug md:text-xl">{affair.headline}</h2>
      <p className="mt-2 text-sm leading-relaxed text-foreground/85">{affair.explanation}</p>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {(affair.exam_tags ?? []).map((t) => (
          <span
            key={t}
            className={cn(
              "rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider",
              TAG_COLOR[t] ?? "border-border bg-secondary text-muted-foreground",
            )}
          >
            {t}
          </span>
        ))}
      </div>

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
        data-print-hide
      >
        {open ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        {open ? "Hide MCQs" : "Practice MCQs"}
      </button>

      {(open || true) && (
        <div className={cn("mt-3 space-y-3 print:block", open ? "block" : "hidden")}>
          {affair.questions?.map((q, i) => <MCQ key={i} q={q} idx={i} />)}
        </div>
      )}
    </div>
  );
}

function MCQ({ q, idx }: { q: Question; idx: number }) {
  const [picked, setPicked] = useState<number | null>(null);
  return (
    <div className="rounded-lg border border-border bg-background p-3">
      <p className="text-sm font-medium">
        Q{idx + 1}. {q.question}
      </p>
      <div className="mt-2 grid gap-1.5">
        {q.options.map((opt, i) => {
          const isPicked = picked === i;
          const isCorrect = picked !== null && i === q.correct_index;
          const isWrong = isPicked && i !== q.correct_index;
          return (
            <button
              key={i}
              type="button"
              onClick={() => picked === null && setPicked(i)}
              disabled={picked !== null}
              className={cn(
                "flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-left text-xs transition",
                picked === null && "border-border hover:border-primary/40",
                isCorrect && "border-teal/50 bg-teal/10 text-teal",
                isWrong && "border-coral/50 bg-coral/10 text-coral",
                picked !== null && !isPicked && !isCorrect && "border-border opacity-60",
              )}
            >
              <span>
                <span className="mr-1.5 font-mono">{String.fromCharCode(65 + i)}.</span>
                {opt}
              </span>
              {isCorrect && <CheckCircle2 className="h-4 w-4" />}
              {isWrong && <XCircle className="h-4 w-4" />}
            </button>
          );
        })}
      </div>
      {picked !== null && (
        <p className="mt-2 text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">Why:</span> {q.explanation}
        </p>
      )}
    </div>
  );
}

function SkeletonList() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="animate-pulse rounded-xl border border-border bg-card p-5">
          <div className="h-5 w-3/4 rounded bg-secondary" />
          <div className="mt-3 h-3 w-full rounded bg-secondary/70" />
          <div className="mt-2 h-3 w-5/6 rounded bg-secondary/70" />
          <div className="mt-3 flex gap-1.5">
            <div className="h-4 w-12 rounded-full bg-secondary" />
            <div className="h-4 w-14 rounded-full bg-secondary" />
          </div>
        </div>
      ))}
      <p className="text-center text-sm text-muted-foreground">
        Today's affairs are being generated…
      </p>
    </div>
  );
}

function EmptyState({ onRefresh }: { onRefresh: () => void }) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center">
      <p className="text-sm text-muted-foreground">No affairs yet for today.</p>
      <Button className="mt-4" size="sm" onClick={onRefresh}>
        Generate now
      </Button>
    </div>
  );
}

function ErrorState({ onRetry, message }: { onRetry: () => void; message: string }) {
  return (
    <div className="rounded-xl border border-coral/30 bg-coral/5 p-6 text-center">
      <p className="text-sm text-coral">Could not load today's affairs.</p>
      {message && <p className="mt-1 text-xs text-muted-foreground">{message}</p>}
      <Button className="mt-4" variant="outline" size="sm" onClick={onRetry}>
        Retry
      </Button>
    </div>
  );
}
