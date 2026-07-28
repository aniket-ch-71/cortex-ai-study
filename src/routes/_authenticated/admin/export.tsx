import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader } from "@/components/ui-pro/PageHeader";
import { SectionCard } from "@/components/ui-pro/SectionCard";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import Papa from "papaparse";
import * as XLSX from "xlsx";

export const Route = createFileRoute("/_authenticated/admin/export")({
  component: Page,
  head: () => ({ meta: [{ title: "Export · Admin · PARIKSHA" }, { name: "robots", content: "noindex,nofollow" }] }),
});

type Format = "csv" | "xlsx" | "json";

function Page() {
  const [state, setState] = useState<string>("");
  const [format, setFormat] = useState<Format>("csv");
  const [busy, setBusy] = useState(false);

  async function run() {
    setBusy(true);
    try {
      let q = supabase.from("question_bank").select("id, exam, subject, chapter, topic, difficulty, question, options, correct_index, explanation, workflow_state, quality_score, is_pyq, pyq_year, published_at, updated_at").limit(50000);
      if (state) q = q.eq("workflow_state", state);
      const { data, error } = await q;
      if (error) throw error;
      const rows = data ?? [];
      if (!rows.length) { toast.info("No rows to export"); return; }

      const stamp = new Date().toISOString().replace(/[:.]/g, "-");
      const base = `parikertha-questions-${stamp}`;

      if (format === "json") {
        download(new Blob([JSON.stringify(rows, null, 2)], { type: "application/json" }), `${base}.json`);
      } else if (format === "csv") {
        const csv = Papa.unparse(rows.map((r) => ({ ...r, options: JSON.stringify(r.options) })));
        download(new Blob([csv], { type: "text/csv;charset=utf-8" }), `${base}.csv`);
      } else {
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(rows.map((r) => ({ ...r, options: JSON.stringify(r.options) })));
        XLSX.utils.book_append_sheet(wb, ws, "Questions");
        const buf = XLSX.write(wb, { type: "array", bookType: "xlsx" });
        download(new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), `${base}.xlsx`);
      }
      toast.success(`Exported ${rows.length} rows`);
    } catch (e) { toast.error(e instanceof Error ? e.message : "Export failed"); }
    finally { setBusy(false); }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 lg:px-8">
      <PageHeader eyebrow="Content Operations" title="Export questions" description="Download filtered datasets for offline analysis or migration." />
      <SectionCard title="Filters" className="mt-6">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-xs font-medium text-muted-foreground">Workflow state
            <Select value={state} onValueChange={setState}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="All states" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">All states</SelectItem>
                {["draft","ai_review","human_review","fact_check","approved","scheduled","published","archived","deprecated"].map((s) => (
                  <SelectItem key={s} value={s}>{s.replaceAll("_"," ")}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
          <label className="block text-xs font-medium text-muted-foreground">Format
            <Select value={format} onValueChange={(v) => setFormat(v as Format)}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="csv">CSV</SelectItem>
                <SelectItem value="xlsx">Excel (XLSX)</SelectItem>
                <SelectItem value="json">JSON</SelectItem>
              </SelectContent>
            </Select>
          </label>
        </div>
        <div className="mt-4 flex justify-end">
          <Button onClick={run} disabled={busy} className="gap-1.5">
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
            {busy ? "Building…" : "Export"}
          </Button>
        </div>
        <div className="mt-2 text-[11px] text-muted-foreground">Capped at 50,000 rows per export.</div>
      </SectionCard>
    </div>
  );
}

function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
