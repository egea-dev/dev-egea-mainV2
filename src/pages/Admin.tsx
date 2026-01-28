import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CalendarCheck, Users, Car, ClipboardList, MoreHorizontal, Archive, Eye, Pencil, Filter, Clock, LogOut, User, AlertTriangle, CheckCircle, RotateCcw, AlarmClock, MapPin, Database, LayoutDashboard } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState, useCallback, useMemo } from "react";
import { subDays, format, parseISO, isSameDay, isBefore } from "date-fns";
import { es } from 'date-fns/locale';
import { toast } from "sonner";
import { TaskDetailsDialog } from "@/features/tasks/components/TaskDetailsDialog";
import type { TaskActionConfig } from "@/features/tasks/components/TaskActionButtons";
import { useNavigate } from "react-router-dom";
import { StatusBadge } from "@/components/shared/ui/StatusBadge";
import { VehicleBadge } from "@/features/fleet/components/VehicleBadge";
import { TaskStateBadge } from "@/features/tasks/components/TaskStateBadge";
import { useDashboardTasks, useDashboardStats } from "@/hooks/use-detailed-tasks";
import { useScreens, useVehicles, useUsers } from "@/hooks/use-supabase";
import { useIsMobile } from "@/hooks/use-mobile";
import type { DetailedTask } from "@/integrations/supabase/client";
import { TaskDialog } from "@/features/installations/components/TaskDialog";
import { Badge } from "@/components/ui/badge";
import { buildMapsSearchUrl } from "@/utils/maps";
import { normalizeTaskLocation } from "@/utils/task";
import type { Profile, Task, Vehicle } from "@/types";
import { getTaskStateColor } from "@/lib/constants";

const SCREEN_FIELD_MAP: Record<string, { site: string[]; description: string[] }> = {
  Instalaciones: {
    site: ['site', 'client', 'address', 'location'],
    description: ['description', 'notes', 'notas', 'detalle', 'observaciones']
  },
  'Tapicería': {
    site: ['obra_', 'n_orden', 'gestor', 'hoja'],
    description: ['trabajo', 'descripcion', 'descripción', 'prioridad', 'cantidad']
  },
  'Confección': {
    site: ['cliente', 'linea', 'línea', 'zona', 'obra'],
    description: ['trabajo', 'descripcion', 'descripción', 'detalle', 'observaciones']
  },
  'Carpintería': {
    site: ['obra', 'ubicacion', 'ubicación', 'cliente'],
    description: ['trabajo', 'descripcion', 'descripción', 'detalle']
  }
};

const DEFAULT_SITE_FIELDS = ['site', 'client', 'address', 'location', 'obra', 'obra_', 'ubicacion', 'ubicación'];
const DEFAULT_DESCRIPTION_FIELDS = ['description', 'descripcion', 'descripción', 'notes', 'notas', 'detalle', 'trabajo'];
const TEMPLATE_FIELD_KEYWORDS = {
  site: ['obra', 'site', 'ubicacion', 'ubicación', 'cliente', 'direccion', 'dirección', 'localizacion', 'localización', 'zona'],
  description: ['descripcion', 'descripción', 'detalle', 'observaciones', 'trabajo', 'resumen', 'nota'],
  order: ['orden', 'order', 'ot', 'pedido', 'ticket', 'numero', 'número', 'nº', 'n°'],
  obra: ['obra', 'proyecto', 'site', 'cliente', 'zona'],
  gestor: ['gestor', 'responsable', 'encargado', 'manager', 'coordinador', 'supervisor']
};
const ORDER_FIELD_FALLBACKS = [
  'n_orden',
  'numero_orden',
  'num_orden',
  'norden',
  'n°_orden',
  'nº_orden',
  'nro_orden',
  'nroorden',
  'orden_trabajo',
  'orden',
  'order'
];
const OBRA_FIELD_FALLBACKS = [
  'obra',
  'obra_',
  'nombre_obra',
  'cliente',
  'linea',
  'línea',
  'sector',
  'zona',
  'site',
  'ubicacion',
  'ubicación'
];
const GESTOR_FIELD_FALLBACKS = [
  'gestor',
  'gestión',
  'gestion',
  'manager',
  'encargado',
  'responsable',
  'coordinador'
];

const sanitizeString = (value: string | null | undefined) =>
  (value ?? '')
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

const mapDetailedTaskToTask = (task: DetailedTask): Task => {
  const numericOrder =
    typeof task.order === "number"
      ? task.order
      : Number.isFinite(Number(task.order))
        ? Number(task.order)
        : 0;

  const normalizedState = (() => {
    const allowed: Task["state"][] = ["urgente", "pendiente", "a la espera", "en fabricacion", "terminado"];
    const candidate = typeof task.state === "string" ? task.state.toLowerCase() : null;
    return candidate && (allowed as string[]).includes(candidate) ? (candidate as Task["state"]) : "pendiente";
  })();

  const normalizedStatus = (() => {
    const allowed: Task["status"][] = ["pendiente", "acabado", "en progreso"];
    const raw = typeof task.status === "string" ? task.status.toLowerCase() : null;
    if (raw && (allowed as string[]).includes(raw)) {
      return raw as Task["status"];
    }
    if (raw === "terminado" || raw === "completado") return "acabado";
    if (raw === "progreso" || raw === "en_progreso") return "en progreso";
    return "pendiente";
  })();

  const pickString = (value: unknown): string | undefined => {
    if (typeof value !== "string") return undefined;
    const trimmed = value.trim();
    return trimmed.length ? trimmed : undefined;
  };

  const pickMeaningfulString = (value: unknown): string | undefined => {
    const text = pickString(value);
    if (!text) return undefined;
    const lowered = text.toLowerCase();
    return lowered === "n/a" ? undefined : text;
  };

  const parseNumberValue = (value: unknown): number | null => {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string") {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
  };

  const normalizeProfileRole = (value: unknown, fallback: Profile["role"] = "operario"): Profile["role"] => {
    const roleText = pickString(value)?.toLowerCase();
    if (!roleText) return fallback;
    if (roleText.includes("admin")) return "admin";
    if (roleText.includes("manager") || roleText.includes("gestor")) return "manager";
    if (roleText.includes("respons")) return "responsable";
    return fallback;
  };

  const normalizeProfileStatus = (value: unknown): Profile["status"] | undefined => {
    const statusText = pickString(value)?.toLowerCase();
    if (!statusText) return undefined;
    if (statusText.includes("vac")) return "vacaciones";
    if (statusText.includes("baja")) return "baja";
    if (statusText.includes("activo")) return "activo";
    return undefined;
  };

  const dataRecord = (task.data ?? {}) as Record<string, unknown>;
  const taskRecord = task as unknown as Record<string, unknown>;

  const resolveField = (candidates: string[], direct?: string | null): string | undefined => {
    const directValue = pickMeaningfulString(direct);
    if (directValue) return directValue;

    for (const candidate of candidates) {
      const normalized = candidate.trim();
      const variants = Array.from(
        new Set([
          normalized,
          normalized.toLowerCase(),
          normalized.toUpperCase(),
          normalized.replace(/\s+/g, "_"),
          normalized.replace(/\s+/g, "").toLowerCase(),
        ])
      );

      for (const key of variants) {
        const fromTask = pickMeaningfulString(taskRecord[key]);
        if (fromTask) return fromTask;

        const fromData = pickMeaningfulString(dataRecord[key]);
        if (fromData) return fromData;
      }
    }

    return undefined;
  };

  const parseAssignedProfiles = (value: unknown): Profile[] => {
    if (!Array.isArray(value)) return [];
    return value
      .map((item) => {
        if (!item || typeof item !== "object") return null;
        const record = item as Record<string, unknown>;
        const id = pickString(record.id);
        const fullName = pickString(record.full_name);
        if (!id || !fullName) return null;
        return {
          id,
          full_name: fullName,
          email: pickString(record.email) ?? null,
          phone: pickString(record.phone) ?? null,
          whatsapp: pickString(record.whatsapp) ?? null,
          role: normalizeProfileRole(record.role),
          status: normalizeProfileStatus(record.status),
        } as Profile;
      })
      .filter((profile): profile is Profile => profile !== null);
  };

  const parseAssignedVehicles = (value: unknown): Vehicle[] => {
    if (!Array.isArray(value)) return [];
    return value
      .map((item) => {
        if (!item || typeof item !== "object") return null;
        const record = item as Record<string, unknown>;
        const id = pickString(record.id);
        const name = pickString(record.name);
        if (!id || !name) return null;
        return {
          id,
          name,
          type: pickString(record.type) ?? "otro",
          license_plate: pickString(record.license_plate) ?? null,
        } as Vehicle;
      })
      .filter((vehicle): vehicle is Vehicle => vehicle !== null);
  };

  const assignedUsers = parseAssignedProfiles(task.assigned_profiles);
  const assignedVehicles = parseAssignedVehicles(task.assigned_vehicles);

  const responsible: Profile | null =
    task.responsible_profile_id && typeof task.responsible_name === "string"
      ? {
        id: task.responsible_profile_id,
        full_name: task.responsible_name,
        email: pickString(task.responsible_email) ?? null,
        phone: pickString(task.responsible_phone) ?? null,
        whatsapp: null,
        role: normalizeProfileRole(task.responsible_role, "responsable"),
        status: normalizeProfileStatus(task.responsible_status) ?? "activo",
      }
      : null;

  const resolvedSite = resolveField(DEFAULT_SITE_FIELDS, pickString(task.site));
  const resolvedDescription = resolveField(DEFAULT_DESCRIPTION_FIELDS, pickString(task.description));
  const workSiteId = pickString(task.work_site_id);
  const workSiteName = pickMeaningfulString(task.work_site_name);
  const workSiteAlias = pickMeaningfulString(task.work_site_alias);
  const workSiteAddress = pickMeaningfulString(task.work_site_address);
  const workSiteCity = pickMeaningfulString(task.work_site_city);
  const workSiteProvince = pickMeaningfulString(task.work_site_province);
  const workSitePostalCode = pickMeaningfulString(task.work_site_postal_code);
  const workSiteLatitude = parseNumberValue(task.work_site_latitude);
  const workSiteLongitude = parseNumberValue(task.work_site_longitude);
  const workSiteMapsUrl = pickMeaningfulString(task.work_site_maps_url);
  const workSiteImagotipo = typeof task.work_site_imagotipo_enabled === "boolean"
    ? task.work_site_imagotipo_enabled
    : null;

  return {
    id: task.id,
    created_at: task.created_at ?? new Date().toISOString(),
    start_date: task.start_date ?? task.created_at ?? new Date().toISOString(),
    end_date: task.end_date ?? task.start_date ?? task.created_at ?? new Date().toISOString(),
    order: numericOrder,
    state: normalizedState,
    status: normalizedStatus,
    location: task.location ?? null,
    work_site_id: workSiteId ?? null,
    work_site_name: workSiteName ?? null,
    work_site_alias: workSiteAlias ?? null,
    work_site_address: workSiteAddress ?? null,
    work_site_city: workSiteCity ?? null,
    work_site_province: workSiteProvince ?? null,
    work_site_postal_code: workSitePostalCode ?? null,
    work_site_latitude: workSiteLatitude,
    work_site_longitude: workSiteLongitude,
    work_site_maps_url: workSiteMapsUrl ?? null,
    work_site_imagotipo_enabled: workSiteImagotipo,
    data: (task.data ?? {}) as Task["data"],
    responsible_profile_id: task.responsible_profile_id ?? null,
    site: resolvedSite,
    description: resolvedDescription,
    responsible,
    assigned_users: assignedUsers,
    assigned_vehicles: assignedVehicles,
    task_profiles: [],
    task_vehicles: [],
  } as Task;
};


const extractFieldValue = (task: DetailedTask, candidates: string[]) => {
  const data = (task.data ?? {}) as Record<string, unknown>;
  const taskRecord = task as unknown as Record<string, unknown>;
  for (const candidate of candidates) {
    const normalized = candidate.trim();
    const variants = Array.from(new Set([
      normalized,
      normalized.toLowerCase(),
      normalized.toUpperCase(),
      normalized.replace(/\s+/g, '_'),
      normalized.replace(/\s+/g, '').toLowerCase()
    ]));

    for (const key of variants) {
      const valueFromTask = taskRecord[key];
      if (valueFromTask !== undefined && valueFromTask !== null && String(valueFromTask).trim() !== '') {
        return String(valueFromTask).trim();
      }

      const valueFromData = data?.[key];
      if (valueFromData !== undefined && valueFromData !== null && String(valueFromData).trim() !== '') {
        return String(valueFromData).trim();
      }
    }
  }
  return undefined;
};

// Tipos para compatibilidad
interface SimpleProfile {
  id: string;
  full_name: string;
  email?: string;
  status: string;
  role?: string;
  avatar_url?: string;
}

interface SimpleVehicle {
  id: string;
  name: string;
  type: string;
}

type DashboardAssignedProfile = {
  id: string;
  full_name: string;
  email: string | null;
  role: string | null;
  status: string | null;
};

type DashboardAssignedVehicle = {
  id: string;
  name: string;
  type: string | null;
};

const normalizeAssignedProfiles = (value: unknown): DashboardAssignedProfile[] => {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const record = item as Record<string, unknown>;
      const id = typeof record.id === 'string' ? record.id : null;
      const fullName = typeof record.full_name === 'string' ? record.full_name : null;
      if (!id || !fullName) return null;
      return {
        id,
        full_name: fullName,
        email: typeof record.email === 'string' ? record.email : null,
        role: typeof record.role === 'string' ? record.role : null,
        status: typeof record.status === 'string' ? record.status : null,
      };
    })
    .filter((profile): profile is DashboardAssignedProfile =>
      profile !== null &&
      typeof profile.id === 'string' &&
      typeof profile.full_name === 'string'
    );
};

const normalizeAssignedVehicles = (value: unknown): DashboardAssignedVehicle[] => {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const record = item as Record<string, unknown>;
      const id = typeof record.id === 'string' ? record.id : null;
      const name = typeof record.name === 'string' ? record.name : null;
      const type = typeof record.type === 'string' ? record.type : null;
      if (!id || !name) return null;
      return {
        id,
        name,
        type: type || null
      };
    })
    .filter((vehicle): vehicle is DashboardAssignedVehicle =>
      vehicle !== null &&
      typeof vehicle.id === 'string' &&
      typeof vehicle.name === 'string'
    );
};

import { CalendarModule } from "@/components/dashboard/CalendarModule";

export default function AdminPage() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [calendarTaskDays, setCalendarTaskDays] = useState<Date[]>([]);
  const [calendarPendingDays, setCalendarPendingDays] = useState<Date[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedTask, setSelectedTask] = useState<DetailedTask | null>(null);

  // Usar hooks personalizados para datos del dashboard
  const { confeccionTasks, tapiceriaTasks, pendingTasks, loading: tasksLoading, templateFieldsByScreen, sessionInfoByTask, refresh: refreshDashboardTasks } = useDashboardTasks();
  const { stats, loading: statsLoading } = useDashboardStats();

  const { data: screens = [] } = useScreens();
  const { data: vehicles = [] } = useVehicles();
  const { data: users = [] } = useUsers();
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isRegisteringArrival, setIsRegisteringArrival] = useState(false);
  const [taskFilter, setTaskFilter] = useState<'all' | 'instalaciones' | 'confeccion' | 'tapiceria'>('instalaciones');
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());
  const [currentUser, setCurrentUser] = useState<SimpleProfile | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Combina todas las tareas para el calendario
  const rawAllTasks = useMemo(() => {
    return [...confeccionTasks, ...tapiceriaTasks, ...pendingTasks];
  }, [confeccionTasks, tapiceriaTasks, pendingTasks]);


  const refreshCalendarData = useCallback(async () => {
    try {
      const sixtyDaysAgo = subDays(new Date(), 60);
      const startDateFilter = format(sixtyDaysAgo, "yyyy-MM-dd");

      const { data, error } = await supabase
        .from("detailed_tasks")
        .select("start_date, state")
        .gte("start_date", startDateFilter);

      if (error) {
        console.error("Error fetching calendar data:", error);
        return;
      }

      const taskDays = new Set<string>();
      const pendingDays = new Set<string>();

      (data as any[] ?? []).forEach((task: any) => {
        if (!task?.start_date) return;
        const taskDate = parseISO(task.start_date);
        if (Number.isNaN(taskDate.getTime())) return;

        const dateKey = format(taskDate, "yyyy-MM-dd");
        taskDays.add(dateKey);

        if (task.state !== "terminado") {
          pendingDays.add(dateKey);
        }
      });

      setCalendarTaskDays(Array.from(taskDays).map((dateStr) => parseISO(dateStr)));
      setCalendarPendingDays(Array.from(pendingDays).map((dateStr) => parseISO(dateStr)));
    } catch (error) {
      console.error("Error fetching calendar data:", error);
    }
  }, []);

  // Actualizar el reloj cada segundo
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Obtener información del usuario actual
  useEffect(() => {
    const getCurrentUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('auth_user_id', user.id)
            .single();
          setCurrentUser(profile);
        }
      } catch (error) {
        console.error('Error fetching user profile:', error);
      }
    };
    getCurrentUser();
  }, []);

  // Función para cerrar sesión
  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/auth');
  };

  const refreshAllData = useCallback(() => {
    refreshDashboardTasks();
    refreshCalendarData();
  }, [refreshDashboardTasks, refreshCalendarData]);

  const buildTemplateCandidates = useCallback((task: DetailedTask, keywords: string[]) => {
    const screenId = task.screen_id;
    if (!screenId) return [];
    const templateFields = templateFieldsByScreen[screenId] ?? [];
    if (templateFields.length === 0) return [];

    const sanitizedKeywords = keywords.map(sanitizeString).filter(Boolean);
    const matches: string[] = [];

    templateFields.forEach((field) => {
      const fieldName = typeof field?.name === 'string' ? field.name : '';
      if (!fieldName) return;
      const fieldLabel = typeof field?.label === 'string' ? field.label : '';
      const normalizedName = sanitizeString(fieldName);
      const normalizedLabel = sanitizeString(fieldLabel);

      const hasMatch = sanitizedKeywords.some((keyword) =>
        normalizedName.includes(keyword) || normalizedLabel.includes(keyword)
      );

      if (hasMatch) {
        matches.push(fieldName);
      }
    });

    return matches;
  }, [templateFieldsByScreen]);

  const getCandidateFields = useCallback((task: DetailedTask, type: 'site' | 'description') => {
    const mapping = SCREEN_FIELD_MAP[task.screen_group ?? ''];
    const defaults = type === 'site' ? DEFAULT_SITE_FIELDS : DEFAULT_DESCRIPTION_FIELDS;
    const groupFields = mapping ? mapping[type] : [];
    const templateKeywords = type === 'site'
      ? TEMPLATE_FIELD_KEYWORDS.site
      : TEMPLATE_FIELD_KEYWORDS.description;
    const templateCandidates = buildTemplateCandidates(task, templateKeywords);
    return Array.from(new Set([...templateCandidates, ...groupFields, ...defaults]));
  }, [buildTemplateCandidates]);

  const getTaskDateLabel = useCallback((task: DetailedTask) => {
    if (!task.start_date) {
      return 'Sin fecha';
    }
    const parsed = parseISO(task.start_date);
    if (Number.isNaN(parsed.getTime())) {
      return 'Sin fecha';
    }
    return format(parsed, 'dd/MM/yyyy', { locale: es });
  }, []);

  const getTaskSiteLabel = useCallback((task: DetailedTask) => {
    const normalized = normalizeTaskLocation(mapDetailedTaskToTask(task));
    if (normalized) return normalized;
    const candidates = getCandidateFields(task, 'site');
    const value = extractFieldValue(task, candidates);
    return value || 'Sin sitio definido';
  }, [getCandidateFields]);

  const getOrderNumberLabel = useCallback((task: DetailedTask) => {
    const candidates = [
      ...buildTemplateCandidates(task, TEMPLATE_FIELD_KEYWORDS.order),
      ...ORDER_FIELD_FALLBACKS,
    ];
    const value = extractFieldValue(task, candidates);
    if (value) {
      return value;
    }
    if (typeof task.order === 'number') {
      return String(task.order);
    }
    return 'Sin número';
  }, [buildTemplateCandidates]);

  const getConfeccionObraLabel = useCallback((task: DetailedTask) => {
    const candidates = [
      ...buildTemplateCandidates(task, TEMPLATE_FIELD_KEYWORDS.obra),
      ...OBRA_FIELD_FALLBACKS,
    ];
    const value = extractFieldValue(task, candidates);
    if (value) {
      return value;
    }
    return getTaskSiteLabel(task);
  }, [buildTemplateCandidates, getTaskSiteLabel]);

  const getTapiceriaGestorLabel = useCallback((task: DetailedTask) => {
    const candidates = [
      ...buildTemplateCandidates(task, TEMPLATE_FIELD_KEYWORDS.gestor),
      ...GESTOR_FIELD_FALLBACKS,
    ];
    const value = extractFieldValue(task, candidates);
    if (value) {
      return value;
    }
    return task.responsible_name || 'Sin gestor';
  }, [buildTemplateCandidates]);

  const getStateBadgeClasses = useCallback(
    (state: string | null) => getTaskStateColor(state),
    []
  );

  const getTaskDescriptionLabel = useCallback((task: DetailedTask) => {
    const candidates = getCandidateFields(task, 'description');
    const value = extractFieldValue(task, candidates);
    return value || 'Sin descripción';
  }, [getCandidateFields]);

  const formatSessionTimestamp = useCallback((value?: string | null) => {
    if (!value) return null;
    try {
      return format(parseISO(value), "dd/MM HH:mm");
    } catch (error) {
      console.warn('Invalid session timestamp', error);
      return null;
    }
  }, []);

  const archiveTask = useCallback(async (taskId: string, options?: { skipRefresh?: boolean }) => {
    try {
      const { data, error } = await (supabase.rpc as any)('archive_task_by_id', {
        p_task_id: taskId
      });

      if (error) {
        throw error;
      }

      const result = Array.isArray(data) ? data[0] : data;
      if (!result?.archived) {
        toast.error(result?.message || 'No se pudo archivar la tarea');
      } else {
        toast.success(result?.message || 'Tarea archivada correctamente');
      }

      if (!options?.skipRefresh) {
        refreshAllData();
      }
    } catch (err) {
      console.error('Error archiving task:', err);
      toast.error('Error al archivar la tarea');
    }
  }, [refreshAllData]);

  const updateTaskState = useCallback(async (taskId: string, newState: 'pendiente' | 'urgente' | 'terminado') => {
    try {
      const updates: { state: string; status?: string } = { state: newState };
      if (newState === 'terminado') {
        updates.status = 'acabado';
      }

      const { error } = await (supabase.from('screen_data') as any)
        .update(updates)
        .eq('id', taskId);

      if (error) {
        throw error;
      }

      if (newState === 'terminado') {
        toast.success('Tarea marcada como terminada. Recuerda archivarla tras la validación.');
      } else if (newState === 'urgente') {
        toast.success('Tarea marcada como urgente');
      } else {
        toast.success('Tarea marcada como pendiente');
      }

      refreshAllData();
    } catch (err) {
      console.error('Error updating task state:', err);
      toast.error('No se pudo actualizar el estado de la tarea');
    }
  }, [refreshAllData]);

  useEffect(() => {
    refreshCalendarData();
  }, [refreshCalendarData]);

  useEffect(() => {
    const channel = supabase
      .channel("dashboard-calendar")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "screen_data" },
        () => {
          refreshCalendarData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refreshCalendarData]);

  const handleArchiveTask = async (taskId: string) => {
    await archiveTask(taskId);
  };

  const handleViewDetails = (task: DetailedTask) => {
    setSelectedTask({ ...task });
    setDetailsDialogOpen(true);
  };

  const handleOpenTaskLocation = useCallback((task: DetailedTask) => {
    const mapped = mapDetailedTaskToTask(task);
    const locationLabel = normalizeTaskLocation(mapped);
    if (!locationLabel) {
      toast.error('Esta tarea no tiene una ubicación registrada');
      return;
    }
    const url = buildMapsSearchUrl(locationLabel);
    if (typeof window !== 'undefined') {
      window.open(url, '_blank', 'noopener');
    }
  }, []);

  const handleRegisterArrival = useCallback(
    async (task: DetailedTask) => {
      if (!currentUser?.id) {
        toast.error('Necesitas una sesión activa para registrar la llegada');
        return;
      }
      setIsRegisteringArrival(true);
      try {
        const mapped = mapDetailedTaskToTask(task);
        const fallback = normalizeTaskLocation(mapped);
        const locationPayload = fallback
        const { data, error } = await (supabase.rpc as any)('register_arrival', {
          p_profile_id: currentUser.id,
          p_task_id: task.id,
          p_start_location: {
            label: normalizeTaskLocation(mapDetailedTaskToTask(task)),
            source: 'admin_dashboard',
            collected_at: new Date().toISOString()
          } as any,
          p_metadata: { source: 'admin' } as any
        });

        if (error) throw error;
        toast.success('Llegada registrada correctamente');
        refreshDashboardTasks();
      } catch (error) {
        console.error('Error registrando llegada desde Admin', error);
        toast.error('No se pudo registrar la llegada');
      } finally {
        setIsRegisteringArrival(false);
      }
    },
    [currentUser?.id, refreshDashboardTasks]
  );

  const handleEditTask = (taskId: string) => {
    // Find task in any list (using sortedTasks which is our source of truth)
    const candidate = sortedTasks.find(t => t.id === taskId);
    if (candidate) {
      const task = mapDetailedTaskToTask(candidate);
      setEditingTask(task);
      setTaskDialogOpen(true);
    }
  };

  // Tareas filtradas y ordenadas para el calendario lateral
  // Se define después para asegurar que sortedTasks ya existe

  // Filtrar tareas según la categoría seleccionada
  const filteredTasks = useMemo(() => {
    if (!pendingTasks) return [];

    return pendingTasks.filter(task => {
      // 1. Check Category
      let categoryMatch = false;
      if (taskFilter === 'all') categoryMatch = true;
      else {
        const rawGroup = task.screen_group || '';
        const group = sanitizeString(rawGroup);
        const filter = sanitizeString(taskFilter);

        if (filter.includes('instalacion')) categoryMatch = group.includes('instalacion');
        else if (filter.includes('confeccion')) categoryMatch = group.includes('confeccion');
        else if (filter.includes('tapiceria')) categoryMatch = group.includes('tapiceria');
        else categoryMatch = group.includes(filter);
      }

      // IMPORTANTE: Las tareas pendientes NO se filtran por fecha
      // Se muestran TODAS las tareas no archivadas, independientemente de su fecha
      // El administrador/manager debe archivarlas manualmente cuando ya no sean relevantes

      return categoryMatch;
    });
  }, [pendingTasks, taskFilter]);

  const sortedTasks = useMemo(() => {
    return filteredTasks
      .map((task, index) => ({ task, index }))
      .sort((a, b) => {
        const aTerminated = (a.task.state ?? '').toLowerCase() === 'terminado';
        const bTerminated = (b.task.state ?? '').toLowerCase() === 'terminado';
        if (aTerminated === bTerminated) {
          return a.index - b.index;
        }
        return aTerminated ? 1 : -1; // Terminated at the bottom
      })
      .map((entry) => entry.task);
  }, [filteredTasks]);

  const dataShortcutScreens = useMemo(() => {
    return screens
      .filter((screen) => screen.dashboard_section === "data_shortcuts")
      .sort((a, b) => {
        const orderA = typeof a.dashboard_order === "number" ? a.dashboard_order : 0;
        const orderB = typeof b.dashboard_order === "number" ? b.dashboard_order : 0;
        return orderA - orderB;
      });
  }, [screens]);

  const handleOpenDataShortcut = useCallback(
    (screenId: string) => {
      navigate(`/admin/data?screen=${screenId}&from=dashboard`);
    },
    [navigate]
  );

  return (
    <div className="space-y-6">
      {/* Header Estándar Unificado */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
            <LayoutDashboard className="h-8 w-8 text-primary" />
            Panel de Control
          </h1>
          <p className="text-muted-foreground mt-1 text-sm font-medium">
            {format(currentTime, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })} · {format(currentTime, 'HH:mm:ss')}
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <div className="text-sm font-semibold text-foreground">{currentUser?.full_name || 'Usuario'}</div>
            <div className="text-xs text-muted-foreground capitalize font-bold">{currentUser?.role || 'Administrador'}</div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-10 w-10 rounded-full ring-2 ring-border/60 hover:ring-border/80">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={currentUser?.avatar_url} alt={currentUser?.full_name} />
                  <AvatarFallback className="bg-card text-foreground">
                    {currentUser?.full_name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56 bg-card border-border/60 text-foreground" align="end" forceMount>
              <DropdownMenuItem onClick={handleLogout} className="hover:bg-muted/60 focus:bg-muted/60 cursor-pointer">
                <LogOut className="mr-2 h-4 w-4" />
                <span>Cerrar sesión</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Responsive Dashboard Layout */}
      <div className="space-y-6">
        {/* Metrics Cards - Responsive Grid Estándar */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-card border-border/60 shadow-lg hover:border-primary/30 transition-all">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Tareas Totales</CardTitle>
              <CalendarCheck className="h-5 w-5 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                {statsLoading ? (
                  <div className="animate-pulse bg-muted/60 h-8 w-12 rounded"></div>
                ) : (
                  stats?.total_tasks || 0
                )}
              </div>
              <p className="text-xs text-muted-foreground/80 mt-1">Tareas en el sistema</p>
            </CardContent>
          </Card>

          <Card className="bg-card border-border/60 shadow-lg hover:border-primary/30 transition-all">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Usuarios Activos</CardTitle>
              <Users className="h-5 w-5 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                {statsLoading ? (
                  <div className="animate-pulse bg-muted/60 h-8 w-12 rounded"></div>
                ) : (
                  stats?.active_users || 0
                )}
              </div>
              <p className="text-xs text-muted-foreground/80 mt-1">Usuarios activos</p>
            </CardContent>
          </Card>

          <Card className="bg-card border-border/60 shadow-lg hover:border-primary/30 transition-all">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Vehículos</CardTitle>
              <Car className="h-5 w-5 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                {statsLoading ? (
                  <div className="animate-pulse bg-muted/60 h-8 w-12 rounded"></div>
                ) : (
                  stats?.active_vehicles || 0
                )}
              </div>
              <p className="text-xs text-muted-foreground/80 mt-1">Vehículos registrados</p>
            </CardContent>
          </Card>

          <Card className="bg-card border-border/60 shadow-lg hover:border-primary/30 transition-all">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Pendientes</CardTitle>
              <ClipboardList className="h-5 w-5 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                {statsLoading ? (
                  <div className="animate-pulse bg-muted/60 h-8 w-12 rounded"></div>
                ) : (
                  stats?.pending_tasks || 0
                )}
              </div>
              <p className="text-xs text-muted-foreground/80 mt-1">Tareas pendientes</p>
            </CardContent>
          </Card>
        </div>

        {/* Calendar Module - Full Width */}
        <CalendarModule
          selectedDate={selectedDate}
          onDateSelect={setSelectedDate}
          isMobile={isMobile}
          mode="installations"
        />

        {/* Main Content - Row with 3 Columns */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Data Shortcuts Card */}
          <Card className="flex-1 bg-card border-border shadow-md">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2 text-foreground font-bold">
                <Database className="h-4 w-4 text-primary" />
                Accesos Gestión de Datos
              </CardTitle>
              <CardDescription className="text-muted-foreground font-medium">
                Configura estos accesos en "Gestión de Tablas de Datos".
              </CardDescription>
            </CardHeader>
            <CardContent>
              {dataShortcutScreens.length > 0 ? (
                <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1 custom-scrollbar">
                  {dataShortcutScreens.map((screen) => (
                    <Button
                      key={screen.id}
                      variant="outline"
                      className="w-full justify-between border-border bg-muted/30 hover:bg-muted/50 text-foreground"
                      onClick={() => handleOpenDataShortcut(screen.id)}
                    >
                      <span className="truncate text-left">{screen.name}</span>
                      {screen.screen_group ? (
                        <Badge variant="secondary" className="ml-2 whitespace-nowrap bg-card text-muted-foreground">
                          {screen.screen_group}
                        </Badge>
                      ) : null}
                    </Button>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Database className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Añade accesos desde Gestión de Tablas de Datos.</p>
                  <Button
                    variant="link"
                    className="mt-2 text-primary"
                    onClick={() => navigate("/admin/data")}
                  >
                    Abrir Gestión de Datos
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Confección Card */}
          <Card className="flex-1 bg-card border-border shadow-md">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2 text-foreground font-bold">
                <div className="w-3 h-3 bg-primary rounded-full shadow-lg shadow-primary/40"></div>
                Confección
              </CardTitle>
            </CardHeader>
            <CardContent>
              {tasksLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 2 }).map((_, i) => (
                    <div key={i} className="grid grid-cols-3 gap-4">
                      <div className="animate-pulse bg-muted/60 h-6 rounded" />
                      <div className="animate-pulse bg-muted/60 h-6 rounded" />
                      <div className="animate-pulse bg-muted/60 h-6 rounded" />
                    </div>
                  ))}
                </div>
              ) : confeccionTasks.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No hay tareas de confección
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="overflow-x-auto">
                    <Table className="min-w-full">
                      <TableHeader>
                        <TableRow className="border-border/60 hover:bg-muted/60">
                          <TableHead className="text-sm text-muted-foreground font-bold uppercase">Nº Orden</TableHead>
                          <TableHead className="text-sm text-muted-foreground font-bold uppercase">Obra</TableHead>
                          <TableHead className="text-sm text-muted-foreground font-bold uppercase">Estado</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {confeccionTasks.slice(0, 2).map((task) => {
                          const statusColor = getStateBadgeClasses(task.state);
                          return (
                            <TableRow key={task.id} className="border-border/60 hover:bg-muted/60">
                              <TableCell className="text-sm font-bold text-foreground">
                                {getOrderNumberLabel(task)}
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground font-medium">{getConfeccionObraLabel(task)}</TableCell>
                              <TableCell>
                                <Badge variant="secondary" className={statusColor}>
                                  {task.state}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                  {confeccionTasks.length > 2 && (
                    <div className="overflow-x-auto">
                      <div className="max-h-48 overflow-y-auto rounded-md border border-border/60 custom-scrollbar">
                        <Table className="min-w-full">
                          <TableBody>
                            {confeccionTasks.slice(2).map((task) => {
                              const statusColor = getStateBadgeClasses(task.state);
                              return (
                                <TableRow key={task.id} className="border-border/60 hover:bg-muted/60">
                                  <TableCell className="text-sm font-medium text-slate-200">
                                    {getOrderNumberLabel(task)}
                                  </TableCell>
                                  <TableCell className="text-sm text-slate-300">{getConfeccionObraLabel(task)}</TableCell>
                                  <TableCell>
                                    <Badge variant="secondary" className={statusColor}>
                                      {task.state}
                                    </Badge>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Tapicería Card */}
          <Card className="flex-1 bg-card border-border shadow-md">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2 text-foreground font-bold">
                <div className="w-3 h-3 bg-purple-500 rounded-full shadow-lg shadow-purple-500/50"></div>
                Tapicería
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border/60 hover:bg-muted/60">
                      <TableHead className="text-sm text-muted-foreground font-bold uppercase">Nº Orden</TableHead>
                      <TableHead className="text-sm text-muted-foreground font-bold uppercase">Gestor</TableHead>
                      <TableHead className="text-sm text-muted-foreground font-bold uppercase">Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tasksLoading ? (
                      Array.from({ length: 3 }).map((_, i) => (
                        <TableRow key={i}>
                          <TableCell><div className="animate-pulse bg-muted/60 h-4 w-8 rounded"></div></TableCell>
                          <TableCell><div className="animate-pulse bg-muted/60 h-4 w-16 rounded"></div></TableCell>
                          <TableCell><div className="animate-pulse bg-muted/60 h-4 w-20 rounded"></div></TableCell>
                        </TableRow>
                      ))
                    ) : tapiceriaTasks.length === 0 ? (
                      <TableRow className="border-border/60 hover:bg-muted/60">
                        <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                          No hay tareas de tapicería
                        </TableCell>
                      </TableRow>
                    ) : (
                      tapiceriaTasks.map((task) => {
                        const statusColor = getStateBadgeClasses(task.state);

                        return (
                          <TableRow key={task.id} className="border-border/60 hover:bg-muted/60">
                            <TableCell className="text-sm font-bold text-foreground">{getOrderNumberLabel(task)}</TableCell>
                            <TableCell className="text-sm text-muted-foreground font-medium">{getTapiceriaGestorLabel(task)}</TableCell>
                            <TableCell>
                              <Badge variant="secondary" className={statusColor}>
                                {task.state}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Pending Tasks Section - Full Width */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-lg">Tareas Pendientes</CardTitle>
              <CardDescription>
                {selectedDate
                  ? `Tareas para el ${format(selectedDate, "d 'de' MMMM 'de' yyyy", { locale: es })}`
                  : 'Todas las tareas pendientes del sistema'
                }
              </CardDescription>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Select value={taskFilter} onValueChange={(value: 'all' | 'instalaciones' | 'confeccion' | 'tapiceria') => setTaskFilter(value)}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <Filter className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Filtrar por..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="instalaciones">Instalaciones</SelectItem>
                  <SelectItem value="confeccion">Confección</SelectItem>
                  <SelectItem value="tapiceria">Tapicería</SelectItem>
                </SelectContent>
              </Select>
              {selectedDate && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedDate(undefined)}
                  className="whitespace-nowrap"
                >
                  Limpiar filtro
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedTaskIds.size === sortedTasks.length && sortedTasks.length > 0}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedTaskIds(new Set(sortedTasks.map(t => t.id)));
                        } else {
                          setSelectedTaskIds(new Set());
                        }
                      }}
                    />
                  </TableHead>
                  <TableHead className="text-sm min-w-[100px]">Fecha</TableHead>
                  <TableHead className="text-sm min-w-[120px]">Usuarios</TableHead>
                  <TableHead className="text-sm min-w-[150px]">Sitio de Trabajo</TableHead>
                  <TableHead className="text-sm min-w-[200px]">Descripción</TableHead>
                  <TableHead className="text-sm min-w-[120px]">Vehículos</TableHead>
                  <TableHead className="text-sm min-w-[100px]">Estado</TableHead>
                  <TableHead className="text-sm min-w-[150px]">Sesión</TableHead>
                  <TableHead className="text-right min-w-[100px]">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tasksLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><div className="animate-pulse bg-muted h-4 w-4 rounded"></div></TableCell>
                      <TableCell><div className="animate-pulse bg-muted h-4 w-20 rounded"></div></TableCell>
                      <TableCell><div className="animate-pulse bg-muted h-8 w-24 rounded"></div></TableCell>
                      <TableCell><div className="animate-pulse bg-muted h-4 w-32 rounded"></div></TableCell>
                      <TableCell><div className="animate-pulse bg-muted h-4 w-40 rounded"></div></TableCell>
                      <TableCell><div className="animate-pulse bg-muted h-6 w-20 rounded"></div></TableCell>
                      <TableCell><div className="animate-pulse bg-muted h-6 w-16 rounded"></div></TableCell>
                      <TableCell><div className="animate-pulse bg-muted h-6 w-28 rounded"></div></TableCell>
                      <TableCell><div className="animate-pulse bg-muted h-8 w-8 rounded"></div></TableCell>
                    </TableRow>
                  ))
                ) : sortedTasks.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-muted-foreground py-12">
                      <div className="flex flex-col items-center gap-2">
                        <ClipboardList className="h-12 w-12 text-muted-foreground/50" />
                        <div>
                          <p className="font-medium">No hay tareas pendientes</p>
                          <p className="text-sm">
                            {selectedDate
                              ? `No hay tareas para el ${format(selectedDate, "d 'de' MMMM", { locale: es })}`
                              : 'Todas las tareas están completadas'
                            }
                          </p>
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedTasks.map((task) => {
                    const sessionSummary = sessionInfoByTask[task.id];
                    const arrivalLabel = formatSessionTimestamp(sessionSummary?.lastArrival);
                    const departureLabel = formatSessionTimestamp(sessionSummary?.lastDeparture);
                    const isTerminated = (task.state ?? '').toLowerCase() === 'terminado';
                    const mappedTask = mapDetailedTaskToTask(task);
                    const resolvedLocation = normalizeTaskLocation(mappedTask);
                    const workSiteAddress = typeof task.work_site_address === 'string' && task.work_site_address.trim().length
                      ? task.work_site_address.trim()
                      : null;
                    const workSiteName = typeof task.work_site_name === 'string' && task.work_site_name.trim().length
                      ? task.work_site_name.trim()
                      : null;
                    const siteLabel = workSiteAddress
                      ?? workSiteName
                      ?? mappedTask.site
                      ?? (typeof task.data?.site === 'string' ? task.data.site : null)
                      ?? (typeof task.data?.client === 'string' ? task.data.client : null)
                      ?? 'Sin sitio asignado';
                    const mapsEnabled = Boolean(task.work_site_imagotipo_enabled);
                    const hasMaps = mapsEnabled && Boolean(resolvedLocation || task.work_site_maps_url);

                    return (
                      <TableRow
                        key={task.id}
                        className="hover:bg-muted/50 cursor-pointer"
                        onDoubleClick={() => handleEditTask(task.id)}
                      >
                        <TableCell>
                          <Checkbox
                            checked={selectedTaskIds.has(task.id)}
                            onCheckedChange={(checked) => {
                              const newSelected = new Set(selectedTaskIds);
                              if (checked) {
                                newSelected.add(task.id);
                              } else {
                                newSelected.delete(task.id);
                              }
                              setSelectedTaskIds(newSelected);
                            }}
                          />
                        </TableCell>
                        <TableCell className="text-sm">
                          {getTaskDateLabel(task)}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {(() => {
                              const assignedProfiles = normalizeAssignedProfiles(task.assigned_profiles);
                              if (assignedProfiles.length === 0) {
                                return (
                                  <span className="text-xs text-muted-foreground">Sin asignar</span>
                                );
                              }

                              return assignedProfiles.map((profile) => {
                                const taskCount = pendingTasks.filter(
                                  (pendingTask) =>
                                    normalizeAssignedProfiles(pendingTask.assigned_profiles).some(
                                      (assigned) => assigned.id === profile.id
                                    )
                                ).length;

                                const bgColor = 'bg-muted/60 text-foreground border border-border/60';

                                return (
                                  <div key={profile.id} className={`flex items-center gap-1 px-2 py-1 rounded text-xs ${bgColor}`}>
                                    <User className="h-3 w-3 flex-shrink-0" />
                                    <span className="truncate max-w-[80px]">{profile.full_name}</span>
                                    {taskCount > 1 && (
                                      <Badge variant="secondary" className="h-4 w-4 p-0 flex items-center justify-center text-xs text-foreground bg-muted/60">
                                        {taskCount}
                                      </Badge>
                                    )}
                                  </div>
                                );
                              });
                            })()}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">
                          <div className="flex flex-col gap-1">
                            <div className="flex items-start gap-2">
                              <MapPin className="mt-1 h-4 w-4 text-muted-foreground" />
                              <span className="font-medium leading-5" title={siteLabel}>
                                {siteLabel}
                              </span>
                            </div>
                            {hasMaps && (
                              <Badge
                                variant="outline"
                                title={task.work_site_maps_url ?? resolvedLocation ?? 'Abrir en Maps'}
                                className="flex w-fit items-center gap-1 border-emerald-400 bg-emerald-100 text-emerald-700 dark:border-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200"
                              >
                                Mapa disponible
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-[220px] truncate" title={getTaskDescriptionLabel(task)}>
                          {getTaskDescriptionLabel(task)}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {normalizeAssignedVehicles(task.assigned_vehicles).length > 0 ? (
                              normalizeAssignedVehicles(task.assigned_vehicles).map((vehicle) => (
                                <VehicleBadge
                                  key={`${task.id}-${vehicle.id}`}
                                  name={vehicle.name}
                                  type={vehicle.type}
                                  size="sm"
                                />
                              ))
                            ) : task.vehicle_type ? (
                              <VehicleBadge
                                key={`${task.id}-vehicle-type`}
                                name={task.vehicle_type}
                                type={task.vehicle_type}
                                size="sm"
                              />
                            ) : (
                              <span className="text-xs text-muted-foreground">Sin vehículo</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <TaskStateBadge state={task.state} />
                            {isTerminated && (
                              <div className="flex items-center gap-1">
                                <Badge className="flex items-center gap-1 bg-muted/60 text-foreground border border-border/60">
                                  <CheckCircle className="h-3 w-3" />
                                  Verificado
                                </Badge>
                                <Badge variant="outline" className="flex w-fit items-center gap-1 text-xs">
                                  <AlarmClock className="h-3 w-3" />
                                  Pendiente
                                </Badge>
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">
                          {sessionSummary ? (
                            sessionSummary.active ? (
                              <Badge variant="outline" className="border-emerald-300 text-emerald-700 dark:border-emerald-700 dark:text-emerald-300">
                                Sesión en curso{arrivalLabel ? ` desde ${arrivalLabel}` : ''}
                              </Badge>
                            ) : (
                              <div className="flex flex-col text-xs text-muted-foreground">
                                {arrivalLabel && <span>Última llegada: {arrivalLabel}</span>}
                                {departureLabel && <span>Salida: {departureLabel}</span>}
                                {!arrivalLabel && !departureLabel && (
                                  <span>Sin registros recientes</span>
                                )}
                              </div>
                            )
                          ) : (
                            <span className="text-xs text-muted-foreground">Sin registros</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground hidden sm:inline-flex"
                            onClick={() => handleEditTask(task.id)}
                            title="Editar tarea"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onSelect={(event) => {
                                  event.preventDefault();
                                  handleViewDetails(task);
                                }}
                              >
                                <Eye className="mr-2 h-4 w-4" />
                                Ver detalles
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleEditTask(task.id)}>
                                <Pencil className="mr-2 h-4 w-4" />
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => updateTaskState(task.id, 'pendiente')}>
                                <RotateCcw className="mr-2 h-4 w-4" />
                                Marcar como pendiente
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => updateTaskState(task.id, 'urgente')}>
                                <AlertTriangle className="mr-2 h-4 w-4 text-amber-500" />
                                Marcar como urgente
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => updateTaskState(task.id, 'terminado')}>
                                <CheckCircle className="mr-2 h-4 w-4 text-emerald-500" />
                                Marcar como terminado
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleArchiveTask(task.id)}>
                                <Archive className="mr-2 h-4 w-4" />
                                Archivar
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {selectedTask && (() => {
        const dialogTask = mapDetailedTaskToTask(selectedTask);
        const locationLabel = normalizeTaskLocation(dialogTask);
        const canRegisterArrival =
          Boolean(currentUser?.id) && selectedTask.responsible_profile_id === currentUser?.id;
        const isTerminated = (selectedTask.state ?? '').toLowerCase() === 'terminado';
        const sessionSummary = sessionInfoByTask[selectedTask.id];
        const arrivalLabel = formatSessionTimestamp(sessionSummary?.lastArrival);
        const departureLabel = formatSessionTimestamp(sessionSummary?.lastDeparture);

        const actions: TaskActionConfig[] = [
          ...(canRegisterArrival && !isTerminated
            ? [
              {
                id: "register",
                label: "Registrar llegada",
                icon: <Clock className="h-4 w-4" />,
                variant: "primary",
                onClick: () => handleRegisterArrival(selectedTask),
                loading: isRegisteringArrival,
              } satisfies TaskActionConfig,
            ]
            : []),
          {
            id: "maps",
            label: "Abrir en Maps",
            icon: <MapPin className="h-4 w-4" />,
            variant: "outline-success",
            onClick: () => handleOpenTaskLocation(selectedTask),
            disabled: !locationLabel,
          },
          ...(isTerminated
            ? [
              {
                id: "archive",
                label: "Archivar tarea",
                icon: <Archive className="h-4 w-4" />,
                variant: "outline-success",
                onClick: async () => {
                  await handleArchiveTask(selectedTask.id);
                  setDetailsDialogOpen(false);
                },
              } satisfies TaskActionConfig,
            ]
            : []),
        ];

        return (
          <TaskDetailsDialog
            task={dialogTask}
            open={detailsDialogOpen}
            onOpenChange={(open) => {
              setDetailsDialogOpen(open);
              if (!open) {
                setSelectedTask(null);
              }
            }}
            description="Visualiza la información clave de la tarea y accede a acciones rápidas."
            actions={actions}
          >
            {sessionSummary && (
              <div className="rounded-lg border bg-muted/40 p-3 text-sm">
                <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-1">Sesión reciente</h4>
                {sessionSummary.active ? (
                  <p className="text-emerald-600 dark:text-emerald-300">
                    Sesión en curso{arrivalLabel ? ` desde ${arrivalLabel}` : ''}
                  </p>
                ) : (
                  <div className="flex flex-col gap-1 text-muted-foreground">
                    {arrivalLabel && <span>Última llegada: {arrivalLabel}</span>}
                    {departureLabel && <span>Salida registrada: {departureLabel}</span>}
                    {!arrivalLabel && !departureLabel && <span>Sin sesiones registradas.</span>}
                  </div>
                )}
              </div>
            )}
          </TaskDetailsDialog>
        );
      })()}
      <TaskDialog
        open={taskDialogOpen}
        onOpenChange={setTaskDialogOpen}
        onSuccess={() => {
          setTaskDialogOpen(false);
          refreshAllData();
        }}
        task={editingTask}
        selectedDate={selectedDate || new Date()}
        users={users}
        vehicles={vehicles}
      />
    </div>
  );
}
