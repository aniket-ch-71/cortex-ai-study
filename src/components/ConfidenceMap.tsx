import { useEffect, useState } from "react";
import { Brain, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getTopicConfidence, type TopicConfidence } from "@/lib/intelligence";
import { cn } from "@/lib/utils";

export function ConfidenceMap() {
  const [items, setItems] = useState<TopicConfidence[] | null>(null);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      setItems(await getTopicConfidence(u.user.id));
    })();
  }, []);

  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain className="h-4 w-4 text-primary" />
          <h3 className="font-display text-base font-semibold">Confidence map</h3>
        </div>
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
          Topic-level
        </span>
      </div>
      {items === null ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-10 animate-pulse rounded bg-secondary" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Take a few tests to build your topic confidence map.
        </p>
      ) : (
        <ul className="space-y-2">
          {items.slice(0, 10).map((it) => {
            const tone =
              it.confidence >= 75 ? "teal"
              : it.confidence >= 50 ? "amber"
              : "coral";
            const bar = tone === "teal" ? "bg-teal" : tone === "amber" ? "bg-amber" : "bg-coral";
            const text = tone === "teal" ? "text-teal" : tone === "amber" ? "text-amber" : "text-coral";
            const href = `/mock-test?subject=${encodeURIComponent(it.subject)}&topic=${encodeURIComponent(it.topic)}&count=10&mode=practice&autostart=1`;
            return (
              <li key={it.id} className="flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-medium">{it.topic}</p>
                    <span className={cn("shrink-0 font-display text-sm font-bold tabular-nums", text)}>
                      {it.confidence}%
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-secondary">
                    <div className={cn("h-full transition-all", bar)} style={{ width: `${it.confidence}%` }} />
                  </div>
                  <div className="mt-1 flex items-center justify-between text-[10px] text-muted-foreground">
                    <span>{it.subject}{it.chapter ? ` · ${it.chapter}` : ""}</span>
                    <a href={href} className="inline-flex items-center gap-0.5 font-semibold text-primary hover:underline">
                      Practice <ArrowRight className="h-2.5 w-2.5" />
                    </a>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
