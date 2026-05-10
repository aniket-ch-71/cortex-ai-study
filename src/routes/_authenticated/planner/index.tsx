import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CalendarRange, Loader2, Sparkles, Trash2, Coffee, BookOpen, Brain, Repeat, FileCheck } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EXAMS, SUBJECTS, LANGUAGES } from "@/lib/cortex-data";
import { useProfile } from "@/hooks/useProfile";

export const Route = createFileRoute("/_authenticated/planner/")({
  head: () => ({ meta: [{ title: "Study Planner — CORTEX" }] }),
  component: PlannerPage,
});

type Block = { subject: string; topic: string; durationMinutes: number; activity: "concept" | "practice" | "revision" | "mock-test" | "break" };
type Day = { day: string; blocks: Block[] };
type Plan = { title: string; tips: string[]; days: Day[] };
type Row = { id: string; title: string; exam: string; exam_date: string | null; hours_per_day: number; plan: Plan; created_at: string };

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

function PlannerPage() {
  const { primaryExam } = useProfile();
  const [exam, setExam] = useState<string>(EXAMS[0]);
  const [seeded, setSeeded] = useState(false);
  useEffect(() => {
    if (!seeded && primaryExam && EXAMS.includes(primaryExam)) {
      setExam(primaryExam);
      setSeeded(true);
    }
  }, [primaryExam, seeded]);
  const [examDate, setExamDate] = useState("");
  const [hoursPerDay, setHoursPerDay] = useState(4);
  const [subjects, setSubjects] = useState<string[]>([SUBJECTS[0], SUBJECTS[1]]);
  const [weaknesses, setWeaknesses] = useState("");
  const [language, setLanguage] = useState("en");
  const [generating, setGenerating] = useState(false);
  const [active, setActive] = useState<Row | null>(null);
  const [history, setHistory] = useState<Row[]>([]);

  const load = async () => {
    const { data } = await supabase
      .from("study_plans")
      .select("id, title, exam, exam_date, hours_per_day, plan, created_at")
      .order("created_at", { ascending: false });
    const rows = (data as unknown as Row[]) ?? [];
    setHistory(rows);
    if (!active && rows[0]) setActive(rows[0]);
  };
  useEffect(() => { load(); }, []);

  const toggleSubject = (s: string) =>
    setSubjects((p) => (p.includes(s) ? p.filter((x) => x !== s) : [...p, s]));

  const onGenerate = async () => {
    if (!subjects.length) return toast.error("Pick at least one subject");
    setGenerating(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return toast.error("Please sign in");
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-plan`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ exam, examDate, hoursPerDay, subjects, weaknesses, language }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `HTTP ${res.status}`);
      }
      const plan = (await res.json()) as Plan;
      const { data: ins, error } = await supabase
        .from("study_plans")
        .insert({
          user_id: u.user.id,
          title: plan.title || `${exam} weekly plan`,
          exam,
          exam_date: examDate || null,
          hours_per_day: hoursPerDay,
          subjects,
          plan: plan as any,
        })
        .select("id, title, exam, exam_date, hours_per_day, plan, created_at")
        .single();
      if (error) throw error;
      setActive(ins as unknown as Row);
      load();
      toast.success("Plan ready!");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to generate");
    } finally {
      setGenerating(false);
    }
  };

  const onDelete = async (id: string) => {
    if (!confirm("Delete this plan?")) return;
    const { error } = await supabase.from("study_plans").delete().eq("id", id);
    if (error) return toast.error(error.message);
    setHistory((h) => h.filter((r) => r.id !== id));
    if (active?.id === id) setActive(null);
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:px-8">
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-lg bg-amber/15 text-amber">
          <CalendarRange className="h-5 w-5" />
        </span>
        <div>
          <h1 className="font-display text-2xl font-bold md:text-3xl">Study Planner</h1>
          <p className="text-sm text-muted-foreground">A 7-day AI plan tailored to your exam, time, and weak spots.</p>
        </div>
      </div>

      <section className="mt-8 rounded-xl border border-border bg-card p-6">
        <h2 className="font-display text-lg font-semibold">New weekly plan</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Field label="Exam">
            <Select value={exam} onValueChange={setExam}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{EXAMS.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Exam date (optional)">
            <Input type="date" value={examDate} onChange={(e) => setExamDate(e.target.value)} />
          </Field>
          <Field label="Hours per day">
            <Input type="number" min={1} max={14} value={hoursPerDay} onChange={(e) => setHoursPerDay(Number(e.target.value))} />
          </Field>
          <Field label="Language">
            <Select value={language} onValueChange={setLanguage}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{LANGUAGES.map((l) => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
        </div>

        <div className="mt-5">
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">Subjects to focus on</Label>
          <div className="mt-2 flex flex-wrap gap-2">
            {SUBJECTS.map((s) => {
              const on = subjects.includes(s);
              return (
                <button
                  key={s}
                  onClick={() => toggleSubject(s)}
                  className={`rounded-full border px-3 py-1 text-sm transition ${on ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground hover:text-foreground"}`}
                >
                  {s}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-5">
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">Weaknesses (optional)</Label>
          <Textarea value={weaknesses} onChange={(e) => setWeaknesses(e.target.value)} className="mt-1.5" placeholder="e.g. struggle with calculus, weak on modern history" />
        </div>

        <Button onClick={onGenerate} disabled={generating} className="mt-6" size="lg">
          {generating ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating…</>) : (<><Sparkles className="mr-2 h-4 w-4" /> Generate plan</>)}
        </Button>
      </section>

      {active && (
        <section className="mt-10">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-lg font-semibold">{active.plan.title}</h2>
              <p className="text-sm text-muted-foreground">{active.exam} · {active.hours_per_day}h/day{active.exam_date ? ` · target ${active.exam_date}` : ""}</p>
            </div>
          </div>

          {active.plan.tips?.length > 0 && (
            <div className="mt-4 grid gap-2 rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm">
              {active.plan.tips.map((t, i) => <p key={i}>💡 {t}</p>)}
            </div>
          )}

          <div className="mt-5 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            {DAYS.map((dayName) => {
              const d = active.plan.days.find((x) => x.day === dayName);
              const total = d?.blocks.reduce((s, b) => s + (b.activity === "break" ? 0 : b.durationMinutes), 0) ?? 0;
              return (
                <div key={dayName} className="rounded-xl border border-border bg-card p-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-display text-sm font-semibold">{dayName}</h3>
                    <span className="text-xs text-muted-foreground">{Math.round(total / 60 * 10) / 10}h</span>
                  </div>
                  <div className="mt-3 space-y-2">
                    {d?.blocks.map((b, i) => <BlockChip key={i} block={b} />) ?? <p className="text-xs text-muted-foreground">—</p>}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <section className="mt-10">
        <h2 className="font-display text-lg font-semibold">Saved plans</h2>
        {history.length === 0 ? (
          <div className="mt-4 rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">No plans yet.</div>
        ) : (
          <ul className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {history.map((h) => (
              <li key={h.id} className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <button onClick={() => setActive(h)} className="min-w-0 text-left">
                    <p className="truncate font-medium">{h.title}</p>
                    <p className="text-xs text-muted-foreground">{h.exam} · {new Date(h.created_at).toLocaleDateString()}</p>
                  </button>
                  <button onClick={() => onDelete(h.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
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

function BlockChip({ block }: { block: Block }) {
  const meta: Record<Block["activity"], { Icon: typeof BookOpen; color: string; label: string }> = {
    concept: { Icon: BookOpen, color: "text-primary bg-primary/10", label: "Concept" },
    practice: { Icon: Brain, color: "text-teal bg-teal/10", label: "Practice" },
    revision: { Icon: Repeat, color: "text-amber bg-amber/10", label: "Revision" },
    "mock-test": { Icon: FileCheck, color: "text-purple bg-purple/10", label: "Mock" },
    break: { Icon: Coffee, color: "text-muted-foreground bg-secondary", label: "Break" },
  };
  const m = meta[block.activity] ?? meta.concept;
  return (
    <div className="rounded-md border border-border bg-background p-2.5 text-xs">
      <div className="flex items-center justify-between gap-2">
        <span className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 ${m.color}`}>
          <m.Icon className="h-3 w-3" /> {m.label}
        </span>
        <span className="text-muted-foreground">{block.durationMinutes}m</span>
      </div>
      <p className="mt-1.5 font-medium">{block.subject}</p>
      <p className="text-muted-foreground">{block.topic}</p>
    </div>
  );
}
