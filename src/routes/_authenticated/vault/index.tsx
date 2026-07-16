import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Loader2, Bookmark, AlertTriangle, Clock, Heart, Trash2, Search, Sparkles, ArrowRight, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui-pro/PageHeader";
import { EmptyState } from "@/components/ui-pro/EmptyState";
import { QuestionBadges } from "@/components/QuestionBadges";
import { listVault, unsaveByHashTag, moveTag, type SavedQuestion, type VaultTag } from "@/lib/vault";
import { buildRevisionPack } from "@/lib/revision-packs";

export const Route = createFileRoute("/_authenticated/vault/")({
  head: () => ({ meta: [{ title: "Vault — PARIKSHA" }] }),
  component: VaultPage,
});

const TABS: { value: VaultTag | "all"; label: string; icon: React.ComponentType<{ className?: string }> | null }[] = [
  { value: "all", label: "All", icon: null },
  { value: "save", label: "Saved", icon: Bookmark },
  { value: "important", label: "Important", icon: AlertTriangle },
  { value: "revise_later", label: "Revise Later", icon: Clock },
  { value: "favorite", label: "Favorite", icon: Heart },
];

function VaultPage() {
  const [items, setItems] = useState<SavedQuestion[]>([]);
  const [tab, setTab] = useState<VaultTag | "all">("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [building, setBuilding] = useState(false);

  const load = async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const rows = await listVault(u.user.id, { tag: tab, search: search.trim() || undefined });
    setItems(rows);
    setLoading(false);
  };

  useEffect(() => { void load(); /* eslint-disable-next-line */ }, [tab]);

  const filtered = useMemo(() => {
    if (!search.trim()) return items;
    const s = search.toLowerCase();
    return items.filter((r) => r.question.toLowerCase().includes(s) || (r.topic ?? "").toLowerCase().includes(s));
  }, [items, search]);

  const onRemove = async (r: SavedQuestion) => {
    if (!confirm("Remove from vault?")) return;
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    await unsaveByHashTag(u.user.id, r.question_hash, r.tag);
    setItems((prev) => prev.filter((x) => x.id !== r.id));
  };

  const onMove = async (r: SavedQuestion, next: VaultTag) => {
    if (next === r.tag) return;
    await moveTag(r.id, next);
    toast.success("Moved");
    void load();
  };

  const practiceThese = async () => {
    setBuilding(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const first = filtered[0];
      const pack = await buildRevisionPack(u.user.id, {
        seed: "topic",
        count: Math.min(20, Math.max(5, filtered.length)),
        subject: first?.subject ?? undefined,
        topic: first?.topic ?? undefined,
      });
      if (!pack) throw new Error("Could not build pack");
      window.location.href = `/revision-packs/${pack.id}`;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setBuilding(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 md:px-8">
      <PageHeader
        eyebrow="Question quality"
        title="Vault"
        description="Every question you saved, marked important, or set aside to revise later."
        actions={
          <Button onClick={practiceThese} disabled={building || filtered.length === 0}>
            {building ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Building…</> : <><Sparkles className="mr-2 h-4 w-4" /> Practice these</>}
          </Button>
        }
      />

      {/* Tag tabs */}
      <div className="mt-6 flex flex-wrap gap-1.5 border-b border-border">
        {TABS.map((t) => {
          const active = tab === t.value;
          return (
            <button
              key={t.value}
              onClick={() => setTab(t.value)}
              className={`-mb-px inline-flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm transition ${
                active ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.icon && <t.icon className="h-3.5 w-3.5" />} {t.label}
            </button>
          );
        })}
      </div>

      {/* Search */}
      <div className="mt-4 flex items-center gap-2">
        <div className="relative flex-1 max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search question, topic…"
            className="pl-9"
          />
        </div>
      </div>

      {loading ? (
        <div className="mt-10 flex justify-center text-sm text-muted-foreground">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading…
        </div>
      ) : filtered.length === 0 ? (
        <div className="mt-10">
          <EmptyState
            icon={Bookmark}
            title="Nothing saved yet"
            description="Save questions from any test, results page, or mistake book — they'll live here for revision."
            action={<Button asChild><Link to="/mock-test">Take a test</Link></Button>}
          />
        </div>
      ) : (
        <ul className="mt-6 space-y-3">
          {filtered.map((r) => (
            <li key={r.id} className="rounded-xl border border-border bg-card p-5">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
                    {r.tag.replace("_", " ")}
                  </span>
                  {r.subject && (
                    <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                      {r.subject}{r.topic ? ` · ${r.topic}` : ""}
                    </span>
                  )}
                  <QuestionBadges q={r} compact />
                </div>
                <div className="flex items-center gap-1">
                  {(["save", "important", "revise_later", "favorite"] as VaultTag[])
                    .filter((t) => t !== r.tag)
                    .slice(0, 2)
                    .map((t) => (
                      <button
                        key={t}
                        onClick={() => onMove(r, t)}
                        className="rounded-md border border-border bg-background px-2 py-1 text-[10px] text-muted-foreground transition hover:border-primary/50 hover:text-primary"
                      >
                        → {t.replace("_", " ")}
                      </button>
                    ))}
                  <button
                    onClick={() => onRemove(r)}
                    className="rounded-md border border-border bg-background px-2 py-1 text-[10px] text-muted-foreground transition hover:border-coral/50 hover:text-coral"
                    aria-label="Remove"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </div>
              <p className="text-sm font-medium leading-relaxed">{r.question}</p>
              <ul className="mt-3 space-y-1 text-sm">
                {(r.options as unknown as string[]).map((opt, i) => {
                  const isAns = i === r.correct_index;
                  return (
                    <li key={i} className={`rounded-md px-3 py-1.5 ${isAns ? "bg-teal/10 text-teal" : "text-muted-foreground"}`}>
                      <span className="font-mono text-xs">{String.fromCharCode(65 + i)}.</span> {opt}
                      {isAns && <CheckCircle2 className="ml-1 inline h-3.5 w-3.5" />}
                    </li>
                  );
                })}
              </ul>
              {r.explanation && (
                <p className="mt-3 rounded-md border border-border bg-background p-3 text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">Why: </span>{r.explanation}
                </p>
              )}
              <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                <span>Saved {new Date(r.created_at).toLocaleDateString()}</span>
                {r.tag === "revise_later" && r.next_review_at && (
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-3 w-3" /> Review by {new Date(r.next_review_at).toLocaleDateString()}
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-8 flex items-center justify-between rounded-xl border border-primary/30 bg-primary/5 p-4 text-sm">
        <div>
          <p className="font-semibold">Turn your vault into a revision pack</p>
          <p className="text-xs text-muted-foreground">Generate a 10-question pack from your saved items.</p>
        </div>
        <Link to="/revision-packs" className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground transition hover:bg-primary/90">
          Revision Packs <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
}
