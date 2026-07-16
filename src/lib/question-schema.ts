// Canonical question shape used by AI generator, vault, revision packs, bulk import.

export type SourceType = "ai_generated" | "pyq" | "verified";

export type CanonicalQuestion = {
  question: string;
  options: string[];
  correct_index: number;
  explanation?: string;
  section?: string;
  marks?: number;
  subject?: string;
  chapter?: string;
  topic?: string;
  concept?: string;
  difficulty?: string;
  estimated_time_seconds?: number;
  weightage?: string;
  exam_frequency?: string;
  concept_importance?: string;
  source_type?: SourceType;
  is_pyq?: boolean;
  pyq_year?: number | null;
  svg_diagram?: string | null;
  diagram_url?: string | null;
};

/** Stable client-safe sha256 hash of question text + correct index. */
export async function hashQuestion(q: Pick<CanonicalQuestion, "question" | "correct_index">): Promise<string> {
  const raw = `${(q.question ?? "").trim().toLowerCase()}::${q.correct_index}`;
  const enc = new TextEncoder().encode(raw);
  const buf = await crypto.subtle.digest("SHA-256", enc);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Best-effort bulk parser for JSON or CSV. Returns valid canonical questions. */
export function parseBulkQuestions(input: string): CanonicalQuestion[] {
  const trimmed = input.trim();
  if (!trimmed) return [];
  // JSON path
  if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
    try {
      const parsed = JSON.parse(trimmed);
      const arr = Array.isArray(parsed) ? parsed : [parsed];
      return arr.filter(isValidQuestion) as CanonicalQuestion[];
    } catch {
      return [];
    }
  }
  // CSV path — expects headers: question,option1,option2,option3,option4,correct_index,[explanation,subject,chapter,topic,difficulty,is_pyq,pyq_year]
  const lines = trimmed.split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];
  const headers = splitCsvLine(lines[0]).map((h) => h.trim().toLowerCase());
  const out: CanonicalQuestion[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = splitCsvLine(lines[i]);
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => (row[h] = (cells[idx] ?? "").trim()));
    const q: CanonicalQuestion = {
      question: row.question,
      options: [row.option1, row.option2, row.option3, row.option4].filter(Boolean),
      correct_index: Number(row.correct_index),
      explanation: row.explanation || undefined,
      subject: row.subject || undefined,
      chapter: row.chapter || undefined,
      topic: row.topic || undefined,
      difficulty: row.difficulty || undefined,
      is_pyq: row.is_pyq === "true" || row.is_pyq === "1",
      pyq_year: row.pyq_year ? Number(row.pyq_year) : null,
    };
    if (isValidQuestion(q)) out.push(q);
  }
  return out;
}

function isValidQuestion(q: unknown): q is CanonicalQuestion {
  if (!q || typeof q !== "object") return false;
  const o = q as Record<string, unknown>;
  return (
    typeof o.question === "string" &&
    Array.isArray(o.options) &&
    o.options.length >= 2 &&
    typeof o.correct_index === "number" &&
    o.correct_index >= 0 &&
    o.correct_index < (o.options as unknown[]).length
  );
}

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { cur += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      out.push(cur); cur = "";
    } else cur += ch;
  }
  out.push(cur);
  return out;
}
