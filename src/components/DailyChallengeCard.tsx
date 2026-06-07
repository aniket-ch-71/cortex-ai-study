import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Target, ArrowRight, Trophy } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  getOrCreateDailyChallenge,
  type DailyChallenge,
} from "@/lib/intelligence";

export function DailyChallengeCard() {
  const [ch, setCh] = useState<DailyChallenge | null>(null);
  const celebrated = useRef(false);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const c = await getOrCreateDailyChallenge(u.user.id);
      setCh(c);
    })();
  }, []);

  useEffect(() => {
    if (!ch) return;
    if (
      !celebrated.current &&
      ch.completed_count >= ch.target_count &&
      ch.target_count > 0
    ) {
      celebrated.current = true;
      toast.success("🎉 Daily challenge complete!", {
        description: `You hit your goal of ${ch.target_count} questions.`,
      });
    }
  }, [ch]);

  const target = ch?.target_count ?? 10;
  const done = ch?.completed_count ?? 0;
  const pct = Math.min(100, Math.round((done / Math.max(1, target)) * 100));
  const isDone = done >= target;

  return (
    <section
      className={`relative overflow-hidden rounded-2xl border p-5 ${
        isDone
          ? "border-teal/40 bg-teal/5"
          : "border-primary/30 bg-gradient-to-br from-primary/8 via-card to-card"
      }`}
    >
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isDone ? (
            <Trophy className="h-4 w-4 text-teal" />
          ) : (
            <Target className="h-4 w-4 text-primary" />
          )}
          <h3 className="font-display text-base font-semibold">
            {isDone ? "Goal hit!" : "Today's challenge"}
          </h3>
        </div>
        <Link
          to="/mock-test"
          className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
        >
          Practice <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      <p className="text-sm text-muted-foreground">
        {isDone
          ? `You answered ${done} questions today. Keep the streak going.`
          : `Answer ${target - done} more questions to complete today's goal.`}
      </p>

      <div className="mt-4 flex items-end justify-between gap-3">
        <span className="font-display text-2xl font-bold tabular-nums">
          {done}
          <span className="text-foreground/50"> / {target}</span>
        </span>
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
            isDone ? "bg-teal/15 text-teal" : "bg-primary/15 text-primary"
          }`}
        >
          {pct}%
        </span>
      </div>

      <div className="mt-2 h-2 overflow-hidden rounded-full bg-secondary">
        <div
          className={`h-full transition-[width] duration-700 ${
            isDone ? "bg-teal" : "bg-primary"
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </section>
  );
}
