import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ScanSearch, Loader2, Sparkles, CheckCircle2, AlertTriangle, Lightbulb, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SUBJECTS, EXAMS, LANGUAGES } from "@/lib/cortex-data";

export const Route = createFileRoute("/_authenticated/analyser/")({
  head: () => ({ meta: [{ title: "Notes Analyser — CORTEX" }] }),
  component: AnalyserPage,
});

type Feedback = {
  summary: string;
  strengths: string[];
  gaps: string[];
  errors?: string[];
  suggestions: string[];
};

type Row = {
  id: string;
  topic: string;
  subject: string | null;
  score: number;
  feedback: Feedback;
  created_at: string;
};

function AnalyserPage() {
  const [topic, setTopic] = useState("");
  const [subject, setSubject] = useState<string>(SUBJECTS[0]);
  const [exam, setExam] = useState<string>(EXAMS[0]);
  const [language, setLanguage] = useState("en");
  const [text, setText] = useState("");
  const [analysing, setAnalysing] = useState(false);
  const [latest, setLatest] = useState<Row | null>(null);
  const [history, setHistory] = useState<Row[]>([]);

  const load = async () => {
    const { data } = await supabase
      .from("note_analyses")
      .select("id, topic, subject, score, feedback, created_at")
      .order("created_at", { ascending: false })
      .limit(10);
    setHistory((data as unknown as Row[]) ?? []);
  };
  useEffect(() => { load(); }, []);

  const onAnalyse = async () => {
    if (!topic.trim() || !text.trim()) return toast.error("Enter topic and notes");
    setAnalysing(true);
    setLatest(null);
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return toast.error("Please sign in");
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyse-notes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ topic, subject, exam, text, language }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `HTTP ${res.status}`);
      }
      const a = await res.json();
      const fb: Feedback = {
        summary: a.summary,
        strengths: a.strengths ?? [],
        gaps: a.gaps ?? [],
        errors: a.errors ?? [],
        suggestions: a.suggestions ?? [],
      };
      const { data: ins, error } = await supabase
        .from("note_analyses")
        .insert({
          user_id: u.user.id,
          topic,
          subject,
          input_text: text,
          score: a.score,
          feedback: fb as unknown as object,
        })
        .select("id, topic, subject, score, feedback, created_at")
        .single();
      if (error) throw error;
      setLatest(ins as unknown as Row);
      load();
      toast.success("Analysis complete");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Analysis failed");
    } finally {
      setAnalysing(false);
    }
  };

  const onDelete = async (id: string) => {
    if (!confirm("Delete this analysis?")) return;
    const { error } = await supabase.from("note_analyses").delete().eq("id", id);
    if (error) return toast.error(error.message);
    setHistory((h) => h.filter((r) => r.id !== id));
    if (latest?.id === id) setLatest(null);
  };

  const display = latest;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 md:px-8">
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-lg bg-purple/15 text-purple">
          <ScanSearch className="h-5 w-5" />
        </span>
        <div>
          <h1 className="font-display text-2xl font-bold md:text-3xl">Notes Analyser</h1>
          <p className="text-sm text-muted-foreground">Paste your notes. Get an AI score, gaps, and fixes.</p>
        </div>
      </div>

      <section className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Topic"><Input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. Indian Polity — Fundamental Rights" /></Field>
            <Field label="Subject">
              <Select value={subject} onValueChange={setSubject}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{SUBJECTS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Exam">
              <Select value={exam} onValueChange={setExam}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{EXAMS.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Language">
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{LANGUAGES.map((l) => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
          </div>
          <div className="mt-4">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Your notes</Label>
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Paste your study notes here…"
              className="mt-1.5 min-h-[260px] font-mono text-sm"
            />
            <p className="mt-1 text-xs text-muted-foreground">{text.length.toLocaleString()} chars</p>
          </div>
          <Button onClick={onAnalyse} disabled={analysing} className="mt-4" size="lg">
            {analysing ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Analysing…</>) : (<><Sparkles className="mr-2 h-4 w-4" /> Analyse notes</>)}
          </Button>
        </div>

        <div className="rounded-xl border border-border bg-card p-6">
          {!display ? (
            <div className="flex h-full min-h-[300px] flex-col items-center justify-center text-center text-sm text-muted-foreground">
              <ScanSearch className="mb-3 h-8 w-8 opacity-50" />
              <p>Run an analysis to see results here.</p>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="flex items-center gap-4">
                <ScoreRing score={display.score} />
                <div>
                  <h3 className="font-display text-lg font-semibold">{display.topic}</h3>
                  <p className="text-sm text-muted-foreground">{display.feedback.summary}</p>
                </div>
              </div>
              <Block icon={<CheckCircle2 className="h-4 w-4 text-teal" />} title="Strengths" items={display.feedback.strengths} />
              <Block icon={<AlertTriangle className="h-4 w-4 text-amber" />} title="Gaps to add" items={display.feedback.gaps} />
              {display.feedback.errors && display.feedback.errors.length > 0 && (
                <Block icon={<AlertTriangle className="h-4 w-4 text-coral" />} title="Errors" items={display.feedback.errors} tone="coral" />
              )}
              <Block icon={<Lightbulb className="h-4 w-4 text-primary" />} title="Suggestions" items={display.feedback.suggestions} />
            </div>
          )}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-lg font-semibold">Past analyses</h2>
        {history.length === 0 ? (
          <div className="mt-4 rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">No analyses yet.</div>
        ) : (
          <ul className="mt-4 grid gap-3 md:grid-cols-2">
            {history.map((h) => (
              <li key={h.id} className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <button onClick={() => setLatest(h)} className="min-w-0 text-left">
                    <p className="truncate font-medium">{h.topic}</p>
                    <p className="text-xs text-muted-foreground">{h.subject} · {new Date(h.created_at).toLocaleDateString()}</p>
                  </button>
                  <div className="flex items-center gap-3">
                    <span className="font-display text-lg font-bold">{h.score}</span>
                    <button onClick={() => onDelete(h.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
                  </div>
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

function Block({ icon, title, items, tone = "default" }: { icon: React.ReactNode; title: string; items: string[]; tone?: "default" | "coral" }) {
  if (!items?.length) return null;
  return (
    <div>
      <div className="flex items-center gap-1.5 text-sm font-medium">{icon} {title}</div>
      <ul className={`mt-2 space-y-1 pl-5 text-sm ${tone === "coral" ? "text-coral" : "text-foreground/90"} list-disc`}>
        {items.map((it, i) => <li key={i}>{it}</li>)}
      </ul>
    </div>
  );
}

function ScoreRing({ score }: { score: number }) {
  const color = score >= 80 ? "text-teal" : score >= 60 ? "text-primary" : score >= 40 ? "text-amber" : "text-coral";
  const dash = (score / 100) * 251.3;
  return (
    <div className="relative grid h-20 w-20 place-items-center">
      <svg viewBox="0 0 100 100" className="absolute inset-0 -rotate-90">
        <circle cx="50" cy="50" r="40" stroke="currentColor" strokeWidth="8" fill="none" className="text-secondary" />
        <circle cx="50" cy="50" r="40" stroke="currentColor" strokeWidth="8" fill="none" strokeDasharray={`${dash} 251.3`} strokeLinecap="round" className={color} />
      </svg>
      <span className={`font-display text-xl font-bold ${color}`}>{score}</span>
    </div>
  );
}
