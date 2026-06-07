import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Repeat, ArrowRight, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  getTodaysRevisions,
  markRevised,
  type RevisionItem,
} from "@/lib/intelligence";

export function RevisionWidget() {
  const [items, setItems] = useState<RevisionItem[] | null>(null);

  const load = async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const list = await getTodaysRevisions(u.user.id, 5);
    setItems(list);
  };

  useEffect(() => {
    void load();
  }, []);

  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Repeat className="h-4 w-4 text-purple" />
          <h3 className="font-display text-base font-semibold">Revise today</h3>
        </div>
        <Link
          to="/mistakes"
          className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
        >
          Mistake Book <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      {items === null ? (
        <div className="flex justify-center py-6 text-xs text-muted-foreground">
          <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> Computing…
        </div>
      ) : items.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No topics due. Take a test to start tracking mastery.
        </p>
      ) : (
        <ul className="space-y-2">
          {items.map((it) => (
            <li
              key={it.id}
              className="group flex items-center justify-between gap-3 rounded-lg border border-border bg-background/60 p-3"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {it.subject}
                  </span>
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                      it.strength === "weak"
                        ? "bg-coral/10 text-coral"
                        : it.strength === "medium"
                          ? "bg-amber/10 text-amber"
                          : "bg-teal/10 text-teal"
                    }`}
                  >
                    {it.strength}
                  </span>
                </div>
                <p className="mt-0.5 truncate text-sm font-medium">{it.topic}</p>
                <div className="mt-1.5 flex items-center gap-2 text-[10px] text-muted-foreground">
                  <span>Accuracy {it.accuracy}%</span>
                  <span>·</span>
                  <span>Retention {it.retention}%</span>
                </div>
              </div>
              <button
                type="button"
                onClick={async () => {
                  await markRevised(it.id);
                  toast.success("Marked revised");
                  void load();
                }}
                className="shrink-0 rounded-md border border-border bg-card px-2.5 py-1.5 text-xs font-medium text-foreground/90 transition hover:border-primary/40 hover:text-foreground focus-ring"
              >
                <CheckCircle2 className="mr-1 inline h-3 w-3" />
                Revised
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
