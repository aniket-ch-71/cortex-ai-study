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
  BookX,
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

type NavItem = { title: string; url: string; icon: any; gate?: "currentAffairs" };

const GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: "Overview",
    items: [{ title: "Dashboard", url: "/dashboard", icon: LayoutDashboard }],
  },
  {
    label: "Study",
    items: [
      { title: "AI Doubt Solver", url: "/doubt-solver", icon: MessageCircleQuestion },
      { title: "Mock Tests", url: "/mock-test", icon: Brain },
      { title: "Notes Generator", url: "/notes", icon: FileText },
      { title: "Notes Analyser", url: "/analyser", icon: ScanSearch },
      { title: "Study Planner", url: "/planner", icon: CalendarRange },
      { title: "Current Affairs", url: "/current-affairs", icon: Newspaper, gate: "currentAffairs" },
    ],
  },
  {
    label: "Insights",
    items: [
      { title: "My Performance", url: "/performance", icon: TrendingUp },
      { title: "Mistake Book", url: "/mistakes", icon: BookX },
    ],
  },
  {
    label: "Account",
    items: [
      { title: "Refer Friends", url: "/referral", icon: Gift },
      { title: "Settings", url: "/settings", icon: Settings },
    ],
  },
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
        <Link to="/dashboard" className="flex items-center gap-2 px-2 py-2 focus-ring">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary/15 text-primary ring-1 ring-inset ring-primary/30">
            <Zap className="h-4 w-4" strokeWidth={2.5} />
          </span>
          {!collapsed && (
            <span className="font-display text-base font-bold tracking-tight">
              <span className="gradient-brand-text">P</span>ariksha
            </span>
          )}
        </Link>
      </SidebarHeader>

      <SidebarContent>
        {GROUPS.map((group) => (
          <SidebarGroup key={group.label}>
            {!collapsed && (
              <SidebarGroupLabel className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/70">
                {group.label}
              </SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  if (item.gate === "currentAffairs" && !showCurrentAffairs) return null;
                  const active = path === item.url;
                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild isActive={active}>
                        <Link to={item.url} className="flex items-center gap-2.5">
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
        ))}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={onLogout} aria-label="Sign out">
              <LogOut className="h-4 w-4" />
              {!collapsed && <span>Sign out</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
