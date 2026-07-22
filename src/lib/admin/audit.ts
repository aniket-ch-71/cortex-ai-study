// Audit log helpers. Writes go through service_role via edge/server fns;
// from the client we do best-effort logging via a lightweight insert
// (RLS blocks direct inserts, so we only READ from the client here).
import { supabase } from "@/integrations/supabase/client";

export type AuditLog = {
  id: string;
  actor_id: string | null;
  actor_email: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  diff: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  ip: string | null;
  user_agent: string | null;
  created_at: string;
};

export type AuditFilters = {
  action?: string;
  entity_type?: string;
  entity_id?: string;
  actor_id?: string;
  since?: string;
  limit?: number;
};

export async function listAuditLogs(f: AuditFilters = {}): Promise<AuditLog[]> {
  let q = supabase
    .from("audit_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(f.limit ?? 100);
  if (f.action) q = q.eq("action", f.action);
  if (f.entity_type) q = q.eq("entity_type", f.entity_type);
  if (f.entity_id) q = q.eq("entity_id", f.entity_id);
  if (f.actor_id) q = q.eq("actor_id", f.actor_id);
  if (f.since) q = q.gte("created_at", f.since);
  const { data, error } = await q;
  if (error) {
    console.error("listAuditLogs", error);
    return [];
  }
  return (data ?? []) as AuditLog[];
}
