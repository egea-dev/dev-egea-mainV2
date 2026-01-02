import { useMemo } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
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
import { LogOut, Settings, PanelLeft, Heart, Plus } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetTrigger } from "./ui/sheet";
import { Button } from "./ui/button";
import { ThemeToggle } from "./theme-toggle";
import { useProfile } from "@/hooks/use-supabase";
import { Accordion, AccordionContent, AccordionItem } from "@/components/ui/accordion";
import { HeaderStatus } from "@/layout/HeaderStatus";
import type { Profile } from "@/types";
import type { AppNavItem } from "@/config/navigation";
import { getNavItemsForRole } from "@/config/navigation";
import { MobileNavigation } from "./layout/MobileNavigation";
import { useRolePreview } from "@/context/RolePreviewContext";
import type { AppRole } from "@/config/navigation";
const logoPlaceholder = "/logo-placeholder.png";

type LayoutProps = {
  children: React.ReactNode;
  profile?: Profile | null;
  navItems?: AppNavItem[];
};

type SidebarContentProps = {
  profile: Profile | null | undefined;
  navItems: AppNavItem[];
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

  const userName = profile?.full_name || "Usuario";

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error("Error al cerrar sesión");
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
            <span className="text-sm font-semibold text-foreground">Egea Productivity</span>
            <span className="text-xs text-muted-foreground capitalize">{profile?.role ?? "usuario"}</span>
          </div>
        </div>
      </SidebarHeader>
      {showPreviewBanner && previewRole && (
        <div className="mx-3 mb-3 rounded-md border border-primary/30 bg-primary/10 px-3 py-2 text-xs text-primary">
          Previsualizando como <span className="font-semibold capitalize">{previewRole}</span>.{" "}
          <button className="underline" onClick={onClearPreview}>
            Volver a mi rol
          </button>
        </div>
      )}
      <SidebarContent>
        <SidebarMenu>
          {navItems.map((item) => (
            <SidebarMenuItem key={item.path}>
              <SidebarMenuButton
                asChild
                tooltip={item.label}
                isActive={isActive(item.path)}
              >
                <Link to={item.path}>
                  <item.icon className="h-4 w-4 shrink-0" />
                  <span className={cn("truncate", isCollapsed && "hidden")}>{item.label}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
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
                <p className="text-xs text-muted-foreground mb-1">Versión {appVersion}</p>
                <p className="text-xs text-muted-foreground flex items-center justify-center gap-1.5">
                  Hecho con <Heart className="h-3 w-3 text-red-500 fill-red-500" /> por Hacchi
                </p>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        )}
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="Configuración">
              <Link to="/admin/settings">
                <Settings className="h-4 w-4 shrink-0" />
                <span className={cn(isCollapsed && "hidden")}>Configuración</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={handleLogout} tooltip="Cerrar sesión">
              <LogOut className="h-4 w-4 shrink-0" />
              <span className={cn(isCollapsed && "hidden")}>Cerrar sesión</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        {!isCollapsed && (
          <div className="px-4 pt-4">
            <img src={logoPlaceholder} alt="Egea" className="mx-auto h-8 opacity-80" />
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
  navItems: AppNavItem[];
  showPreviewBanner: boolean;
  onClearPreview: () => void;
  previewRole: AppRole | null;
}) => {
  const { isCollapsed, toggleSidebar } = useSidebar();

  return (
    <div className="relative flex min-h-screen w-full">
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
        <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b bg-background/80 px-4 backdrop-blur-md sm:px-6">
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
            <div className="hidden md:flex">
              <HeaderStatus />
            </div>
            <ThemeToggle />
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-2 sm:p-4">{children}</main>
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
        avatar_url: resolvedProfile.avatar_url ?? undefined,
      }
    : undefined;

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error("Error al cerrar sesión");
    } else {
      toast.success("Sesión cerrada");
      navigate("/auth", { replace: true });
    }
  };

  const isActive = (path: string) =>
    location.pathname === path || (path !== "/admin" && location.pathname.startsWith(path));

  return (
    <div className="relative min-h-screen bg-background">
      <div className="hidden border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:block">
        {previewRole && (
          <div className="border-b border-primary/30 bg-primary/10">
            <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-2 text-sm text-primary">
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
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div>
            <p className="text-sm text-muted-foreground">
              Hola, {resolvedProfile?.full_name ?? "Usuario"}
            </p>
            <h1 className="text-xl font-semibold capitalize">
              {previewRole ?? resolvedProfile?.role ?? "colaborador"}
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <HeaderStatus />
            <ThemeToggle />
            <Button variant="outline" size="sm" onClick={handleLogout} className="hidden md:inline-flex">
              Cerrar sesión
            </Button>
          </div>
        </div>
        <nav className="mx-auto flex max-w-5xl gap-2 px-6 pb-4">
          {navItems.map((item) => (
            <Button
              key={item.path}
              variant={isActive(item.path) ? "secondary" : "ghost"}
              className="gap-2"
              onClick={() => {
                if (!isActive(item.path)) navigate(item.path);
              }}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Button>
          ))}
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
        <div className="mx-2 mb-2 flex justify-end">
          <Button variant="outline" size="sm" onClick={handleLogout}>
            Cerrar sesión
          </Button>
        </div>
        <MobileNavigation currentUser={currentUser} navItems={navItems} />
      </div>

      <main className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 pb-24 pt-4 md:max-w-5xl md:pb-10 md:pt-6">
        {children}
      </main>

      <div className="mt-6 flex justify-center pb-6">
        <img src={logoPlaceholder} alt="Egea" className="h-10 opacity-80" />
      </div>

      <Button
        size="icon"
        className="fixed bottom-20 right-4 z-40 h-12 w-12 rounded-full md:hidden"
        onClick={() => toast.info("Acciones rápidas próximamente")}
      >
        <Plus className="h-5 w-5" />
      </Button>
    </div>
  );
};

export default Layout;
