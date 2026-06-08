import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Bell,
  Flame,
  MessageCircleQuestion,
  Brain,
  FileText,
  CalendarRange,
  ArrowRight,
  CalendarDays,
  Trophy,
  Activity,
  Star,
  Gift,
  Rocket,
  X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { useCountUp } from "@/hooks/useCountUp";
import { getDailyQuote } from "@/lib/quotes";
import { ReviewModal } from "@/components/ReviewModal";
import { StatCard } from "@/components/ui-pro/StatCard";
import { ReadinessRing } from "@/components/ReadinessRing";
import { RevisionWidget } from "@/components/RevisionWidget";
import { ActivityHeatmap } from "@/components/ActivityHeatmap";
import { DailyChallengeCard } from "@/components/DailyChallengeCard";
import { RankPredictor } from "@/components/RankPredictor";
import { RecommendedTopics } from "@/components/RecommendedTopics";
import { MissionControl } from "@/components/MissionControl";


export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — PARIKSHA" }] }),
  component: DashboardPage,
});

type Profile = Tables<"profiles">;
type Doubt = Tables<"doubts">;

function DashboardPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [doubts, setDoubts] = useState<Doubt[]>([]);
  const [doubtsToday, setDoubtsToday] = useState(0);
  const [stats, setStats] = useState({ tests: 0, doubts: 0, notes: 0, avg: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;

      const todayStr = new Date().toISOString().slice(0, 10);
      const [
        { data: prof },
        { data: list },
        { data: usage },
        { count: testsCount },
        { count: doubtsCount },
        { count: notesCount },
        { data: attempts },
      ] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", u.user.id).maybeSingle(),
        supabase.from("doubts").select("*").order("created_at", { ascending: false }).limit(5),
        supabase
          .from("daily_usage")
          .select("doubts_used")
          .eq("user_id", u.user.id)
          .eq("usage_date", todayStr)
          .maybeSingle(),
        supabase.from("mock_attempts").select("*", { count: "exact", head: true }),
        supabase.from("doubts").select("*", { count: "exact", head: true }),
        supabase.from("notes").select("*", { count: "exact", head: true }),
        supabase.from("mock_attempts").select("score, total"),
      ]);

      setProfile(prof);
      setDoubts(list ?? []);
      setDoubtsToday(usage?.doubts_used ?? 0);
      const avg =
        attempts && attempts.length
          ? Math.round(
              (attempts.reduce((s, a) => s + (a.total ? (a.score / a.total) * 100 : 0), 0) /
                attempts.length) * 1,
            )
          : 0;
      setStats({
        tests: testsCount ?? 0,
        doubts: doubtsCount ?? 0,
        notes: notesCount ?? 0,
        avg,
      });
      setLoading(false);
    })();
  }, []);

  const firstName = profile?.full_name?.split(" ")[0] || "Student";
  const examDate = profile?.target_exam ? estimateExamCountdown(profile.target_exam) : null;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:px-8">
      {/* Welcome bar */}
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-border/60 pb-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary/80">Dashboard</p>
          <h1 className="mt-1 font-display text-3xl font-bold tracking-tight md:text-4xl">
            Welcome back, <span className="gradient-brand-text">{firstName}</span>
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {profile?.target_exam ? `Preparing for ${profile.target_exam}` : "Set your target exam in Settings"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            className="tap-target rounded-full border border-border/70 bg-card p-2.5 text-muted-foreground transition-colors hover:text-foreground focus-ring"
            aria-label="Notifications"
          >
            <Bell className="h-4 w-4" />
          </button>
        </div>
      </div>

      <StreakCard profile={profile} />

      {/* Daily quote */}
      <DailyQuote />

      {/* Personalized recommendations */}
      <RecommendationWidget
        profile={profile}
        stats={stats}
        loading={loading}
      />

      {/* Stats */}
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Brain} tone="primary" label="Tests taken" value={stats.tests} loading={loading} />
        <StatCard icon={Trophy} tone="amber" label="Average score" value={stats.avg} loading={loading} suffix={stats.tests ? "%" : ""} placeholder={!stats.tests} />
        <StatCard icon={MessageCircleQuestion} tone="purple" label="Doubts solved" value={stats.doubts} loading={loading} />
        <StatCard icon={FileText} tone="teal" label="Notes created" value={stats.notes} loading={loading} />
      </div>


      {/* Quick actions */}
      <h2 className="mt-10 font-display text-lg font-semibold">Quick actions</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
        <ActionCard
          to="/doubt-solver"
          icon={MessageCircleQuestion}
          title="Ask AI a doubt"
          desc={`${Math.max(0, 5 - doubtsToday)} of 5 free today`}
          color="text-purple"
          ready
        />
        <ActionCard to="/mock-test" icon={Brain} title="Take a mock test" desc="Real exam patterns" color="text-primary" ready />
        <ActionCard to="/notes" icon={FileText} title="Generate notes" desc="Notes + flashcards" color="text-teal" ready />
        <ActionCard to="/planner" icon={CalendarRange} title="Plan my week" desc="7-day AI plan" color="text-amber" ready />
        {((profile as any)?.referral_count ?? 0) < 3 ? (
          <ActionCard to="/referral" icon={Gift} title="Refer Friends" desc="Unlock badges" color="text-teal" ready />
        ) : !(profile as any)?.has_reviewed ? (
          <RatePARIKSHACard />
        ) : null}
      </div>

      {/* Recent + countdown */}
      <div className="mt-10 grid gap-4 lg:grid-cols-3">
        <section className="rounded-xl border border-border bg-card p-5 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-display text-base font-semibold">Recent activity</h3>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </div>
          {loading ? (
            <SkeletonList />
          ) : doubts.length === 0 ? (
            <EmptyState
              title="Nothing here yet"
              desc="Ask the AI your first doubt to get started."
              cta={{ to: "/doubt-solver", label: "Open Doubt Solver" }}
            />
          ) : (
            <ul className="divide-y divide-border">
              {doubts.map((d) => (
                <li key={d.id} className="flex items-start gap-3 py-3">
                  <MessageCircleQuestion className="mt-0.5 h-4 w-4 shrink-0 text-purple" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm">{d.question}</p>
                    <p className="text-xs text-muted-foreground">
                      {d.subject ?? "General"} · {new Date(d.created_at).toLocaleString()}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <aside className="rounded-xl border border-border bg-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-display text-base font-semibold">Upcoming exam</h3>
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
          </div>
          {profile?.target_exam ? (
            <div>
              <div className="font-display text-3xl font-bold text-primary">
                {examDate?.days ?? "—"}
              </div>
              <div className="mt-1 text-sm text-muted-foreground">
                days until {profile.target_exam}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No target exam set yet.
            </p>
          )}

          <div className="mt-6">
            <ReadinessRing />
          </div>
        </aside>
      </div>

      {/* Intelligence row */}
      <div className="mt-8 grid gap-4 lg:grid-cols-3">
        <DailyChallengeCard />
        <RevisionWidget />
        <ActivityHeatmap />
      </div>

      {/* Predictor + recommendations */}
      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        <RankPredictor />
        <RecommendedTopics />
      </div>
    </div>
  );
}

function Stat({
  icon: Icon,
  color,
  label,
  value,
  loading,
  suffix = "",
  placeholder = false,
}: {
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  label: string;
  value: number;
  loading: boolean;
  suffix?: string;
  placeholder?: boolean;
}) {
  const animated = useCountUp(value, 800, !loading);
  return (
    <div className="rounded-xl border border-border bg-card p-5 transition-colors hover:border-primary/40">
      <div className={`grid h-9 w-9 place-items-center rounded-lg bg-secondary ${color}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="mt-3 font-display text-2xl font-bold tabular-nums">
        {loading || placeholder ? "—" : `${animated}${suffix}`}
      </div>
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
    </div>
  );
}

function DailyQuote() {
  const q = getDailyQuote();
  return (
    <div className="mt-6 rounded-xl border border-border bg-card/60 px-5 py-4 animate-fade-up">
      <p className="text-sm italic text-foreground/90">&ldquo;{q.text}&rdquo;</p>
      <p className="mt-1 text-xs text-muted-foreground">— {q.author}</p>
    </div>
  );
}

function ActionCard({
  to,
  icon: Icon,
  title,
  desc,
  color,
  ready,
}: {
  to?: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  desc: string;
  color: string;
  ready?: boolean;
}) {
  const inner = (
    <div
      className={`group rounded-xl border border-border bg-card p-5 ${
        ready ? "hover-lift hover:border-primary/40" : "opacity-60"
      }`}
    >
      <div className={`grid h-10 w-10 place-items-center rounded-lg bg-secondary ${color}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="mt-4 flex items-center justify-between">
        <div>
          <div className="font-medium">{title}</div>
          <div className="text-xs text-muted-foreground">{desc}</div>
        </div>
        {ready && (
          <ArrowRight className="h-4 w-4 text-muted-foreground transition group-hover:translate-x-1 group-hover:text-foreground" />
        )}
      </div>
    </div>
  );
  return ready && to ? <Link to={to}>{inner}</Link> : <div>{inner}</div>;
}

function RatePARIKSHACard() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group rounded-xl border border-amber/30 bg-amber/5 p-5 text-left hover-lift hover:border-amber/60"
      >
        <div className="grid h-10 w-10 place-items-center rounded-lg bg-secondary text-amber">
          <Star className="h-5 w-5" />
        </div>
        <div className="mt-4 flex items-center justify-between">
          <div>
            <div className="font-medium">Rate PARIKSHA</div>
            <div className="text-xs text-muted-foreground">Help others discover us</div>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground transition group-hover:translate-x-1 group-hover:text-foreground" />
        </div>
      </button>
      <ReviewModal open={open} onOpenChange={setOpen} />
    </>
  );
}

function Progress({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="flex justify-between text-xs">
        <span>{label}</span>
        <span className="text-muted-foreground">{value}%</span>
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-secondary">
        <div className="h-full bg-primary" style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

function SkeletonList() {
  return (
    <ul className="space-y-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <li key={i} className="h-10 animate-pulse rounded-md bg-secondary" />
      ))}
    </ul>
  );
}

function EmptyState({
  title,
  desc,
  cta,
}: {
  title: string;
  desc: string;
  cta?: { to: string; label: string };
}) {
  return (
    <div className="py-8 text-center">
      <p className="font-medium">{title}</p>
      <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
      {cta && (
        <Link
          to={cta.to}
          className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
        >
          {cta.label} <ArrowRight className="h-3 w-3" />
        </Link>
      )}
    </div>
  );
}

// Rough estimate so the dashboard widget shows something useful before the
// user enters a real exam date.
function estimateExamCountdown(_exam: string) {
  const now = new Date();
  const target = new Date(now.getFullYear(), 11, 31);
  const days = Math.max(0, Math.ceil((target.getTime() - now.getTime()) / 86_400_000));
  return { days };
}

function StreakCard({ profile }: { profile: Profile | null }) {
  const streak = profile?.streak ?? 0;
  const best = (profile as any)?.best_streak ?? 0;
  const lastDate = (profile as any)?.last_streak_date as string | null;

  if (streak === 0 && !lastDate) {
    return (
      <Link
        to="/mock-test"
        className="mt-6 block rounded-xl border border-amber/40 bg-gradient-to-r from-amber/10 via-amber/5 to-transparent p-5 transition hover:border-amber/70"
      >
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="font-display text-lg font-semibold">🚀 Start your streak today!</p>
            <p className="mt-1 text-sm text-muted-foreground">Complete 1 task to begin</p>
          </div>
          <span className="rounded-md bg-amber px-3 py-2 text-sm font-medium text-background">
            Take a 5-min test →
          </span>
        </div>
      </Link>
    );
  }

  if (streak === 0 && lastDate) {
    return (
      <Link
        to="/mock-test"
        className="mt-6 block rounded-xl border border-primary/40 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-5 transition hover:border-primary/70"
      >
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="font-display text-lg font-semibold">💪 Comeback time!</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Your best was {best} day{best === 1 ? "" : "s"}. Beat that today!
            </p>
          </div>
          <span className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground">
            Restart streak →
          </span>
        </div>
      </Link>
    );
  }

  const milestone =
    streak >= 30
      ? "Legendary! 👑"
      : streak >= 14
        ? "Two weeks strong! 💪"
        : streak >= 7
          ? "Week warrior! 🏆"
          : "Keep it up! ⚡";

  return (
    <div className="mt-6 flex items-center justify-between gap-3 rounded-xl border border-amber/40 bg-gradient-to-r from-amber/10 to-transparent p-5">
      <div className="flex items-center gap-3">
        <Flame className="h-7 w-7 text-amber animate-flicker" />
        <div>
          <p className="font-display text-lg font-semibold">🔥 {streak} day streak!</p>
          <p className="text-sm text-muted-foreground">{milestone}</p>
        </div>
      </div>
      {best > streak && (
        <span className="text-xs text-muted-foreground">Best: {best}</span>
      )}
    </div>
  );
}

const DISMISS_KEY = "pariksha.recoDismissed";

function RecommendationWidget({
  profile,
  stats,
  loading,
}: {
  profile: Profile | null;
  stats: { tests: number; doubts: number; notes: number; avg: number };
  loading: boolean;
}) {
  const [dismissed, setDismissed] = useState<string[]>([]);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DISMISS_KEY);
      if (raw) setDismissed(JSON.parse(raw));
    } catch {}
  }, []);
  const dismiss = (id: string) => {
    const next = [...dismissed, id];
    setDismissed(next);
    try {
      localStorage.setItem(DISMISS_KEY, JSON.stringify(next));
    } catch {}
  };
  if (loading || !profile) return null;

  const exam = profile.target_exam ?? "";
  const all: {
    id: string;
    title: string;
    desc: string;
    cta: string;
    to: string;
    show: boolean;
  }[] = [
    {
      id: "first-test",
      title: "🎯 Take your first mock test",
      desc: "See where you stand before you start preparing",
      cta: "Start 10-min test →",
      to: "/mock-test",
      show: stats.tests === 0,
    },
    {
      id: "build-foundation",
      title: "📚 Build your foundation first",
      desc: "Try the Notes Generator to strengthen weak topics",
      cta: "Generate notes →",
      to: "/notes",
      show: stats.tests > 0 && stats.avg < 40,
    },
    {
      id: "first-doubt",
      title: "🤔 Got a doubt? Ask AI",
      desc: "PARIKSHA explains step-by-step in Hinglish",
      cta: "Ask now →",
      to: "/doubt-solver",
      show: stats.doubts === 0,
    },
    {
      id: "study-plan",
      title: "📅 No study plan yet?",
      desc: `Get AI-generated 7-day plan${exam ? ` for ${exam}` : ""}`,
      cta: "Create plan →",
      to: "/planner",
      show: true,
    },
    {
      id: "current-affairs",
      title: "📰 Today's current affairs ready!",
      desc: "8 affairs + 16 MCQs — 5 min read",
      cta: "Read now →",
      to: "/current-affairs",
      show: /SSC|UPSC|Bank|IBPS|RRB/i.test(exam),
    },
  ];
  const shown = all.filter((r) => r.show && !dismissed.includes(r.id)).slice(0, 2);
  if (shown.length === 0) return null;

  return (
    <div className="mt-6 grid gap-3 sm:grid-cols-2">
      {shown.map((r) => (
        <div
          key={r.id}
          className="relative rounded-xl border border-border bg-gradient-to-br from-primary/10 via-card to-card p-5 transition hover:border-primary/40"
        >
          <button
            type="button"
            onClick={() => dismiss(r.id)}
            aria-label="Dismiss"
            className="absolute right-3 top-3 rounded-md p-1 text-muted-foreground/60 transition hover:bg-secondary hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
          <p className="pr-6 font-display text-base font-semibold">{r.title}</p>
          <p className="mt-1 text-sm text-muted-foreground">{r.desc}</p>
          <Link
            to={r.to}
            className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            <Rocket className="h-3.5 w-3.5" /> {r.cta}
          </Link>
        </div>
      ))}
    </div>
  );
}
