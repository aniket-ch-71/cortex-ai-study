import { supabase } from "@/integrations/supabase/client";

export type MediaRow = {
  id: string;
  bucket: string;
  path: string;
  filename: string;
  mime: string;
  size_bytes: number;
  width: number | null;
  height: number | null;
  checksum: string | null;
  folder: string;
  tags: string[];
  alt: string | null;
  thumbnail_path: string | null;
  uploaded_by: string | null;
  version: number;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
};

export type MediaVersion = {
  id: string;
  media_id: string;
  version: number;
  path: string;
  checksum: string | null;
  size_bytes: number | null;
  uploaded_by: string | null;
  created_at: string;
};

export type MediaUsage = {
  id: string;
  media_id: string;
  question_id: string;
  usage_kind: "question" | "option" | "solution" | "hint" | "explanation" | "diagram";
  option_index: number | null;
  created_at: string;
};

export type ListMediaParams = {
  q?: string;
  folder?: string;
  tag?: string;
  mime?: string;
  unusedOnly?: boolean;
  page?: number;
  pageSize?: number;
};

const ALLOWED_MIME = new Set([
  "image/svg+xml",
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "application/pdf",
]);
const MAX_BYTES = 15 * 1024 * 1024; // 15MB per media file

export function validateMediaFile(file: File): string | null {
  if (!ALLOWED_MIME.has(file.type)) return `Unsupported type: ${file.type || "unknown"}`;
  if (file.size > MAX_BYTES) return `File too large (${(file.size / 1024 / 1024).toFixed(1)}MB > 15MB)`;
  return null;
}

export async function sha256Hex(buf: ArrayBuffer): Promise<string> {
  const d = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(d))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function readImageDims(file: File): Promise<{ width: number | null; height: number | null }> {
  if (!file.type.startsWith("image/") || file.type === "image/svg+xml") {
    return { width: null, height: null };
  }
  return await new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve({ width: null, height: null });
    };
    img.src = url;
  });
}

async function makeThumbnail(file: File): Promise<Blob | null> {
  if (!file.type.startsWith("image/") || file.type === "image/svg+xml") return null;
  try {
    const bmp = await createImageBitmap(file);
    const max = 320;
    const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
    const w = Math.max(1, Math.round(bmp.width * scale));
    const h = Math.max(1, Math.round(bmp.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(bmp, 0, 0, w, h);
    return await new Promise((r) => canvas.toBlob((b) => r(b), "image/webp", 0.82));
  } catch {
    return null;
  }
}

function sanitizeName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 120);
}

export async function uploadMedia(file: File, opts: { folder?: string; tags?: string[]; alt?: string } = {}): Promise<MediaRow> {
  const err = validateMediaFile(file);
  if (err) throw new Error(err);
  const buf = await file.arrayBuffer();
  const checksum = await sha256Hex(buf);

  const { data: existing } = await supabase
    .from("media_library")
    .select("*")
    .eq("checksum", checksum)
    .is("deleted_at", null)
    .maybeSingle();
  if (existing) return existing as MediaRow;

  const dims = await readImageDims(file);
  const { data: sess } = await supabase.auth.getSession();
  const uid = sess.session?.user.id ?? null;
  const folder = (opts.folder || "/").replace(/\/+$/, "") || "/";
  const key = `${folder === "/" ? "" : folder.replace(/^\/+/, "") + "/"}${Date.now()}_${sanitizeName(file.name)}`;

  const { error: upErr } = await supabase.storage.from("media").upload(key, file, {
    contentType: file.type,
    upsert: false,
  });
  if (upErr) throw upErr;

  let thumbPath: string | null = null;
  const thumb = await makeThumbnail(file);
  if (thumb) {
    const tkey = `_thumbs/${key.replace(/\.[a-zA-Z0-9]+$/, "")}.webp`;
    const { error: tErr } = await supabase.storage.from("media").upload(tkey, thumb, {
      contentType: "image/webp",
      upsert: true,
    });
    if (!tErr) thumbPath = tkey;
  }

  const { data, error } = await supabase
    .from("media_library")
    .insert({
      bucket: "media",
      path: key,
      filename: file.name,
      mime: file.type,
      size_bytes: file.size,
      width: dims.width,
      height: dims.height,
      checksum,
      folder,
      tags: opts.tags ?? [],
      alt: opts.alt ?? null,
      thumbnail_path: thumbPath,
      uploaded_by: uid,
    })
    .select("*")
    .single();
  if (error) throw error;
  return data as MediaRow;
}

export async function listMedia(p: ListMediaParams = {}) {
  const { q, folder, tag, mime, unusedOnly, page = 1, pageSize = 48 } = p;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("media_library")
    .select("*", { count: "exact" })
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .range(from, to);
  if (folder) query = query.eq("folder", folder);
  if (mime) query = query.ilike("mime", `${mime}%`);
  if (tag) query = query.contains("tags", [tag]);
  if (q && q.trim()) query = query.ilike("filename", `%${q.trim().replace(/[%_]/g, "")}%`);

  const { data, error, count } = await query;
  if (error) throw error;
  let rows = (data ?? []) as MediaRow[];

  if (unusedOnly && rows.length) {
    const ids = rows.map((r) => r.id);
    const { data: usage } = await supabase.from("media_usage").select("media_id").in("media_id", ids);
    const used = new Set(((usage ?? []) as { media_id: string }[]).map((u) => u.media_id));
    rows = rows.filter((r) => !used.has(r.id));
  }
  return { rows, total: count ?? rows.length };
}

export async function getSignedMediaUrl(path: string, bucket = "media", expires = 3600): Promise<string | null> {
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expires);
  if (error) return null;
  return data.signedUrl;
}

export async function softDeleteMedia(ids: string[]) {
  if (!ids.length) return;
  const { error } = await supabase
    .from("media_library")
    .update({ deleted_at: new Date().toISOString() })
    .in("id", ids);
  if (error) throw error;
}

export async function renameMedia(id: string, filename: string, alt?: string, tags?: string[]) {
  const patch: Record<string, unknown> = { filename };
  if (alt !== undefined) patch.alt = alt;
  if (tags !== undefined) patch.tags = tags;
  const { error } = await supabase.from("media_library").update(patch).eq("id", id);
  if (error) throw error;
}

export async function moveFolder(ids: string[], folder: string) {
  if (!ids.length) return;
  const { error } = await supabase.from("media_library").update({ folder }).in("id", ids);
  if (error) throw error;
}

export async function replaceMedia(id: string, file: File): Promise<MediaRow> {
  const err = validateMediaFile(file);
  if (err) throw new Error(err);
  const { data: cur, error: e0 } = await supabase.from("media_library").select("*").eq("id", id).single();
  if (e0) throw e0;
  const row = cur as MediaRow;

  // snapshot current
  await supabase.from("media_versions").insert({
    media_id: id,
    version: row.version,
    path: row.path,
    checksum: row.checksum,
    size_bytes: row.size_bytes,
    uploaded_by: row.uploaded_by,
  });

  const buf = await file.arrayBuffer();
  const checksum = await sha256Hex(buf);
  const dims = await readImageDims(file);
  const key = `${row.folder === "/" ? "" : row.folder.replace(/^\/+/, "") + "/"}${Date.now()}_${sanitizeName(file.name)}`;
  const { error: uErr } = await supabase.storage.from("media").upload(key, file, {
    contentType: file.type,
    upsert: false,
  });
  if (uErr) throw uErr;

  const { data, error } = await supabase
    .from("media_library")
    .update({
      path: key,
      filename: file.name,
      mime: file.type,
      size_bytes: file.size,
      width: dims.width,
      height: dims.height,
      checksum,
      version: row.version + 1,
    })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return data as MediaRow;
}

export async function listMediaVersions(mediaId: string): Promise<MediaVersion[]> {
  const { data, error } = await supabase
    .from("media_versions")
    .select("*")
    .eq("media_id", mediaId)
    .order("version", { ascending: false });
  if (error) throw error;
  return (data ?? []) as MediaVersion[];
}

export async function listMediaUsage(mediaId: string): Promise<MediaUsage[]> {
  const { data, error } = await supabase
    .from("media_usage")
    .select("*")
    .eq("media_id", mediaId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as MediaUsage[];
}

export async function usageCounts(ids: string[]): Promise<Record<string, number>> {
  if (!ids.length) return {};
  const { data } = await supabase.from("media_usage").select("media_id").in("media_id", ids);
  const counts: Record<string, number> = {};
  for (const r of (data ?? []) as { media_id: string }[]) {
    counts[r.media_id] = (counts[r.media_id] ?? 0) + 1;
  }
  return counts;
}

export async function linkMediaToQuestion(mediaId: string, questionId: string, usageKind: MediaUsage["usage_kind"], optionIndex: number | null = null) {
  const { error } = await supabase.from("media_usage").insert({
    media_id: mediaId,
    question_id: questionId,
    usage_kind: usageKind,
    option_index: optionIndex,
  });
  if (error && !/duplicate/i.test(error.message)) throw error;
}

export async function distinctMediaFolders(): Promise<string[]> {
  const { data } = await supabase.from("media_library").select("folder").is("deleted_at", null).limit(1000);
  const s = new Set<string>(["/"]);
  for (const r of (data ?? []) as { folder: string }[]) s.add(r.folder || "/");
  return Array.from(s).sort();
}
