import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, Sparkles, Play, RotateCcw, Trophy } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/ui-pro/PageHeader";
import { EmptyState } from "@/components/ui-pro/EmptyState";
import {
  buildRevisionPack, listRevisionPacks, type RevisionPack, type SeedType,
} from "@/lib/revision-packs";

export const Route = createFileRoute("/_authenticated/revision-packs/")({
  head: () => ({ meta: [{ title: "Revision Packs — PARIKSHA" }] }),
  component: PacksPage,
});

const SEEDS: { value: SeedType; label: string; hint: string }[] = [
  { value: "mistakes", label: "From my mistakes", hint: "Uses your most-repeated wrong answers" },
  { value: "weak", label: "From weak topics", hint: "Lowest confidence topics first" },
  { value: "due", label: "From due revisions", hint: "Saved 'Revise Later' items due today" },
  { value: "topic", label: "Specific topic", hint: "Pick a subject and topic" },
];

function PacksPage() {
  const navigate = useNavigate();
  const [seed, setSeed] = useState<SeedType>("mistakes");
  const [count, setCount] = useState(10);
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard" | "mixed">("mixed");
  const [subject, setSubject] = useState("");
  const [topic, setTopic] = useState("");
  const [building, setBuilding] = useState(false);
  const [packs, setPacks] = useState<RevisionPack[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    setPacks(await listRevisionPacks(u.user.id));
    setLoading(false);
  };
  useEffect(() => { void load(); }, []);

  const build = async () => {
    setBuilding(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const pack = await buildRevisionPack(u.user.id, {
        seed, count, difficulty, subject: subject.trim() || undefined, topic: topic.trim() || undefined,
      });
      if (!pack) throw new Error("Not enough source questions — try another seed");
      toast.success("Pack ready");
      navigate({ to: "/revision-packs/$packId", params: { packId: pack.id } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to build pack");
    } finally {
      setBuilding(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 md:px-8">
      <PageHeader
        eyebrow="Adaptive practice"
        title="Smart Revision Packs"
        description="Auto-generated question sets built from your mistakes, weak topics, or upcoming revisions."
      />

      <section className="mt-6 rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/10 via-primary/5 to-card p-6">
        <h2 className="font-display text-lg font-semibold">Generate a pack</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-1.5 lg:col-span-3">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Seed source</Label>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {SEEDS.map((s) => {
                const active = seed === s.value;
                return (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => setSeed(s.value)}
                    className={`rounded-lg border p-3 text-left transition ${
                      active ? "border-primary bg-primary/10" : "border-border bg-background hover:border-primary/40"
                    }`}
                  >
                    <p className="text-sm font-semibold">{s.label}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{s.hint}</p>
                  </button>
                );
              })}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Question count</Label>
            <Select value={String(count)} onValueChange={(v) => setCount(Number(v))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {[5, 10, 15, 20, 30].map((n) => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Difficulty</Label>
            <Select value={difficulty} onValueChange={(v) => setDifficulty(v as typeof difficulty)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {["mixed", "easy", "medium", "hard"].map((d) => <SelectItem key={d} value={d} className="capitalize">{d}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {seed === "topic" && (
            <>
              <div className="space-y-1.5">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Subject</Label>
                <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g. Physics" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Topic</Label>
                <Input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. Kinematics" />
              </div>
            </>
          )}
        </div>
        <Button onClick={build} disabled={building} className="mt-5" size="lg">
          {building ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Building pack…</> : <><Sparkles className="mr-2 h-4 w-4" /> Generate pack</>}
        </Button>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-lg font-semibold">Your packs</h2>
        {loading ? (
          <div className="mt-4 flex justify-center text-sm text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : packs.length === 0 ? (
          <div className="mt-4"><EmptyState icon={Sparkles} title="No packs yet" description="Generate your first pack above." /></div>
        ) : (
          <ul className="mt-4 grid gap-3 md:grid-cols-2">
            {packs.map((p) => (
              <li key={p.id} className="rounded-xl border border-border bg-card p-5 transition hover:border-primary/40">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="truncate font-medium">{p.title}</h3>
                    <p className="mt-1 text-xs text-muted-foreground capitalize">
                      {p.seed_type.replace("_", " ")} · {p.question_count} Qs · ~{p.estimated_minutes} min
                    </p>
                    <p className="text-xs text-muted-foreground">{new Date(p.created_at).toLocaleString()}</p>
                  </div>
                  {p.completed_at && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-teal/10 px-2 py-0.5 text-[10px] font-semibold text-teal">
                      <Trophy className="h-3 w-3" /> {p.score}/{p.question_count}
                    </span>
                  )}
                </div>
                <Link
                  to="/revision-packs/$packId"
                  params={{ packId: p.id }}
                  className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                >
                  {p.completed_at ? <><RotateCcw className="h-3 w-3" /> Replay</> : <><Play className="h-3 w-3" /> Start</>}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
