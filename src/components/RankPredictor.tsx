import { useEffect, useState } from "react";
import { Trophy, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { predictRank, type RankPrediction } from "@/lib/intelligence";

export function RankPredictor() {
  const [pred, setPred] = useState<RankPrediction | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const { data: prof } = await supabase
        .from("profiles")
        .select("target_exam")
        .eq("id", u.user.id)
        .maybeSingle();
      const exam = prof?.target_exam || "";
      const p = await predictRank(u.user.id, exam);
      setPred(p);
      setLoading(false);
    })();
  }, []);

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-display text-base font-semibold">Rank predictor</h3>
        <Trophy className="h-4 w-4 text-amber" />
      </div>
      {loading || !pred ? (
        <div className="space-y-2">
          <div className="h-8 w-32 animate-pulse rounded bg-secondary" />
          <div className="h-4 w-48 animate-pulse rounded bg-secondary" />
        </div>
      ) : (
        <>
          <div className="flex items-baseline gap-2">
            <span className="font-display text-3xl font-bold text-primary tabular-nums">
              {pred.percentile}
            </span>
            <span className="text-sm text-muted-foreground">percentile</span>
          </div>
          <p className="mt-1 text-sm font-medium">{pred.band} · {pred.exam}</p>
          <div className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
            <TrendingUp className="h-3 w-3" />
            Est. rank range: <span className="font-medium text-foreground">{pred.estimatedRankRange}</span>
          </div>
          <p className="mt-3 rounded-md border border-border bg-background p-2.5 text-xs text-muted-foreground">
            {pred.insight}
          </p>
          <p className="mt-2 text-[10px] uppercase tracking-wider text-muted-foreground">
            Confidence: {pred.confidence}
          </p>
        </>
      )}
    </div>
  );
}
