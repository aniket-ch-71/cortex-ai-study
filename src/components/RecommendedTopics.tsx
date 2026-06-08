import { useEffect, useState } from "react";
import { Sparkles, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { recommendTopics, type RecommendedTopic } from "@/lib/intelligence";

const REASON_LABEL: Record<RecommendedTopic["reason"], string> = {
  weak: "Weak",
  "due-revision": "Due for revision",
  "never-attempted": "New",
  "high-weightage": "High weightage",
};

const REASON_TONE: Record<RecommendedTopic["reason"], string> = {
  weak: "bg-coral/10 text-coral ring-coral/20",
  "due-revision": "bg-amber/10 text-amber ring-amber/20",
  "never-attempted": "bg-primary/10 text-primary ring-primary/20",
  "high-weightage": "bg-purple/10 text-purple ring-purple/20",
};

function practiceHref(subject: string, topic: string, count = 10) {
  const sp = new URLSearchParams({
    subject, topic, count: String(count), mode: "practice", autostart: "1",
  });
  return `/mock-test?${sp.toString()}`;
}

export function RecommendedTopics() {
  const [items, setItems] = useState<RecommendedTopic[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      setItems(await recommendTopics(u.user.id, 5));
      setLoading(false);
    })();
  }, []);

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-display text-base font-semibold">Recommended for you</h3>
        <Sparkles className="h-4 w-4 text-primary" />
      </div>
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-12 animate-pulse rounded-md bg-secondary" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Take a few tests so we can recommend topics tailored to you.
        </p>
      ) : (
        <ul className="space-y-2">
          {items.map((t, i) => (
            <li
              key={`${t.subject}-${t.topic}-${i}`}
              className="flex items-center justify-between gap-3 rounded-md border border-border/60 bg-background px-3 py-2"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-medium">{t.topic}</p>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ring-inset ${REASON_TONE[t.reason]}`}
                  >
                    {REASON_LABEL[t.reason]}
                  </span>
                </div>
                <p className="truncate text-xs text-muted-foreground">
                  {t.subject}
                  {t.chapter ? ` · ${t.chapter}` : ""} · {t.accuracy}% accuracy
                </p>
              </div>
              <a
                href={practiceHref(t.subject, t.topic, 10)}
                className="shrink-0 rounded-md border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary transition hover:bg-primary hover:text-primary-foreground"
              >
                Practice 10 <ArrowRight className="ml-0.5 inline h-3 w-3" />
              </a>
            </li>
          ))}
        </ul>
      )}
      <a
        href={`/mock-test?mode=smart&count=10&autostart=1`}
        className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
      >
        Smart Practice (10 Qs) <ArrowRight className="h-3.5 w-3.5" />
      </a>
    </div>
  );
}
