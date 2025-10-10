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
import {
  LayoutDashboard,
  CalendarCheck,
  Database,
  Monitor,
  FileText,
  Users,
  LogOut,
  Settings,
  PanelLeft,
  Heart,
  Archive,
} from "lucide-react";
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

const navItems = [
  { path: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { path: "/admin/installations", label: "Instalaciones", icon: CalendarCheck },
  { path: "/admin/data", label: "Gestionar Datos", icon: Database },
  { path: "/admin/screens", label: "Pantallas", icon: Monitor },
  { path: "/admin/templates", label: "Plantillas", icon: FileText },
  { path: "/admin/users", label: "Usuarios", icon: Users },
  { path: "/admin/archive", label: "Historial", icon: Archive },
];

const SidebarContentComponent = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isCollapsed } = useSidebar();
  const { data: profile } = useProfile();
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
    return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
  }

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
               </div>
          </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          {navItems.map((item) => (
            <SidebarMenuItem key={item.path}>
              <SidebarMenuButton
                asChild
                isActive={location.pathname === item.path || (item.path !== "/admin" && location.pathname.startsWith(item.path))}
                tooltip={item.label}
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

const MainLayout = ({ children }: { children: React.ReactNode }) => {
  const { isCollapsed, toggleSidebar } = useSidebar();

  return (
    <div className="relative flex min-h-screen w-full">
      <Sidebar>
        <SidebarContentComponent />
      </Sidebar>
      <div className={cn("flex-1 flex flex-col transition-all duration-300", isCollapsed ? "md:ml-14" : "md:ml-64")}>
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
                    <SidebarContentComponent />
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
        <main className="flex-1 overflow-y-auto p-2 sm:p-4">
          {children}
        </main>
      </div>
    </div>
  );
};

export const Layout = ({ children }: { children: React.ReactNode }) => {
  return (
    <SidebarProvider>
      <MainLayout>{children}</MainLayout>
    </SidebarProvider>
  );
};