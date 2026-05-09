import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { TrendingUp, Loader2, Trophy, Flame } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/performance/")({
  head: () => ({ meta: [{ title: "My Performance — CORTEX" }] }),
  component: PerformancePage,
});

type Attempt = {
  id: string;
  score: number;
  total: number;
  completed_at: string;
  breakdown: any;
  test_id: string;
};

function PerformancePage() {
  const [loading, setLoading] = useState(true);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [tests, setTests] = useState<Record<string, { title: string; subject: string; exam: string | null }>>({});

  useEffect(() => {
    (async () => {
      const { data: a } = await supabase
        .from("mock_attempts")
        .select("id, score, total, completed_at, breakdown, test_id")
        .order("completed_at", { ascending: false });
      const list = (a as Attempt[]) ?? [];
      setAttempts(list);
      if (list.length) {
        const ids = Array.from(new Set(list.map((x) => x.test_id)));
        const { data: t } = await supabase
          .from("mock_tests")
          .select("id, title, subject, exam")
          .in("id", ids);
        const map: Record<string, any> = {};
        (t ?? []).forEach((row) => (map[row.id] = row));
        setTests(map);
      }
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-sm text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading…
      </div>
    );
  }

  const totalTests = attempts.length;
  const avg =
    totalTests > 0
      ? Math.round(
          attempts.reduce((s, a) => s + (a.total ? (a.score / a.total) * 100 : 0), 0) / totalTests,
        )
      : 0;

  // Subject-wise accuracy from breakdown.sections
  const subjAgg: Record<string, { correct: number; total: number }> = {};
  attempts.forEach((a) => {
    const sec = a.breakdown?.sections;
    if (sec && typeof sec === "object") {
      Object.entries<any>(sec).forEach(([name, b]) => {
        if (!subjAgg[name]) subjAgg[name] = { correct: 0, total: 0 };
        subjAgg[name].correct += b.correct ?? 0;
        subjAgg[name].total += b.total ?? 0;
      });
    }
  });
  const subjects = Object.entries(subjAgg).map(([name, v]) => ({
    name,
    pct: v.total ? Math.round((v.correct / v.total) * 100) : 0,
    total: v.total,
  }));
  const weak = subjects.filter((s) => s.pct < 50 && s.total > 0);

  // Streak calendar — last 30 days
  const days: { date: string; studied: boolean }[] = [];
  const studied = new Set(attempts.map((a) => a.completed_at.slice(0, 10)));
  for (let i = 29; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86_400_000).toISOString().slice(0, 10);
    days.push({ date: d, studied: studied.has(d) });
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:px-8">
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-lg bg-primary/15 text-primary">
          <TrendingUp className="h-5 w-5" />
        </span>
        <div>
          <h1 className="font-display text-2xl font-bold md:text-3xl">My Performance</h1>
          <p className="text-sm text-muted-foreground">Track your progress across tests and subjects.</p>
        </div>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <Card icon={<Trophy className="h-4 w-4" />} label="Tests taken" value={String(totalTests)} />
        <Card icon={<TrendingUp className="h-4 w-4" />} label="Average score" value={totalTests ? `${avg}%` : "—"} />
        <Card icon={<Flame className="h-4 w-4" />} label="Active days (30d)" value={String(days.filter((d) => d.studied).length)} />
      </div>

      {/* Subject accuracy */}
      <section className="mt-10 rounded-xl border border-border bg-card p-6">
        <h2 className="font-display text-lg font-semibold">Subject-wise accuracy</h2>
        {subjects.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">Take a few tests to see subject accuracy.</p>
        ) : (
          <div className="mt-4 space-y-3">
            {subjects.map((s) => (
              <div key={s.name}>
                <div className="flex justify-between text-sm">
                  <span className="truncate">{s.name}</span>
                  <span className="text-muted-foreground">{s.pct}%</span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-secondary">
                  <div
                    className={`h-full ${s.pct >= 70 ? "bg-teal" : s.pct >= 50 ? "bg-primary" : "bg-coral"}`}
                    style={{ width: `${s.pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Weak topics */}
      <section className="mt-6 rounded-xl border border-border bg-card p-6">
        <h2 className="font-display text-lg font-semibold">Weak areas</h2>
        {weak.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">No weak subjects yet — nice!</p>
        ) : (
          <ul className="mt-3 flex flex-wrap gap-2">
            {weak.map((s) => (
              <li key={s.name} className="rounded-full border border-coral/40 bg-coral/10 px-3 py-1 text-xs text-coral">
                {s.name} · {s.pct}%
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Streak calendar */}
      <section className="mt-6 rounded-xl border border-border bg-card p-6">
        <h2 className="font-display text-lg font-semibold">Streak (last 30 days)</h2>
        <div className="mt-4 flex flex-wrap gap-1.5">
          {days.map((d) => (
            <span
              key={d.date}
              title={d.date}
              className={`h-5 w-5 rounded-sm ${d.studied ? "bg-primary" : "bg-secondary"}`}
            />
          ))}
        </div>
      </section>

      {/* Recent attempts */}
      <section className="mt-6 rounded-xl border border-border bg-card p-6">
        <h2 className="font-display text-lg font-semibold">Recent attempts</h2>
        {attempts.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">No attempts yet.</p>
        ) : (
          <ul className="mt-4 divide-y divide-border">
            {attempts.slice(0, 10).map((a) => {
              const t = tests[a.test_id];
              const pct = a.total ? Math.round((a.score / a.total) * 100) : 0;
              return (
                <li key={a.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{t?.title ?? "Test"}</p>
                    <p className="text-xs text-muted-foreground">
                      {t?.exam ?? ""} · {new Date(a.completed_at).toLocaleString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-display font-bold">{a.score}/{a.total}</p>
                    <p className="text-xs text-muted-foreground">{pct}%</p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

function Card({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="grid h-9 w-9 place-items-center rounded-lg bg-secondary text-primary">{icon}</div>
      <div className="mt-3 font-display text-2xl font-bold">{value}</div>
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
    </div>
  );
}
