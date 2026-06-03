import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import {
  LayoutDashboard,
  MessageCircleQuestion,
  Brain,
  FileText,
  ScanSearch,
  CalendarRange,
  Newspaper,
  TrendingUp,
  Settings,
  LogOut,
  Zap,
  Gift,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  SidebarHeader,
  useSidebar,
} from "@/components/ui/sidebar";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useProfile } from "@/hooks/useProfile";

type NavItem = { title: string; url: string; icon: any; ready: boolean; gate?: "currentAffairs" };

const NAV: NavItem[] = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard, ready: true },
  { title: "AI Doubt Solver", url: "/doubt-solver", icon: MessageCircleQuestion, ready: true },
  { title: "Mock Tests", url: "/mock-test", icon: Brain, ready: true },
  { title: "Notes Generator", url: "/notes", icon: FileText, ready: true },
  { title: "Notes Analyser", url: "/analyser", icon: ScanSearch, ready: true },
  { title: "Study Planner", url: "/planner", icon: CalendarRange, ready: true },
  { title: "Current Affairs", url: "/current-affairs", icon: Newspaper, ready: true, gate: "currentAffairs" },
  { title: "My Performance", url: "/performance", icon: TrendingUp, ready: true },
  { title: "Refer Friends", url: "/referral", icon: Gift, ready: true },
  { title: "Settings", url: "/settings", icon: Settings, ready: true },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const path = useRouterState({ select: (r) => r.location.pathname });
  const navigate = useNavigate();
  const { profile } = useProfile();
  const showCurrentAffairs = (profile as any)?.show_current_affairs !== false;

  const onLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Signed out");
    navigate({ to: "/" });
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <Link to="/dashboard" className="flex items-center gap-2 px-2 py-1.5">
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-primary/15 text-primary">
            <Zap className="h-3.5 w-3.5" strokeWidth={2.5} />
          </span>
          {!collapsed && <span className="font-display text-base font-bold">Pariksha</span>}
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Study</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV.map((item) => {
                if (item.gate === "currentAffairs" && !showCurrentAffairs) return null;
                const active = path === item.url;
                if (!item.ready) {
                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        className="cursor-not-allowed opacity-50"
                        title="Coming soon"
                      >
                        <item.icon className="h-4 w-4" />
                        {!collapsed && (
                          <span className="flex w-full items-center justify-between">
                            {item.title}
                            <span className="rounded bg-secondary px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                              soon
                            </span>
                          </span>
                        )}
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                }
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={active}>
                      <Link to={item.url} className="flex items-center gap-2">
                        <item.icon className="h-4 w-4" />
                        {!collapsed && <span>{item.title}</span>}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={onLogout}>
              <LogOut className="h-4 w-4" />
              {!collapsed && <span>Sign out</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
