import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  Save, Send, Copy, Archive, ArchiveRestore, Trash2, History, Eye,
  ArrowLeft, Smartphone, Tablet, Monitor, Sun, Moon, Loader2, CheckCircle2, AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger,
} from "@/components/ui/sheet";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { RichEditor } from "./RichEditor";
import { QuestionPreview } from "./QuestionPreview";
import {
  createQuestion, updateQuestion, getQuestion, duplicateQuestion,
  publishQuestions, archiveQuestions, restoreQuestions, softDeleteQuestions,
  listVersions, restoreVersion, validateForPublish,
  QUESTION_STATUSES, QUESTION_TYPES,
  type Question, type QuestionType, type QuestionInput,
} from "@/lib/admin/questions";
import { cn } from "@/lib/utils";

type Mode = "create" | "edit";

const DEFAULTS: QuestionInput = {
  exam: "",
  sub_exam: "",
  subject: "",
  chapter: "",
  topic: "",
  sub_topic: "",
  concept: "",
  difficulty: "medium",
  language: "en",
  question: "",
  options: ["", "", "", ""],
  correct_index: 0,
  correct_indices: [],
  numerical_answer: undefined as unknown as number,
  explanation: "",
  question_type: "single_correct",
  source_type: "manual",
  is_pyq: false,
  pyq_year: undefined,
  weightage: undefined,
  exam_frequency: undefined,
  concept_importance: undefined,
  svg_diagram: undefined,
  diagram_url: undefined,
  solution_image_url: undefined,
  estimated_time_seconds: 60,
  marks: 1,
  negative_marks: 0.25,
  tags: [],
  status: "draft",
};

export function QuestionEditor({
  mode, questionId, onSaved,
}: { mode: Mode; questionId?: string; onSaved?: (id: string) => void }) {
  const navigate = useNavigate();
  const [q, setQ] = useState<Partial<Question> & QuestionInput>(DEFAULTS);
  const [initial, setInitial] = useState<string>("");
  const [loading, setLoading] = useState(mode === "edit");
  const [saving, setSaving] = useState(false);
  const [device, setDevice] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const dirty = JSON.stringify(q) !== initial;

  useEffect(() => {
    if (mode !== "edit" || !questionId) return;
    let cancel = false;
    (async () => {
      setLoading(true);
      try {
        const data = await getQuestion(questionId);
        if (!data) { toast.error("Question not found"); return; }
        if (cancel) return;
        const merged = { ...DEFAULTS, ...data, options: data.options ?? DEFAULTS.options };
        setQ(merged);
        setInitial(JSON.stringify(merged));
      } catch (e: any) { toast.error(e?.message ?? "Failed to load"); }
      finally { if (!cancel) setLoading(false); }
    })();
    return () => { cancel = true; };
  }, [mode, questionId]);

  useEffect(() => {
    if (mode === "create") setInitial(JSON.stringify(DEFAULTS));
  }, [mode]);

  const validation = useMemo(() => validateForPublish(q), [q]);

  const patch = (p: Partial<typeof q>) => setQ((prev) => ({ ...prev, ...p }));
  const setOption = (i: number, v: string) => {
    const opts = [...(q.options ?? [])];
    opts[i] = v;
    patch({ options: opts });
  };
  const addOption = () => patch({ options: [...(q.options ?? []), ""] });
  const removeOption = (i: number) => {
    const opts = [...(q.options ?? [])];
    opts.splice(i, 1);
    patch({
      options: opts,
      correct_index: Math.min(q.correct_index ?? 0, Math.max(0, opts.length - 1)),
      correct_indices: (q.correct_indices ?? []).filter((x) => x !== i).map((x) => (x > i ? x - 1 : x)),
    });
  };

  const doSave = async (nextStatus?: Question["status"]) => {
    setSaving(true);
    try {
      const payload: QuestionInput = { ...q, status: nextStatus ?? q.status ?? "draft" };
      if (nextStatus === "published") {
        const v = validateForPublish({ ...q, status: "published" });
        if (!v.ok) { toast.error("Fix validation errors before publishing"); setSaving(false); return; }
        (payload as any).published_at = new Date().toISOString();
      }
      let saved: Question;
      if (mode === "create") saved = await createQuestion(payload);
      else saved = await updateQuestion(questionId!, payload);
      const merged = { ...DEFAULTS, ...saved };
      setQ(merged);
      setInitial(JSON.stringify(merged));
      toast.success(nextStatus === "published" ? "Published" : "Saved");
      if (mode === "create") onSaved?.(saved.id);
    } catch (e: any) { toast.error(e?.message ?? "Save failed"); }
    finally { setSaving(false); }
  };

  // Keyboard: cmd/ctrl+s
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault(); doSave();
      }
    };
    window.addEventListener("keydown", on);
    return () => window.removeEventListener("keydown", on);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  if (loading) {
    return <div className="flex h-64 items-center justify-center text-muted-foreground"><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading…</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/admin/questions"><ArrowLeft className="mr-1.5 h-4 w-4" /> All questions</Link>
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-display text-xl font-bold">
                {mode === "create" ? "New question" : "Edit question"}
              </h1>
              {mode === "edit" && q.status && <StatusBadge s={q.status} />}
              {mode === "edit" && <span className="text-xs text-muted-foreground">v{q.version}</span>}
              {dirty && <Badge variant="outline" className="text-amber-600">Unsaved</Badge>}
            </div>
            <p className="text-xs text-muted-foreground">
              {mode === "edit" ? `ID · ${questionId?.slice(0, 8)}…` : "Draft is created on first save."}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {mode === "edit" && <VersionsSheet questionId={questionId!} onRestored={() => window.location.reload()} />}
          {mode === "edit" && (
            <>
              <Button variant="outline" size="sm" onClick={async () => {
                try { const dup = await duplicateQuestion(questionId!); toast.success("Duplicated"); navigate({ to: "/admin/questions/$id", params: { id: dup.id } }); }
                catch (e: any) { toast.error(e?.message ?? "Failed"); }
              }}><Copy className="mr-1.5 h-4 w-4" /> Duplicate</Button>
              {q.archived ? (
                <Button variant="outline" size="sm" onClick={async () => { await restoreQuestions([questionId!]); toast.success("Restored"); patch({ archived: false, status: "draft" }); }}>
                  <ArchiveRestore className="mr-1.5 h-4 w-4" /> Restore
                </Button>
              ) : (
                <Button variant="outline" size="sm" onClick={async () => { await archiveQuestions([questionId!]); toast.success("Archived"); patch({ archived: true, status: "archived" }); }}>
                  <Archive className="mr-1.5 h-4 w-4" /> Archive
                </Button>
              )}
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm" className="text-destructive hover:text-destructive"><Trash2 className="mr-1.5 h-4 w-4" /> Delete</Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete this question?</AlertDialogTitle>
                    <AlertDialogDescription>Soft-delete — the question will disappear from all lists. Admins can recover it later.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={async () => { await softDeleteQuestions([questionId!]); toast.success("Deleted"); navigate({ to: "/admin/questions" }); }}>Delete</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          )}
          <Button variant="outline" onClick={() => doSave()} disabled={saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save draft
          </Button>
          <Button onClick={() => doSave("published")} disabled={saving || !validation.ok}>
            <Send className="mr-2 h-4 w-4" /> Publish
          </Button>
        </div>
      </div>

      {!validation.ok && (
        <Card className="border-amber-500/40 bg-amber-500/5 p-3">
          <div className="flex items-start gap-2 text-sm">
            <AlertTriangle className="mt-0.5 h-4 w-4 text-amber-600" />
            <div>
              <div className="font-medium text-amber-800 dark:text-amber-300">Cannot publish yet</div>
              <ul className="mt-1 list-disc pl-5 text-amber-800/90 dark:text-amber-300/80">
                {validation.errors.map((e) => <li key={e}>{e}</li>)}
              </ul>
            </div>
          </div>
        </Card>
      )}
      {validation.ok && (
        <Card className="border-emerald-500/40 bg-emerald-500/5 p-3">
          <div className="flex items-center gap-2 text-sm text-emerald-800 dark:text-emerald-300">
            <CheckCircle2 className="h-4 w-4" /> Ready to publish · all validations passed
          </div>
        </Card>
      )}

      <Tabs defaultValue="edit">
        <TabsList>
          <TabsTrigger value="edit">Editor</TabsTrigger>
          <TabsTrigger value="preview"><Eye className="mr-1.5 h-3.5 w-3.5" /> Preview</TabsTrigger>
        </TabsList>

        <TabsContent value="edit" className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-4">
            <Card className="p-4 space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Question type">
                  <Select value={q.question_type} onValueChange={(v) => patch({ question_type: v as QuestionType })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{QUESTION_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                  </Select>
                </Field>
                <Field label="Language">
                  <Select value={q.language} onValueChange={(v) => patch({ language: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="hi">Hindi</SelectItem>
                      <SelectItem value="bn">Bengali</SelectItem>
                      <SelectItem value="ta">Tamil</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              </div>

              <RichEditor label="Question" value={q.question ?? ""} onChange={(v) => patch({ question: v })} rows={8} />

              {(q.question_type === "diagram") && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Diagram image URL">
                    <Input value={q.diagram_url ?? ""} onChange={(e) => patch({ diagram_url: e.target.value })} placeholder="https://…" />
                  </Field>
                  <Field label="Solution image URL">
                    <Input value={q.solution_image_url ?? ""} onChange={(e) => patch({ solution_image_url: e.target.value })} placeholder="https://…" />
                  </Field>
                  <div className="sm:col-span-2">
                    <Label className="mb-1 block text-xs font-medium">Inline SVG</Label>
                    <Textarea rows={5} value={q.svg_diagram ?? ""} onChange={(e) => patch({ svg_diagram: e.target.value })} placeholder="<svg …>" />
                  </div>
                </div>
              )}
            </Card>

            <Card className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold">Options & correct answer</h2>
                {q.question_type !== "numerical" && (
                  <Button size="sm" variant="outline" onClick={addOption}>+ Add option</Button>
                )}
              </div>

              {q.question_type === "numerical" ? (
                <Field label="Correct numerical answer">
                  <Input type="number" step="any" value={q.numerical_answer ?? ""} onChange={(e) => patch({ numerical_answer: e.target.value === "" ? (undefined as any) : Number(e.target.value) })} />
                </Field>
              ) : (
                <div className="space-y-2">
                  {(q.options ?? []).map((opt, i) => (
                    <div key={i} className="flex items-start gap-2">
                      {q.question_type === "multiple_correct" ? (
                        <Checkbox
                          checked={(q.correct_indices ?? []).includes(i)}
                          onCheckedChange={(c) => {
                            const cur = new Set(q.correct_indices ?? []);
                            c ? cur.add(i) : cur.delete(i);
                            patch({ correct_indices: Array.from(cur).sort() });
                          }}
                          className="mt-2.5"
                        />
                      ) : (
                        <input
                          type="radio"
                          name="correct"
                          className="mt-3 h-4 w-4"
                          checked={q.correct_index === i}
                          onChange={() => patch({ correct_index: i })}
                          aria-label={`Mark option ${String.fromCharCode(65 + i)} as correct`}
                        />
                      )}
                      <div className="flex-1">
                        <RichEditor value={opt} onChange={(v) => setOption(i, v)} rows={2} placeholder={`Option ${String.fromCharCode(65 + i)}`} />
                      </div>
                      <Button size="icon" variant="ghost" className="mt-1" onClick={() => removeOption(i)} aria-label="Remove option">
                        <Trash2 className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card className="p-4">
              <RichEditor label="Explanation / Solution" value={q.explanation ?? ""} onChange={(v) => patch({ explanation: v })} rows={6} />
            </Card>
          </div>

          {/* Right side: metadata */}
          <div className="space-y-4">
            <Card className="p-4 space-y-3">
              <h2 className="text-sm font-semibold">Placement</h2>
              <TextRow label="Exam" v={q.exam} onChange={(v) => patch({ exam: v })} required />
              <TextRow label="Sub exam" v={q.sub_exam} onChange={(v) => patch({ sub_exam: v })} />
              <TextRow label="Subject" v={q.subject} onChange={(v) => patch({ subject: v })} required />
              <TextRow label="Chapter" v={q.chapter ?? ""} onChange={(v) => patch({ chapter: v })} />
              <TextRow label="Topic" v={q.topic ?? ""} onChange={(v) => patch({ topic: v })} required />
              <TextRow label="Sub-topic" v={q.sub_topic ?? ""} onChange={(v) => patch({ sub_topic: v })} />
              <TextRow label="Concept" v={q.concept ?? ""} onChange={(v) => patch({ concept: v })} />
            </Card>

            <Card className="p-4 space-y-3">
              <h2 className="text-sm font-semibold">Difficulty & scoring</h2>
              <Field label="Difficulty">
                <Select value={q.difficulty} onValueChange={(v) => patch({ difficulty: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="easy">Easy</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="hard">Hard</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <div className="grid grid-cols-3 gap-2">
                <Field label="Marks"><Input type="number" step="0.25" value={q.marks ?? 1} onChange={(e) => patch({ marks: Number(e.target.value) })} /></Field>
                <Field label="Negative"><Input type="number" step="0.25" value={q.negative_marks ?? 0} onChange={(e) => patch({ negative_marks: Number(e.target.value) })} /></Field>
                <Field label="Time (s)"><Input type="number" value={q.estimated_time_seconds ?? 60} onChange={(e) => patch({ estimated_time_seconds: Number(e.target.value) })} /></Field>
              </div>
              <Field label="Weightage">
                <Select value={q.weightage ?? ""} onValueChange={(v) => patch({ weightage: v === "__none__" ? undefined : v })}>
                  <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">—</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Exam frequency">
                <Select value={q.exam_frequency ?? ""} onValueChange={(v) => patch({ exam_frequency: v === "__none__" ? undefined : v })}>
                  <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">—</SelectItem>
                    <SelectItem value="rare">Rare</SelectItem>
                    <SelectItem value="occasional">Occasional</SelectItem>
                    <SelectItem value="frequent">Frequent</SelectItem>
                    <SelectItem value="very_frequent">Very frequent</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Quality score (0-100)">
                <Input type="number" min={0} max={100} value={q.quality_score ?? ""} onChange={(e) => patch({ quality_score: e.target.value === "" ? undefined : Number(e.target.value) })} />
              </Field>
            </Card>

            <Card className="p-4 space-y-3">
              <h2 className="text-sm font-semibold">Provenance</h2>
              <div className="flex items-center justify-between">
                <Label htmlFor="pyq" className="text-sm">Previous year question</Label>
                <Switch id="pyq" checked={!!q.is_pyq} onCheckedChange={(c) => patch({ is_pyq: c })} />
              </div>
              {q.is_pyq && (
                <Field label="PYQ year"><Input type="number" value={q.pyq_year ?? ""} onChange={(e) => patch({ pyq_year: e.target.value === "" ? undefined : Number(e.target.value) })} /></Field>
              )}
              <Field label="Source">
                <Select value={q.source_type} onValueChange={(v) => patch({ source_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">Manual</SelectItem>
                    <SelectItem value="ai_generated">AI generated</SelectItem>
                    <SelectItem value="pyq">PYQ</SelectItem>
                    <SelectItem value="high_weightage">High weightage</SelectItem>
                    <SelectItem value="imported">Imported</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Tags (comma separated)">
                <Input value={(q.tags ?? []).join(", ")} onChange={(e) => patch({ tags: e.target.value.split(",").map((t) => t.trim()).filter(Boolean) })} />
              </Field>
            </Card>

            <Card className="p-4 space-y-3">
              <h2 className="text-sm font-semibold">Workflow</h2>
              <Field label="Status">
                <Select value={q.status ?? "draft"} onValueChange={(v) => patch({ status: v as Question["status"] })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{QUESTION_STATUSES.map((s) => <SelectItem key={s} value={s} className="capitalize">{s.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
              <p className="text-xs text-muted-foreground">Flow: Draft → Under review → Approved → Published → Archived. Moderators approve before publish.</p>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="preview" className="mt-4">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-md border">
              <IconToggle active={device === "desktop"} onClick={() => setDevice("desktop")}><Monitor className="h-4 w-4" /></IconToggle>
              <IconToggle active={device === "tablet"} onClick={() => setDevice("tablet")}><Tablet className="h-4 w-4" /></IconToggle>
              <IconToggle active={device === "mobile"} onClick={() => setDevice("mobile")}><Smartphone className="h-4 w-4" /></IconToggle>
            </div>
            <div className="inline-flex rounded-md border">
              <IconToggle active={theme === "light"} onClick={() => setTheme("light")}><Sun className="h-4 w-4" /></IconToggle>
              <IconToggle active={theme === "dark"} onClick={() => setTheme("dark")}><Moon className="h-4 w-4" /></IconToggle>
            </div>
          </div>
          <QuestionPreview q={q} device={device} theme={theme} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1"><Label className="text-xs font-medium">{label}</Label>{children}</div>;
}
function TextRow({ label, v, onChange, required }: { label: string; v?: string; onChange: (v: string) => void; required?: boolean }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs font-medium">{label}{required && <span className="ml-0.5 text-destructive">*</span>}</Label>
      <Input value={v ?? ""} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
function IconToggle({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn("px-2.5 py-1.5 text-xs", active ? "bg-primary text-primary-foreground" : "hover:bg-muted")}
    >
      {children}
    </button>
  );
}
function StatusBadge({ s }: { s: Question["status"] }) {
  const map: Record<Question["status"], string> = {
    draft: "bg-muted text-muted-foreground",
    under_review: "bg-blue-500/15 text-blue-700",
    approved: "bg-violet-500/15 text-violet-700",
    published: "bg-emerald-500/15 text-emerald-700",
    archived: "bg-neutral-500/15 text-neutral-700",
  };
  return <Badge className={cn("capitalize", map[s])}>{s.replace(/_/g, " ")}</Badge>;
}

function VersionsSheet({ questionId, onRestored }: { questionId: string; onRestored: () => void }) {
  const [open, setOpen] = useState(false);
  const [versions, setVersions] = useState<Awaited<ReturnType<typeof listVersions>>>([]);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (!open) return;
    (async () => { setLoading(true); try { setVersions(await listVersions(questionId)); } finally { setLoading(false); } })();
  }, [open, questionId]);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm"><History className="mr-1.5 h-4 w-4" /> History</Button>
      </SheetTrigger>
      <SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
        <SheetHeader><SheetTitle>Version history</SheetTitle></SheetHeader>
        <div className="mt-4 space-y-3">
          {loading && <div className="text-sm text-muted-foreground">Loading…</div>}
          {!loading && versions.length === 0 && <div className="text-sm text-muted-foreground">No prior versions yet.</div>}
          {versions.map((v) => {
            const s = v.snapshot;
            return (
              <Card key={v.id} className="p-3">
                <div className="flex items-center justify-between text-xs">
                  <div className="font-mono">v{v.version}</div>
                  <div className="text-muted-foreground">{new Date(v.created_at).toLocaleString()}</div>
                </div>
                <div className="mt-2 line-clamp-2 text-sm">{s.question}</div>
                <div className="mt-2 flex items-center justify-end gap-2">
                  <Button size="sm" variant="outline" onClick={async () => {
                    try { await restoreVersion(questionId, v.version); toast.success(`Restored to v${v.version}`); setOpen(false); onRestored(); }
                    catch (e: any) { toast.error(e?.message ?? "Restore failed"); }
                  }}>Restore</Button>
                </div>
              </Card>
            );
          })}
        </div>
      </SheetContent>
    </Sheet>
  );
}
