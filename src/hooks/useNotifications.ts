import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { listNotifications, markNotificationsRead, type NotificationRow } from "@/lib/admin/ops";

export function useNotifications() {
  const [items, setItems] = useState<NotificationRow[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const rows = await listNotifications(50);
      setItems(rows);
    } catch {
      // ignore — will retry on realtime tick
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) { if (mounted) setLoading(false); return; }
      await refresh();
      const channel = supabase
        .channel(`notifications:${sess.session.user.id}`)
        .on("postgres_changes",
          { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${sess.session.user.id}` },
          () => { refresh(); })
        .subscribe();
      return () => { supabase.removeChannel(channel); };
    })();
    return () => { mounted = false; };
  }, [refresh]);

  const unread = items.filter((n) => !n.read_at);

  const markRead = useCallback(async (ids: string[]) => {
    if (!ids.length) return;
    await markNotificationsRead(ids);
    setItems((prev) => prev.map((n) => ids.includes(n.id) ? { ...n, read_at: new Date().toISOString() } : n));
  }, []);

  const markAllRead = useCallback(async () => {
    const ids = unread.map((n) => n.id);
    await markRead(ids);
  }, [unread, markRead]);

  return { items, unread, loading, refresh, markRead, markAllRead };
}
