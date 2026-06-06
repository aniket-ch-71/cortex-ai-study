import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  BookX,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Loader2,
  Repeat,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui-pro/PageHeader";
import { EmptyState } from "@/components/ui-pro/EmptyState";

export const Route = createFileRoute("/_authenticated/mistakes/")({
  head: () => ({ meta: [{ title: "Mistake Book — PARIKSHA" }] }),
  component: MistakeBookPage,
});

type Mistake = {
  id: string;
  question_id: string;
  question: string;
  options: string[];
  correct_index: number | null;
  explanation: string | null;
  subject: string | null;
  chapter: string | null;
  topic: string | null;
  difficulty: string | null;
  times_wrong: number;
  times_attempted: number;
  last_wrong_at: string;
  status: string;
};

function MistakeBookPage() {
  const [loading, setLoading] = useState(true);
  const [mistakes, setMistakes] = useState<Mistake[]>([]);
  const [filter, setFilter] = useState<"open" | "all">("open");

  const load = async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    let q = supabase
      .from("mistake_book")
      .select("*")
      .eq("user_id", u.user.id)
      .order("last_wrong_at", { ascending: false });
    if (filter === "open") q = q.eq("status", "open");
    const { data } = await q;
    setMistakes((data ?? []) as unknown as Mistake[]);
    setLoading(false);
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const grouped = useMemo(() => {
    const tree: Record<string, Record<string, Mistake[]>> = {};
    mistakes.forEach((m) => {
      const subj = m.subject ?? "General";
      const topic = m.topic ?? m.chapter ?? "Untagged";
      tree[subj] ??= {};
      tree[subj][topic] ??= [];
      tree[subj][topic].push(m);
    });
    return tree;
  }, [mistakes]);

  const repeated = useMemo(
    () => [...mistakes].sort((a, b) => b.times_wrong - a.times_wrong).slice(0, 6),
    [mistakes],
  );

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 md:px-8">
      <PageHeader
        eyebrow="Intelligence"
        title="Mistake Book"
        description="Every wrong or skipped question, grouped by subject and topic. Reattempt to master."
        actions={
          <div className="flex gap-2">
            <Button
              variant={filter === "open" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter("open")}
            >
              Open
            </Button>
            <Button
              variant={filter === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter("all")}
            >
              All
            </Button>
          </div>
        }
      />

      {loading ? (
        <div className="mt-10 flex justify-center text-sm text-muted-foreground">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading…
        </div>
      ) : mistakes.length === 0 ? (
        <div className="mt-10">
          <EmptyState
            icon={BookX}
            title="No mistakes yet"
            description="Take a mock test and your wrong answers will appear here for review."
            action={
              <Button asChild>
                <Link to="/mock-test">Take a test</Link>
              </Button>
            }
          />
        </div>
      ) : (
        <>
          {/* Most Repeated Mistakes */}
          {repeated.length > 0 && (
            <section className="mt-8 rounded-2xl border border-amber/30 bg-amber/5 p-5">
              <div className="mb-3 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-amber" />
                <h2 className="font-display text-base font-semibold">
                  Most Repeated Mistakes
                </h2>
              </div>
              <ul className="grid gap-2 sm:grid-cols-2">
                {repeated.map((m) => (
                  <li
                    key={m.id}
                    className="rounded-lg border border-border bg-card/60 p-3 text-sm"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        {m.subject ?? "General"} · {m.topic ?? "—"}
                      </span>
                      <span className="rounded-full bg-coral/10 px-2 py-0.5 text-xs font-medium text-coral">
                        ×{m.times_wrong} wrong
                      </span>
                    </div>
                    <p className="mt-2 line-clamp-2 text-sm">{m.question}</p>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Grouped by subject → topic */}
          <div className="mt-8 space-y-4">
            {Object.entries(grouped).map(([subject, topics]) => (
              <SubjectGroup
                key={subject}
                subject={subject}
                topics={topics}
                onMarkMastered={async (id) => {
                  await supabase
                    .from("mistake_book")
                    .update({ status: "mastered" })
                    .eq("id", id);
                  toast.success("Marked as mastered");
                  void load();
                }}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function SubjectGroup({
  subject,
  topics,
  onMarkMastered,
}: {
  subject: string;
  topics: Record<string, Mistake[]>;
  onMarkMastered: (id: string) => void;
}) {
  const [open, setOpen] = useState(true);
  const count = Object.values(topics).reduce((s, arr) => s + arr.length, 0);
  return (
    <section className="rounded-2xl border border-border bg-card">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-3 px-5 py-4"
      >
        <div className="flex items-center gap-2">
          {open ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
          <h2 className="font-display text-lg font-semibold">{subject}</h2>
        </div>
        <span className="text-xs text-muted-foreground">{count} questions</span>
      </button>
      {open && (
        <div className="space-y-4 border-t border-border px-5 py-4">
          {Object.entries(topics).map(([topic, items]) => (
            <TopicBlock
              key={topic}
              topic={topic}
              items={items}
              onMarkMastered={onMarkMastered}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function TopicBlock({
  topic,
  items,
  onMarkMastered,
}: {
  topic: string;
  items: Mistake[];
  onMarkMastered: (id: string) => void;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground/90">{topic}</h3>
        <span className="text-xs text-muted-foreground">{items.length}</span>
      </div>
      <ul className="space-y-3">
        {items.map((m) => (
          <li key={m.id} className="rounded-lg border border-border bg-background p-4">
            <p className="text-sm font-medium leading-relaxed">{m.question}</p>
            <ul className="mt-3 space-y-1 text-sm">
              {m.options.map((opt, i) => {
                const isAns = i === m.correct_index;
                return (
                  <li
                    key={i}
                    className={`rounded-md px-3 py-1.5 ${
                      isAns ? "bg-teal/10 text-teal" : "text-muted-foreground"
                    }`}
                  >
                    <span className="font-mono text-xs">
                      {String.fromCharCode(65 + i)}.
                    </span>{" "}
                    {opt}
                    {isAns && (
                      <CheckCircle2 className="ml-1 inline h-3.5 w-3.5" />
                    )}
                  </li>
                );
              })}
            </ul>
            {m.explanation && (
              <p className="mt-3 rounded-md border border-border bg-card p-3 text-xs text-muted-foreground">
                <span className="font-medium text-foreground">Why: </span>
                {m.explanation}
              </p>
            )}
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-2">
                <XCircle className="h-3.5 w-3.5 text-coral" />
                Wrong {m.times_wrong}× · Attempted {m.times_attempted}×
              </span>
              <div className="flex gap-2">
                {m.status === "open" && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onMarkMastered(m.id)}
                  >
                    <Repeat className="mr-1.5 h-3.5 w-3.5" /> Mark mastered
                  </Button>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
