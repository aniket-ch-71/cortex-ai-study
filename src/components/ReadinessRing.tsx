import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Sparkles, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { computeReadiness, type ReadinessResult } from "@/lib/intelligence";

export function ReadinessRing() {
  const [data, setData] = useState<ReadinessResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      try {
        const r = await computeReadiness(u.user.id);
        setData(r);
      } catch (e) {
        console.error("readiness", e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const score = data?.overall ?? 0;
  const tone =
    score >= 75 ? "text-teal" : score >= 50 ? "text-primary" : score >= 25 ? "text-amber" : "text-coral";
  const ringColor =
    score >= 75 ? "#00C9A7" : score >= 50 ? "#4F8EF7" : score >= 25 ? "#F4A33A" : "#FF6B6B";

  const circumference = 2 * Math.PI * 46;
  const dash = (score / 100) * circumference;

  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <h3 className="font-display text-base font-semibold">Exam readiness</h3>
        </div>
        <Link
          to="/performance"
          className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
        >
          Details <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      <div className="grid gap-5 sm:grid-cols-[auto,1fr] sm:items-center">
        <div className="relative mx-auto h-32 w-32">
          <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
            <circle
              cx="50"
              cy="50"
              r="46"
              fill="none"
              stroke="hsl(var(--secondary))"
              strokeWidth="6"
            />
            <circle
              cx="50"
              cy="50"
              r="46"
              fill="none"
              stroke={ringColor}
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={`${dash} ${circumference}`}
              style={{ transition: "stroke-dasharray 800ms ease" }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`font-display text-3xl font-bold tabular-nums ${tone}`}>
              {loading ? "—" : score}
            </span>
            <span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              of 100
            </span>
          </div>
        </div>

        <div className="space-y-2">
          {data?.subjects.length ? (
            data.subjects.map((s) => (
              <div key={s.name}>
                <div className="flex justify-between text-xs">
                  <span className="truncate">{s.name}</span>
                  <span className="text-muted-foreground tabular-nums">{s.score}%</span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-secondary">
                  <div
                    className="h-full"
                    style={{
                      width: `${s.score}%`,
                      backgroundColor:
                        s.score >= 75
                          ? "#00C9A7"
                          : s.score >= 50
                            ? "#4F8EF7"
                            : s.score >= 25
                              ? "#F4A33A"
                              : "#FF6B6B",
                    }}
                  />
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">
              Take a test to unlock per-subject readiness.
            </p>
          )}
        </div>
      </div>

      {data && (
        <div className="mt-4 grid grid-cols-2 gap-2 text-[11px] sm:grid-cols-5">
          <Driver label="Accuracy" v={data.drivers.accuracy} />
          <Driver label="Coverage" v={data.drivers.coverage} />
          <Driver label="Consistency" v={data.drivers.consistency} />
          <Driver label="Mocks" v={data.drivers.mockPerf} />
          <Driver label="Revision" v={data.drivers.revision} />
        </div>
      )}
    </section>
  );
}

function Driver({ label, v }: { label: string; v: number }) {
  return (
    <div className="rounded-md border border-border bg-background px-2 py-1.5 text-center">
      <div className="font-display text-sm font-semibold tabular-nums">{v}%</div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
    </div>
  );
}
