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
import { useEffect } from "react";
import { LogOut } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useProfile } from "@/hooks/use-supabase";
import { navItems } from "@/config/nav-items";
import { Skeleton } from "@/components/ui/skeleton";

export const SidebarContentComponent = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isCollapsed } = useSidebar();
  const { data: profile, isLoading, isError } = useProfile();
  const appVersion = import.meta.env.VITE_APP_VERSION;

  useEffect(() => {
    if (isError) {
      toast.error("Error al cargar el perfil de usuario");
    }
  }, [isError]);

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
        <div className="w-full px-3 py-2 text-center">
          <p className="text-xs text-muted-foreground">Versión {appVersion}</p>
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
