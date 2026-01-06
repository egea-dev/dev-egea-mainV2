import { useCallback, useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import "dayjs/locale/es";
import relativeTime from "dayjs/plugin/relativeTime";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useProfile, useTasksByDate } from "@/hooks/use-supabase";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Task } from "@/types";
import { useWorkSession } from "@/hooks/use-work-session";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { WorkSession } from "@/types";
import { Clock, MapPin, CheckCircle2, AlertTriangle, Loader2, MessageCircle } from "lucide-react";
import { buildMapsSearchUrl } from "@/utils/maps";

dayjs.extend(relativeTime);
dayjs.locale("es");

type WorkdayIncident = {
  id: string;
  created_at: string;
  message?: string | null;
  status?: string | null;
  metadata?: Record<string, unknown> | null;
  incident_type?: string | null;
  severity?: string | null;
  description?: string | null;
};

type WorkdayLocation = {
  id: string;
  created_at: string;
  location?: Record<string, unknown> | null;
  note?: string | null;
  metadata?: Record<string, unknown> | null;
  acknowledged_at?: string | null;
};

const formatTaskWindow = (task: Task) => {
  const start = task.start_date ? dayjs(task.start_date).format("HH:mm") : "00:00";
  const end = task.end_date ? dayjs(task.end_date).format("HH:mm") : "00:00";
  return `${start} - ${end}`;
};

export default function WorkdayPage() {
  const { data: profile } = useProfile();
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const { data: allTasks = [] } = useTasksByDate(selectedDate);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [detailsTask, setDetailsTask] = useState<Task | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [calendarTaskDays, setCalendarTaskDays] = useState<Date[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  // Filtrar tareas del usuario actual
  const tasksForUser = useMemo(() => {
    if (!profile?.id) return [];
    return allTasks.filter((task) => {
      if (task.responsible_profile_id === profile.id) return true;
      const assigned = task.assigned_users ?? [];
      return assigned.some((user) => user.id === profile.id);
    });
  }, [allTasks, profile?.id]);

  // Tarea activa
  const activeTask = useMemo(() => {
    if (tasksForUser.length === 0) return null;
    if (selectedTaskId) {
      const selected = tasksForUser.find((t) => t.id === selectedTaskId);
      if (selected) return selected;
    }
    const now = dayjs();
    const current = tasksForUser.find((task) => {
      if (!task.start_date || !task.end_date) return task.state !== "terminado";
      const start = dayjs(task.start_date);
      const end = dayjs(task.end_date);
      return now.isAfter(start) && now.isBefore(end) && task.state !== "terminado";
    });
    return current ?? tasksForUser[0];
  }, [tasksForUser, selectedTaskId]);

  // Próximas tareas
  const upcomingTasks = useMemo(() => {
    if (!activeTask) return tasksForUser;
    return tasksForUser.filter((task) => task.id !== activeTask.id && task.state !== "terminado");
  }, [tasksForUser, activeTask]);

  // Hook de sesión de trabajo
  const {
    session,
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
      const startWindow = dayjs().subtract(30, "day").format("YYYY-MM-DD");
      const endWindow = dayjs().add(45, "day").format("YYYY-MM-DD");
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

      setCalendarTaskDays(Array.from(taskDates).map((value) => dayjs(value).toDate()));
    };

    fetchCalendar();
  }, [profile?.id]);

  // Seleccionar automáticamente la primera tarea
  useEffect(() => {
    if (!tasksForUser.length) {
      setSelectedTaskId(null);
      return;
    }
    if (selectedTaskId && tasksForUser.some((task) => task.id === selectedTaskId)) {
      return;
    }
    const preferred = activeTask ?? tasksForUser[0];
    setSelectedTaskId(preferred?.id ?? null);
  }, [tasksForUser, activeTask, selectedTaskId]);

  // Saludo basado en la hora
  const greeting = useMemo(() => {
    const hour = currentTime.getHours();
    if (hour < 12) return "Buenos días";
    if (hour < 20) return "Buenas tardes";
    return "Buenas noches";
  }, [currentTime]);

  // Formato de fecha y hora actual
  const formattedDateTime = useMemo(() => {
    return dayjs(currentTime).format("dddd D [de] MMMM - HH:mm:ss").toUpperCase();
  }, [currentTime]);

  // Marcar tarea como completada
  const markTaskCompleted = useCallback(
    async (taskId: string | null | undefined) => {
      if (!taskId) return;

      const { error } = await supabase
        .from("screen_data")
        .update({
          state: "terminado",
          status: "acabado",
          updated_at: new Date().toISOString(),
        })
        .eq("id", taskId);

      if (error) {
        toast.error("No se pudo marcar la tarea como completada");
        return;
      }

      toast.success("Tarea completada");
      queryClient.invalidateQueries({ queryKey: ["tasks"], exact: false });
    },
    [queryClient]
  );

  // Registrar llegada/salida
  const handleSessionToggle = async () => {
    if (isSessionBusy) return;

    try {
      if (isSessionActive) {
        const finished = await endSession();
        if (finished?.task_id) {
          await markTaskCompleted(finished.task_id);
        }
      } else {
        if (!selectedTaskId) {
          toast.error("Selecciona una tarea antes de registrar la llegada");
          return;
        }
        await startSession({ taskId: selectedTaskId });
      }
    } catch (error) {
      console.error("Error toggling work session", error);
    }
  };

  // Reportar incidencia
  const handleReportIncident = async () => {
    if (!profile?.id) return;

    const { error } = await supabase.from("communication_logs").insert({
      type: "incidencia",
      recipient: "panel-admin",
      subject: null,
      message: `Incidencia reportada por ${profile.full_name ?? "operario"}`,
      status: "pending",
      metadata: {
        profile_id: profile.id,
        source: "workday",
        task_id: activeTask?.id ?? null,
        reported_at: new Date().toISOString(),
      },
      created_by: profile.id,
    });

    if (error) {
      toast.error("No se pudo reportar la incidencia");
    } else {
      toast.success("Incidencia enviada al administrador");
    }
  };

  // Abrir ubicación en Maps
  const openMapsForTask = useCallback((task: Task | null) => {
    if (!task) return;

    const candidate =
      task.data?.address ??
      task.data?.location ??
      task.data?.site ??
      "";

    if (!candidate) {
      toast.error("Esta tarea no tiene una dirección asociada");
      return;
    }

    const url = buildMapsSearchUrl(String(candidate));
    window.open(url, "_blank", "noopener");
  }, []);

  const selectedTask = tasksForUser.find((t) => t.id === selectedTaskId);

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-4 pb-24 md:pb-6">
      {/* Banner de avisos */}
      {(isSessionActive || tasksForUser.some((t) => t.state !== "terminado")) && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-950/20 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
          <ul className="list-disc space-y-1 pl-4">
            {tasksForUser.filter((t) => t.state !== "terminado").length > 0 && (
              <li>
                Tienes {tasksForUser.filter((t) => t.state !== "terminado").length} tarea
                {tasksForUser.filter((t) => t.state !== "terminado").length > 1 ? "s" : ""} sin completar.
                Se mantendrán en tu agenda hasta que marques la salida.
              </li>
            )}
          </ul>
        </div>
      )}

      {/* Carta de saludo y estado */}
      <div className="rounded-2xl border bg-card shadow-sm">
        <div className="flex flex-col gap-4 p-4 sm:p-6">
          <div className="flex flex-col gap-3">
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
          </div>

          <div className="flex flex-col gap-2">
            <Button
              variant={isSessionActive ? "destructive" : "default"}
              className="w-full gap-2"
              onClick={handleSessionToggle}
              disabled={isSessionBusy || !profile?.id || tasksForUser.length === 0}
            >
              {isSessionBusy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Clock className="h-4 w-4" />
              )}
              {isSessionActive ? "Registrar salida" : "Registrar llegada"}
            </Button>

            {activeTask && (
              <Button variant="outline" className="w-full gap-2" onClick={() => openMapsForTask(activeTask)}>
                <MapPin className="h-4 w-4" />
                Ver en Maps
              </Button>
            )}

            <Button variant="outline" className="w-full gap-2" onClick={() => {
              if (activeTask) {
                setDetailsTask(activeTask);
                setDetailsOpen(true);
              }
            }}>
              Ver detalles
            </Button>

            <Button variant="outline" className="w-full gap-2" onClick={handleReportIncident}>
              <AlertTriangle className="h-4 w-4" />
              Reportar incidencia
            </Button>
          </div>
        </div>
      </div>

      {/* Calendario personal */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Calendario personal</CardTitle>
          <CardDescription>
            Selecciona el día que quieres revisar. Tus tareas se actualizarán automáticamente.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center px-2 sm:px-4">
          <div className="w-full max-w-[320px]">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(value) => value && setSelectedDate(value)}
              numberOfMonths={1}
              className="w-full rounded-md border shadow-sm"
              modifiers={{
                hasTasks: calendarTaskDays,
              }}
              modifiersClassNames={{
                hasTasks: "rdp-day_hasTasks",
              }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Tarea en curso */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Tarea en curso</h2>

        {activeTask ? (
          <Card className="overflow-hidden">
            <CardHeader className="flex flex-col gap-2">
              <div className="flex items-start justify-between">
                <CardTitle className="text-base">{activeTask.data?.site ?? "Tarea asignada"}</CardTitle>
                <Badge variant="default" className="uppercase text-xs">
                  {activeTask.state ?? "pendiente"}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Ubicación: {activeTask.data?.location ?? "Por confirmar"}
              </p>
              <p className="text-sm text-muted-foreground">
                Montaje: {activeTask.data?.installation_date ? dayjs(activeTask.data.installation_date).format("DD/MM/YYYY") : "05/01/2026"}
              </p>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="flex items-start gap-2">
                <Checkbox id="checklist" className="mt-0.5" />
                <label htmlFor="checklist" className="text-sm font-medium cursor-pointer">
                  Completar checklist
                </label>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                {formatTaskWindow(activeTask)} | Responsable: {activeTask.responsible?.full_name ?? ""}
              </div>

              <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                <span>
                  Duración: <span className="font-semibold text-foreground">{durationLabel}</span>
                </span>
                <span>Estado: {stateLabel}</span>
              </div>

              {activeTask.data?.description && (
                <p className="text-sm text-muted-foreground">{activeTask.data.description}</p>
              )}
            </CardContent>
          </Card>
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
          <h2 className="text-lg font-semibold">Próximas tareas</h2>
          <Button variant="link" size="sm" className="text-primary">
            Ver agenda completa
          </Button>
        </div>

        <div className="grid gap-3">
          {upcomingTasks.length > 0 ? (
            upcomingTasks.slice(0, 3).map((task) => (
              <Card key={task.id} className="overflow-hidden">
                <CardContent className="flex items-start justify-between p-4">
                  <div className="min-w-0 space-y-1">
                    <p className="font-medium text-sm">
                      {task.data?.site ?? task.data?.location ?? "Tarea asignada"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatTaskWindow(task)} | {task.data?.location ?? "Lugar por confirmar"}
                    </p>
                  </div>

                  <Badge variant="secondary" className="uppercase text-xs ml-2">
                    {task.state ?? "pendiente"}
                  </Badge>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="p-6 text-center text-sm text-muted-foreground">
                No tienes más tareas programadas para esta fecha.
              </CardContent>
            </Card>
          )}
        </div>
      </section>

      {/* Centro de comunicaciones */}
      <section className="space-y-3">
        <Card>
          <CardHeader className="pb-3">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              Centro de comunicaciones
            </h2>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Próximamente verás aquí tus mensajes y notificaciones compartidas con el administrador.
            </p>
          </CardContent>
        </Card>
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
                <p className="text-sm">{detailsTask?.start_date ? dayjs(detailsTask.start_date).format("DD/MM/YYYY") : "05/01/2026"}</p>
              </div>

              <Separator />

              <div className="space-y-2">
                <p className="text-sm font-semibold">Fecha de cierre</p>
                <p className="text-sm">{detailsTask?.end_date ? dayjs(detailsTask.end_date).format("DD/MM/YYYY") : "05/01/2026"}</p>
              </div>

              <Separator />

              <div className="space-y-2">
                <p className="text-sm font-semibold">Sitio</p>
                <p className="text-sm">{detailsTask?.data?.site ?? detailsTask?.data?.location ?? "Almacen central"}</p>
              </div>

              <Separator />

              <div className="space-y-2">
                <p className="text-sm font-semibold">Estado</p>
                <Badge variant="default" className="uppercase">
                  {detailsTask?.state ?? "pendiente"}
                </Badge>
              </div>

              <Separator />

              <div className="space-y-2">
                <p className="text-sm font-semibold">Descripción</p>
                <p className="text-sm text-muted-foreground">
                  {detailsTask?.data?.description ?? "sdgasdf"}
                </p>
              </div>

              <Separator />

              <div className="space-y-2">
                <p className="text-sm font-semibold">Ubicación</p>
                <div className="flex items-center gap-2">
                  <p className="text-sm">{detailsTask?.data?.location ?? "Almacen central"}</p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-2"
                    onClick={() => openMapsForTask(detailsTask)}
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
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
