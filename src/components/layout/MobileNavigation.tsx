import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Menu, 
  LayoutDashboard, 
  CalendarCheck, 
  Database, 
  Monitor, 
  FileText, 
  Users, 
  Archive,
  MessageCircle,
  Settings,
  LogOut,
  X
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useDirectMessages } from '@/hooks/use-direct-messages';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface MobileNavigationProps {
  currentUser?: {
    full_name: string;
    role: string;
    avatar_url?: string;
  } | null;
}

export const MobileNavigation = ({ currentUser }: MobileNavigationProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { unreadCount } = useDirectMessages();

  const navItems = [
    { path: '/admin', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/admin/installations', label: 'Instalaciones', icon: CalendarCheck },
    { path: '/admin/data', label: 'Gestionar Datos', icon: Database },
    { path: '/admin/screens', label: 'Pantallas', icon: Monitor },
    { path: '/admin/templates', label: 'Plantillas', icon: FileText },
    { path: '/admin/users', label: 'Usuarios', icon: Users },
    { path: '/admin/archive', label: 'Historial', icon: Archive },
  ];

  const handleNavigation = (path: string) => {
    navigate(path);
    setIsOpen(false);
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      navigate('/auth');
      toast.success('Sesión cerrada correctamente');
    } catch (error) {
      toast.error('Error al cerrar sesión');
    }
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="lg:hidden">
      {/* Header móvil */}
      <div className="flex items-center justify-between p-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center gap-3">
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="h-10 w-10">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-80 p-0">
              <SheetHeader className="p-6 border-b">
                <div className="flex items-center justify-between">
                  <SheetTitle className="text-lg font-semibold">Menú</SheetTitle>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsOpen(false)}
                    className="h-8 w-8"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </SheetHeader>

              {/* Perfil de usuario */}
              {currentUser && (
                <div className="p-6 border-b">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={currentUser.avatar_url || ''} />
                      <AvatarFallback>
                        {currentUser.full_name.split(' ').map(n => n[0]).join('').toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{currentUser.full_name}</p>
                      <Badge variant="secondary" className="text-xs capitalize">
                        {currentUser.role}
                      </Badge>
                    </div>
                  </div>
                </div>
              )}

              {/* Navegación principal */}
              <div className="flex-1 overflow-y-auto">
                <nav className="p-4 space-y-2">
                  {navItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <Button
                        key={item.path}
                        variant={isActive(item.path) ? "secondary" : "ghost"}
                        className="w-full justify-start h-12"
                        onClick={() => handleNavigation(item.path)}
                      >
                        <Icon className="h-5 w-5 mr-3" />
                        <span className="flex-1 text-left">{item.label}</span>
                      </Button>
                    );
                  })}
                </nav>

                {/* Comunicaciones */}
                <div className="p-4 border-t">
                  <Button
                    variant="ghost"
                    className="w-full justify-start h-12"
                    onClick={() => handleNavigation('/admin/communications')}
                  >
                    <MessageCircle className="h-5 w-5 mr-3" />
                    <span className="flex-1 text-left">Comunicaciones</span>
                    {unreadCount > 0 && (
                      <Badge variant="destructive" className="h-5 w-5 p-0 flex items-center justify-center text-xs">
                        {unreadCount}
                      </Badge>
                    )}
                  </Button>
                </div>

                {/* Configuración y logout */}
                <div className="p-4 border-t space-y-2">
                  <Button
                    variant="ghost"
                    className="w-full justify-start h-12"
                    onClick={() => handleNavigation('/admin/settings')}
                  >
                    <Settings className="h-5 w-5 mr-3" />
                    <span className="flex-1 text-left">Configuración</span>
                  </Button>
                  <Button
                    variant="ghost"
                    className="w-full justify-start h-12 text-destructive hover:text-destructive"
                    onClick={handleLogout}
                  >
                    <LogOut className="h-5 w-5 mr-3" />
                    <span className="flex-1 text-left">Cerrar sesión</span>
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
          
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-semibold">Egea MainControl</h1>
            {unreadCount > 0 && (
              <Badge variant="destructive" className="h-5 w-5 p-0 flex items-center justify-center text-xs">
                {unreadCount}
              </Badge>
            )}
          </div>
        </div>

        {/* Avatar y acciones rápidas */}
        {currentUser && (
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleNavigation('/admin/communications')}
              className="relative h-10 w-10"
            >
              <MessageCircle className="h-5 w-5" />
              {unreadCount > 0 && (
                <Badge 
                  variant="destructive" 
                  className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
                >
                  {unreadCount}
                </Badge>
              )}
            </Button>
            <Avatar className="h-10 w-10">
              <AvatarImage src={currentUser.avatar_url || ''} />
              <AvatarFallback className="text-sm">
                {currentUser.full_name.split(' ').map(n => n[0]).join('').toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </div>
        )}
      </div>

      {/* Bottom Navigation para móvil */}
      <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-t lg:hidden z-50">
        <div className="grid grid-cols-5 gap-1 p-2">
          {navItems.slice(0, 5).map((item) => {
            const Icon = item.icon;
            return (
              <Button
                key={item.path}
                variant={isActive(item.path) ? "secondary" : "ghost"}
                className="flex flex-col h-16 gap-1"
                onClick={() => handleNavigation(item.path)}
              >
                <Icon className="h-5 w-5" />
                <span className="text-xs">{item.label}</span>
              </Button>
            );
          })}
        </div>
      </div>

      {/* Espacio para el bottom navigation */}
      <div className="h-16 lg:hidden"></div>
    </div>
  );
};