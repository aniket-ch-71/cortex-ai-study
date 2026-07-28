import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader } from "@/components/ui-pro/PageHeader";
import { SectionCard } from "@/components/ui-pro/SectionCard";
import { EmptyState } from "@/components/ui-pro/EmptyState";
import { Button } from "@/components/ui/button";
import { Bell, CheckCircle2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useNotifications } from "@/hooks/useNotifications";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin/notifications")({
  component: Page,
  head: () => ({ meta: [{ title: "Notifications · Admin · PARIKSHA" }, { name: "robots", content: "noindex,nofollow" }] }),
});

function Page() {
  const { items, unread, markAllRead, markRead } = useNotifications();
  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 lg:px-8">
      <PageHeader
        eyebrow="Content Operations"
        title="Notifications"
        description="Assignments, review requests, publishing events."
        actions={unread.length > 0 && <Button size="sm" variant="outline" onClick={markAllRead}>Mark all read</Button>}
      />
      {items.length === 0 ? (
        <SectionCard className="mt-6"><EmptyState icon={Bell} title="No notifications" description="You are all caught up." /></SectionCard>
      ) : (
        <div className="mt-6 space-y-2">
          {items.map((n) => (
            <div key={n.id} className={cn("flex items-start gap-3 rounded-md border p-3", n.read_at ? "border-border/50 opacity-70" : "border-border/70 bg-card/40")}>
              <span className={cn("mt-1 h-2 w-2 rounded-full", n.read_at ? "bg-muted-foreground/40" : "bg-primary")} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-sm font-medium">{n.title}</div>
                  <div className="text-[11px] text-muted-foreground">{formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}</div>
                </div>
                {n.body && <div className="mt-0.5 text-xs text-muted-foreground">{n.body}</div>}
                <div className="mt-1.5 flex items-center gap-2 text-[11px]">
                  {n.link && <Link to={n.link} className="text-primary hover:underline">Open</Link>}
                  {!n.read_at && <button onClick={() => markRead([n.id])} className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"><CheckCircle2 className="h-3 w-3" />Mark read</button>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
