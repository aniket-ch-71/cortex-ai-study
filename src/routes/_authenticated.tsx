import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";

export const Route = createFileRoute("/_authenticated")({
  // Client-side guard: check session before rendering
  beforeLoad: async ({ location }) => {
    if (typeof window === "undefined") return;
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      throw redirect({
        to: "/auth",
        search: { mode: "login", redirect: location.pathname },
      });
    }
  },
  component: AuthedLayout,
});

function AuthedLayout() {
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(() => setChecking(false));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (!session) window.location.href = "/auth";
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex h-14 items-center gap-3 border-b border-border bg-background/70 px-4 backdrop-blur-xl">
            <SidebarTrigger />
            <span className="font-display text-sm font-semibold">CORTEX</span>
          </header>
          <main className="flex-1 overflow-auto">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
