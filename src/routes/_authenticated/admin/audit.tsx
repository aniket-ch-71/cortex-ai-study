import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/ui-pro/PageHeader";
import { SectionCard } from "@/components/ui-pro/SectionCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { listAuditLogs, type AuditLog } from "@/lib/admin/audit";
import { RefreshCw } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/audit")({
  component: AuditView,
  head: () => ({ meta: [{ title: "Audit Log · Admin" }, { name: "robots", content: "noindex,nofollow" }] }),
});

function AuditView() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState("");
  const [entity, setEntity] = useState("");

  async function load() {
    setLoading(true);
    setLogs(await listAuditLogs({ action: action || undefined, entity_type: entity || undefined, limit: 200 }));
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
      <PageHeader
        eyebrow="Governance"
        title="Audit log"
        description="Every admin action is recorded. Filter by action or entity type."
      />

      <SectionCard title="Recent activity">
        <div className="mb-3 flex flex-wrap items-end gap-2">
          <div className="w-40">
            <label className="text-[11px] font-medium text-muted-foreground">Action</label>
            <Input placeholder="e.g. question.publish" value={action} onChange={(e) => setAction(e.target.value)} />
          </div>
          <div className="w-40">
            <label className="text-[11px] font-medium text-muted-foreground">Entity type</label>
            <Input placeholder="e.g. question" value={entity} onChange={(e) => setEntity(e.target.value)} />
          </div>
          <Button variant="outline" size="sm" onClick={load} className="gap-1.5">
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        <div className="overflow-x-auto rounded-md border border-border/60">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-[11px] uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">When</th>
                <th className="px-3 py-2 font-medium">Actor</th>
                <th className="px-3 py-2 font-medium">Action</th>
                <th className="px-3 py-2 font-medium">Entity</th>
                <th className="px-3 py-2 font-medium">Details</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((l) => (
                <tr key={l.id} className="border-t border-border/50 align-top">
                  <td className="whitespace-nowrap px-3 py-2 text-xs text-muted-foreground">
                    {new Date(l.created_at).toLocaleString()}
                  </td>
                  <td className="px-3 py-2 text-xs">
                    {l.actor_email ?? l.actor_id?.slice(0, 8) ?? "system"}
                  </td>
                  <td className="px-3 py-2">
                    <span className="rounded bg-primary/10 px-2 py-0.5 font-mono text-[11px] text-primary">
                      {l.action}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-xs">
                    <div className="font-medium">{l.entity_type}</div>
                    {l.entity_id && (
                      <div className="text-muted-foreground">{l.entity_id.slice(0, 12)}…</div>
                    )}
                  </td>
                  <td className="max-w-md px-3 py-2 text-xs text-muted-foreground">
                    {l.diff ? (
                      <details>
                        <summary className="cursor-pointer">view diff</summary>
                        <pre className="mt-1 overflow-auto rounded bg-muted/40 p-2 text-[10px]">
                          {JSON.stringify(l.diff, null, 2)}
                        </pre>
                      </details>
                    ) : (
                      <span>—</span>
                    )}
                  </td>
                </tr>
              ))}
              {!logs.length && !loading && (
                <tr>
                  <td colSpan={5} className="px-3 py-8 text-center text-sm text-muted-foreground">
                    No audit events yet. Actions from Stage 2 onwards will appear here.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  );
}
