import { Bell } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useNotifications } from "@/hooks/useNotifications";

export function NotificationBell() {
  const { unread } = useNotifications();
  return (
    <Link to="/admin/notifications" className="relative inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground">
      <Bell className="h-4 w-4" />
      {unread.length > 0 && (
        <span className="absolute -right-1 -top-1 grid h-4 min-w-[16px] place-items-center rounded-full bg-rose-500 px-1 text-[10px] font-semibold text-white ring-2 ring-background">
          {unread.length > 9 ? "9+" : unread.length}
        </span>
      )}
    </Link>
  );
}
