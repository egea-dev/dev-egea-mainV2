import {
  LayoutDashboard,
  CalendarCheck,
  Database,
  Monitor,
  FileText,
  Users,
  Archive,
  MessageCircle,
  Settings,
  ShoppingCart,
  Factory,
  Package,
  Search,
  ClipboardList,
  Clock,
  UserCircle,
  TvMinimal,
  ShieldCheck,
  ScrollText,
  Activity,
  AlertTriangle,
  Truck,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type AppRole = "admin" | "manager" | "responsable" | "operario" | "produccion" | "envios" | "almacen" | "comercial";

export type AppNavItem = {
  type: "item";
  path: string;
  label: string;
  icon: LucideIcon;
};

export type AppNavGroup = {
  type: "group";
  label: string;
  icon: LucideIcon;
  items: AppNavItem[];
};

export type AppNavEntry = AppNavItem | AppNavGroup;

const procesosItems: AppNavItem[] = [
  { type: "item", path: "/admin/gestion", label: "Gestion", icon: ClipboardList },
  { type: "item", path: "/admin/users", label: "Usuarios", icon: Users },
  { type: "item", path: "/admin/data", label: "Gestionar datos", icon: Database },
  { type: "item", path: "/admin/screens", label: "Pantallas", icon: Monitor },
  { type: "item", path: "/admin/kiosk", label: "Pantallas Kiosko", icon: TvMinimal },
  { type: "item", path: "/admin/templates", label: "Plantillas", icon: FileText },
  { type: "item", path: "/admin/produccion", label: "Produccion", icon: Factory },
  { type: "item", path: "/admin/envios", label: "Envíos", icon: Package },
  { type: "item", path: "/admin/expediciones", label: "Expediciones", icon: Truck },
  { type: "item", path: "/admin/almacen", label: "Almacen", icon: Package },
  { type: "item", path: "/admin/incidencias", label: "Incidencias", icon: AlertTriangle },
];

const actividadItems: AppNavItem[] = [
  { type: "item", path: "/admin/archive", label: "Historial", icon: Archive },
  { type: "item", path: "/admin/system-log", label: "Log total del sistema", icon: ScrollText },
];

const sistemasItems: AppNavItem[] = [
  // { type: "item", path: "/admin/communications", label: "Comunicaciones", icon: MessageCircle }, // DESHABILITADO - En desarrollo
  { type: "item", path: "/admin/settings", label: "Configuracion", icon: Settings },
  { type: "item", path: "/admin/permissions-matrix", label: "Matriz Permisos", icon: ShieldCheck },
  { type: "item", path: "/admin/sla-config", label: "Configuracion SLA", icon: ShieldCheck },
];


const mainNav: AppNavEntry[] = [
  { type: "item", path: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { type: "item", path: "/admin/installations", label: "Instalaciones", icon: CalendarCheck },
  { type: "item", path: "/admin/calendario-global", label: "Calendario Global", icon: CalendarCheck },
  { type: "item", path: "/admin/comercial", label: "Comercial", icon: ShoppingCart },
  { type: "group", label: "Procesos", icon: Search, items: procesosItems },
  { type: "group", label: "Actividad", icon: Activity, items: actividadItems },
  { type: "group", label: "Sistema", icon: Settings, items: sistemasItems },
];

/**
 * Obtiene los items de navegación filtrados según el rol del usuario
 * Implementa jerarquía: admin > manager > responsable > operario
 */
export const getNavItemsForRole = (role: string | null | undefined): AppNavEntry[] => {
  const normalizedRole = role?.toLowerCase() || 'operario';

  switch (normalizedRole) {
    case 'admin':
      // Admins tienen acceso completo a toda la navegación
      return mainNav;

    case 'manager':
      // Managers tienen acceso casi completo, excepto algunas configuraciones críticas
      return mainNav.map(entry => {
        if (entry.type === 'group' && entry.label === 'Sistema') {
          // Filtrar items específicos del grupo Sistema
          return {
            ...entry,
            items: entry.items.filter(item => {
              // Managers no tienen acceso a System Log
              return item.path !== '/admin/system-log';
            })
          };
        }
        return entry;
      });

    case 'responsable':
      // Responsables tienen acceso limitado a operaciones diarias
      return mainNav.filter(entry => {
        if (entry.type === 'item') {
          // Permitir: Dashboard, Instalaciones, Calendario Global, Comercial
          const allowedPaths = [
            '/admin',
            '/admin/installations',
            '/admin/calendario-global',
            '/admin/comercial'
          ];
          return allowedPaths.includes(entry.path);
        }

        if (entry.type === 'group') {
          // Permitir grupo Procesos (con filtros)
          if (entry.label === 'Procesos') {
            return {
              ...entry,
              items: entry.items.filter(item => {
                // Responsables pueden ver: Gestión, Pantallas, Producción, Usuarios
                const allowedProcesos = [
                  '/admin/gestion',
                  '/admin/screens',
                  '/admin/produccion',
                  '/admin/kiosk',
                  '/admin/users'
                ];
                return allowedProcesos.includes(item.path);
              })
            };
          }

          // Permitir grupo Actividad (solo Historial)
          if (entry.label === 'Actividad') {
            return {
              ...entry,
              items: entry.items.filter(item => item.path === '/admin/archive')
            };
          }

          // Permitir grupo Sistema (vacio para responsables ya que usuarios se movio)
          if (entry.label === 'Sistema') {
            return {
              ...entry,
              items: entry.items.filter(item => {
                const allowedSistema: string[] = [];
                return allowedSistema.includes(item.path);
              })
            };
          }
        }

        return false;
      }).filter(entry => {
        // Eliminar grupos vacíos
        if (entry.type === 'group') {
          return entry.items.length > 0;
        }
        return true;
      });

    case 'operario':
      // Operarios tienen acceso a su jornada personal y perfil
      return [
        { type: "item", path: "/user/workday", label: "Mi Jornada", icon: Clock },
        { type: "item", path: "/user/profile", label: "Perfil", icon: UserCircle },
      ];


    case 'produccion':
      // Producción solo accede a su módulo
      return [

        { type: "item", path: "/admin/produccion", label: "Produccion", icon: Factory },
      ];

    case 'envios':
      // Envíos accede a su módulo y Expediciones
      return [
        { type: "item", path: "/admin/envios", label: "Envíos", icon: Package },
        { type: "item", path: "/admin/expediciones", label: "Expediciones", icon: Truck },
      ];

    case 'almacen':
      return [
        { type: "item", path: "/admin/almacen", label: "Almacen", icon: Package },
        { type: "item", path: "/admin/comercial", label: "Comercial", icon: ShoppingCart },
      ];

    case 'comercial':
      // Comercial solo accede a su módulo
      return [
        { type: "item", path: "/admin/comercial", label: "Comercial", icon: ShoppingCart },
      ];

    default:
      // Rol no reconocido, sin acceso
      return [];
  }
};

export const flattenNavItems = (entries: AppNavEntry[]): AppNavItem[] =>
  entries.flatMap((entry) => (entry.type === "group" ? entry.items : entry));

export const getPrimaryNavItems = (role: string | null | undefined): AppNavItem[] => {
  const nav = getNavItemsForRole(role);
  return flattenNavItems(nav).slice(0, 5);
};
