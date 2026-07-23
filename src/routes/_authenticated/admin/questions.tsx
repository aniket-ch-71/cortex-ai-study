import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Plus,
  Search,
  Filter,
  RefreshCw,
  MoreHorizontal,
  Copy,
  Archive,
  ArchiveRestore,
  Trash2,
  Send,
  Eye,
  Columns3,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { PageHeader } from "@/components/ui-pro/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import { Card } from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  listQuestions,
  archiveQuestions,
  restoreQuestions,
  softDeleteQuestions,
  publishQuestions,
  duplicateQuestion,
  bulkUpdate,
  QUESTION_STATUSES,
  QUESTION_TYPES,
  type Question,
  type QuestionFilters,
  type QuestionStatus,
  type SortField,
} from "@/lib/admin/questions";
import { cn } from "@/lib/utils";

type ColKey =
  | "question"
  | "exam"
  | "subject"
  | "topic"
  | "question_type"
  | "difficulty"
  | "is_pyq"
  | "status"
  | "version"
  | "updated_at";

const ALL_COLUMNS: { key: ColKey; label: string; always?: boolean }[] = [
  { key: "question", label: "Question", always: true },
  { key: "exam", label: "Exam" },
  { key: "subject", label: "Subject" },
  { key: "topic", label: "Topic" },
  { key: "question_type", label: "Type" },
  { key: "difficulty", label: "Difficulty" },
  { key: "is_pyq", label: "PYQ" },
  { key: "status", label: "Status" },
  { key: "version", label: "v" },
  { key: "updated_at", label: "Updated" },
];
type ColKey = (typeof ALL_COLUMNS)[number]["key"];

type SavedView = { name: string; filters: QuestionFilters; cols: ColKey[] };
const VIEWS_KEY = "pariksha:admin:qb:views";
const COLS_KEY = "pariksha:admin:qb:cols";

function useDebounced<T>(v: T, ms = 300): T {
  const [d, setD] = useState(v);
  useEffect(() => {
    const t = setTimeout(() => setD(v), ms);
    return () => clearTimeout(t);
  }, [v, ms]);
  return d;
}

function Page() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState<QuestionFilters>({});
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounced(search, 350);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [sort, setSort] = useState<SortField>("updated_at");
  const [order, setOrder] = useState<"asc" | "desc">("desc");
  const [rows, setRows] = useState<Question[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [cols, setCols] = useState<ColKey[]>(() => {
    if (typeof window === "undefined") return ALL_COLUMNS.map((c) => c.key);
    try {
      const raw = localStorage.getItem(COLS_KEY);
      return raw ? (JSON.parse(raw) as ColKey[]) : ALL_COLUMNS.map((c) => c.key);
    } catch {
      return ALL_COLUMNS.map((c) => c.key);
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(COLS_KEY, JSON.stringify(cols));
    } catch {}
  }, [cols]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { rows, total } = await listQuestions({
        filters: { ...filters, q: debouncedSearch || undefined },
        page,
        pageSize,
        sort,
        order,
      });
      setRows(rows);
      setTotal(total);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to load questions");
    } finally {
      setLoading(false);
    }
  }, [filters, debouncedSearch, page, pageSize, sort, order]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => setPage(1), [debouncedSearch, filters, pageSize]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const allChecked = rows.length > 0 && rows.every((r) => selected.has(r.id));

  const toggleAll = () => {
    setSelected((s) => {
      const n = new Set(s);
      if (allChecked) rows.forEach((r) => n.delete(r.id));
      else rows.forEach((r) => n.add(r.id));
      return n;
    });
  };
  const toggleOne = (id: string) =>
    setSelected((s) => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });

  const selectedIds = useMemo(() => Array.from(selected), [selected]);
  const runBulk = async (
    fn: (ids: string[]) => Promise<unknown>,
    okMsg: string,
  ) => {
    if (!selectedIds.length) return;
    try {
      await fn(selectedIds);
      toast.success(okMsg);
      setSelected(new Set());
      await load();
    } catch (e: any) {
      toast.error(e?.message ?? "Bulk action failed");
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target && (e.target as HTMLElement).matches("input,textarea"))
        return;
      if (e.key === "n" && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        navigate({ to: "/admin/questions/new" });
      } else if (e.key === "/") {
        e.preventDefault();
        (document.getElementById("qb-search") as HTMLInputElement | null)?.focus();
      } else if (e.key === "r" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        load();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [navigate, load]);

  // Saved views
  const [views, setViews] = useState<SavedView[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      return JSON.parse(localStorage.getItem(VIEWS_KEY) ?? "[]");
    } catch {
      return [];
    }
  });
  const saveView = () => {
    const name = prompt("Name this view:");
    if (!name) return;
    const next = [...views.filter((v) => v.name !== name), { name, filters, cols }];
    setViews(next);
    localStorage.setItem(VIEWS_KEY, JSON.stringify(next));
    toast.success(`View "${name}" saved`);
  };
  const applyView = (v: SavedView) => {
    setFilters(v.filters);
    setCols(v.cols);
  };

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8">
      <PageHeader
        eyebrow="Content"
        title="Question library"
        description="Search, review, edit, and publish questions across every exam."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" onClick={load} disabled={loading}>
              <RefreshCw className={cn("mr-2 h-4 w-4", loading && "animate-spin")} />
              Refresh
            </Button>
            <Button asChild>
              <Link to="/admin/questions/new">
                <Plus className="mr-2 h-4 w-4" /> New question
              </Link>
            </Button>
          </div>
        }
      />

      {/* Sticky toolbar */}
      <div className="sticky top-0 z-20 -mx-4 mt-4 border-b border-border/60 bg-background/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[240px] flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="qb-search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search text, explanation… (press /)"
              className="pl-9"
            />
          </div>
          <FiltersSheet filters={filters} onChange={setFilters} />
          <SortMenu sort={sort} order={order} onChange={(s, o) => { setSort(s); setOrder(o); }} />
          <ColumnPicker cols={cols} onChange={setCols} />
          <Button variant="outline" size="sm" onClick={saveView}>
            Save view
          </Button>
          {views.length > 0 && (
            <Select onValueChange={(n) => { const v = views.find((x) => x.name === n); if (v) applyView(v); }}>
              <SelectTrigger className="h-9 w-[160px]"><SelectValue placeholder="Saved views" /></SelectTrigger>
              <SelectContent>
                {views.map((v) => (
                  <SelectItem key={v.name} value={v.name}>{v.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <ActiveFilterChips filters={filters} onClear={(k) => setFilters((f) => ({ ...f, [k]: undefined }))} />
        </div>

        {selectedIds.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-sm">
            <span className="font-medium">{selectedIds.length} selected</span>
            <span className="mx-2 text-border">•</span>
            <Button size="sm" variant="secondary" onClick={() => runBulk(publishQuestions, "Published")}>
              <Send className="mr-1.5 h-3.5 w-3.5" /> Publish
            </Button>
            <Button size="sm" variant="outline" onClick={() => runBulk(archiveQuestions, "Archived")}>
              <Archive className="mr-1.5 h-3.5 w-3.5" /> Archive
            </Button>
            <Button size="sm" variant="outline" onClick={() => runBulk(restoreQuestions, "Restored")}>
              <ArchiveRestore className="mr-1.5 h-3.5 w-3.5" /> Restore
            </Button>
            <BulkMetadataUpdater onApply={async (patch) => {
              await bulkUpdate(selectedIds, patch as any);
              toast.success("Metadata updated");
              setSelected(new Set()); load();
            }} />
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="sm" variant="destructive"><Trash2 className="mr-1.5 h-3.5 w-3.5" /> Delete</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete {selectedIds.length} question(s)?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Soft-delete — questions are hidden from students and staff but can be recovered by admins from the database.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => runBulk(softDeleteQuestions, "Deleted")}>Delete</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
      </div>

      {/* Table */}
      <Card className="mt-4 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="w-10 px-3 py-2">
                  <Checkbox checked={allChecked} onCheckedChange={toggleAll} aria-label="Select all" />
                </th>
                {cols.map((k) => (
                  <th key={k} className="whitespace-nowrap px-3 py-2 font-medium">
                    {ALL_COLUMNS.find((c) => c.key === k)?.label}
                  </th>
                ))}
                <th className="w-16 px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {loading && rows.length === 0 && (
                <tr><td colSpan={cols.length + 2} className="px-3 py-16 text-center text-muted-foreground">Loading…</td></tr>
              )}
              {!loading && rows.length === 0 && (
                <tr><td colSpan={cols.length + 2} className="px-3 py-16 text-center text-muted-foreground">No questions match your filters.</td></tr>
              )}
              {rows.map((q) => (
                <tr key={q.id} className={cn("border-t border-border/50 hover:bg-muted/30", selected.has(q.id) && "bg-primary/5")}>
                  <td className="px-3 py-2">
                    <Checkbox checked={selected.has(q.id)} onCheckedChange={() => toggleOne(q.id)} aria-label="Select row" />
                  </td>
                  {cols.map((k) => (
                    <td key={k} className="max-w-[420px] truncate px-3 py-2 align-top">
                      {renderCell(q, k)}
                    </td>
                  ))}
                  <td className="px-3 py-2">
                    <RowMenu q={q} onDone={load} onOpen={() => navigate({ to: "/admin/questions/$id", params: { id: q.id } })} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/60 bg-muted/20 px-4 py-2 text-sm">
          <div className="text-muted-foreground">
            {total.toLocaleString()} question{total === 1 ? "" : "s"} · page {page} of {totalPages}
          </div>
          <div className="flex items-center gap-2">
            <Select value={String(pageSize)} onValueChange={(v) => setPageSize(Number(v))}>
              <SelectTrigger className="h-8 w-[90px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {[25, 50, 100, 200].map((n) => <SelectItem key={n} value={String(n)}>{n} / page</SelectItem>)}
              </SelectContent>
            </Select>
            <Button size="icon" variant="outline" className="h-8 w-8" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button size="icon" variant="outline" className="h-8 w-8" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>

      <p className="mt-3 text-xs text-muted-foreground">
        Shortcuts: <kbd className="rounded bg-muted px-1">n</kbd> new · <kbd className="rounded bg-muted px-1">/</kbd> search · <kbd className="rounded bg-muted px-1">⌘R</kbd> refresh
      </p>
    </div>
  );
}

function renderCell(q: Question, k: ColKey) {
  switch (k) {
    case "question":
      return (
        <Link to="/admin/questions/$id" params={{ id: q.id }} className="line-clamp-2 font-medium hover:underline">
          {q.question || <span className="text-muted-foreground">Untitled</span>}
        </Link>
      );
    case "exam": return <span className="text-muted-foreground">{q.exam}{q.sub_exam ? ` · ${q.sub_exam}` : ""}</span>;
    case "subject": return q.subject;
    case "topic": return q.topic ?? <span className="text-muted-foreground">—</span>;
    case "question_type": return <Badge variant="outline" className="capitalize">{q.question_type.replace(/_/g, " ")}</Badge>;
    case "difficulty": return <DifficultyPill d={q.difficulty} />;
    case "is_pyq": return q.is_pyq ? <Badge className="bg-amber-500/15 text-amber-700">PYQ{q.pyq_year ? ` ${q.pyq_year}` : ""}</Badge> : <span className="text-muted-foreground">—</span>;
    case "status": return <StatusPill s={q.status} />;
    case "version": return <span className="font-mono text-xs text-muted-foreground">v{q.version}</span>;
    case "updated_at": return <span className="text-xs text-muted-foreground">{new Date(q.updated_at).toLocaleDateString()}</span>;
  }
}

function DifficultyPill({ d }: { d: string }) {
  const map: Record<string, string> = { easy: "bg-emerald-500/15 text-emerald-700", medium: "bg-amber-500/15 text-amber-700", hard: "bg-rose-500/15 text-rose-700" };
  return <Badge className={cn("capitalize", map[d.toLowerCase()] ?? "bg-muted")}>{d}</Badge>;
}

function StatusPill({ s }: { s: QuestionStatus }) {
  const map: Record<QuestionStatus, string> = {
    draft: "bg-muted text-muted-foreground",
    under_review: "bg-blue-500/15 text-blue-700",
    approved: "bg-violet-500/15 text-violet-700",
    published: "bg-emerald-500/15 text-emerald-700",
    archived: "bg-neutral-500/15 text-neutral-700",
  };
  return <Badge className={cn("capitalize", map[s])}>{s.replace(/_/g, " ")}</Badge>;
}

function RowMenu({ q, onDone, onOpen }: { q: Question; onDone: () => void; onOpen: () => void }) {
  const act = async (fn: () => Promise<unknown>, ok: string) => {
    try { await fn(); toast.success(ok); onDone(); } catch (e: any) { toast.error(e?.message ?? "Failed"); }
  };
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="icon" variant="ghost" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={onOpen}><Eye className="mr-2 h-4 w-4" /> Open editor</DropdownMenuItem>
        <DropdownMenuItem onClick={() => act(async () => { await duplicateQuestion(q.id); }, "Duplicated")}>
          <Copy className="mr-2 h-4 w-4" /> Duplicate
        </DropdownMenuItem>
        {q.status !== "published" && (
          <DropdownMenuItem onClick={() => act(async () => { await publishQuestions([q.id]); }, "Published")}>
            <Send className="mr-2 h-4 w-4" /> Publish
          </DropdownMenuItem>
        )}
        {q.archived ? (
          <DropdownMenuItem onClick={() => act(async () => { await restoreQuestions([q.id]); }, "Restored")}>
            <ArchiveRestore className="mr-2 h-4 w-4" /> Restore
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem onClick={() => act(async () => { await archiveQuestions([q.id]); }, "Archived")}>
            <Archive className="mr-2 h-4 w-4" /> Archive
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem className="text-destructive" onClick={() => act(async () => { await softDeleteQuestions([q.id]); }, "Deleted")}>
          <Trash2 className="mr-2 h-4 w-4" /> Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ColumnPicker({ cols, onChange }: { cols: ColKey[]; onChange: (c: ColKey[]) => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm"><Columns3 className="mr-1.5 h-4 w-4" /> Columns</Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Visible columns</DropdownMenuLabel>
        {ALL_COLUMNS.map((c) => (
          <DropdownMenuCheckboxItem
            key={c.key}
            checked={cols.includes(c.key)}
            disabled={c.always}
            onCheckedChange={(chk) => {
              if (chk) onChange([...cols, c.key]);
              else onChange(cols.filter((k) => k !== c.key));
            }}
          >
            {c.label}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function SortMenu({
  sort, order, onChange,
}: { sort: SortField; order: "asc" | "desc"; onChange: (s: SortField, o: "asc" | "desc") => void }) {
  const opts: { s: SortField; l: string }[] = [
    { s: "updated_at", l: "Updated" }, { s: "created_at", l: "Created" },
    { s: "status", l: "Status" }, { s: "difficulty", l: "Difficulty" },
    { s: "quality_score", l: "Quality" }, { s: "question", l: "Question A→Z" },
  ];
  return (
    <div className="flex items-center gap-1">
      <Select value={sort} onValueChange={(v) => onChange(v as SortField, order)}>
        <SelectTrigger className="h-9 w-[140px]"><SelectValue /></SelectTrigger>
        <SelectContent>{opts.map((o) => <SelectItem key={o.s} value={o.s}>Sort: {o.l}</SelectItem>)}</SelectContent>
      </Select>
      <Button variant="outline" size="sm" onClick={() => onChange(sort, order === "asc" ? "desc" : "asc")}>
        {order === "asc" ? "↑" : "↓"}
      </Button>
    </div>
  );
}

function FiltersSheet({
  filters, onChange,
}: { filters: QuestionFilters; onChange: (f: QuestionFilters) => void }) {
  const [local, setLocal] = useState<QuestionFilters>(filters);
  useEffect(() => setLocal(filters), [filters]);
  const set = (k: keyof QuestionFilters, v: any) =>
    setLocal((f) => ({ ...f, [k]: v === "" || v == null ? undefined : v }));
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm"><Filter className="mr-1.5 h-4 w-4" /> Filters</Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader><SheetTitle>Filter questions</SheetTitle></SheetHeader>
        <div className="mt-4 space-y-3">
          <TextField label="Exam" v={local.exam} onChange={(v) => set("exam", v)} />
          <TextField label="Subject" v={local.subject} onChange={(v) => set("subject", v)} />
          <TextField label="Chapter" v={local.chapter} onChange={(v) => set("chapter", v)} />
          <TextField label="Topic" v={local.topic} onChange={(v) => set("topic", v)} />
          <TextField label="Concept" v={local.concept} onChange={(v) => set("concept", v)} />
          <TextField label="Tag" v={local.tag} onChange={(v) => set("tag", v)} />

          <SelectField label="Difficulty" v={local.difficulty} onChange={(v) => set("difficulty", v)}
            options={[{ v: "easy", l: "Easy" }, { v: "medium", l: "Medium" }, { v: "hard", l: "Hard" }]} />
          <SelectField label="Type" v={local.question_type} onChange={(v) => set("question_type", v)}
            options={QUESTION_TYPES.map((t) => ({ v: t.value, l: t.label }))} />
          <SelectField label="Status" v={local.status} onChange={(v) => set("status", v)}
            options={QUESTION_STATUSES.map((s) => ({ v: s, l: s.replace(/_/g, " ") }))} />
          <SelectField label="PYQ" v={local.is_pyq == null ? "" : String(local.is_pyq)} onChange={(v) => set("is_pyq", v === "" ? undefined : v === "true")}
            options={[{ v: "true", l: "PYQ only" }, { v: "false", l: "Non-PYQ" }]} />
          <NumberField label="PYQ Year" v={local.pyq_year} onChange={(v) => set("pyq_year", v)} />
          <SelectField label="Weightage" v={local.weightage} onChange={(v) => set("weightage", v)}
            options={[{ v: "high", l: "High" }, { v: "medium", l: "Medium" }, { v: "low", l: "Low" }]} />

          <div className="flex items-center gap-2 pt-2">
            <Checkbox id="ia" checked={!!local.include_archived} onCheckedChange={(c) => set("include_archived", !!c)} />
            <label htmlFor="ia" className="text-sm">Include archived</label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="id" checked={!!local.include_deleted} onCheckedChange={(c) => set("include_deleted", !!c)} />
            <label htmlFor="id" className="text-sm">Include deleted</label>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => { setLocal({}); onChange({}); }}>Clear</Button>
            <Button onClick={() => onChange(local)}>Apply</Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function TextField({ label, v, onChange }: { label: string; v?: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1"><label className="text-xs font-medium">{label}</label>
      <Input value={v ?? ""} onChange={(e) => onChange(e.target.value)} /></div>
  );
}
function NumberField({ label, v, onChange }: { label: string; v?: number; onChange: (v: number | undefined) => void }) {
  return (
    <div className="space-y-1"><label className="text-xs font-medium">{label}</label>
      <Input type="number" value={v ?? ""} onChange={(e) => onChange(e.target.value ? Number(e.target.value) : undefined)} /></div>
  );
}
function SelectField({
  label, v, onChange, options,
}: { label: string; v?: string; onChange: (v: string) => void; options: { v: string; l: string }[] }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium">{label}</label>
      <Select value={v ?? ""} onValueChange={(val) => onChange(val === "__all__" ? "" : val)}>
        <SelectTrigger><SelectValue placeholder="Any" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__">Any</SelectItem>
          {options.map((o) => <SelectItem key={o.v} value={o.v}>{o.l}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}

function ActiveFilterChips({ filters, onClear }: { filters: QuestionFilters; onClear: (k: keyof QuestionFilters) => void }) {
  const entries = (Object.entries(filters) as [keyof QuestionFilters, unknown][]).filter(
    ([, v]) => v !== undefined && v !== "" && v !== false,
  );
  if (!entries.length) return null;
  return (
    <div className="ml-1 flex flex-wrap items-center gap-1">
      {entries.map(([k, v]) => (
        <Badge key={String(k)} variant="secondary" className="gap-1">
          {String(k)}: {String(v)}
          <button className="ml-1 text-xs opacity-70 hover:opacity-100" onClick={() => onClear(k)}>×</button>
        </Badge>
      ))}
    </div>
  );
}

function BulkMetadataUpdater({ onApply }: { onApply: (patch: Record<string, unknown>) => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<QuestionStatus | "">("");
  const [difficulty, setDifficulty] = useState("");
  const [topic, setTopic] = useState("");
  const [chapter, setChapter] = useState("");
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button size="sm" variant="outline">Edit metadata</Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader><SheetTitle>Update metadata for selected</SheetTitle></SheetHeader>
        <div className="mt-4 space-y-3">
          <SelectField label="Status" v={status} onChange={(v) => setStatus(v as QuestionStatus)}
            options={QUESTION_STATUSES.map((s) => ({ v: s, l: s.replace(/_/g, " ") }))} />
          <SelectField label="Difficulty" v={difficulty} onChange={setDifficulty}
            options={[{ v: "easy", l: "Easy" }, { v: "medium", l: "Medium" }, { v: "hard", l: "Hard" }]} />
          <TextField label="Move to chapter" v={chapter} onChange={setChapter} />
          <TextField label="Move to topic" v={topic} onChange={setTopic} />
          <div className="flex justify-end pt-2">
            <Button onClick={async () => {
              const patch: Record<string, unknown> = {};
              if (status) patch.status = status;
              if (difficulty) patch.difficulty = difficulty;
              if (chapter) patch.chapter = chapter;
              if (topic) patch.topic = topic;
              if (!Object.keys(patch).length) return;
              await onApply(patch);
              setOpen(false);
            }}>Apply</Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export const Route = createFileRoute("/_authenticated/admin/questions")({
  component: Page,
  head: () => ({
    meta: [
      { title: "Questions · Admin · Pariksha" },
      { name: "description", content: "Enterprise question library with search, filters, and bulk actions." },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
});
