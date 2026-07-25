import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PageHeader } from "@/components/ui-pro/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import {
  Upload,
  Trash2,
  FolderPlus,
  Search,
  RefreshCw,
  Copy,
  Image as ImageIcon,
  FileText,
  History,
  Link2,
} from "lucide-react";
import {
  distinctMediaFolders,
  getSignedMediaUrl,
  listMedia,
  listMediaUsage,
  listMediaVersions,
  moveFolder,
  MediaRow,
  MediaUsage,
  MediaVersion,
  renameMedia,
  replaceMedia,
  softDeleteMedia,
  uploadMedia,
  usageCounts,
  validateMediaFile,
} from "@/lib/admin/media";

export const Route = createFileRoute("/_authenticated/admin/media")({
  component: MediaPage,
  head: () => ({
    meta: [
      { title: "Media Library · Admin · PARIKSHA" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
});

function bytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

function MediaPage() {
  const [rows, setRows] = useState<MediaRow[]>([]);
  const [folders, setFolders] = useState<string[]>(["/"]);
  const [folder, setFolder] = useState<string>("/");
  const [q, setQ] = useState("");
  const [mime, setMime] = useState<string>("");
  const [unusedOnly, setUnusedOnly] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [usage, setUsage] = useState<Record<string, number>>({});
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [detail, setDetail] = useState<MediaRow | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const { rows, total } = await listMedia({ q, folder: folder === "/" ? undefined : folder, mime, unusedOnly, page, pageSize: 48 });
      setRows(rows);
      setTotal(total);
      const ids = rows.map((r) => r.id);
      const [counts, folderList] = await Promise.all([usageCounts(ids), distinctMediaFolders()]);
      setUsage(counts);
      setFolders(folderList);
      // resolve preview urls (thumb preferred)
      const map: Record<string, string> = {};
      await Promise.all(
        rows.map(async (r) => {
          const p = r.thumbnail_path ?? r.path;
          const u = await getSignedMediaUrl(p);
          if (u) map[r.id] = u;
        }),
      );
      setUrls(map);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error(`Failed to load media: ${msg}`);
    } finally {
      setLoading(false);
    }
  }, [q, folder, mime, unusedOnly, page]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const onUpload = async (files: FileList | null) => {
    if (!files || !files.length) return;
    const arr = Array.from(files);
    for (const f of arr) {
      const err = validateMediaFile(f);
      if (err) {
        toast.error(`${f.name}: ${err}`);
        continue;
      }
    }
    const ok = arr.filter((f) => !validateMediaFile(f));
    toast.info(`Uploading ${ok.length} file(s)…`);
    let done = 0;
    for (const f of ok) {
      try {
        await uploadMedia(f, { folder });
        done++;
      } catch (e) {
        toast.error(`${f.name}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
    toast.success(`Uploaded ${done}/${ok.length}`);
    refresh();
  };

  const bulkDelete = async () => {
    if (!selected.size) return;
    if (!confirm(`Delete ${selected.size} file(s)? This is a soft delete.`)) return;
    try {
      await softDeleteMedia(Array.from(selected));
      toast.success("Deleted");
      setSelected(new Set());
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    }
  };

  const bulkMove = async () => {
    if (!selected.size) return;
    const dest = prompt("Move to folder (e.g. /physics/diagrams):", folder);
    if (dest == null) return;
    try {
      await moveFolder(Array.from(selected), dest || "/");
      toast.success("Moved");
      setSelected(new Set());
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Move failed");
    }
  };

  const newFolder = async () => {
    const name = prompt("New folder path (e.g. /physics/optics):");
    if (!name) return;
    setFolders((f) => Array.from(new Set([...f, name])).sort());
    setFolder(name);
  };

  const toggleAll = (v: boolean) => {
    setSelected(v ? new Set(rows.map((r) => r.id)) : new Set());
  };

  const totalPages = Math.max(1, Math.ceil(total / 48));

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8">
      <PageHeader
        eyebrow="Assets"
        title="Media library"
        description="Diagrams, figures and uploads for the question bank."
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={newFolder}>
              <FolderPlus className="mr-1.5 h-4 w-4" />New folder
            </Button>
            <Button size="sm" onClick={() => fileInputRef.current?.click()}>
              <Upload className="mr-1.5 h-4 w-4" />Upload
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/png,image/jpeg,image/webp,image/svg+xml,application/pdf"
              className="hidden"
              onChange={(e) => onUpload(e.target.files)}
            />
          </div>
        }
      />

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => { setPage(1); setQ(e.target.value); }} placeholder="Search filename…" className="pl-8" />
        </div>
        <Select value={folder} onValueChange={(v) => { setPage(1); setFolder(v); }}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Folder" /></SelectTrigger>
          <SelectContent>
            {folders.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={mime || "all"} onValueChange={(v) => { setPage(1); setMime(v === "all" ? "" : v); }}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            <SelectItem value="image/">Images</SelectItem>
            <SelectItem value="image/svg">SVG</SelectItem>
            <SelectItem value="application/pdf">PDF</SelectItem>
          </SelectContent>
        </Select>
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <Checkbox checked={unusedOnly} onCheckedChange={(v) => { setPage(1); setUnusedOnly(!!v); }} />
          Unused only
        </label>
        <Button variant="ghost" size="sm" onClick={refresh}>
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
        {selected.size > 0 && (
          <div className="ml-auto flex items-center gap-2 rounded-md border border-border/60 bg-card/40 px-2 py-1 text-sm">
            <span className="text-muted-foreground">{selected.size} selected</span>
            <Button variant="outline" size="sm" onClick={bulkMove}>Move</Button>
            <Button variant="destructive" size="sm" onClick={bulkDelete}>
              <Trash2 className="mr-1 h-3.5 w-3.5" />Delete
            </Button>
          </div>
        )}
      </div>

      <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
        <Checkbox
          checked={rows.length > 0 && selected.size === rows.length}
          onCheckedChange={(v) => toggleAll(!!v)}
        />
        <span>Select page · {total} total</span>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {rows.map((r) => {
          const sel = selected.has(r.id);
          return (
            <div
              key={r.id}
              className={`group relative overflow-hidden rounded-lg border bg-card/60 transition ${sel ? "border-primary ring-1 ring-primary/40" : "border-border/60 hover:border-primary/40"}`}
            >
              <button
                type="button"
                onClick={() => setDetail(r)}
                className="block aspect-square w-full bg-muted/40"
              >
                {r.mime.startsWith("image/") && urls[r.id] ? (
                  <img src={urls[r.id]} alt={r.alt ?? r.filename} className="h-full w-full object-cover" loading="lazy" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                    {r.mime.startsWith("image/") ? <ImageIcon className="h-8 w-8" /> : <FileText className="h-8 w-8" />}
                  </div>
                )}
              </button>
              <label className="absolute left-1.5 top-1.5 rounded bg-background/80 p-1 backdrop-blur">
                <Checkbox
                  checked={sel}
                  onCheckedChange={(v) => {
                    setSelected((s) => {
                      const n = new Set(s);
                      if (v) n.add(r.id); else n.delete(r.id);
                      return n;
                    });
                  }}
                />
              </label>
              {usage[r.id] ? (
                <Badge className="absolute right-1.5 top-1.5" variant="secondary">
                  <Link2 className="mr-1 h-3 w-3" />{usage[r.id]}
                </Badge>
              ) : (
                <Badge className="absolute right-1.5 top-1.5" variant="outline">unused</Badge>
              )}
              <div className="border-t border-border/60 px-2 py-1.5">
                <div className="truncate text-xs font-medium">{r.filename}</div>
                <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                  <span>{bytes(r.size_bytes)}</span>
                  {r.width && r.height ? <span>{r.width}×{r.height}</span> : null}
                </div>
              </div>
            </div>
          );
        })}
        {!loading && rows.length === 0 && (
          <div className="col-span-full rounded-lg border border-dashed border-border/60 py-16 text-center text-sm text-muted-foreground">
            No media yet. Click Upload to add files.
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Prev</Button>
          <span className="text-sm text-muted-foreground">Page {page} / {totalPages}</span>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
        </div>
      )}

      <MediaDetail
        row={detail}
        onClose={() => setDetail(null)}
        onChanged={() => { refresh(); }}
      />
    </div>
  );
}

function MediaDetail({ row, onClose, onChanged }: { row: MediaRow | null; onClose: () => void; onChanged: () => void }) {
  const [url, setUrl] = useState<string | null>(null);
  const [versions, setVersions] = useState<MediaVersion[]>([]);
  const [usage, setUsage] = useState<MediaUsage[]>([]);
  const [filename, setFilename] = useState("");
  const [alt, setAlt] = useState("");
  const [tags, setTags] = useState("");
  const replaceRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!row) return;
    setFilename(row.filename);
    setAlt(row.alt ?? "");
    setTags(row.tags.join(", "));
    (async () => {
      setUrl(await getSignedMediaUrl(row.path));
      setVersions(await listMediaVersions(row.id));
      setUsage(await listMediaUsage(row.id));
    })();
  }, [row]);

  if (!row) return null;

  const saveMeta = async () => {
    try {
      await renameMedia(row.id, filename, alt, tags.split(",").map((t) => t.trim()).filter(Boolean));
      toast.success("Saved");
      onChanged();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    }
  };

  const onReplace = async (f: File | null | undefined) => {
    if (!f) return;
    const err = validateMediaFile(f);
    if (err) return toast.error(err);
    try {
      await replaceMedia(row.id, f);
      toast.success("Replaced");
      onChanged();
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Replace failed");
    }
  };

  const copyUrl = () => {
    if (!url) return;
    navigator.clipboard.writeText(url);
    toast.success("Signed URL copied");
  };

  return (
    <Sheet open={!!row} onOpenChange={(o) => { if (!o) onClose(); }}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="truncate">{row.filename}</SheetTitle>
        </SheetHeader>
        <div className="mt-4 space-y-5">
          <div className="rounded-lg border border-border/60 bg-muted/30 p-2">
            {row.mime.startsWith("image/") && url ? (
              <img src={url} alt={row.alt ?? row.filename} className="mx-auto max-h-[360px] w-auto rounded" />
            ) : url ? (
              <a href={url} target="_blank" rel="noreferrer" className="block p-6 text-center text-sm text-primary underline">
                Open file in new tab
              </a>
            ) : (
              <div className="p-6 text-center text-sm text-muted-foreground">Loading…</div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground">
            <div>Size: <span className="text-foreground">{bytes(row.size_bytes)}</span></div>
            <div>Type: <span className="text-foreground">{row.mime}</span></div>
            <div>Dimensions: <span className="text-foreground">{row.width && row.height ? `${row.width}×${row.height}` : "—"}</span></div>
            <div>Folder: <span className="text-foreground">{row.folder}</span></div>
            <div>Version: <span className="text-foreground">v{row.version}</span></div>
            <div>Uploaded: <span className="text-foreground">{new Date(row.created_at).toLocaleString()}</span></div>
          </div>

          <div className="space-y-2">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Filename</label>
              <Input value={filename} onChange={(e) => setFilename(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Alt text</label>
              <Input value={alt} onChange={(e) => setAlt(e.target.value)} placeholder="Description for accessibility" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Tags (comma separated)</label>
              <Input value={tags} onChange={(e) => setTags(e.target.value)} />
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={saveMeta}>Save changes</Button>
              <Button size="sm" variant="outline" onClick={copyUrl}>
                <Copy className="mr-1 h-3.5 w-3.5" />Copy URL
              </Button>
              <Button size="sm" variant="outline" onClick={() => replaceRef.current?.click()}>
                <Upload className="mr-1 h-3.5 w-3.5" />Replace file
              </Button>
              <input
                ref={replaceRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml,application/pdf"
                className="hidden"
                onChange={(e) => onReplace(e.target.files?.[0])}
              />
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
              <History className="h-4 w-4" /> Version history ({versions.length})
            </div>
            {versions.length === 0 ? (
              <div className="text-xs text-muted-foreground">No prior versions.</div>
            ) : (
              <ul className="divide-y divide-border/60 rounded-md border border-border/60">
                {versions.map((v) => (
                  <li key={v.id} className="flex items-center justify-between px-3 py-2 text-xs">
                    <span>v{v.version} · {v.size_bytes ? bytes(v.size_bytes) : "—"}</span>
                    <span className="text-muted-foreground">{new Date(v.created_at).toLocaleString()}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
              <Link2 className="h-4 w-4" /> Used in {usage.length} question(s)
            </div>
            {usage.length === 0 ? (
              <div className="text-xs text-muted-foreground">Not linked to any question yet.</div>
            ) : (
              <ul className="divide-y divide-border/60 rounded-md border border-border/60">
                {usage.map((u) => (
                  <li key={u.id} className="flex items-center justify-between px-3 py-2 text-xs">
                    <a href={`/admin/questions/${u.question_id}`} className="truncate text-primary hover:underline">
                      {u.question_id.slice(0, 8)}…
                    </a>
                    <Badge variant="outline">{u.usage_kind}{u.option_index != null ? ` #${u.option_index + 1}` : ""}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
