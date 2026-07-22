import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/ui-pro/PageHeader";
import { StatCard } from "@/components/ui-pro/StatCard";
import { SectionCard } from "@/components/ui-pro/SectionCard";
import { FileQuestion, Flag, Users, ScrollText, Upload, Image as ImageIcon, BarChart3 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: AdminOverview,
  head: () => ({
    meta: [
      { title: "Admin CMS · PARIKSHA" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
});

function AdminOverview() {
  const [stats, setStats] = useState({ questions: 0, reports: 0, staff: 0, logs: 0 });

  useEffect(() => {
    (async () => {
      const [q, r, s, l] = await Promise.all([
        supabase.from("question_bank").select("*", { count: "exact", head: true }),
        supabase.from("question_reports").select("*", { count: "exact", head: true }),
        supabase.from("user_roles").select("*", { count: "exact", head: true }).neq("role", "user"),
        supabase.from("audit_logs").select("*", { count: "exact", head: true }),
      ]);
      setStats({
        questions: q.count ?? 0,
        reports: r.count ?? 0,
        staff: s.count ?? 0,
        logs: l.count ?? 0,
      });
    })();
  }, []);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
      <PageHeader
        eyebrow="Enterprise CMS"
        title="Admin overview"
        description="Manage the PARIKSHA content library, moderators, and question quality."
      />

      <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Questions" value={stats.questions.toLocaleString()} icon={FileQuestion} />
        <StatCard label="Open reports" value={stats.reports.toLocaleString()} icon={Flag} />
        <StatCard label="Staff members" value={stats.staff.toLocaleString()} icon={Users} />
        <StatCard label="Audit events" value={stats.logs.toLocaleString()} icon={ScrollText} />
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <SectionCard title="Content operations" description="Author, curate and publish questions">
          <div className="grid grid-cols-1 gap-2">
            <QuickLink to="/admin/questions" icon={FileQuestion} title="Question library" desc="Browse, edit, review, publish" />
            <QuickLink to="/admin/import" icon={Upload} title="Bulk import" desc="CSV / JSON / XLSX pipelines" />
            <QuickLink to="/admin/media" icon={ImageIcon} title="Media library" desc="Diagrams, SVGs, uploads" />
          </div>
        </SectionCard>

        <SectionCard title="Quality & governance" description="Audit and moderate at scale">
          <div className="grid grid-cols-1 gap-2">
            <QuickLink to="/admin/reports" icon={Flag} title="Question reports" desc="Triage student flags" />
            <QuickLink to="/admin/analytics" icon={BarChart3} title="Content analytics" desc="Coverage, quality, gaps" />
            <QuickLink to="/admin/audit" icon={ScrollText} title="Audit log" desc="Every admin action" />
            <QuickLink to="/admin/users" icon={Users} title="Users & roles" desc="Staff role assignments" />
          </div>
        </SectionCard>
      </div>

      <div className="mt-6 rounded-lg border border-dashed border-border/70 bg-muted/30 p-4 text-xs text-muted-foreground">
        Stage 1 of the Enterprise CMS is live (RBAC, admin shell, audit log). Question management, editor, media library, bulk import and analytics ship in the next stages.
      </div>
    </div>
  );
}

function QuickLink({
  to,
  icon: Icon,
  title,
  desc,
}: {
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  desc: string;
}) {
  return (
    <Link
      to={to}
      className="group flex items-start gap-3 rounded-md border border-transparent p-2.5 transition-colors hover:border-border/70 hover:bg-muted/40"
    >
      <span className="mt-0.5 grid h-8 w-8 place-items-center rounded-md bg-primary/10 text-primary ring-1 ring-inset ring-primary/20">
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <div className="text-sm font-medium">{title}</div>
        <div className="text-xs text-muted-foreground">{desc}</div>
      </div>
    </Link>
  );
}
