import { LayoutDashboard, CalendarCheck, Database, Monitor, FileText, Users, Archive } from "lucide-react";

export const navItems = [
  { path: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { path: "/admin/installations", label: "Instalaciones", icon: CalendarCheck },
  { path: "/admin/data", label: "Gestionar Datos", icon: Database },
  { path: "/admin/screens", label: "Pantallas", icon: Monitor },
  { path: "/admin/templates", label: "Plantillas", icon: FileText },
  { path: "/admin/users", label: "Usuarios", icon: Users },
  { path: "/admin/archive", label: "Historial", icon: Archive },
];
