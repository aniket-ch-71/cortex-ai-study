import { createFileRoute, Outlet, Link, useRouterState, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Shield,
  LayoutDashboard,
  FileQuestion,
  Image as ImageIcon,
  Flag,
  Upload,
  Users,
  ScrollText,
  BarChart3,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin")({
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    const { data: sess } = await supabase.auth.getSession();
    if (!sess.session) throw redirect({ to: "/auth", search: { mode: "login", redirect: "/admin" } });
  },
  component: AdminLayout,
});

const NAV = [
  { to: "/admin", label: "Overview", icon: LayoutDashboard, exact: true },
  { to: "/admin/questions", label: "Questions", icon: FileQuestion },
  { to: "/admin/media", label: "Media Library", icon: ImageIcon },
  { to: "/admin/reports", label: "Reports", icon: Flag },
  { to: "/admin/import", label: "Bulk Import", icon: Upload },
  { to: "/admin/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/admin/users", label: "Users & Roles", icon: Users, roles: ["super_admin"] as string[] },
  { to: "/admin/audit", label: "Audit Log", icon: ScrollText, roles: ["admin", "super_admin"] as string[] },
];

function AdminLayout() {
  const [checking, setChecking] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const [roles, setRoles] = useState<string[]>([]);
  const path = useRouterState({ select: (r) => r.location.pathname });

  useEffect(() => {
    (async () => {
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        window.location.href = "/auth";
        return;
      }
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", sess.session.user.id);
      const rs = ((data ?? []) as { role: string }[]).map((r) => r.role);
      setRoles(rs);
      const staff = rs.some((r) => r !== "user");
      setAllowed(staff);
      setChecking(false);
    })();
  }, []);

  if (checking) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-sm text-muted-foreground">
        Verifying access…
      </div>
    );
  }
  if (!allowed) {
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center gap-3 px-6 text-center">
        <Shield className="h-10 w-10 text-muted-foreground" />
        <h1 className="text-xl font-semibold">Admin access required</h1>
        <p className="text-sm text-muted-foreground">
          This area is restricted to PARIKSHA staff. If you should have access, ask a super admin to grant you a role.
        </p>
        <Link to="/dashboard" className="mt-2 text-sm font-medium text-primary hover:underline">
          Back to dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100dvh-3.5rem)] w-full">
      <aside className="hidden w-60 shrink-0 border-r border-border/60 bg-card/40 p-3 lg:block">
        <div className="mb-3 flex items-center gap-2 px-2 py-1.5">
          <span className="grid h-7 w-7 place-items-center rounded-md bg-primary/15 text-primary ring-1 ring-inset ring-primary/30">
            <Shield className="h-3.5 w-3.5" />
          </span>
          <div className="flex flex-col">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Admin CMS</span>
            <span className="text-xs font-medium text-foreground">PARIKSHA</span>
          </div>
        </div>
        <nav className="flex flex-col gap-0.5">
          {NAV.map((item) => {
            if (item.roles && !item.roles.some((r) => roles.includes(r))) return null;
            const active = item.exact ? path === item.to : path === item.to || path.startsWith(item.to + "/");
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex items-center gap-2 rounded-md px-2.5 py-2 text-sm transition-colors",
                  active
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>
      <div className="min-w-0 flex-1">
        <Outlet />
      </div>
    </div>
  );
}
