import { supabase } from "@/integrations/supabase/client";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { unzipSync, strFromU8 } from "fflate";
import { hashQuestion } from "@/lib/question-schema";
import { sha256Hex } from "@/lib/admin/media";

export type ImportFormat = "csv" | "xlsx" | "json" | "zip";
export type ImportStatus =
  | "pending"
  | "uploading"
  | "validating"
  | "previewing"
  | "importing"
  | "completed"
  | "failed"
  | "cancelled"
  | "rolled_back";

export type DedupeStrategy = "skip" | "replace" | "keep_both";

export type ImportJob = {
  id: string;
  created_by: string | null;
  source_filename: string;
  source_size: number;
  source_path: string | null;
  format: ImportFormat;
  status: ImportStatus;
  current_phase: string | null;
  progress_pct: number;
  rows_found: number;
  rows_valid: number;
  rows_invalid: number;
  rows_imported: number;
  rows_failed: number;
  duplicates: number;
  options: Record<string, unknown>;
  column_map: Record<string, string> | null;
  started_at: string | null;
  finished_at: string | null;
  duration_ms: number | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
};

export type ImportError = {
  id: number;
  job_id: string;
  row_index: number;
  field: string | null;
  code: string;
  message: string;
  raw: Record<string, unknown> | null;
  created_at: string;
};

export type ImportLog = {
  id: number;
  job_id: string;
  level: "debug" | "info" | "warn" | "error";
  phase: string | null;
  message: string;
  meta: Record<string, unknown> | null;
  created_at: string;
};

export type ParsedRow = {
  index: number;
  raw: Record<string, unknown>;
  question: string;
  options: string[];
  correct_index: number;
  explanation: string | null;
  exam: string | null;
  subject: string | null;
  chapter: string | null;
  topic: string | null;
  difficulty: string | null;
  question_type: string;
  is_pyq: boolean;
  pyq_year: number | null;
  language: string;
  tags: string[];
  hash: string | null;
  errors: string[];
  duplicate?: boolean;
};

export const CANONICAL_FIELDS = [
  "question",
  "option1",
  "option2",
  "option3",
  "option4",
  "correct_index",
  "explanation",
  "exam",
  "subject",
  "chapter",
  "topic",
  "difficulty",
  "question_type",
  "is_pyq",
  "pyq_year",
  "language",
  "tags",
] as const;

const MAX_UPLOAD_BYTES = 100 * 1024 * 1024; // 100MB safety cap (browser side)

export function detectFormat(name: string): ImportFormat | null {
  const n = name.toLowerCase();
  if (n.endsWith(".csv")) return "csv";
  if (n.endsWith(".xlsx") || n.endsWith(".xls")) return "xlsx";
  if (n.endsWith(".json")) return "json";
  if (n.endsWith(".zip")) return "zip";
  return null;
}

async function log(jobId: string, message: string, phase?: string, level: ImportLog["level"] = "info", meta?: Record<string, unknown>) {
  await supabase.from("bulk_import_logs").insert({ job_id: jobId, level, phase: phase ?? null, message, meta: meta ?? null });
}

async function updateJob(jobId: string, patch: Partial<ImportJob>) {
  await supabase.from("bulk_import_jobs").update(patch as never).eq("id", jobId);
}

async function pushErrors(jobId: string, errs: Array<{ row_index: number; field?: string; code: string; message: string; raw?: unknown }>) {
  if (!errs.length) return;
  const rows = errs.map((e) => ({
    job_id: jobId,
    row_index: e.row_index,
    field: e.field ?? null,
    code: e.code,
    message: e.message,
    raw: (e.raw ?? null) as unknown,
  }));
  const CHUNK = 500;
  for (let i = 0; i < rows.length; i += CHUNK) {
    await supabase.from("bulk_import_errors").insert(rows.slice(i, i + CHUNK) as never);
  }
}

export async function createImportJob(file: File): Promise<ImportJob> {
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error(`File too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Split into batches under 100MB.`);
  }
  const format = detectFormat(file.name);
  if (!format) throw new Error("Unsupported file format. Use CSV, XLSX, JSON, or ZIP.");

  const { data: sess } = await supabase.auth.getSession();
  const uid = sess.session?.user.id ?? null;

  const { data: job, error } = await supabase
    .from("bulk_import_jobs")
    .insert({
      created_by: uid,
      source_filename: file.name,
      source_size: file.size,
      format,
      status: "uploading",
      current_phase: "Uploading source file",
      options: {},
    })
    .select("*")
    .single();
  if (error) throw error;

  const path = `${(job as ImportJob).id}/source.${format}`;
  const { error: upErr } = await supabase.storage.from("imports").upload(path, file, {
    contentType: file.type || "application/octet-stream",
    upsert: true,
  });
  if (upErr) {
    await updateJob((job as ImportJob).id, { status: "failed", error_message: upErr.message, finished_at: new Date().toISOString() });
    throw upErr;
  }
  await updateJob((job as ImportJob).id, { source_path: path, status: "pending" });
  await log((job as ImportJob).id, `Uploaded ${file.name} (${file.size} bytes)`, "upload");
  return { ...(job as ImportJob), source_path: path, status: "pending" };
}

function coerceRow(raw: Record<string, unknown>, index: number): ParsedRow {
  const errors: string[] = [];
  const g = (k: string): string => {
    const v = raw[k] ?? raw[k.toLowerCase()] ?? raw[k.toUpperCase()];
    return v == null ? "" : String(v).trim();
  };
  const question = g("question");
  const opts = [g("option1"), g("option2"), g("option3"), g("option4")].filter(Boolean);
  const ci = Number(g("correct_index"));
  const explanation = g("explanation") || null;

  if (!question || question.length < 5) errors.push("question missing or too short");
  if (opts.length < 2) errors.push("at least 2 options required");
  if (!Number.isFinite(ci) || ci < 0 || ci >= opts.length) errors.push("correct_index out of range");

  const pyqRaw = g("pyq_year");
  const pyq = pyqRaw ? Number(pyqRaw) : null;
  const tagsRaw = g("tags");
  const tags = tagsRaw ? tagsRaw.split(/[|,;]/).map((t) => t.trim()).filter(Boolean) : [];

  return {
    index,
    raw,
    question,
    options: opts,
    correct_index: ci,
    explanation,
    exam: g("exam") || null,
    subject: g("subject") || null,
    chapter: g("chapter") || null,
    topic: g("topic") || null,
    difficulty: g("difficulty") || null,
    question_type: g("question_type") || "single_correct",
    is_pyq: /^(true|1|yes)$/i.test(g("is_pyq")),
    pyq_year: pyq && Number.isFinite(pyq) ? pyq : null,
    language: g("language") || "en",
    tags,
    hash: null,
    errors,
  };
}

async function parseCsv(text: string): Promise<Record<string, unknown>[]> {
  return await new Promise((resolve, reject) => {
    Papa.parse<Record<string, unknown>>(text, {
      header: true,
      skipEmptyLines: true,
      complete: (r) => resolve(r.data),
      error: (e: unknown) => reject(e),
    });
  });
}

function parseXlsx(buf: ArrayBuffer): Record<string, unknown>[] {
  const wb = XLSX.read(buf, { type: "array" });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  return XLSX.utils.sheet_to_json(sheet, { defval: "" });
}

function parseJson(text: string): Record<string, unknown>[] {
  const j = JSON.parse(text);
  if (Array.isArray(j)) return j as Record<string, unknown>[];
  if (Array.isArray((j as { questions?: unknown[] }).questions)) return (j as { questions: Record<string, unknown>[] }).questions;
  return [j as Record<string, unknown>];
}

async function parseZip(buf: ArrayBuffer): Promise<Record<string, unknown>[]> {
  const files = unzipSync(new Uint8Array(buf));
  const manifest = files["manifest.json"] || files["questions.json"];
  if (manifest) return parseJson(strFromU8(manifest));
  const csv = Object.keys(files).find((k) => k.toLowerCase().endsWith(".csv"));
  if (csv) return await parseCsv(strFromU8(files[csv]));
  throw new Error("ZIP must contain manifest.json, questions.json, or a .csv file");
}

export async function runValidation(jobId: string): Promise<{ rows: ParsedRow[]; job: ImportJob }> {
  await updateJob(jobId, { status: "validating", current_phase: "Downloading source", progress_pct: 5, started_at: new Date().toISOString() });
  const { data: jobData, error: jErr } = await supabase.from("bulk_import_jobs").select("*").eq("id", jobId).single();
  if (jErr) throw jErr;
  const job = jobData as ImportJob;
  if (!job.source_path) throw new Error("Source file missing");

  const { data: blob, error: dErr } = await supabase.storage.from("imports").download(job.source_path);
  if (dErr) throw dErr;
  const buf = await blob.arrayBuffer();
  await log(jobId, "Source downloaded", "download");

  await updateJob(jobId, { current_phase: "Parsing", progress_pct: 15 });
  let rawRows: Record<string, unknown>[] = [];
  try {
    if (job.format === "csv") rawRows = await parseCsv(new TextDecoder().decode(buf));
    else if (job.format === "xlsx") rawRows = parseXlsx(buf);
    else if (job.format === "json") rawRows = parseJson(new TextDecoder().decode(buf));
    else if (job.format === "zip") rawRows = await parseZip(buf);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await updateJob(jobId, { status: "failed", error_message: msg, finished_at: new Date().toISOString() });
    await log(jobId, `Parse failed: ${msg}`, "parse", "error");
    throw e;
  }
  await log(jobId, `Parsed ${rawRows.length} rows`, "parse");

  await updateJob(jobId, { current_phase: "Validating rows", progress_pct: 35, rows_found: rawRows.length });

  const rows: ParsedRow[] = [];
  const errs: Array<{ row_index: number; field?: string; code: string; message: string; raw?: unknown }> = [];
  for (let i = 0; i < rawRows.length; i++) {
    const r = coerceRow(rawRows[i], i);
    if (r.errors.length === 0) {
      r.hash = await hashQuestion({ question: r.question, correct_index: r.correct_index });
    }
    for (const err of r.errors) errs.push({ row_index: i, code: "validation", message: err, raw: rawRows[i] });
    rows.push(r);
  }
  await pushErrors(jobId, errs);

  // duplicate detection against existing question_bank
  await updateJob(jobId, { current_phase: "Checking duplicates", progress_pct: 65 });
  const hashes = rows.filter((r) => r.hash).map((r) => r.hash!) as string[];
  const dupSet = new Set<string>();
  const CHUNK = 200;
  for (let i = 0; i < hashes.length; i += CHUNK) {
    const slice = hashes.slice(i, i + CHUNK);
    const { data: existing } = await supabase
      .from("question_bank")
      .select("question_hash")
      .in("question_hash", slice);
    for (const e of (existing ?? []) as { question_hash: string }[]) dupSet.add(e.question_hash);
  }
  let dupCount = 0;
  for (const r of rows) {
    if (r.hash && dupSet.has(r.hash)) {
      r.duplicate = true;
      dupCount++;
    }
  }

  const valid = rows.filter((r) => r.errors.length === 0).length;
  const invalid = rows.length - valid;
  await updateJob(jobId, {
    status: "previewing",
    current_phase: "Ready for review",
    progress_pct: 100,
    rows_valid: valid,
    rows_invalid: invalid,
    duplicates: dupCount,
  });
  await log(jobId, `Validation complete: ${valid} valid, ${invalid} invalid, ${dupCount} duplicates`, "validate");

  const { data: finalJob } = await supabase.from("bulk_import_jobs").select("*").eq("id", jobId).single();
  return { rows, job: (finalJob as ImportJob) ?? job };
}

export async function commitImport(jobId: string, rows: ParsedRow[], strategy: DedupeStrategy = "skip"): Promise<void> {
  const started = Date.now();
  await updateJob(jobId, { status: "importing", current_phase: "Importing questions", progress_pct: 0, started_at: new Date().toISOString(), options: { dedupe: strategy } });
  await log(jobId, `Commit started with strategy=${strategy}`, "commit");

  const { data: sess } = await supabase.auth.getSession();
  const uid = sess.session?.user.id ?? null;

  const importable = rows.filter((r) => r.errors.length === 0);
  let imported = 0;
  let failed = 0;
  let skipped = 0;
  const CHUNK = 100;

  for (let i = 0; i < importable.length; i += CHUNK) {
    const batch = importable.slice(i, i + CHUNK);
    const toInsert: Array<Record<string, unknown>> = [];
    const replaceMap: Array<{ row: ParsedRow; existing_id: string; snapshot: Record<string, unknown> }> = [];

    // handle duplicates per strategy
    const dupHashes = batch.filter((r) => r.duplicate && r.hash).map((r) => r.hash!);
    let existingById: Record<string, { id: string; snapshot: Record<string, unknown> }> = {};
    if (dupHashes.length && (strategy === "replace")) {
      const { data: ex } = await supabase.from("question_bank").select("*").in("question_hash", dupHashes);
      for (const e of (ex ?? []) as Array<Record<string, unknown>>) {
        existingById[String(e.question_hash)] = { id: String(e.id), snapshot: e };
      }
    }

    for (const r of batch) {
      if (r.duplicate) {
        if (strategy === "skip") { skipped++; continue; }
        if (strategy === "replace" && r.hash && existingById[r.hash]) {
          replaceMap.push({ row: r, existing_id: existingById[r.hash].id, snapshot: existingById[r.hash].snapshot });
          continue;
        }
        // keep_both → falls through to insert with a new hash bust
      }
      toInsert.push({
        question: r.question,
        options: r.options,
        correct_index: r.correct_index,
        explanation: r.explanation ?? "",
        exam: r.exam ?? "GENERIC",
        sub_exam: r.exam ?? "GENERIC",
        subject: r.subject ?? "General",
        chapter: r.chapter,
        topic: r.topic,
        difficulty: r.difficulty ?? "medium",
        question_type: r.question_type as never,
        language: r.language,
        is_pyq: r.is_pyq,
        pyq_year: r.pyq_year,
        source_type: "verified",
        tags: r.tags,
        author_id: uid,
        status: "draft",
        question_hash: r.duplicate && strategy === "keep_both" && r.hash ? `${r.hash}_${Date.now()}_${r.index}` : r.hash,
      });
    }

    if (toInsert.length) {
      const { data: ins, error: iErr } = await supabase.from("question_bank").insert(toInsert as never).select("id");
      if (iErr) {
        failed += toInsert.length;
        await pushErrors(jobId, toInsert.map((_, idx) => ({ row_index: i + idx, code: "insert_failed", message: iErr.message })));
      } else {
        imported += (ins ?? []).length;
        const historyRows = ((ins ?? []) as { id: string }[]).map((row) => ({
          job_id: jobId,
          question_id: row.id,
          action: "inserted" as const,
          previous_snapshot: null,
        }));
        if (historyRows.length) await supabase.from("bulk_import_history").insert(historyRows as never);
      }
    }

    for (const rp of replaceMap) {
      const { error: uErr } = await supabase
        .from("question_bank")
        .update({
          question: rp.row.question,
          options: rp.row.options,
          correct_index: rp.row.correct_index,
          explanation: rp.row.explanation ?? "",
        } as never)
        .eq("id", rp.existing_id);
      if (uErr) {
        failed++;
        await pushErrors(jobId, [{ row_index: rp.row.index, code: "update_failed", message: uErr.message }]);
      } else {
        imported++;
        await supabase.from("bulk_import_history").insert({
          job_id: jobId,
          question_id: rp.existing_id,
          action: "replaced",
          previous_snapshot: rp.snapshot as never,
        } as never);
      }
    }

    const pct = Math.min(99, Math.round(((i + batch.length) / importable.length) * 100));
    await updateJob(jobId, { progress_pct: pct, rows_imported: imported, rows_failed: failed });
    await log(jobId, `Chunk ${i / CHUNK + 1}: +${toInsert.length} inserts, +${replaceMap.length} replacements`, "commit");
  }

  const duration = Date.now() - started;
  await updateJob(jobId, {
    status: "completed",
    current_phase: "Complete",
    progress_pct: 100,
    rows_imported: imported,
    rows_failed: failed,
    duration_ms: duration,
    finished_at: new Date().toISOString(),
  });
  await log(jobId, `Import complete: ${imported} imported, ${skipped} skipped, ${failed} failed in ${duration}ms`, "commit");

  // Cleanup source file
  const { data: jobRow } = await supabase.from("bulk_import_jobs").select("source_path").eq("id", jobId).single();
  const sp = (jobRow as { source_path: string | null } | null)?.source_path;
  if (sp) await supabase.storage.from("imports").remove([sp]);
}

export async function cancelImport(jobId: string) {
  await updateJob(jobId, { status: "cancelled", finished_at: new Date().toISOString(), current_phase: "Cancelled" });
  await log(jobId, "Import cancelled by user", "cancel", "warn");
}

export async function rollbackImport(jobId: string): Promise<{ removed: number; reverted: number }> {
  const { data, error } = await supabase.rpc("admin_rollback_import", { _job_id: jobId });
  if (error) throw error;
  await log(jobId, "Import rolled back", "rollback", "warn");
  return (data as { removed: number; reverted: number }) ?? { removed: 0, reverted: 0 };
}

export async function listImportJobs(limit = 50): Promise<ImportJob[]> {
  const { data, error } = await supabase
    .from("bulk_import_jobs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as ImportJob[];
}

export async function getImportJob(jobId: string): Promise<ImportJob | null> {
  const { data } = await supabase.from("bulk_import_jobs").select("*").eq("id", jobId).maybeSingle();
  return (data as ImportJob) ?? null;
}

export async function listJobErrors(jobId: string, limit = 200): Promise<ImportError[]> {
  const { data, error } = await supabase
    .from("bulk_import_errors")
    .select("*")
    .eq("job_id", jobId)
    .order("row_index", { ascending: true })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as ImportError[];
}

export async function listJobLogs(jobId: string, limit = 200): Promise<ImportLog[]> {
  const { data, error } = await supabase
    .from("bulk_import_logs")
    .select("*")
    .eq("job_id", jobId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as ImportLog[];
}
