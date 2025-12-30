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
  TvMinimal,
  ShieldCheck,
  ScrollText,
  Activity,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type AppRole = "admin" | "manager" | "responsable" | "operario";

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

const consultasItems: AppNavItem[] = [
  { type: "item", path: "/admin/gestion", label: "Gestion", icon: ClipboardList },
  { type: "item", path: "/admin/data", label: "Gestionar datos", icon: Database },
  { type: "item", path: "/admin/screens", label: "Pantallas", icon: Monitor },
  { type: "item", path: "/admin/kiosk", label: "Pantallas Kiosko", icon: TvMinimal },
  { type: "item", path: "/admin/templates", label: "Plantillas", icon: FileText },
  { type: "item", path: "/admin/production", label: "Produccion", icon: Factory },
  { type: "item", path: "/admin/envios", label: "Envios", icon: Package },
  { type: "item", path: "/admin/warehouse", label: "Inventario", icon: Package },
];

const actividadItems: AppNavItem[] = [
  { type: "item", path: "/admin/archive", label: "Historial", icon: Archive },
  { type: "item", path: "/admin/system-log", label: "Log total del sistema", icon: ScrollText },
];

const sistemasItems: AppNavItem[] = [
  { type: "item", path: "/admin/communications", label: "Comunicaciones", icon: MessageCircle },
  { type: "item", path: "/admin/settings", label: "Configuracion", icon: Settings },
  { type: "item", path: "/admin/sla-config", label: "Configuracion SLA", icon: ShieldCheck },
  { type: "item", path: "/admin/users", label: "Usuarios", icon: Users },
];

const mainNav: AppNavEntry[] = [
  { type: "item", path: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { type: "item", path: "/admin/installations", label: "Instalaciones", icon: CalendarCheck },
  { type: "item", path: "/admin/calendario-global", label: "Calendario Global", icon: CalendarCheck },
  { type: "item", path: "/admin/comercial", label: "Comercial", icon: ShoppingCart },
  { type: "group", label: "Consultas", icon: Search, items: consultasItems },
  { type: "group", label: "Actividad", icon: Activity, items: actividadItems },
  { type: "group", label: "Sistema", icon: Settings, items: sistemasItems },
];

export const getNavItemsForRole = (_role: string | null | undefined): AppNavEntry[] => {
  return mainNav;
};

export const flattenNavItems = (entries: AppNavEntry[]): AppNavItem[] =>
  entries.flatMap((entry) => (entry.type === "group" ? entry.items : entry));

export const getPrimaryNavItems = (role: string | null | undefined): AppNavItem[] => {
  const nav = getNavItemsForRole(role);
  return flattenNavItems(nav).slice(0, 5);
};
