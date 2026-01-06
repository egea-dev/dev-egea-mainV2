import React, { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Menu, LogOut, MessageCircle, ChevronDown } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
// DESHABILITADO: Problema de conversaciones pausado
// import { useDirectMessages } from "@/hooks/use-direct-messages";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme-toggle";
import { flattenNavItems, getNavItemsForRole } from "@/config/navigation";
import type { AppNavEntry, AppNavItem, AppRole } from "@/config/navigation";

interface MobileNavigationProps {
  currentUser?: {
    full_name: string;
    role: string;
    email?: string | null;
    avatar_url?: string;
  } | null;
  navItems?: AppNavEntry[];
}

const resolveRole = (role?: string | null): AppRole =>
  role === "manager" || role === "responsable" || role === "operario" ? role : "admin";

export const MobileNavigation = ({ currentUser, navItems }: MobileNavigationProps) => {
  const logoPlaceholder = "/logo-placeholder.png";
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // DESHABILITADO: Problema de conversaciones pausado
  // const { unreadCount } = useDirectMessages();
  const unreadCount = 0;

  const role = resolveRole(currentUser?.role);
  const entries = navItems ?? getNavItemsForRole(role);
  const flatItems = flattenNavItems(entries);
  const autoCollapseGroups = useMemo(() => new Set(["Actividad", "Sistema"]), []);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const showBottomLogout = currentUser?.role === "operario" || currentUser?.role === "responsable";

  const handleNavigation = (path: string) => {
    navigate(path);
    setIsOpen(false);
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      navigate("/auth");
      toast.success("Sesion cerrada correctamente");
    } catch (error) {
      toast.error("Error al cerrar sesion");
    }
  };

  const isActive = (path: string) =>
    location.pathname === path || (path !== "/admin" && location.pathname.startsWith(path));

  useEffect(() => {
    setOpenGroups((prev) => {
      const next = { ...prev };
      entries.forEach((entry) => {
        if (entry.type === "group" && autoCollapseGroups.has(entry.label)) {
          next[entry.label] = entry.items.some((item) => isActive(item.path));
        }
      });
      return next;
    });
  }, [location.pathname, entries, autoCollapseGroups]);

  const renderNavButton = (item: AppNavItem, variant: "main" | "nested" = "main") => {
    const Icon = item.icon;
    const active = isActive(item.path);
    return (
      <Button
        key={item.path}
        variant="ghost"
        className={cn(
          "w-full justify-start h-12",
          active && "text-primary ring-1 ring-primary/30 bg-transparent",
          variant === "nested" && "h-10 text-sm"
        )}
        onClick={() => handleNavigation(item.path)}
      >
        <Icon className={cn("h-5 w-5 mr-3", variant === "nested" && "h-4 w-4")} />
        <span className="flex-1 text-left">{item.label}</span>
        {item.path === "/admin/communications" && unreadCount > 0 && (
          <Badge className="h-5 w-5 p-0 flex items-center justify-center text-xs">
            {unreadCount}
          </Badge>
        )}
      </Button>
    );
  };

  return (
    <div className="lg:hidden">
      <div className="flex items-center justify-between border-b bg-background/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center gap-3">
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="h-10 w-10">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-80 p-0 [&>button[data-radix-dialog-close]]:hidden">
              <SheetHeader className="border-b px-6 py-4">
                <SheetTitle className="text-lg font-semibold text-left">Menu</SheetTitle>
              </SheetHeader>

              {currentUser && (
                <div className="p-6 border-b">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={currentUser.avatar_url || ""} />
                      <AvatarFallback>
                        {currentUser.full_name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{currentUser.full_name}</p>
                      <Badge variant="secondary" className="text-xs capitalize mb-1">
                        {currentUser.role}
                      </Badge>
                      <p className="text-xs text-muted-foreground truncate">{currentUser.email || "user@oko.com"}</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex-1 overflow-y-auto scrollbar-thin">
                <nav className="p-4 space-y-2">
                  {entries.map((entry) => {
                    if (entry.type === "item") {
                      return renderNavButton(entry);
                    }

                    const isAutoCollapse = autoCollapseGroups.has(entry.label);
                    const isOpen = !isAutoCollapse ? true : Boolean(openGroups[entry.label]);
                    return (
                      <div key={entry.label} className="pt-2">
                        {isAutoCollapse ? (
                          <Button
                            variant="ghost"
                            className={cn(
                              "w-full justify-between h-10 px-2 text-[11px] uppercase tracking-[0.2em]",
                              isOpen ? "text-primary" : "text-muted-foreground"
                            )}
                            onClick={() =>
                              setOpenGroups((prev) => ({ ...prev, [entry.label]: !prev[entry.label] }))
                            }
                          >
                            <span>{entry.label}</span>
                            <ChevronDown className={cn("h-4 w-4 transition-transform", isOpen && "rotate-180")} />
                          </Button>
                        ) : (
                          <div className="px-2 pb-2 text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                            {entry.label}
                          </div>
                        )}
                        <div className={cn("space-y-1 pl-2 border-l border-border/60", isAutoCollapse && !isOpen && "hidden")}>
                          {entry.items.map((item) => renderNavButton(item, "nested"))}
                        </div>
                      </div>
                    );
                  })}
                </nav>

                <div className="space-y-2 border-t p-4">
                  <Button
                    variant="ghost"
                    className="w-full justify-start h-12 text-destructive hover:text-destructive"
                    onClick={handleLogout}
                  >
                    <LogOut className="h-5 w-5 mr-3" />
                    <span className="flex-1 text-left">Cerrar sesion</span>
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>

          <div className="flex items-center gap-2">
            <img src={logoPlaceholder} alt="Egea" className="h-7 w-auto" />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          {currentUser && (
            <>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleNavigation("/admin/communications")}
                className="relative h-10 w-10"
              >
                <MessageCircle className="h-5 w-5" />
                {unreadCount > 0 && (
                  <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
                    {unreadCount}
                  </Badge>
                )}
              </Button>
              <Avatar className="h-10 w-10">
                <AvatarImage src={currentUser.avatar_url || ""} />
                <AvatarFallback className="text-sm">
                  {currentUser.full_name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </>
          )}
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-t lg:hidden z-50">
        <div className={cn("grid gap-1 p-2", showBottomLogout ? "grid-cols-4" : "grid-cols-5")}>
          {flatItems.slice(0, 5).map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <Button
                key={item.path}
                variant="ghost"
                className={cn(
                  "relative flex flex-col h-16 gap-1",
                  active && "text-primary ring-1 ring-primary/30 bg-transparent"
                )}
                onClick={() => handleNavigation(item.path)}
              >
                <Icon className="h-5 w-5" />
                <span className="text-xs">{item.label}</span>
                {item.path === "/admin/communications" && unreadCount > 0 && (
                  <Badge className="absolute -top-1 right-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
                    {unreadCount}
                  </Badge>
                )}
              </Button>
            );
          })}
          {showBottomLogout && (
            <Button
              variant="ghost"
              className="relative flex flex-col h-16 gap-1 text-destructive hover:text-destructive"
              onClick={handleLogout}
            >
              <LogOut className="h-5 w-5" />
              <span className="text-xs">Cerrar sesion</span>
            </Button>
          )}
        </div>
      </div>

      <div className="h-16 lg:hidden" />
    </div>
  );
};
