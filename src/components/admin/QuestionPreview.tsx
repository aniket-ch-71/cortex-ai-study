import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RichContent } from "./RichContent";
import { cn } from "@/lib/utils";
import { CheckCircle2, Circle } from "lucide-react";
import type { Question } from "@/lib/admin/questions";

type Device = "desktop" | "tablet" | "mobile";

const widths: Record<Device, string> = {
  desktop: "max-w-3xl",
  tablet: "max-w-xl",
  mobile: "max-w-[380px]",
};

export function QuestionPreview({
  q,
  device = "desktop",
  theme = "light",
}: {
  q: Partial<Question>;
  device?: Device;
  theme?: "light" | "dark";
}) {
  const type = q.question_type ?? "single_correct";
  const opts = q.options ?? [];
  const correctSet = new Set<number>(
    type === "multiple_correct"
      ? (q.correct_indices ?? [])
      : q.correct_index != null
        ? [q.correct_index]
        : [],
  );

  return (
    <div className={cn(theme === "dark" ? "dark bg-neutral-950" : "bg-background", "rounded-xl p-4")}>
      <div className={cn("mx-auto", widths[device])}>
        <Card className="p-5 space-y-4">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {q.exam && <Badge variant="secondary">{q.exam}</Badge>}
            {q.subject && <Badge variant="outline">{q.subject}</Badge>}
            {q.topic && <Badge variant="outline">{q.topic}</Badge>}
            {q.difficulty && <Badge>{q.difficulty}</Badge>}
            {q.is_pyq && <Badge className="bg-amber-500/15 text-amber-700">PYQ{q.pyq_year ? ` ${q.pyq_year}` : ""}</Badge>}
            {q.marks != null && <span className="text-muted-foreground">+{q.marks}{q.negative_marks ? ` / -${q.negative_marks}` : ""}</span>}
          </div>

          {q.svg_diagram && (
            <div
              className="rounded-md border bg-muted/40 p-2 [&_svg]:mx-auto [&_svg]:h-auto [&_svg]:max-w-full"
              dangerouslySetInnerHTML={{ __html: q.svg_diagram }}
            />
          )}
          {q.diagram_url && !q.svg_diagram && (
            <img src={q.diagram_url} alt="Diagram" className="mx-auto max-h-80 rounded-md border" />
          )}

          <RichContent>{q.question ?? ""}</RichContent>

          {type === "numerical" ? (
            <div className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
              Numerical answer field · Correct: <span className="font-mono text-foreground">{q.numerical_answer ?? "—"}</span>
            </div>
          ) : (
            <ol className="space-y-2">
              {opts.map((o, i) => {
                const correct = correctSet.has(i);
                return (
                  <li
                    key={i}
                    className={cn(
                      "flex items-start gap-3 rounded-md border p-3 text-sm",
                      correct
                        ? "border-emerald-500/60 bg-emerald-500/5"
                        : "border-border/60",
                    )}
                  >
                    {correct ? (
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                    ) : (
                      <Circle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                    )}
                    <div className="min-w-0 flex-1">
                      <span className="mr-1 font-semibold">{String.fromCharCode(65 + i)}.</span>
                      <RichContent className="inline">{o}</RichContent>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}

          {q.explanation && (
            <div className="rounded-md bg-muted/40 p-3">
              <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Explanation</div>
              <RichContent>{q.explanation}</RichContent>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
