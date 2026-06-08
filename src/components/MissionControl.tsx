import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Flame, Repeat, Target, TrendingUp, AlertTriangle, Trophy,
  CalendarDays, Sparkles, ArrowRight, Loader2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getMissionControl, type MissionControl as MC } from "@/lib/intelligence";
import { cn } from "@/lib/utils";

function practiceHref(params: Record<string, string | number>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) sp.set(k, String(v));
  sp.set("autostart", "1");
  return `/mock-test?${sp.toString()}`;
}

export function MissionControl() {
  const [data, setData] = useState<MC | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      try {
        const mc = await getMissionControl(u.user.id);
        setData(mc);
      } catch (e) {
        console.error("getMissionControl", e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <section className="mt-6 rounded-2xl border border-border bg-card p-6">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading today's mission…
        </div>
      </section>
    );
  }
  if (!data) return null;

  const challengePct = data.challenge
    ? Math.round((data.challenge.completed_count / Math.max(1, data.challenge.target_count)) * 100)
    : 0;

  const reco = data.recommended;
  const recoHref = reco
    ? practiceHref({ subject: reco.subject, topic: reco.topic, count: 10, mode: "practice" })
    : data.weakest
      ? practiceHref({ subject: data.weakest.subject, topic: data.weakest.topic, count: 10, mode: "practice" })
      : practiceHref({ mode: "smart", count: 10 });
  const recoLabel = reco
    ? `Practice 10 ${reco.topic} questions`
    : data.weakest
      ? `Strengthen ${data.weakest.topic}`
      : "Start Smart Practice";

  return (
    <section className="mt-6">
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-primary/80">
            Today's Mission
          </p>
          <h2 className="font-display text-xl font-bold tracking-tight md:text-2xl">
            Your daily exam command center
          </h2>
        </div>
        {data.readinessDelta != null && (
          <span
            className={cn(
              "rounded-full px-2.5 py-1 text-[11px] font-medium ring-1 ring-inset",
              data.readinessDelta >= 0
                ? "bg-teal/10 text-teal ring-teal/20"
                : "bg-coral/10 text-coral ring-coral/20",
            )}
          >
            {data.readinessDelta >= 0 ? "▲" : "▼"} {Math.abs(data.readinessDelta)} pts (7d)
          </span>
        )}
      </div>

      {/* Primary action card */}
      <a
        href={recoHref}
        className="group block rounded-2xl border border-primary/40 bg-gradient-to-br from-primary/15 via-primary/5 to-card p-6 shadow-elev-1 transition hover:border-primary/70 hover:shadow-elev-2"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-primary">
              📍 Recommended next action
            </p>
            <p className="mt-1 font-display text-lg font-semibold md:text-xl">{recoLabel}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {reco
                ? `${reco.subject} · ${reco.accuracy}% accuracy · priority ${reco.priority}`
                : data.weakest
                  ? `${data.weakest.subject} · confidence ${data.weakest.confidence}%`
                  : "Generate a 10-Q set from your weakest concepts"}
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition group-hover:gap-2.5">
            <Sparkles className="h-3.5 w-3.5" /> Start now <ArrowRight className="h-4 w-4" />
          </span>
        </div>
      </a>

      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Tile
          icon={Flame} tone="amber" label="Streak"
          value={`${data.streak}d`}
          sub={data.bestStreak > data.streak ? `Best ${data.bestStreak}` : "Keep going"}
          action={data.challenge && data.challenge.completed_count < data.challenge.target_count
            ? { label: "Protect today", href: practiceHref({ mode: "smart", count: 5 }) }
            : null}
        />
        <Tile
          icon={Repeat} tone="purple" label="Revision due"
          value={String(data.revisionDueCount)}
          sub={data.topRevision ? `Top: ${data.topRevision.topic}` : "All caught up"}
          action={data.topRevision
            ? { label: "Revise now", href: practiceHref({ subject: data.topRevision.subject, topic: data.topRevision.topic, count: 5, mode: "revision" }) }
            : null}
        />
        <Tile
          icon={Target} tone="teal" label="Daily challenge"
          value={data.challenge ? `${data.challenge.completed_count}/${data.challenge.target_count}` : "0/0"}
          sub={`${challengePct}% complete`}
          progress={challengePct}
          action={data.challenge && data.challenge.completed_count < data.challenge.target_count
            ? { label: "Continue", href: practiceHref({ mode: "smart", count: 5 }) }
            : null}
        />
        <Tile
          icon={TrendingUp} tone="primary" label="Readiness"
          value={`${data.readiness.overall}%`}
          sub={
            data.readinessDelta == null
              ? "Building baseline"
              : data.readinessDelta >= 0
                ? `Up ${data.readinessDelta} pts`
                : `Down ${Math.abs(data.readinessDelta)} pts`
          }
          link={{ label: "View drivers", to: "/performance" }}
        />
        <Tile
          icon={AlertTriangle} tone="coral" label="Weakest topic"
          value={data.weakest ? `${data.weakest.confidence}%` : "—"}
          sub={data.weakest ? data.weakest.topic : "Take a test to track"}
          action={data.weakest
            ? { label: "Practice 10 Qs", href: practiceHref({ subject: data.weakest.subject, topic: data.weakest.topic, count: 10, mode: "practice" }) }
            : null}
        />
        <Tile
          icon={Trophy} tone="amber" label="Exam goal"
          value={data.examGoalLabel ?? "Set goal"}
          sub={data.examGoalGap ?? "Open settings to set"}
          link={{ label: "Edit goal", to: "/settings" }}
        />
        <Tile
          icon={CalendarDays} tone="purple" label="Exam countdown"
          value={data.daysToExam != null ? `${data.daysToExam}d` : "—"}
          sub={data.examDate ? new Date(data.examDate).toDateString() : "Add exam date"}
          link={{ label: "Open planner", to: "/planner" }}
        />
        <Tile
          icon={Sparkles} tone="primary" label="Smart practice"
          value="10 Qs"
          sub="From your weakest concepts"
          action={{ label: "Start drill", href: practiceHref({ mode: "smart", count: 10 }) }}
        />
      </div>
    </section>
  );
}

type Tone = "primary" | "teal" | "purple" | "amber" | "coral";
const TONE: Record<Tone, string> = {
  primary: "text-primary bg-primary/10 ring-primary/20",
  teal: "text-teal bg-teal/10 ring-teal/20",
  purple: "text-purple bg-purple/10 ring-purple/20",
  amber: "text-amber bg-amber/10 ring-amber/20",
  coral: "text-coral bg-coral/10 ring-coral/20",
};
const BAR_TONE: Record<Tone, string> = {
  primary: "bg-primary", teal: "bg-teal", purple: "bg-purple", amber: "bg-amber", coral: "bg-coral",
};

function Tile({
  icon: Icon, tone, label, value, sub, action, link, progress,
}: {
  icon: React.ComponentType<{ className?: string }>;
  tone: Tone;
  label: string;
  value: string;
  sub: string;
  progress?: number;
  action?: { label: string; href: string } | null;
  link?: { label: string; to: "/performance" | "/settings" | "/planner" | "/mistakes" } | null;
}) {
  return (
    <div className="group relative flex flex-col rounded-xl border border-border/70 bg-card p-4 transition hover:border-primary/40 hover:shadow-elev-1">
      <div className="flex items-center justify-between">
        <div className={cn("grid h-8 w-8 place-items-center rounded-lg ring-1 ring-inset", TONE[tone])}>
          <Icon className="h-4 w-4" />
        </div>
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
      </div>
      <div className="mt-3 line-clamp-1 font-display text-xl font-bold tracking-tight tabular-nums">
        {value}
      </div>
      <div className="mt-0.5 line-clamp-1 text-[11px] text-muted-foreground">{sub}</div>
      {progress != null && (
        <div className="mt-2 h-1 overflow-hidden rounded-full bg-secondary">
          <div className={cn("h-full transition-all", BAR_TONE[tone])} style={{ width: `${Math.min(100, progress)}%` }} />
        </div>
      )}
      {action && (
        <a
          href={action.href}
          className="mt-3 inline-flex items-center gap-1 text-[11px] font-semibold text-primary transition hover:gap-2"
        >
          {action.label} <ArrowRight className="h-3 w-3" />
        </a>
      )}
      {link && (
        <Link
          to={link.to}
          className="mt-3 inline-flex items-center gap-1 text-[11px] font-semibold text-primary transition hover:gap-2"
        >
          {link.label} <ArrowRight className="h-3 w-3" />
        </Link>
      )}
    </div>
  );
}
