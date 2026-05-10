import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { FileText, Loader2, Plus, Trash2, FileDown, ArrowRight, RotateCw, Search } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { LANGUAGES } from "@/lib/cortex-data";
import { ExamPicker, defaultExamPicker, examPickerFromPrimary, type ExamPickerValue } from "@/components/ExamPicker";
import { useProfile } from "@/hooks/useProfile";

export const Route = createFileRoute("/_authenticated/notes/")({
  head: () => ({ meta: [{ title: "Notes Generator — CORTEX" }] }),
  component: NotesIndex,
});

type NoteRow = {
  id: string;
  title: string;
  topic: string;
  subject: string;
  exam: string | null;
  created_at: string;
};

function NotesIndex() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<NoteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [search, setSearch] = useState("");

  const [topic, setTopic] = useState("");
  const { primaryExam } = useProfile();
  const [picker, setPicker] = useState<ExamPickerValue>(defaultExamPicker());
  const [pickerInit, setPickerInit] = useState(false);
  useEffect(() => {
    if (!pickerInit && primaryExam) {
      setPicker(examPickerFromPrimary(primaryExam));
      setPickerInit(true);
    }
  }, [primaryExam, pickerInit]);
  const [language, setLanguage] = useState("en");

  const load = async () => {
    const { data } = await supabase
      .from("notes")
      .select("id, title, topic, subject, exam, created_at")
      .order("created_at", { ascending: false });
    setRows((data as NoteRow[]) ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.title.toLowerCase().includes(q) ||
        r.topic.toLowerCase().includes(q) ||
        (r.subject ?? "").toLowerCase().includes(q),
    );
  }, [rows, search]);

  const onGenerate = async () => {
    if (!topic.trim()) return toast.error("Enter a topic");
    setGenerating(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return toast.error("Please sign in");
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-notes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          topic,
          subject: picker.subject,
          exam: picker.subExam,
          language,
          numFlashcards: 12,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `HTTP ${res.status}`);
      }
      const payload = await res.json();
      const { data: inserted, error } = await supabase
        .from("notes")
        .insert({
          user_id: u.user.id,
          title: payload.title || topic,
          topic,
          subject: picker.subject,
          exam: picker.subExam,
          language,
          style: "flashcards_notes",
          content: payload.content,
          flashcards: payload.flashcards,
        })
        .select("id")
        .single();
      if (error) throw error;
      toast.success("Notes ready!");
      navigate({ to: "/notes/$noteId", params: { noteId: inserted.id } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to generate");
    } finally {
      setGenerating(false);
    }
  };

  const onDelete = async (id: string) => {
    if (!confirm("Delete this note set?")) return;
    const { error } = await supabase.from("notes").delete().eq("id", id);
    if (error) return toast.error(error.message);
    setRows((p) => p.filter((r) => r.id !== id));
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:px-8">
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-lg bg-teal/15 text-teal">
          <FileText className="h-5 w-5" />
        </span>
        <div>
          <h1 className="font-display text-2xl font-bold md:text-3xl">Notes Generator</h1>
          <p className="text-sm text-muted-foreground">Topic-wise study notes + active-recall flashcards.</p>
        </div>
      </div>

      <section className="mt-8 rounded-xl border border-border bg-card p-6">
        <h2 className="font-display text-lg font-semibold">Create new notes</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Field label="Topic">
            <Input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. Newton's Laws" />
          </Field>
          <ExamPicker value={picker} onChange={setPicker} />
          <Field label="Language">
            <Select value={language} onValueChange={setLanguage}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{LANGUAGES.map((l) => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
        </div>
        <Button onClick={onGenerate} disabled={generating} className="mt-6" size="lg">
          {generating ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating…</>) : (<><Plus className="mr-2 h-4 w-4" /> Generate notes</>)}
        </Button>
      </section>

      <section className="mt-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-lg font-semibold">Your notes</h2>
          <div className="relative w-full sm:w-72">
            <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by topic / subject…" className="pl-8" />
          </div>
        </div>
        <div className="mt-4">
          {loading ? (
            <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => (<div key={i} className="h-20 animate-pulse rounded-lg bg-secondary" />))}</div>
          ) : filtered.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">{rows.length === 0 ? "No notes yet. Generate your first set above." : "No notes match your search."}</div>
          ) : (
            <ul className="grid gap-3 md:grid-cols-2">
              {filtered.map((r) => (
                <li key={r.id} className="group rounded-xl border border-border bg-card p-5 transition hover:border-primary/40">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="truncate font-medium">{r.title}</h3>
                      <p className="mt-1 text-xs text-muted-foreground">{r.topic} · {r.subject} · {r.exam}</p>
                      <p className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString()}</p>
                    </div>
                    <button onClick={() => onDelete(r.id)} className="text-muted-foreground hover:text-destructive" aria-label="Delete"><Trash2 className="h-4 w-4" /></button>
                  </div>
                  <div className="mt-4 flex justify-end">
                    <button onClick={() => navigate({ to: "/notes/$noteId", params: { noteId: r.id } })} className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">Open <ArrowRight className="h-3 w-3" /></button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
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

// Re-export icons used inside dynamic import to avoid tree-shake warnings
export { FileDown, RotateCw };
