import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/ui-pro/PageHeader";
import { SectionCard } from "@/components/ui-pro/SectionCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Trash2, Shield, ShieldPlus } from "lucide-react";
import { useStaffRole } from "@/hooks/useStaffRole";

export const Route = createFileRoute("/_authenticated/admin/users")({
  component: AdminUsers,
  head: () => ({ meta: [{ title: "Users & Roles · Admin" }, { name: "robots", content: "noindex,nofollow" }] }),
});

type Row = { user_id: string; role: string; full_name: string | null; username: string | null };

const ALL_ROLES = ["super_admin", "admin", "moderator", "content_creator", "reviewer"] as const;
type Role = (typeof ALL_ROLES)[number];

const ROLE_STYLES: Record<Role, string> = {
  super_admin: "bg-coral/15 text-coral ring-coral/30",
  admin: "bg-amber/15 text-amber ring-amber/30",
  moderator: "bg-teal/15 text-teal ring-teal/30",
  content_creator: "bg-primary/15 text-primary ring-primary/30",
  reviewer: "bg-purple/15 text-purple ring-purple/30",
};

function AdminUsers() {
  const { isSuperAdmin, loading: roleLoading } = useStaffRole();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [grantEmail, setGrantEmail] = useState("");
  const [grantRole, setGrantRole] = useState<Role>("content_creator");
  const [busy, setBusy] = useState(false);

  async function load() {
    setLoading(true);
    const { data: staff } = await supabase
      .from("user_roles")
      .select("user_id, role")
      .neq("role", "user");
    const ids = Array.from(new Set((staff ?? []).map((r) => r.user_id)));
    const { data: profs } = ids.length
      ? await supabase.from("profiles").select("id, full_name, username").in("id", ids)
      : { data: [] };
    const pmap = new Map((profs ?? []).map((p: any) => [p.id, p]));
    setRows(
      ((staff ?? []) as { user_id: string; role: string }[]).map((r) => ({
        user_id: r.user_id,
        role: r.role,
        full_name: pmap.get(r.user_id)?.full_name ?? null,
        username: pmap.get(r.user_id)?.username ?? null,
      })),
    );
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function grant() {
    if (!grantEmail.trim()) return;
    setBusy(true);
    try {
      const { data: prof, error: pe } = await supabase
        .from("profiles")
        .select("id, username")
        .ilike("username", grantEmail.trim())
        .maybeSingle();
      if (pe || !prof) {
        toast.error("No user found with that username");
        return;
      }
      const { error } = await supabase
        .from("user_roles")
        .insert({ user_id: prof.id, role: grantRole as any });
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success(`Granted ${grantRole.replace("_", " ")}`);
      setGrantEmail("");
      load();
    } finally {
      setBusy(false);
    }
  }

  async function revoke(user_id: string, role: string) {
    if (!confirm(`Revoke ${role.replace("_", " ")} from this user?`)) return;
    const { error } = await supabase
      .from("user_roles")
      .delete()
      .eq("user_id", user_id)
      .eq("role", role);
    if (error) return toast.error(error.message);
    toast.success("Revoked");
    load();
  }

  const filtered = rows.filter((r) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (
      (r.username ?? "").toLowerCase().includes(q) ||
      (r.full_name ?? "").toLowerCase().includes(q) ||
      r.user_id.includes(q) ||
      r.role.includes(q)
    );
  });

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
      <PageHeader
        eyebrow="Access Control"
        title="Users & roles"
        description="Assign staff roles. Only super admins can grant or revoke roles."
      />

      {isSuperAdmin && !roleLoading && (
        <SectionCard title="Grant role" description="Look up an existing user by username, then choose a role.">
          <div className="flex flex-col gap-2 md:flex-row">
            <Input
              placeholder="username"
              value={grantEmail}
              onChange={(e) => setGrantEmail(e.target.value)}
              className="md:max-w-xs"
            />
            <Select value={grantRole} onValueChange={(v) => setGrantRole(v as Role)}>
              <SelectTrigger className="md:w-56">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ALL_ROLES.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r.replace("_", " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={grant} disabled={busy} className="gap-1.5">
              <ShieldPlus className="h-4 w-4" />
              Grant
            </Button>
          </div>
        </SectionCard>
      )}

      <SectionCard
        title="Staff members"
        description={loading ? "Loading…" : `${rows.length} role assignments`}
      >
        <div className="mb-3">
          <Input
            placeholder="Search by name, username, role…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="max-w-sm"
          />
        </div>
        <div className="overflow-x-auto rounded-md border border-border/60">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-[11px] uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">User</th>
                <th className="px-3 py-2 font-medium">Role</th>
                <th className="px-3 py-2 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={`${r.user_id}-${r.role}`} className="border-t border-border/50">
                  <td className="px-3 py-2">
                    <div className="font-medium">{r.full_name || r.username || "—"}</div>
                    <div className="text-[11px] text-muted-foreground">
                      {r.username ? `@${r.username}` : r.user_id.slice(0, 8) + "…"}
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <Badge
                      variant="outline"
                      className={`gap-1 ring-1 ring-inset ${ROLE_STYLES[r.role as Role] ?? ""}`}
                    >
                      <Shield className="h-3 w-3" />
                      {r.role.replace("_", " ")}
                    </Badge>
                  </td>
                  <td className="px-3 py-2 text-right">
                    {isSuperAdmin && (
                      <Button variant="ghost" size="sm" onClick={() => revoke(r.user_id, r.role)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
              {!filtered.length && (
                <tr>
                  <td colSpan={3} className="px-3 py-8 text-center text-sm text-muted-foreground">
                    No staff assignments yet.
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
