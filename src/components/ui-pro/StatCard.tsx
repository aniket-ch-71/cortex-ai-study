import type { ComponentType } from "react";
import { useCountUp } from "@/hooks/useCountUp";
import { cn } from "@/lib/utils";

export function StatCard({
  icon: Icon,
  label,
  value,
  suffix = "",
  tone = "primary",
  loading = false,
  placeholder = false,
  delta,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: number;
  suffix?: string;
  tone?: "primary" | "teal" | "purple" | "amber" | "coral";
  loading?: boolean;
  placeholder?: boolean;
  delta?: { value: string; positive?: boolean };
}) {
  const animated = useCountUp(value, 800, !loading);
  const toneClass = {
    primary: "text-primary bg-primary/10 ring-primary/20",
    teal: "text-teal bg-teal/10 ring-teal/20",
    purple: "text-purple bg-purple/10 ring-purple/20",
    amber: "text-amber bg-amber/10 ring-amber/20",
    coral: "text-coral bg-coral/10 ring-coral/20",
  }[tone];

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-border/70 bg-card/80 p-5 shadow-elev-1 transition hover:border-primary/40 hover:shadow-elev-2">
      <div className="flex items-start justify-between">
        <div
          className={cn(
            "grid h-10 w-10 place-items-center rounded-xl ring-1 ring-inset",
            toneClass,
          )}
        >
          <Icon className="h-4.5 w-4.5" />
        </div>
        {delta && (
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ring-inset",
              delta.positive
                ? "bg-teal/10 text-teal ring-teal/20"
                : "bg-coral/10 text-coral ring-coral/20",
            )}
          >
            {delta.positive ? "▲" : "▼"} {delta.value}
          </span>
        )}
      </div>
      <div className="mt-4 font-display text-2xl font-bold tracking-tight tabular-nums md:text-[28px]">
        {loading || placeholder ? (
          <span className="inline-block h-7 w-16 animate-pulse rounded bg-secondary" />
        ) : (
          <>
            {animated}
            <span className="text-foreground/60">{suffix}</span>
          </>
        )}
      </div>
      <div className="mt-1 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </div>
    </div>
  );
}
