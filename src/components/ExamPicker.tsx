// 3-step exam hierarchy picker (Category → Sub-exam → Subject)
// Same data source as Mock Tests so behavior stays consistent.
import { useEffect, useMemo } from "react";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  EXAM_CATEGORIES,
  SUB_EXAMS,
  SUB_EXAM_SUBJECTS,
  type ExamCategory,
} from "@/lib/exam-patterns";

export type ExamPickerValue = {
  category: ExamCategory;
  subExam: string;
  subject: string;
};

export function defaultExamPicker(): ExamPickerValue {
  const category: ExamCategory = "SSC";
  const subExam = SUB_EXAMS[category][0];
  const subject = (SUB_EXAM_SUBJECTS[subExam] ?? ["All"])[0];
  return { category, subExam, subject };
}

/** Build an ExamPickerValue from a saved primary exam name (e.g. "SSC CGL"). */
export function examPickerFromPrimary(primaryExam: string | null | undefined): ExamPickerValue {
  if (!primaryExam) return defaultExamPicker();
  for (const cat of EXAM_CATEGORIES) {
    if (SUB_EXAMS[cat].includes(primaryExam)) {
      const subject = (SUB_EXAM_SUBJECTS[primaryExam] ?? ["All"])[0];
      return { category: cat, subExam: primaryExam, subject };
    }
  }
  return defaultExamPicker();
}

export function ExamPicker({
  value,
  onChange,
}: {
  value: ExamPickerValue;
  onChange: (v: ExamPickerValue) => void;
}) {
  const subjects = useMemo(
    () => SUB_EXAM_SUBJECTS[value.subExam] ?? ["All"],
    [value.subExam],
  );

  // If subExam doesn't have current subject, snap to first.
  useEffect(() => {
    if (!subjects.includes(value.subject)) {
      onChange({ ...value, subject: subjects[0] });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value.subExam]);

  return (
    <>
      <Field label="Exam category">
        <Select
          value={value.category}
          onValueChange={(v) => {
            const cat = v as ExamCategory;
            const sub = SUB_EXAMS[cat][0];
            const subj = (SUB_EXAM_SUBJECTS[sub] ?? ["All"])[0];
            onChange({ category: cat, subExam: sub, subject: subj });
          }}
        >
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {EXAM_CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <Field label="Sub-exam">
        <Select
          value={value.subExam}
          onValueChange={(v) => onChange({ ...value, subExam: v })}
        >
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {SUB_EXAMS[value.category].map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <Field label="Subject / Section">
        <Select
          value={value.subject}
          onValueChange={(v) => onChange({ ...value, subject: v })}
        >
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {subjects.map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs uppercase tracking-wider text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
