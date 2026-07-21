import { useEffect, useState } from "react";
import { Sparkles, Check } from "lucide-react";

const PHASES = [
  { icon: "🧠", label: "Analyzing exam blueprint…" },
  { icon: "📚", label: "Selecting high-quality questions…" },
  { icon: "🎯", label: "Balancing difficulty levels…" },
  { icon: "📊", label: "Optimizing topic coverage…" },
  { icon: "⚡", label: "Building your personalized mock test…" },
  { icon: "✅", label: "Final quality validation…" },
];

export interface GenerationOverlayProps {
  open: boolean;
  progress: number; // 0-100
  etaSeconds?: number;
  detail?: string;
}

/**
 * Premium generation overlay with phased messages, animated ring
 * and smooth progress. Phases advance driven by real progress %.
 */
export function GenerationOverlay({ open, progress, etaSeconds, detail }: GenerationOverlayProps) {
  const [smooth, setSmooth] = useState(0);

  // Smoothly ease displayed progress toward actual.
  useEffect(() => {
    if (!open) {
      setSmooth(0);
      return;
    }
    let raf = 0;
    const tick = () => {
      setSmooth((prev) => {
        const target = Math.max(prev, Math.min(99, progress));
        const next = prev + (target - prev) * 0.12;
        return Math.abs(target - next) < 0.2 ? target : next;
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [open, progress]);

  if (!open) return null;

  const pct = Math.round(progress >= 100 ? 100 : smooth);
  const currentPhase = Math.min(
    PHASES.length - 1,
    Math.floor((pct / 100) * PHASES.length),
  );

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-md animate-fade-in">
      <div className="relative mx-4 w-full max-w-md overflow-hidden rounded-2xl border border-border bg-card p-8 shadow-elev-2">
        {/* animated gradient bg */}
        <div className="pointer-events-none absolute inset-0 opacity-40">
          <div className="absolute -left-16 -top-16 h-56 w-56 rounded-full bg-primary/30 blur-3xl animate-pulse" />
          <div className="absolute -bottom-20 -right-10 h-56 w-56 rounded-full bg-teal/20 blur-3xl animate-pulse [animation-delay:1s]" />
        </div>

        <div className="relative">
          <div className="mb-6 flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-primary to-primary/60 text-primary-foreground shadow-md">
              <Sparkles className="h-5 w-5 animate-pulse" />
            </span>
            <div>
              <p className="font-display text-lg font-semibold">Generating your test</p>
              <p className="text-xs text-muted-foreground">
                {etaSeconds && etaSeconds > 0
                  ? `Estimated ~${etaSeconds}s remaining`
                  : "AI is crafting each question"}
              </p>
            </div>
          </div>

          {/* Progress ring + percent */}
          <div className="flex items-center gap-5">
            <ProgressRing pct={pct} />
            <div className="min-w-0 flex-1">
              <ul className="space-y-2 text-sm">
                {PHASES.map((p, i) => {
                  const done = i < currentPhase || pct >= 100;
                  const active = i === currentPhase && pct < 100;
                  return (
                    <li
                      key={p.label}
                      className={`flex items-center gap-2 transition-all ${
                        done
                          ? "text-foreground"
                          : active
                            ? "text-foreground"
                            : "text-muted-foreground/50"
                      }`}
                    >
                      <span className="w-5 text-center">
                        {done ? (
                          <Check className="h-3.5 w-3.5 text-emerald-500" />
                        ) : active ? (
                          <span className="inline-block h-2 w-2 animate-ping rounded-full bg-primary" />
                        ) : (
                          <span className="inline-block h-1.5 w-1.5 rounded-full bg-muted-foreground/30" />
                        )}
                      </span>
                      <span className={`${active ? "font-medium" : ""} truncate`}>
                        {p.icon} {p.label}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="mt-6 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full rounded-full bg-gradient-to-r from-primary via-primary/80 to-teal transition-[width] duration-300 ease-out"
              style={{ width: `${pct}%` }}
            />
          </div>
          {detail && (
            <p className="mt-3 text-center text-xs text-muted-foreground">{detail}</p>
          )}
        </div>
      </div>
    </div>
  );
}

function ProgressRing({ pct }: { pct: number }) {
  const r = 34;
  const c = 2 * Math.PI * r;
  const dash = (pct / 100) * c;
  return (
    <div className="relative h-20 w-20 shrink-0">
      <svg viewBox="0 0 80 80" className="h-full w-full -rotate-90">
        <circle cx="40" cy="40" r={r} className="fill-none stroke-secondary" strokeWidth="6" />
        <circle
          cx="40"
          cy="40"
          r={r}
          className="fill-none stroke-primary transition-[stroke-dashoffset] duration-300"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c - dash}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        <span className="font-display text-lg font-bold tabular-nums">{pct}%</span>
      </div>
    </div>
  );
}
