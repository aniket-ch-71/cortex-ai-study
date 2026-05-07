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
  Clock,
  Activity,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — CORTEX" }] }),
  component: DashboardPage,
});

type Profile = Tables<"profiles">;
type Doubt = Tables<"doubts">;

function DashboardPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [doubts, setDoubts] = useState<Doubt[]>([]);
  const [doubtsToday, setDoubtsToday] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;

      const [{ data: prof }, { data: list }, { data: usage }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", u.user.id).maybeSingle(),
        supabase.from("doubts").select("*").order("created_at", { ascending: false }).limit(5),
        supabase
          .from("daily_usage")
          .select("doubts_used")
          .eq("user_id", u.user.id)
          .eq("usage_date", new Date().toISOString().slice(0, 10))
          .maybeSingle(),
      ]);

      setProfile(prof);
      setDoubts(list ?? []);
      setDoubtsToday(usage?.doubts_used ?? 0);
      setLoading(false);
    })();
  }, []);

  const firstName = profile?.full_name?.split(" ")[0] || "Student";
  const examDate = profile?.target_exam ? estimateExamCountdown(profile.target_exam) : null;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:px-8">
      {/* Welcome bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold md:text-3xl">
            Welcome back, {firstName} 👋
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {profile?.target_exam ? `Preparing for ${profile.target_exam}` : "Set your target exam in Settings"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-sm">
            <Flame className="h-4 w-4 text-amber" />
            <span className="font-medium">{profile?.streak ?? 0} day streak</span>
          </div>
          <button
            className="rounded-full border border-border bg-card p-2 text-muted-foreground hover:text-foreground"
            aria-label="Notifications"
          >
            <Bell className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat icon={Brain} color="text-primary" label="Tests taken" value={loading ? "—" : "0"} />
        <Stat icon={Trophy} color="text-amber" label="Average score" value={loading ? "—" : "—"} />
        <Stat
          icon={MessageCircleQuestion}
          color="text-purple"
          label="Doubts solved"
          value={loading ? "—" : String(doubts.length)}
        />
        <Stat icon={Clock} color="text-teal" label="Study hours" value={loading ? "—" : "0"} />
      </div>

      {/* Quick actions */}
      <h2 className="mt-10 font-display text-lg font-semibold">Quick actions</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <ActionCard
          to="/doubt-solver"
          icon={MessageCircleQuestion}
          title="Ask AI a doubt"
          desc={`${Math.max(0, 5 - doubtsToday)} of 5 free today`}
          color="text-purple"
          ready
        />
        <ActionCard icon={Brain} title="Take a mock test" desc="Coming soon" color="text-primary" />
        <ActionCard icon={FileText} title="Generate notes" desc="Coming soon" color="text-teal" />
        <ActionCard icon={CalendarRange} title="Plan my week" desc="Coming soon" color="text-amber" />
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
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Subject progress
            </h4>
            <div className="mt-3 space-y-3">
              {["Maths", "Physics", "Chemistry"].map((s) => (
                <Progress key={s} label={s} value={0} />
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Stat({
  icon: Icon,
  color,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className={`grid h-9 w-9 place-items-center rounded-lg bg-secondary ${color}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="mt-3 font-display text-2xl font-bold">{value}</div>
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
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
      className={`group rounded-xl border border-border bg-card p-5 transition ${
        ready ? "hover:border-primary/40" : "opacity-60"
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
