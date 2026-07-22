import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type StaffRole = "super_admin" | "admin" | "moderator" | "content_creator" | "reviewer";
export type AnyRole = StaffRole | "user";

const STAFF_ROLES: StaffRole[] = ["super_admin", "admin", "moderator", "content_creator", "reviewer"];

export function useStaffRole() {
  const [roles, setRoles] = useState<AnyRole[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        if (!cancelled) {
          setRoles([]);
          setLoading(false);
        }
        return;
      }
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", sess.session.user.id);
      if (!cancelled) {
        setRoles(((data ?? []) as { role: AnyRole }[]).map((r) => r.role));
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const has = (r: AnyRole) => roles.includes(r);
  const hasAny = (rs: AnyRole[]) => rs.some((r) => roles.includes(r));
  const isStaff = roles.some((r) => STAFF_ROLES.includes(r as StaffRole));
  const isSuperAdmin = has("super_admin");
  const isAdmin = has("admin") || isSuperAdmin;

  return { roles, loading, has, hasAny, isStaff, isSuperAdmin, isAdmin };
}
