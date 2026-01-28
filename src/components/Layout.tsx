import { useEffect, useMemo, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { LogOut, PanelLeft, Heart, Plus, ChevronDown } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn, shellBackground } from "@/lib/utils";
import { Sheet, SheetContent, SheetTrigger } from "./ui/sheet";
import { Button } from "./ui/button";
import { ThemeToggle } from "./theme-toggle";
import { useProfile } from "@/hooks/use-supabase";
import { Accordion, AccordionContent, AccordionItem } from "@/components/ui/accordion";
import { HeaderStatus } from "@/layout/HeaderStatus";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Profile } from "@/types";
import type { AppNavEntry, AppNavGroup, AppNavItem } from "@/config/navigation";
import { getNavItemsForRole } from "@/config/navigation";
import { MobileNavigation } from "./layout/MobileNavigation";
import { useRolePreview } from "@/context/RolePreviewContext";
import type { AppRole } from "@/config/navigation";
import { RolePreviewSelector } from "./layout/RolePreviewSelector";
import { VersionDisplay } from "./VersionDisplay";
import { ThemeImage } from "./ui/ThemeImage";

const logoLight = "/img/logo-placeholder.png";
const logoDark = "/img/logo-placeholder.png";

type LayoutProps = {
  children: React.ReactNode;
  profile?: Profile | null;
  navItems?: AppNavEntry[];
};

type SidebarContentProps = {
  profile: Profile | null | undefined;
  navItems: AppNavEntry[];
};

const SidebarContentComponent = ({
  profile,
  navItems,
  showPreviewBanner,
  onClearPreview,
  previewRole,
}: SidebarContentProps & {
  showPreviewBanner: boolean;
  onClearPreview: () => void;
  previewRole: AppRole | null;
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isCollapsed } = useSidebar();
  const appVersion = import.meta.env.VITE_APP_VERSION;
  const autoCollapseGroups = useMemo(() => new Set(["Actividad", "Sistema"]), []);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

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
        tooltip={item.label}
        isActive={isActive(item.path)}
        className={cn(variant === "nested" && "h-9 text-xs text-muted-foreground")}
      >
        <NavLink
          to={item.path}
          end={item.path === "/admin"}
          className="flex w-full items-center gap-3"
          aria-current={isActive(item.path) ? "page" : undefined}
        >
          <item.icon className={cn("h-4 w-4 shrink-0", variant === "nested" && "h-3.5 w-3.5")} aria-hidden="true" />
          <span className={cn("truncate", isCollapsed ? "sr-only" : "inline")}>{item.label}</span>
        </NavLink>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );

  return (
    <>
      <SidebarHeader>
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
      </SidebarHeader>
      {showPreviewBanner && previewRole && (
        <div className="mx-3 mb-3 rounded-md border border-primary/30 bg-primary/10 px-3 py-2 text-xs text-primary shadow-sm">
          Previsualizando como <span className="font-semibold capitalize">{previewRole}</span>.{" "}
          <button className="underline" onClick={onClearPreview}>
            Volver a mi rol
          </button>
        </div>
      )}
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
        {!isCollapsed && (
          <Accordion type="single" collapsible className="w-full px-2">
            <AccordionItem value="item-1" className="border-b-0">
              <AccordionContent className="pb-2 text-center space-y-2">
                <div className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                  EGEA
                </div>
                <p className="text-xs text-muted-foreground mb-1">Version {appVersion}</p>
                <p className="text-xs text-muted-foreground flex items-center justify-center gap-1.5">
                  Hecho con <Heart className="h-3 w-3 text-red-500 fill-red-500" /> por Hacchi
                </p>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        )}
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={handleLogout} tooltip="Cerrar sesion">
              <LogOut className="h-4 w-4 shrink-0" />
              <span className={cn(isCollapsed && "hidden")}>Cerrar sesion</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        {!isCollapsed && (
          <div className="px-4 pt-4 space-y-2">
            <ThemeImage
              lightSrc={logoLight}
              darkSrc={logoDark}
              alt="Egea"
              className="mx-auto h-8 opacity-90 hover:opacity-100"
            />
            <div className="flex justify-center">
              <VersionDisplay variant="badge" showChangelog />
            </div>
          </div>
        )}
      </SidebarFooter>
    </>
  );
};

const MainLayout = ({
  children,
  profile,
  navItems,
  showPreviewBanner,
  onClearPreview,
  previewRole,
}: {
  children: React.ReactNode;
  profile: Profile | null | undefined;
  navItems: AppNavEntry[];
  showPreviewBanner: boolean;
  onClearPreview: () => void;
  previewRole: AppRole | null;
}) => {
  const { isCollapsed, toggleSidebar } = useSidebar();
  const resolvedRole = previewRole ?? profile?.role ?? null;

  return (
    <div className="relative flex min-h-screen w-full bg-background">
      <Sidebar>
        <SidebarContentComponent
          profile={profile}
          navItems={navItems}
          showPreviewBanner={showPreviewBanner}
          onClearPreview={onClearPreview}
          previewRole={previewRole}
        />
      </Sidebar>
      <div
        className={cn(
          "flex-1 flex flex-col transition-all duration-300",
          isCollapsed ? "md:ml-14" : "md:ml-64"
        )}
      >
        <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b bg-[hsl(var(--glass-background))] px-4 backdrop-blur-[var(--glass-blur)] border-[hsl(var(--glass-border))] sm:px-6">
          <div className="flex items-center gap-2">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                  <PanelLeft className="h-5 w-5" />
                  <span className="sr-only">Toggle Sidebar</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64 p-0">
                <SidebarContentComponent
                  profile={profile}
                  navItems={navItems}
                  showPreviewBanner={showPreviewBanner}
                  onClearPreview={onClearPreview}
                  previewRole={previewRole}
                />
              </SheetContent>
            </Sheet>
            <Button variant="ghost" size="icon" className="hidden md:flex" onClick={toggleSidebar}>
              <PanelLeft className="h-5 w-5" />
              <span className="sr-only">Toggle Sidebar</span>
            </Button>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-2">
              <HeaderStatus role={resolvedRole} />
              {/* <RolePreviewSelector /> */}
            </div>
            {/* <VersionDisplay variant="badge" showChangelog /> */}
            <ThemeToggle />
          </div>
        </header>

        <main className={cn("flex-1 overflow-y-auto p-0 sm:p-2 md:p-4 lg:p-6", shellBackground)}>
          {children}
        </main>
      </div>
    </div>
  );
};

export const Layout = ({ children, profile: profileProp, navItems: navItemsProp }: LayoutProps) => {
  const { data: profileFallback } = useProfile();
  const { previewRole, clearPreview } = useRolePreview();
  const profile = profileProp ?? profileFallback ?? null;
  const effectiveRole = previewRole ?? profile?.role ?? "admin";
  const navItems = useMemo(
    () => navItemsProp ?? getNavItemsForRole(effectiveRole),
    [navItemsProp, effectiveRole]
  );
  const showPreviewBanner = Boolean(previewRole);

  return (
    <SidebarProvider>
      <MainLayout
        profile={profile}
        navItems={navItems}
        showPreviewBanner={showPreviewBanner}
        onClearPreview={clearPreview}
        previewRole={previewRole}
      >
        {children}
      </MainLayout>
    </SidebarProvider>
  );
};

export const CompactLayout = ({ children, profile, navItems: navItemsProp }: LayoutProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { previewRole, clearPreview } = useRolePreview();
  const resolvedProfile = profile ?? null;
  const effectiveRole = previewRole ?? resolvedProfile?.role ?? "operario";
  const navItems = navItemsProp ?? getNavItemsForRole(effectiveRole);
  const currentUser = resolvedProfile
    ? {
      full_name: resolvedProfile.full_name,
      role: effectiveRole,
      email: resolvedProfile.email,
      avatar_url: resolvedProfile.avatar_url ?? undefined,
    }
    : undefined;

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error("Error al cerrar sesion");
    } else {
      toast.success("Sesion cerrada");
      navigate("/auth", { replace: true });
    }
  };

  const isActive = (path: string) =>
    location.pathname === path || (path !== "/admin" && location.pathname.startsWith(path));

  const handleNavigate = (path: string) => {
    if (!isActive(path)) navigate(path);
  };

  const renderCompactItem = (entry: AppNavEntry) => {
    if (entry.type === "item") {
      return (
        <Button
          key={entry.path}
          variant={isActive(entry.path) ? "secondary" : "ghost"}
          className="gap-2"
          onClick={() => handleNavigate(entry.path)}
        >
          <entry.icon className="h-4 w-4" />
          {entry.label}
        </Button>
      );
    }

    const groupActive = entry.items.some((item) => isActive(item.path));
    return (
      <DropdownMenu key={entry.label}>
        <DropdownMenuTrigger asChild>
          <Button variant={groupActive ? "secondary" : "ghost"} className="gap-2">
            <entry.icon className="h-4 w-4" />
            {entry.label}
            <ChevronDown className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          {entry.items.map((item) => (
            <DropdownMenuItem key={item.path} onClick={() => handleNavigate(item.path)}>
              <item.icon className="mr-2 h-4 w-4" />
              {item.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };

  return (
    <div className={cn("relative min-h-screen", shellBackground)}>
      <div className="hidden border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:block">
        {previewRole && (
          <div className="border-b border-primary/30 bg-primary/10">
            <div className="w-full flex items-center justify-between px-6 py-2 text-sm text-primary">
              <span>
                Previsualizando como{" "}
                <span className="font-semibold capitalize">{previewRole}</span>
              </span>
              <button className="underline" onClick={clearPreview}>
                Volver a mi rol real
              </button>
            </div>
          </div>
        )}
        <div className="w-full flex items-center justify-between px-6 py-4">
          <div>
            <p className="text-sm text-muted-foreground">
              Hola, {resolvedProfile?.full_name ?? "Usuario"}
            </p>
            <h1 className="text-xl font-semibold capitalize">
              {previewRole ?? resolvedProfile?.role ?? "..."}
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <HeaderStatus role={effectiveRole} />
            <VersionDisplay variant="badge" showChangelog />
            <ThemeToggle />
            <Button variant="outline" size="sm" onClick={handleLogout} className="hidden md:inline-flex">
              Cerrar sesion
            </Button>
          </div>
        </div>
        <nav className="w-full flex flex-wrap gap-2 px-6 pb-4">
          {navItems.map(renderCompactItem)}
        </nav>
      </div>

      <div className="md:hidden">
        {previewRole && (
          <div className="mx-2 mb-2 rounded-md border border-primary/30 bg-primary/10 px-3 py-2 text-xs text-primary">
            Previsualizando como{" "}
            <span className="font-semibold capitalize">{previewRole}</span>.{" "}
            <button className="underline" onClick={clearPreview}>
              Volver a mi rol
            </button>
          </div>
        )}
        <MobileNavigation currentUser={currentUser} navItems={navItems} />
      </div>

      <main className="w-full flex flex-col gap-4 px-4 pb-24 pt-0 md:pb-10 md:pt-6">
        {children}
      </main>

      <div className="mt-6 flex justify-center pb-6">
        <ThemeImage
          lightSrc={logoLight}
          darkSrc={logoDark}
          alt="Egea"
          className="h-10 opacity-90"
        />
      </div>

      <Button
        size="icon"
        className="fixed bottom-20 right-4 z-40 h-12 w-12 rounded-full shadow-lg md:hidden"
        onClick={() => toast.info("Acciones rapidas proximamente")}
      >
        <Plus className="h-5 w-5" />
      </Button>
    </div>
  );
};

export default Layout;
