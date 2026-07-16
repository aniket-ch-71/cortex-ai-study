import { BadgeCheck, Flame, Star, Sparkles } from "lucide-react";
import type { CanonicalQuestion } from "@/lib/question-schema";

const CHIP = "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ring-inset";

export function QuestionBadges({ q, compact = false }: { q: Partial<CanonicalQuestion>; compact?: boolean }) {
  const chips: React.ReactNode[] = [];

  if (q.is_pyq) {
    chips.push(
      <span key="pyq" className={`${CHIP} bg-amber/10 text-amber ring-amber/30`}>
        <Star className="h-2.5 w-2.5" /> PYQ{q.pyq_year ? ` ${q.pyq_year}` : ""}
      </span>,
    );
  }
  if (q.source_type === "verified" && !q.is_pyq) {
    chips.push(
      <span key="verified" className={`${CHIP} bg-teal/10 text-teal ring-teal/30`}>
        <BadgeCheck className="h-2.5 w-2.5" /> Verified
      </span>,
    );
  }
  if (q.weightage === "high") {
    chips.push(
      <span key="weight" className={`${CHIP} bg-coral/10 text-coral ring-coral/30`}>
        <Flame className="h-2.5 w-2.5" /> High weightage
      </span>,
    );
  }
  if (q.exam_frequency === "very_high" || q.exam_frequency === "high") {
    chips.push(
      <span key="freq" className={`${CHIP} bg-primary/10 text-primary ring-primary/30`}>
        <Sparkles className="h-2.5 w-2.5" /> {q.exam_frequency === "very_high" ? "Very frequent" : "Frequent"}
      </span>,
    );
  }
  if (q.concept_importance === "core") {
    chips.push(
      <span key="core" className={`${CHIP} bg-purple/10 text-purple ring-purple/30`}>
        Core
      </span>,
    );
  }
  if (compact) return <div className="flex flex-wrap gap-1">{chips}</div>;
  if (!chips.length) return null;
  return <div className="flex flex-wrap gap-1.5">{chips}</div>;
}
