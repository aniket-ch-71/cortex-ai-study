import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PageHeader } from "@/components/ui-pro/PageHeader";
import { SectionCard } from "@/components/ui-pro/SectionCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Upload,
  FileSpreadsheet,
  FileJson,
  FileArchive,
  Check,
  X,
  AlertTriangle,
  Undo2,
  RefreshCw,
  Download,
  ArrowRight,
  History,
} from "lucide-react";
import {
  cancelImport,
  commitImport,
  createImportJob,
  DedupeStrategy,
  detectFormat,
  getImportJob,
  ImportError,
  ImportJob,
  listImportJobs,
  listJobErrors,
  ParsedRow,
  rollbackImport,
  runValidation,
} from "@/lib/admin/import";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin/import")({
  component: ImportPage,
  head: () => ({
    meta: [
      { title: "Bulk Import · Admin · PARIKSHA" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
});

type WizardStep = "select" | "detect" | "validate" | "resolve" | "importing" | "summary";

function ImportPage() {
  const [step, setStep] = useState<WizardStep>("select");
  const [file, setFile] = useState<File | null>(null);
  const [job, setJob] = useState<ImportJob | null>(null);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [errors, setErrors] = useState<ImportError[]>([]);
  const [strategy, setStrategy] = useState<DedupeStrategy>("skip");
  const [history, setHistory] = useState<ImportJob[]>([]);
  const [drag, setDrag] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const loadHistory = useCallback(async () => {
    setHistory(await listImportJobs(20));
  }, []);
  useEffect(() => { loadHistory(); }, [loadHistory]);

  // Realtime job progress
  useEffect(() => {
    if (!job?.id) return;
    const ch = supabase
      .channel(`import-${job.id}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "bulk_import_jobs", filter: `id=eq.${job.id}` }, (payload) => {
        setJob(payload.new as ImportJob);
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [job?.id]);

  const reset = () => {
    setStep("select");
    setFile(null);
    setJob(null);
    setRows([]);
    setErrors([]);
  };

  const onPick = (f: File | null | undefined) => {
    if (!f) return;
    const fmt = detectFormat(f.name);
    if (!fmt) return toast.error("Use CSV, XLSX, JSON, or ZIP files");
    setFile(f);
    setStep("detect");
  };

  const startUpload = async () => {
    if (!file) return;
    try {
      toast.info("Uploading and preparing…");
      const j = await createImportJob(file);
      setJob(j);
      setStep("validate");
      toast.success("Uploaded. Starting validation…");
      const res = await runValidation(j.id);
      setJob(res.job);
      setRows(res.rows);
      setErrors(await listJobErrors(j.id, 200));
      setStep("resolve");
      loadHistory();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Import failed");
      setStep("select");
    }
  };

  const doCommit = async () => {
    if (!job) return;
    setStep("importing");
    try {
      await commitImport(job.id, rows, strategy);
      const j = await getImportJob(job.id);
      if (j) setJob(j);
      setStep("summary");
      toast.success("Import complete");
      loadHistory();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Commit failed");
      setStep("resolve");
    }
  };

  const doCancel = async () => {
    if (!job) return;
    await cancelImport(job.id);
    toast.warning("Import cancelled");
    reset();
    loadHistory();
  };

  const doRollback = async (jobId: string) => {
    if (!confirm("Roll back this import? Inserted questions will be removed and updated questions reverted.")) return;
    try {
      const r = await rollbackImport(jobId);
      toast.success(`Rolled back: ${r.removed} removed, ${r.reverted} reverted`);
      loadHistory();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Rollback failed");
    }
  };

  const downloadErrorCsv = () => {
    if (!errors.length) return;
    const lines = ["row_index,field,code,message", ...errors.map((e) => [e.row_index, e.field ?? "", e.code, JSON.stringify(e.message)].join(","))];
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `import-errors-${job?.id ?? "job"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8">
      <PageHeader
        eyebrow="Ingest"
        title="Bulk import"
        description="Import questions from CSV, XLSX, JSON, or ZIP with validation, dedupe and rollback."
      />

      <Tabs defaultValue="wizard" className="mt-4">
        <TabsList>
          <TabsTrigger value="wizard">Import wizard</TabsTrigger>
          <TabsTrigger value="history">History ({history.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="wizard" className="mt-4">
          <StepBar step={step} />

          {step === "select" && (
            <SectionCard>
              <div
                onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
                onDragLeave={() => setDrag(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDrag(false);
                  onPick(e.dataTransfer.files?.[0]);
                }}
                className={`grid place-items-center rounded-xl border-2 border-dashed p-12 text-center transition ${drag ? "border-primary bg-primary/5" : "border-border/60"}`}
              >
                <Upload className="mb-3 h-8 w-8 text-muted-foreground" />
                <div className="text-base font-medium">Drop file here or click to browse</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  Supported: CSV, XLSX, JSON, ZIP · Max 100 MB per file
                </div>
                <Button className="mt-4" onClick={() => inputRef.current?.click()}>
                  Choose file
                </Button>
                <input
                  ref={inputRef}
                  type="file"
                  accept=".csv,.xlsx,.xls,.json,.zip"
                  className="hidden"
                  onChange={(e) => onPick(e.target.files?.[0])}
                />
                <TemplateHints />
              </div>
            </SectionCard>
          )}

          {step === "detect" && file && (
            <SectionCard>
              <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
                <FormatIcon format={detectFormat(file.name)!} />
                <div className="flex-1">
                  <div className="text-sm font-medium">{file.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {(file.size / 1024 / 1024).toFixed(2)} MB · {detectFormat(file.name)!.toUpperCase()} detected
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={reset}>Cancel</Button>
                  <Button onClick={startUpload}>
                    Upload & validate <ArrowRight className="ml-1 h-4 w-4" />
                  </Button>
                </div>
              </div>
            </SectionCard>
          )}

          {step === "validate" && job && (
            <SectionCard>
              <div className="flex items-center gap-3">
                <RefreshCw className="h-5 w-5 animate-spin text-primary" />
                <div className="flex-1">
                  <div className="text-sm font-medium">{job.current_phase ?? "Working…"}</div>
                  <Progress value={job.progress_pct} className="mt-2" />
                </div>
                <Button variant="ghost" size="sm" onClick={doCancel}>Cancel</Button>
              </div>
            </SectionCard>
          )}

          {step === "resolve" && job && (
            <>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-6">
                <Stat label="Rows found" value={job.rows_found} />
                <Stat label="Valid" value={job.rows_valid} tone="ok" />
                <Stat label="Invalid" value={job.rows_invalid} tone="err" />
                <Stat label="Duplicates" value={job.duplicates} tone="warn" />
                <Stat label="Errors logged" value={errors.length} />
                <Stat label="Est. time" value={`${Math.max(1, Math.ceil((job.rows_valid + job.duplicates) / 200))}s`} />
              </div>

              <SectionCard className="mt-4">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="text-sm font-medium">Duplicate strategy</div>
                  <Select value={strategy} onValueChange={(v) => setStrategy(v as DedupeStrategy)}>
                    <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="skip">Skip duplicates</SelectItem>
                      <SelectItem value="replace">Replace existing</SelectItem>
                      <SelectItem value="keep_both">Keep both</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="ml-auto flex gap-2">
                    <Button variant="outline" size="sm" onClick={downloadErrorCsv} disabled={!errors.length}>
                      <Download className="mr-1 h-3.5 w-3.5" />Errors CSV
                    </Button>
                    <Button variant="outline" size="sm" onClick={doCancel}>Cancel</Button>
                    <Button size="sm" onClick={doCommit} disabled={job.rows_valid === 0}>
                      Import {job.rows_valid} question(s) <ArrowRight className="ml-1 h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </SectionCard>

              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                <SectionCard title="Preview (first 20 rows)" description={`${rows.length} parsed`}>
                  <div className="max-h-[400px] overflow-auto text-xs">
                    <table className="min-w-full">
                      <thead className="sticky top-0 bg-card">
                        <tr className="text-left text-muted-foreground">
                          <th className="p-1.5">#</th>
                          <th className="p-1.5">Question</th>
                          <th className="p-1.5">Ans</th>
                          <th className="p-1.5">State</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.slice(0, 20).map((r) => (
                          <tr key={r.index} className="border-t border-border/60">
                            <td className="p-1.5 text-muted-foreground">{r.index + 1}</td>
                            <td className="p-1.5"><div className="max-w-md truncate">{r.question || <span className="italic text-destructive">missing</span>}</div></td>
                            <td className="p-1.5">{r.correct_index}</td>
                            <td className="p-1.5">
                              {r.errors.length > 0 ? (
                                <Badge variant="destructive">invalid</Badge>
                              ) : r.duplicate ? (
                                <Badge variant="secondary">duplicate</Badge>
                              ) : (
                                <Badge variant="outline">ok</Badge>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </SectionCard>

                <SectionCard title="Errors" description={`${errors.length} issue(s)`}>
                  <div className="max-h-[400px] overflow-auto text-xs">
                    {errors.length === 0 ? (
                      <div className="py-8 text-center text-muted-foreground">No validation errors 🎉</div>
                    ) : (
                      <ul className="divide-y divide-border/60">
                        {errors.slice(0, 200).map((e) => (
                          <li key={e.id} className="flex items-start gap-2 p-2">
                            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 text-destructive" />
                            <div>
                              <div className="font-medium">Row {e.row_index + 1} <span className="text-muted-foreground">· {e.code}</span></div>
                              <div className="text-muted-foreground">{e.message}</div>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </SectionCard>
              </div>
            </>
          )}

          {step === "importing" && job && (
            <SectionCard>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <RefreshCw className="h-5 w-5 animate-spin text-primary" />
                  <div className="flex-1 text-sm font-medium">{job.current_phase ?? "Importing…"}</div>
                  <div className="text-xs text-muted-foreground">{job.rows_imported}/{job.rows_valid}</div>
                </div>
                <Progress value={job.progress_pct} />
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {["Preparing", "Validating", "Importing", "Finishing"].map((p, i) => (
                    <div key={p} className={`flex items-center gap-2 rounded-md border p-2 text-xs ${job.progress_pct > i * 25 ? "border-primary/60 bg-primary/5 text-primary" : "border-border/60 text-muted-foreground"}`}>
                      <Check className="h-3.5 w-3.5" /> {p}
                    </div>
                  ))}
                </div>
              </div>
            </SectionCard>
          )}

          {step === "summary" && job && (
            <SectionCard>
              <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
                <div className="grid h-12 w-12 place-items-center rounded-full bg-primary/10 text-primary">
                  <Check className="h-6 w-6" />
                </div>
                <div className="flex-1">
                  <div className="text-lg font-semibold">Import complete</div>
                  <div className="text-sm text-muted-foreground">
                    Imported {job.rows_imported} of {job.rows_valid} valid questions in {((job.duration_ms ?? 0) / 1000).toFixed(1)}s.
                    {job.rows_failed > 0 ? ` ${job.rows_failed} failed.` : ""}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => doRollback(job.id)}>
                    <Undo2 className="mr-1 h-3.5 w-3.5" />Rollback
                  </Button>
                  <Button onClick={reset}>Import another</Button>
                </div>
              </div>
            </SectionCard>
          )}
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          <SectionCard>
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <History className="h-4 w-4" /> Recent imports
              </div>
              <Button variant="ghost" size="sm" onClick={loadHistory}><RefreshCw className="h-4 w-4" /></Button>
            </div>
            <div className="overflow-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-border/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="p-2">File</th>
                    <th className="p-2">Format</th>
                    <th className="p-2">Status</th>
                    <th className="p-2">Rows</th>
                    <th className="p-2">Imported</th>
                    <th className="p-2">Duration</th>
                    <th className="p-2">When</th>
                    <th className="p-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((j) => (
                    <tr key={j.id} className="border-b border-border/40">
                      <td className="p-2"><div className="max-w-xs truncate">{j.source_filename}</div></td>
                      <td className="p-2 uppercase text-muted-foreground">{j.format}</td>
                      <td className="p-2"><StatusBadge status={j.status} /></td>
                      <td className="p-2">{j.rows_found}</td>
                      <td className="p-2">{j.rows_imported}</td>
                      <td className="p-2 text-xs text-muted-foreground">{j.duration_ms ? `${(j.duration_ms / 1000).toFixed(1)}s` : "—"}</td>
                      <td className="p-2 text-xs text-muted-foreground">{new Date(j.created_at).toLocaleString()}</td>
                      <td className="p-2">
                        {j.status === "completed" && (
                          <Button size="sm" variant="ghost" onClick={() => doRollback(j.id)}>
                            <Undo2 className="mr-1 h-3.5 w-3.5" />Rollback
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {history.length === 0 && (
                    <tr><td colSpan={8} className="p-6 text-center text-sm text-muted-foreground">No imports yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </SectionCard>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StepBar({ step }: { step: WizardStep }) {
  const items: { key: WizardStep; label: string }[] = [
    { key: "select", label: "1. Select" },
    { key: "detect", label: "2. Detect" },
    { key: "validate", label: "3. Validate" },
    { key: "resolve", label: "4. Resolve" },
    { key: "importing", label: "5. Import" },
    { key: "summary", label: "6. Summary" },
  ];
  const idx = items.findIndex((i) => i.key === step);
  return (
    <div className="mb-4 flex flex-wrap items-center gap-2 text-xs">
      {items.map((it, i) => {
        const active = i === idx;
        const done = i < idx;
        return (
          <div key={it.key} className={`flex items-center gap-1 rounded-full px-2.5 py-1 ${active ? "bg-primary/15 text-primary" : done ? "bg-primary/5 text-primary/70" : "bg-muted/40 text-muted-foreground"}`}>
            {done ? <Check className="h-3 w-3" /> : null}
            {it.label}
          </div>
        );
      })}
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number | string; tone?: "ok" | "err" | "warn" }) {
  const c = tone === "ok" ? "text-emerald-600" : tone === "err" ? "text-destructive" : tone === "warn" ? "text-amber-600" : "text-foreground";
  return (
    <div className="rounded-lg border border-border/60 bg-card/60 p-3">
      <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`mt-1 text-2xl font-bold ${c}`}>{value}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: ImportJob["status"] }) {
  const map: Record<ImportJob["status"], string> = {
    pending: "bg-muted text-muted-foreground",
    uploading: "bg-blue-500/15 text-blue-600",
    validating: "bg-blue-500/15 text-blue-600",
    previewing: "bg-amber-500/15 text-amber-600",
    importing: "bg-blue-500/15 text-blue-600",
    completed: "bg-emerald-500/15 text-emerald-600",
    failed: "bg-destructive/15 text-destructive",
    cancelled: "bg-muted text-muted-foreground",
    rolled_back: "bg-orange-500/15 text-orange-600",
  };
  return <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${map[status]}`}>{status}</span>;
}

function FormatIcon({ format }: { format: "csv" | "xlsx" | "json" | "zip" }) {
  const Icon = format === "json" ? FileJson : format === "zip" ? FileArchive : FileSpreadsheet;
  return (
    <div className="grid h-12 w-12 place-items-center rounded-lg bg-primary/10 text-primary">
      <Icon className="h-6 w-6" />
    </div>
  );
}

function TemplateHints() {
  return (
    <div className="mt-6 max-w-2xl text-left text-xs text-muted-foreground">
      <div className="font-medium text-foreground">Expected columns (CSV/XLSX):</div>
      <code className="mt-1 block break-all rounded bg-muted/50 p-2 font-mono">
        question, option1, option2, option3, option4, correct_index, explanation, exam, subject, chapter, topic, difficulty, question_type, is_pyq, pyq_year, language, tags
      </code>
      <div className="mt-2">JSON: array of objects with the same field names. ZIP: include a <code>manifest.json</code> or <code>questions.json</code>.</div>
    </div>
  );
}
