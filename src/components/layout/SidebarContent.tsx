import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { useEffect, useMemo, useState } from "react";
import { LogOut, ChevronDown } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useProfile } from "@/hooks/use-supabase";
import { getNavItemsForRole } from "@/config/navigation";
import type { AppNavGroup, AppNavItem } from "@/config/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import NotificationBadge from "@/components/shared/NotificationBadge";
import NotificationPanel from "@/components/shared/NotificationPanel";

export const SidebarContentComponent = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isCollapsed } = useSidebar();
  const { data: profile, isLoading, isError } = useProfile();
  const appVersion = import.meta.env.VITE_APP_VERSION;
  const navItems = getNavItemsForRole(profile?.role ?? "admin");
  const autoCollapseGroups = useMemo(() => new Set(["Actividad", "Sistema"]), []);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const [notificationPanelOpen, setNotificationPanelOpen] = useState(false);

  useEffect(() => {
    if (isError) {
      toast.error("Error al cargar el perfil de usuario");
    }
  }, [isError]);

  const userName = profile?.full_name || "Usuario";

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error("Error al cerrar sesion");
    } else {
      navigate("/auth");
    }
  };

  const getInitials = (name: string) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  };

  const isActive = (path: string) =>
    location.pathname === path || (path !== "/admin" && location.pathname.startsWith(path));

  const isGroupActive = (group: AppNavGroup) => group.items.some((item) => isActive(item.path));

  useEffect(() => {
    setOpenGroups((prev) => {
      const next = { ...prev };
      navItems.forEach((entry) => {
        if (entry.type === "group" && autoCollapseGroups.has(entry.label)) {
          next[entry.label] = isGroupActive(entry);
        }
      });
      return next;
    });
  }, [location.pathname, navItems, autoCollapseGroups]);

  const toggleGroup = (label: string) => {
    setOpenGroups((prev) => ({ ...prev, [label]: !prev[label] }));
  };

  const renderItem = (item: AppNavItem, variant: "main" | "nested" = "main") => (
    <SidebarMenuItem key={item.path}>
      <SidebarMenuButton
        asChild
        isActive={isActive(item.path)}
        tooltip={item.label}
        className={cn(variant === "nested" && "h-9 text-xs text-muted-foreground")}
      >
        <Link to={item.path}>
          <item.icon className={cn("h-4 w-4 shrink-0", variant === "nested" && "h-3.5 w-3.5")} />
          <span className={cn("truncate", isCollapsed && "hidden")}>{item.label}</span>
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );

  if (isLoading) {
    return (
      <SidebarHeader>
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-8 rounded-full" />
          <div className={cn("flex flex-col gap-1", isCollapsed && "hidden")}>
            <Skeleton className="h-4 w-24" />
          </div>
        </div>
      </SidebarHeader>
    );
  }

  return (
    <>
      <SidebarHeader>
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt={userName} className="h-full w-full object-cover" />
              ) : (
                <AvatarFallback>{getInitials(userName)}</AvatarFallback>
              )}
            </Avatar>
            <div className={cn("flex flex-col", isCollapsed && "hidden")}>
              <span className="text-[11px] font-semibold text-foreground">{profile?.full_name || "Usuario"}</span>
              <span className="text-xs text-muted-foreground capitalize">{profile?.role ?? "usuario"}</span>
            </div>
          </div>
          {/* Notification Badge */}
          <NotificationBadge
            targetRole={profile?.role as any}
            onClick={() => setNotificationPanelOpen(true)}
            className={cn(isCollapsed && "hidden")}
          />
        </div>
      </SidebarHeader>

      {/* Notification Panel */}
      <NotificationPanel
        isOpen={notificationPanelOpen}
        onClose={() => setNotificationPanelOpen(false)}
        targetRole={profile?.role as any}
      />
      <SidebarContent>
        <SidebarMenu>
          {navItems.map((entry) => {
            if (entry.type === "item") {
              return renderItem(entry);
            }

            const isAutoCollapse = autoCollapseGroups.has(entry.label);
            const isOpen = !isAutoCollapse ? true : Boolean(openGroups[entry.label]);
            return (
              <SidebarMenuItem key={entry.label}>
                {isAutoCollapse ? (
                  <SidebarMenuButton
                    onClick={() => toggleGroup(entry.label)}
                    isActive={isGroupActive(entry)}
                    className="justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <entry.icon className="h-4 w-4 shrink-0" />
                      <span className={cn("truncate", isCollapsed && "hidden")}>{entry.label}</span>
                    </div>
                    {!isCollapsed && (
                      <ChevronDown className={cn("h-4 w-4 transition-transform", isOpen && "rotate-180")} />
                    )}
                  </SidebarMenuButton>
                ) : (
                  <div className={cn("px-3 pt-3 pb-1 text-[11px] uppercase tracking-[0.2em] text-muted-foreground", isCollapsed && "hidden")}>
                    {entry.label}
                  </div>
                )}
                <SidebarMenu className={cn("mt-1", isAutoCollapse && !isOpen && "hidden")}>
                  {entry.items.map((item) => renderItem(item, "nested"))}
                </SidebarMenu>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter>
        <div className="w-full px-3 py-2 text-center">
          <p className="text-xs text-muted-foreground">Version {appVersion}</p>
        </div>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={handleLogout} tooltip="Logout">
              <LogOut className="h-4 w-4 shrink-0" />
              <span className={cn(isCollapsed && "hidden")}>Logout</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </>
  );
};
