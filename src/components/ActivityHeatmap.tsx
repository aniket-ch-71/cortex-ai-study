import { useEffect, useState } from "react";
import { CalendarDays } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getActivityHeatmap, type HeatCell } from "@/lib/intelligence";

const WEEKS = 12;

function level(count: number) {
  if (count === 0) return 0;
  if (count < 5) return 1;
  if (count < 15) return 2;
  if (count < 30) return 3;
  return 4;
}

const levelClass = [
  "bg-secondary/60",
  "bg-primary/20",
  "bg-primary/40",
  "bg-primary/70",
  "bg-primary",
];

export function ActivityHeatmap() {
  const [cells, setCells] = useState<HeatCell[]>([]);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const c = await getActivityHeatmap(u.user.id, WEEKS);
      setCells(c);
    })();
  }, []);

  // Group into columns of 7 (one column per week)
  const columns: HeatCell[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    columns.push(cells.slice(i, i + 7));
  }
  const totalQuestions = cells.reduce((s, c) => s + c.count, 0);
  const totalMinutes = cells.reduce((s, c) => s + c.minutes, 0);
  const activeDays = cells.filter((c) => c.count > 0).length;

  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-teal" />
          <h3 className="font-display text-base font-semibold">Study activity</h3>
        </div>
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
          last {WEEKS} weeks
        </div>
      </div>

      <div className="flex gap-[3px] overflow-x-auto pb-2">
        {columns.map((col, ci) => (
          <div key={ci} className="flex flex-col gap-[3px]">
            {col.map((cell) => (
              <div
                key={cell.date}
                title={`${cell.date} · ${cell.count} questions · ${cell.minutes}m`}
                className={`h-3 w-3 rounded-[3px] ${levelClass[level(cell.count)]}`}
              />
            ))}
          </div>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3 text-center text-[11px]">
        <Stat label="Active days" value={activeDays} />
        <Stat label="Questions" value={totalQuestions} />
        <Stat label="Minutes" value={totalMinutes} />
      </div>

      <div className="mt-3 flex items-center justify-end gap-1 text-[10px] text-muted-foreground">
        <span>Less</span>
        {levelClass.map((c, i) => (
          <span key={i} className={`h-2.5 w-2.5 rounded-[2px] ${c}`} />
        ))}
        <span>More</span>
      </div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-border bg-background px-2 py-2">
      <div className="font-display text-base font-semibold tabular-nums">{value}</div>
      <div className="mt-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
    </div>
  );
}
