import { useCallback, useEffect, useMemo, useState } from "react";
import {
  format,
  formatDistanceToNow,
  isAfter,
  isBefore,
  isSameDay,
  addDays,
  subDays,
  startOfDay
} from "date-fns";
import { es } from "date-fns/locale";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useProfile, useTasksByDate } from "@/hooks/use-supabase";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { getTaskStateColor, getTaskStateLabel } from "@/lib/constants";
import type { Task } from "@/types";
import { useWorkSession } from "@/hooks/use-work-session";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { Clock, MapPin, AlertTriangle, Info, CheckCircle2, CalendarCheck } from "lucide-react";
import { buildMapsSearchUrl } from "@/utils/maps";
import { WeeklyCalendar } from "@/components/calendar/WeeklyCalendar";
import { IncidentReportModal } from "@/components/incidents/IncidentReportModal";



export default function WorkdayPage() {
  const { data: profile } = useProfile();
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [currentTime, setCurrentTime] = useState<Date>(new Date());

  // Preferencias de usuario
  const [showCalendar, setShowCalendar] = useState(() => {
    const saved = localStorage.getItem('workday-show-calendar');
    return saved !== null ? JSON.parse(saved) : true;
  });

  const [taskFilter, setTaskFilter] = useState<'all' | 'overdue' | 'pending' | 'validation' | 'upcoming'>('all');
  const [taskListOpen, setTaskListOpen] = useState(false);
  const [taskListTitle, setTaskListTitle] = useState("");

  // CRÍTICO: Obtener TODAS las tareas del usuario sin filtrar por fecha
  // Esto permite ver tareas del 30, 31 dic y cualquier día anterior
  const { data: allUserTasks = [] } = useQuery({
    queryKey: ['all-user-tasks', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];

      // Obtener TODAS las tareas y filtrar en el cliente
      const { data, error } = await supabase
        .from('detailed_tasks')
        .select('*');

      if (error) throw error;

      const rows = (data ?? []) as any[];

      // Filtrar por usuario en el cliente
      const userTasks = rows.filter((task) => {
        // Verificar si es responsable
        if (task.responsible_profile_id === profile.id) return true;

        // Verificar si está asignado
        if (Array.isArray(task.assigned_profiles)) {
          return task.assigned_profiles.some((p: any) => p.id === profile.id);
        }

        return false;
      });

      return userTasks.map((task) => ({
        ...task,
        site: task.site || task.data?.site || 'N/A',
        description: task.description || task.data?.description || 'N/A',
        responsible: task.responsible_name ? {
          id: task.responsible_profile_id,
          full_name: task.responsible_name,
          status: 'activo'
        } : null,
        assigned_users: Array.isArray(task.assigned_profiles) ? task.assigned_profiles : [],
        assigned_vehicles: Array.isArray(task.assigned_vehicles) ? task.assigned_vehicles : [],
      }));
    },
    enabled: !!profile?.id,
  });

  const [detailsTask, setDetailsTask] = useState<Task | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const [calendarTaskDays, setCalendarTaskDays] = useState<Date[]>([]);

  // Estado para reporte de incidencias
  const [incidentModalOpen, setIncidentModalOpen] = useState(false);
  const [selectedTaskForIncident, setSelectedTaskForIncident] = useState<Task | null>(null);

  // Filtrar solo tareas NO terminadas/validadas
  // ESTO INCLUYE TAREAS DE CUALQUIER FECHA (30 dic, 31 dic, etc.)
  const tasksForUser = useMemo(() => {
    return (allUserTasks as Task[]).filter((task) => {
      return task.state !== "terminado" && task.status !== "acabado";
    });
  }, [allUserTasks]);

  // Tarea activa (la primera pendiente o en curso)
  const activeTask = useMemo(() => {
    if (tasksForUser.length === 0) return null;
    const now = new Date();

    // Buscar tarea en curso (dentro del rango de fechas)
    const current = tasksForUser.find((task) => {
      if (!task.start_date || !task.end_date) return false;
      const start = new Date(task.start_date);
      const end = new Date(task.end_date);
      return isAfter(now, start) && isBefore(now, end);
    });

    // Si no hay tarea en curso, tomar la primera pendiente
    return current ?? tasksForUser[0];
  }, [tasksForUser]);

  // Próximas tareas (todas menos la activa)
  const upcomingTasks = useMemo(() => {
    if (!activeTask) return tasksForUser;
    return tasksForUser.filter((task) => task.id !== activeTask.id && task.state !== "terminado");
  }, [tasksForUser, activeTask]);

  // Estadísticas de tareas para visualización (revisa TODAS las fechas)
  // IMPORTANTE: Las tareas permanecen visibles hasta que admin/manager las validen
  const taskStats = useMemo(() => {
    const now = new Date();
    const today = startOfDay(now);

    // Tareas atrasadas: TODAS las tareas de días anteriores
    const overdueTasks = tasksForUser.filter((task) => {
      if (!task.start_date) return false;
      return isBefore(new Date(task.start_date), today);
    });

    // Tareas pendientes: Estados pendiente, urgente, a la espera
    const pendingTasks = tasksForUser.filter((task) => {
      return task.state === "pendiente" ||
        task.state === "urgente" ||
        task.state === "a la espera" ||
        task.status === "pendiente";
    });

    // Tareas pendientes de validar: En fabricación o completadas
    const validationTasks = tasksForUser.filter((task) => {
      return task.state === "en fabricacion" ||
        task.status === "completado" ||
        String(task.state).toLowerCase().includes("validar");
    });

    // Próximas tareas: Programadas para el futuro
    const futureTasks = tasksForUser.filter((task) => {
      if (!task.start_date) return false;
      return isAfter(new Date(task.start_date), today) && !isSameDay(new Date(task.start_date), today);
    });


    return {
      overdue: overdueTasks.length,
      pending: pendingTasks.length,
      validation: validationTasks.length,
      upcoming: futureTasks.length,
      total: tasksForUser.length,
      overdueTasks,
      pendingTasks,
      validationTasks,
      futureTasks,
    };
  }, [tasksForUser]);

  // Tareas filtradas según selección
  const filteredTasks = useMemo(() => {
    switch (taskFilter) {
      case 'overdue':
        return taskStats.overdueTasks;
      case 'pending':
        return taskStats.pendingTasks;
      case 'validation':
        return taskStats.validationTasks;
      case 'upcoming':
        return taskStats.futureTasks;
      default:
        return tasksForUser;
    }
  }, [taskFilter, taskStats, tasksForUser]);

  // Guardar preferencia de calendario
  const toggleCalendar = () => {
    const newValue = !showCalendar;
    setShowCalendar(newValue);
    localStorage.setItem('workday-show-calendar', JSON.stringify(newValue));
  };

  // Manejar click en tarjeta de estadística - Abre dialog con lista de tareas
  const handleStatClick = (filter: typeof taskFilter, title: string) => {
    setTaskFilter(filter);
    setTaskListTitle(title);
    setTaskListOpen(true);
  };

  // Hook de sesión de trabajo
  const {
    isActive: isSessionActive,
    startSession,
    endSession,
    isStarting,
    isEnding,
    durationLabel,
    stateLabel,
    lastEventLabel,
  } = useWorkSession({ profileId: profile?.id, taskId: activeTask?.id ?? null });

  const isSessionBusy = isStarting || isEnding;

  // Actualizar reloj cada segundo
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Cargar días con tareas para el calendario
  useEffect(() => {
    if (!profile?.id) {
      setCalendarTaskDays([]);
      return;
    }

    const fetchCalendar = async () => {
      const startWindow = format(subDays(new Date(), 30), "yyyy-MM-dd");
      const endWindow = format(addDays(new Date(), 45), "yyyy-MM-dd");
      const { data } = await supabase
        .from("screen_data")
        .select("id, start_date, state, responsible_profile_id, task_profiles(profile_id)")
        .gte("start_date", startWindow)
        .lte("start_date", endWindow);

      const relevant = (data ?? []).filter((task: any) => {
        if (!task) return false;
        if (task.responsible_profile_id === profile.id) return true;
        const profiles = Array.isArray(task.task_profiles) ? task.task_profiles : [];
        return profiles.some((tp: { profile_id?: string }) => tp?.profile_id === profile.id);
      });

      const taskDates = new Set<string>();
      relevant.forEach((task: any) => {
        if (task?.start_date) taskDates.add(task.start_date);
      });

      setCalendarTaskDays(Array.from(taskDates).map((value) => new Date(value)));
    };

    fetchCalendar();
  }, [profile?.id]);

  // Saludo basado en la hora
  const greeting = useMemo(() => {
    const hour = currentTime.getHours();
    if (hour < 12) return "Buenos días";
    if (hour < 20) return "Buenas tardes";
    return "Buenas noches";
  }, [currentTime]);

  // Formato de fecha y hora actual
  const formattedDateTime = useMemo(() => {
    return format(currentTime, "eeee d 'de' MMMM - HH:mm:ss", { locale: es }).toUpperCase();
  }, [currentTime]);

  // Registrar llegada/salida para una tarea específica
  const handleSessionToggle = async (task: Task) => {
    if (isSessionBusy) return;

    try {
      if (isSessionActive) {
        // REGISTRAR SALIDA - NO cierra la tarea, solo finaliza sesión
        await endSession();
        toast.success("Salida registrada correctamente");
      } else {
        // REGISTRAR LLEGADA
        await startSession({ taskId: task.id });
        toast.success("Llegada registrada correctamente");
      }
      queryClient.invalidateQueries({ queryKey: ["tasks"], exact: false });
    } catch (error) {
      console.error("Error toggling work session", error);
      toast.error("Error al registrar llegada/salida");
    }
  };

  // Reportar incidencia
  // Reportar incidencia - Abre modal
  const handleReportIncident = (task: Task) => {
    setSelectedTaskForIncident(task);
    setIncidentModalOpen(true);
  };

  // Abrir ubicación en Maps
  const openMapsForTask = useCallback((task: Task) => {
    const candidate = task.data?.address ?? task.data?.location ?? task.data?.site ?? "";

    if (!candidate) {
      toast.error("Esta tarea no tiene una dirección asociada");
      return;
    }

    const url = buildMapsSearchUrl(String(candidate));
    window.open(url, "_blank", "noopener");
  }, []);

  // Componente de tarjeta de tarea con botones
  const TaskCard = ({ task, isActive = false }: { task: Task; isActive?: boolean }) => {
    const formatTaskWindow = (t: Task) => {
      const start = t.start_date ? format(new Date(t.start_date), "HH:mm") : "00:00";
      const end = t.end_date ? format(new Date(t.end_date), "HH:mm") : "00:00";
      return `${start} - ${end}`;
    };

    return (
      <Card className="overflow-hidden">
        <CardContent className="p-4 space-y-4">
          {/* Header de la tarea */}
          <div className="space-y-2">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold text-base">
                {task.data?.site ?? task.data?.location ?? "Tarea asignada"}
              </h3>
              <Badge
                className={cn("uppercase text-xs shrink-0 capitalize", getTaskStateColor(task.state))}
              >
                {getTaskStateLabel(task.state)}
              </Badge>
            </div>

            <div className="space-y-1 text-sm text-muted-foreground">
              <p>Ubicación: {task.data?.location ?? "Por confirmar"}</p>
              <p>
                Montaje: {task.data?.installation_date
                  ? format(new Date(task.data.installation_date), "dd/MM/yyyy")
                  : format(new Date(task.start_date), "dd/MM/yyyy")}
              </p>
            </div>
          </div>

          {/* Información de horario y duración */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>{formatTaskWindow(task)}</span>
            {task.responsible?.full_name && (
              <>
                <span>|</span>
                <span>Responsable: {task.responsible.full_name}</span>
              </>
            )}
          </div>

          {isActive && (
            <div className="space-y-2 text-xs text-muted-foreground">
              <p>Duración: <span className="font-semibold text-foreground">{durationLabel}</span></p>
              <p>Estado: <span className="capitalize">{stateLabel}</span></p>
            </div>
          )}

          {/* Descripción */}
          {task.data?.description && (
            <p className="text-sm text-muted-foreground">{String(task.data.description)}</p>
          )}

          {/* Botones de acción */}
          <div className="flex flex-col gap-2 pt-2">
            <Button
              variant={isSessionActive ? "destructive" : "default"}
              className="w-full gap-2"
              onClick={() => handleSessionToggle(task)}
              disabled={isSessionBusy}
            >
              <Clock className="h-4 w-4" />
              {isSessionActive ? "Registrar salida" : "Registrar llegada"}
            </Button>

            <Button
              variant="outline"
              className="w-full gap-2 border-emerald-500 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950"
              onClick={() => openMapsForTask(task)}
            >
              <MapPin className="h-4 w-4" />
              Ver en Maps
            </Button>

            <Button
              variant="outline"
              className="w-full gap-2 border-blue-500 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950"
              onClick={() => {
                setDetailsTask(task);
                setDetailsOpen(true);
              }}
            >
              <Info className="h-4 w-4" />
              Ver detalles
            </Button>

            <Button
              variant="outline"
              className="w-full gap-2 border-amber-500 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950"
              onClick={() => handleReportIncident(task)}
            >
              <AlertTriangle className="h-4 w-4" />
              Reportar incidencia
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-4 pb-24 md:pb-6">
      {/* Banner de avisos - Movido más arriba */}
      {tasksForUser.length > 0 && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-950/20 px-4 py-2.5 text-sm text-amber-800 dark:text-amber-200">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <p>
              Tienes <strong>{tasksForUser.length}</strong> tarea{tasksForUser.length > 1 ? "s" : ""} pendiente{tasksForUser.length > 1 ? "s" : ""}.
              {" "}Todas tus tareas permanecen visibles hasta que admin/manager las validen.
            </p>
          </div>
        </div>
      )}

      {/* Carta de saludo y estado */}
      <Card className="border bg-card shadow-sm">
        <CardContent className="p-4 sm:p-6 space-y-3">
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            {formattedDateTime}
          </span>

          <div className="space-y-2">
            <h1 className="text-2xl font-semibold leading-tight">
              {greeting}, {profile?.full_name ?? "usuario"}
            </h1>

            <p className="text-sm text-muted-foreground">
              Estado actual: <span className="font-semibold text-primary capitalize">{stateLabel}</span>.
              {lastEventLabel && ` ${lastEventLabel}.`}
            </p>

            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              DURACIÓN: <span className="text-foreground">{durationLabel}</span>
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Resumen de Tareas Pendientes */}
      <Card className="border bg-gradient-to-br from-card to-card/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            Resumen de Tareas
          </CardTitle>
          <CardDescription>
            Click en una categoría para ver tus tareas. Las tareas permanecen hasta que admin/manager las validen.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => handleStatClick('overdue', 'Tareas Atrasadas')}
              className={cn(
                "rounded-lg border-2 p-3 transition-all hover:scale-105 text-left",
                taskFilter === 'overdue'
                  ? "border-red-500 bg-red-100 dark:bg-red-950/40 ring-2 ring-red-500 ring-offset-2"
                  : "border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/20 hover:border-red-300"
              )}
            >
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-red-600 dark:text-red-400 uppercase tracking-wide">
                    Atrasadas
                  </p>
                  <p className="text-2xl font-bold text-red-700 dark:text-red-300">
                    {taskStats.overdue}
                  </p>
                </div>
                <AlertTriangle className="h-8 w-8 text-red-500 dark:text-red-400" />
              </div>
              <p className="text-xs text-red-600/80 dark:text-red-400/80 mt-2">
                De días anteriores
              </p>
            </button>

            {/* Tareas Pendientes */}
            <button
              onClick={() => handleStatClick('pending', 'Tareas Pendientes')}
              className={cn(
                "rounded-lg border-2 p-3 transition-all hover:scale-105 text-left",
                taskFilter === 'pending'
                  ? "border-amber-500 bg-amber-100 dark:bg-amber-950/40 ring-2 ring-amber-500 ring-offset-2"
                  : "border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/20 hover:border-amber-300"
              )}
            >
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-amber-600 dark:text-amber-400 uppercase tracking-wide">
                    Pendientes
                  </p>
                  <p className="text-2xl font-bold text-amber-700 dark:text-amber-300">
                    {taskStats.pending}
                  </p>
                </div>
                <Clock className="h-8 w-8 text-amber-500 dark:text-amber-400" />
              </div>
              <p className="text-xs text-amber-600/80 dark:text-amber-400/80 mt-2">
                Por realizar
              </p>
            </button>

            {/* Tareas Pendientes de Validar */}
            <button
              onClick={() => handleStatClick('validation', 'Tareas Por Validar')}
              className={cn(
                "rounded-lg border-2 p-3 transition-all hover:scale-105 text-left",
                taskFilter === 'validation'
                  ? "border-blue-500 bg-blue-100 dark:bg-blue-950/40 ring-2 ring-blue-500 ring-offset-2"
                  : "border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-950/20 hover:border-blue-300"
              )}
            >
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-blue-600 dark:text-blue-400 uppercase tracking-wide">
                    Por Validar
                  </p>
                  <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                    {taskStats.validation}
                  </p>
                </div>
                <CheckCircle2 className="h-8 w-8 text-blue-500 dark:text-blue-400" />
              </div>
              <p className="text-xs text-blue-600/80 dark:text-blue-400/80 mt-2">
                Esperando revisión
              </p>
            </button>

            {/* Próximas Tareas */}
            <button
              onClick={() => handleStatClick('upcoming', 'Próximas Tareas')}
              className={cn(
                "rounded-lg border-2 p-3 transition-all hover:scale-105 text-left",
                taskFilter === 'upcoming'
                  ? "border-emerald-500 bg-emerald-100 dark:bg-emerald-950/40 ring-2 ring-emerald-500 ring-offset-2"
                  : "border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/20 hover:border-emerald-300"
              )}
            >
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">
                    Próximas
                  </p>
                  <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">
                    {taskStats.upcoming}
                  </p>
                </div>
                <CalendarCheck className="h-8 w-8 text-emerald-500 dark:text-emerald-400" />
              </div>
              <p className="text-xs text-emerald-600/80 dark:text-emerald-400/80 mt-2">
                Programadas
              </p>
            </button>
          </div>

          {/* Total de Tareas */}
          <div className="mt-3 pt-3 border-t">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">
                Total de tareas pendientes
              </p>
              <p className="text-lg font-bold text-primary">
                {taskStats.total}
              </p>
            </div>
            {taskFilter !== 'all' && (
              <p className="text-xs text-center text-muted-foreground mt-2">
                Mostrando {filteredTasks.length} tareas filtradas. Click en la categoría para ver todas.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Calendario personal - Mostrar/Ocultar según preferencia */}
      {showCalendar && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Calendario personal</CardTitle>
            <CardDescription>
              Selecciona el día que quieres revisar. Tus tareas se actualizarán automáticamente.
            </CardDescription>
          </CardHeader>
          <CardContent className="px-4">
            <WeeklyCalendar
              selectedDate={selectedDate}
              onSelectDate={setSelectedDate}
              daysWithTasks={calendarTaskDays}
            />
          </CardContent>
        </Card>
      )}

      {/* Tarea en curso */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">Tarea en curso</h2>
        </div>

        {activeTask ? (
          <div className="space-y-3">
            <div className="flex items-start gap-2">
              <Checkbox id="checklist" className="mt-0.5" />
              <label htmlFor="checklist" className="text-sm font-medium cursor-pointer">
                Completar checklist
              </label>
            </div>

            <TaskCard task={activeTask} isActive={true} />
          </div>
        ) : (
          <Card>
            <CardContent className="p-6 text-center text-sm text-muted-foreground">
              No tienes tareas activas para la fecha seleccionada.
            </CardContent>
          </Card>
        )}
      </section>

      {/* Próximas tareas */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Todas tus tareas pendientes</h2>
          <Button variant="link" size="sm" className="text-primary h-auto p-0">
            Ver agenda completa
          </Button>
        </div>

        <div className="grid gap-3">
          {upcomingTasks.length > 0 ? (
            upcomingTasks.map((task) => (
              <TaskCard key={task.id} task={task} />
            ))
          ) : (
            <Card>
              <CardContent className="p-6 text-center text-sm text-muted-foreground">
                No tienes más tareas pendientes.
              </CardContent>
            </Card>
          )}
        </div>
      </section>

      {/* Modal de detalles */}
      <Dialog
        open={detailsOpen && Boolean(detailsTask)}
        onOpenChange={(open) => {
          setDetailsOpen(open);
          if (!open) setDetailsTask(null);
        }}
      >
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {detailsTask?.data?.site ?? detailsTask?.data?.location ?? "Detalle de la tarea"}
            </DialogTitle>
          </DialogHeader>

          <ScrollArea className="max-h-[60vh] pr-2">
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <p className="text-sm font-semibold">Fecha de inicio</p>
                <p className="text-sm">
                  {detailsTask?.start_date ? format(new Date(detailsTask.start_date), "dd/MM/yyyy") : "N/A"}
                </p>
              </div>

              <Separator />

              <div className="space-y-2">
                <p className="text-sm font-semibold">Fecha de cierre</p>
                <p className="text-sm">
                  {detailsTask?.end_date ? format(new Date(detailsTask.end_date), "dd/MM/yyyy") : "N/A"}
                </p>
              </div>

              <Separator />

              <div className="space-y-2">
                <p className="text-sm font-semibold">Sitio</p>
                <p className="text-sm">{String(detailsTask?.data?.site ?? detailsTask?.data?.location ?? "N/A")}</p>
              </div>

              <Separator />

              <div className="space-y-2">
                <p className="text-sm font-semibold">Estado</p>
                <Badge className={cn("uppercase text-xs shrink-0 capitalize", getTaskStateColor(detailsTask?.state))}>
                  {getTaskStateLabel(detailsTask?.state)}
                </Badge>
              </div>

              <Separator />

              <div className="space-y-2">
                <p className="text-sm font-semibold">Descripción</p>
                <p className="text-sm text-muted-foreground">
                  {String(detailsTask?.data?.description ?? "Sin descripción")}
                </p>
              </div>

              <Separator />

              <div className="space-y-2">
                <p className="text-sm font-semibold">Ubicación</p>
                <div className="flex items-center gap-2">
                  <p className="text-sm">{String(detailsTask?.data?.location ?? "N/A")}</p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-2"
                    onClick={() => detailsTask && openMapsForTask(detailsTask)}
                  >
                    <MapPin className="h-4 w-4" />
                    Abrir en Maps
                  </Button>
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <p className="text-sm font-semibold">Operarios asignados</p>
                <p className="text-sm text-primary">{profile?.full_name ?? "usuario"}</p>
              </div>

              <Separator />

              <div className="space-y-2">
                <p className="text-sm font-semibold">Vehículos asignados</p>
                <p className="text-sm text-muted-foreground">Sin vehículos asignados</p>
              </div>

              <Separator />

              <div className="space-y-2">
                <p className="text-sm font-semibold">Incidencias</p>
                <p className="text-sm text-muted-foreground">No hay incidencias asociadas a esta tarea.</p>
              </div>

              <Separator />

              {/* Botones de acción en el modal */}
              <div className="flex flex-col gap-2 pt-2">
                <Button
                  variant={isSessionActive ? "destructive" : "default"}
                  className="w-full gap-2"
                  onClick={() => detailsTask && handleSessionToggle(detailsTask)}
                  disabled={isSessionBusy}
                >
                  <Clock className="h-4 w-4" />
                  {isSessionActive ? "Registrar salida" : "Registrar llegada"}
                </Button>

                <Button
                  variant="outline"
                  className="w-full gap-2 border-emerald-500 text-emerald-600"
                  onClick={() => detailsTask && openMapsForTask(detailsTask)}
                >
                  <MapPin className="h-4 w-4" />
                  Ver en Maps
                </Button>

                <Button
                  variant="outline"
                  className="w-full gap-2 border-amber-500 text-amber-600"
                  onClick={() => detailsTask && handleReportIncident(detailsTask)}
                >
                  <AlertTriangle className="h-4 w-4" />
                  Reportar incidencia
                </Button>
              </div>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Modal de Reporte de Incidencias */}
      {selectedTaskForIncident && (
        <IncidentReportModal
          isOpen={incidentModalOpen}
          onClose={() => {
            setIncidentModalOpen(false);
            setSelectedTaskForIncident(null);
          }}
          system="main"
          itemId={selectedTaskForIncident.id}
          itemLabel={String(selectedTaskForIncident.data?.site ?? selectedTaskForIncident.data?.location ?? "Tarea")}
        />
      )}

      {/* Dialog de Lista de Tareas */}
      <Dialog open={taskListOpen} onOpenChange={setTaskListOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>{taskListTitle}</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh] pr-4">
            <div className="space-y-3">
              {filteredTasks.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No hay tareas en esta categoría
                </p>
              ) : (
                filteredTasks.map((task) => (
                  <Card key={task.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold">{String(task.data?.site ?? "Sin ubicación")}</h4>
                            <Badge className={cn("uppercase text-xs shrink-0 capitalize", getTaskStateColor(task.state))}>
                              {getTaskStateLabel(task.state)}
                            </Badge>
                          </div>

                          {task.data?.location && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <MapPin className="h-3 w-3" />
                              <span>{String(task.data.location)}</span>
                            </div>
                          )}

                          {task.start_date && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              <span>{format(new Date(task.start_date), "dd/MM/yyyy HH:mm")}</span>
                            </div>
                          )}
                        </div>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setDetailsTask(task);
                            setDetailsOpen(true);
                            setTaskListOpen(false);
                          }}
                        >
                          Ver detalles
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}

