import {
  LayoutDashboard,
  CalendarCheck,
  Database,
  Monitor,
  FileText,
  Users,
  Archive,
  MessageCircle,
  ClipboardList,
  UserCircle,
  Settings,
  ShoppingCart,
  Factory,
  Package,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export type AppRole = 'admin' | 'manager' | 'responsable' | 'operario';

export type AppNavItem = {
  path: string;
  label: string;
  icon: LucideIcon;
};

const adminNav: AppNavItem[] = [
  { path: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/admin/installations', label: 'Instalaciones', icon: CalendarCheck },
  { path: '/admin/comercial', label: 'Comercial', icon: ShoppingCart },
  { path: '/admin/data', label: 'Gestionar Datos', icon: Database },
  { path: '/admin/screens', label: 'Pantallas', icon: Monitor },
  { path: '/admin/templates', label: 'Plantillas', icon: FileText },
  { path: '/admin/users', label: 'Usuarios', icon: Users },
  { path: '/admin/communications', label: 'Comunicaciones', icon: MessageCircle },
  { path: '/admin/archive', label: 'Historial', icon: Archive },
  { path: '/admin/kiosk', label: 'Producción', icon: Factory },
  { path: '/admin/warehouse', label: 'Almacén', icon: Package },
];

const managerNav: AppNavItem[] = adminNav;

const responsibleNav: AppNavItem[] = [
  { path: '/admin/workday', label: 'Mi jornada', icon: ClipboardList },
  { path: '/admin/communications', label: 'Comunicaciones', icon: MessageCircle },
  { path: '/admin/screens', label: 'Pantallas', icon: Monitor },
  { path: '/admin/settings', label: 'Perfil', icon: UserCircle },
];

const operarioNav: AppNavItem[] = [
  { path: '/admin/workday', label: 'Mi jornada', icon: ClipboardList },
  { path: '/admin/communications', label: 'Mensajes', icon: MessageCircle },
  { path: '/admin/settings', label: 'Perfil', icon: UserCircle },
];

export const getNavItemsForRole = (role: string | null | undefined): AppNavItem[] => {
  switch (role) {
    case 'admin':
      return adminNav;
    case 'manager':
      return managerNav;
    case 'responsable':
      return responsibleNav;
    case 'operario':
    default:
      return operarioNav;
  }
};

export const getPrimaryNavItems = (role: string | null | undefined): AppNavItem[] => {
  const nav = getNavItemsForRole(role);
  return nav.slice(0, 5);
};
