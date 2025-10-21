import { useCallback, useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import "dayjs/locale/es";
import relativeTime from "dayjs/plugin/relativeTime";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Clock, CheckCircle2, MessageCircle, AlertTriangle, Loader2, MapPin } from "lucide-react";
import { useProfile, useTasksByDate } from "@/hooks/use-supabase";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Task } from "@/types";
import { useWorkSession } from "@/hooks/use-work-session";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { WorkSession } from "@/types";

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
  location: Record<string, unknown> | null;
  note: string | null;
  metadata: Record<string, unknown> | null;
  acknowledged_at?: string | null;
};

type OutstandingTask = {
  id: string;
  state: string;
  start_date: string | null;
  data: Record<string, unknown> | null;
  responsible?: { id: string; full_name: string } | null;
};

dayjs.extend(relativeTime);
dayjs.locale("es");

const formatTaskWindow = (task: Task) => {
  const start = task.start_date ? dayjs(task.start_date).format("HH:mm") : "--";
  const end = task.end_date ? dayjs(task.end_date).format("HH:mm") : "--";
  return `${start} - ${end}`;
};

export default function WorkdayPage() {
  const queryClient = useQueryClient();
  const { data: profile } = useProfile();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const { data: allTasks = [], isLoading: loadingTasks } = useTasksByDate(selectedDate);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [detailsTask, setDetailsTask] = useState<Task | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [calendarTaskDays, setCalendarTaskDays] = useState<Date[]>([]);
  const [calendarPendingDays, setCalendarPendingDays] = useState<Date[]>([]);

  const tasksForUser = useMemo(() => {
    if (!profile?.id) return [];
    return allTasks.filter((task) => {
      if (task.responsible_profile_id === profile.id) return true;
      const assigned = task.assigned_users ?? [];
      return assigned.some((user) => user.id === profile.id);
    });
  }, [allTasks, profile?.id]);

  const activeTask = useMemo(() => {
    if (tasksForUser.length === 0) return null;
    const now = dayjs();
    const current = tasksForUser.find((task) => {
      if (!task.start_date || !task.end_date) return task.state !== "terminado";
      const start = dayjs(task.start_date);
      const end = dayjs(task.end_date);
      return now.isAfter(start) && now.isBefore(end) && task.state !== "terminado";
    });
    return current ?? tasksForUser[0];
  }, [tasksForUser]);

  const upcomingTasks = useMemo(() => {
    if (!activeTask) return tasksForUser;
    return tasksForUser.filter((task) => task.id !== activeTask.id);
  }, [tasksForUser, activeTask]);

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

  const { data: outstandingTasksData = [] } = useQuery<OutstandingTask[]>({
    queryKey: ["outstanding-tasks", profile?.id],
    enabled: Boolean(profile?.id),
    staleTime: 60_000,
    queryFn: async () => {
      if (!profile?.id) return [];
      const { data, error } = await supabase
        .from("screen_data")
        .select(
          `id, state, start_date, data,
           responsible:responsible_profile_id(id, full_name),
           task_profiles(profiles(id))`
        )
        .neq("state", "terminado")
        .or(`responsible_profile_id.eq.${profile.id},task_profiles.profiles.id.eq.${profile.id}`);

      if (error) throw error;

      const unique = new Map<string, OutstandingTask>();
      (data ?? []).forEach((row: any) => {
        if (!unique.has(row.id)) {
          unique.set(row.id, {
            id: row.id,
            state: row.state,
            start_date: row.start_date ?? null,
            data: row.data ?? null,
            responsible: row.responsible
              ? { id: row.responsible.id, full_name: row.responsible.full_name }
              : null,
          });
        }
      });
      return Array.from(unique.values());
    },
  });

  const hasOutstandingTasks = (outstandingTasksData?.length ?? 0) > 0;
  const hasActiveSession = session?.status === "active" && !session?.ended_at;

  const selectedTask = useMemo(() => {
    if (!selectedTaskId) return activeTask ?? null;
    return tasksForUser.find((task) => task.id === selectedTaskId) ?? activeTask ?? null;
  }, [selectedTaskId, tasksForUser, activeTask]);

  const greeting = useMemo(() => {
    const hour = dayjs(currentTime).hour();
    if (hour < 12) return "Buenos dias";
    if (hour < 19) return "Buenas tardes";
    return "Buenas noches";
  }, [currentTime]);

  const formattedDateTime = useMemo(() => {
    const base = dayjs(currentTime);
    const dateLabel = base.format("dddd D [de] MMMM");
    const capitalizedDate = dateLabel.charAt(0).toUpperCase() + dateLabel.slice(1);
    return `${capitalizedDate} - ${base.format("HH:mm:ss")}`;
  }, [currentTime]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

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
        console.error("Error marking task as completed", error);
        toast.error("No se pudo marcar la tarea como completada");
        return;
      }

      const { error: archiveError } = await supabase.rpc("archive_task_by_id", {
        p_task_id: taskId,
      });

      if (archiveError) {
        console.error("Error archiving task after completion", archiveError);
        toast.error("La tarea se marco como terminada pero no se archivo");
      } else {
        toast.success("Tarea completada y archivada");
      }

      queryClient.invalidateQueries({ queryKey: ["tasks"], exact: false });
      if (selectedDate) {
        queryClient.invalidateQueries({
          queryKey: ["tasks", dayjs(selectedDate).format("YYYY-MM-DD")],
        });
      }
    },
    [queryClient, selectedDate]
  );

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

  useEffect(() => {
    if (!profile?.id) {
      setCalendarTaskDays([]);
      setCalendarPendingDays([]);
      return;
    }

    const fetchCalendar = async () => {
      const startWindow = dayjs().subtract(30, "day").format("YYYY-MM-DD");
      const endWindow = dayjs().add(45, "day").format("YYYY-MM-DD");
      const { data, error } = await supabase
        .from("screen_data")
        .select(
          "id, start_date, state, responsible_profile_id, task_profiles(profile_id)"
        )
        .gte("start_date", startWindow)
        .lte("start_date", endWindow);

      if (error) {
        console.error("Error fetching worker calendar", error);
        return;
      }

      const relevant = (data ?? []).filter((task: any) => {
        if (!task) return false;
        if (task.responsible_profile_id === profile.id) return true;
        const profiles = Array.isArray(task.task_profiles) ? task.task_profiles : [];
        return profiles.some((tp: { profile_id?: string }) => tp?.profile_id === profile.id);
      });

      const taskDates = new Set<string>();
      const pendingDates = new Set<string>();

      relevant.forEach((task: any) => {
        if (!task?.start_date) return;
        taskDates.add(task.start_date);
        if (task.state !== "terminado") {
          pendingDates.add(task.start_date);
        }
      });

      setCalendarTaskDays(Array.from(taskDates).map((value) => dayjs(value).toDate()));
      setCalendarPendingDays(Array.from(pendingDates).map((value) => dayjs(value).toDate()));
    };

    fetchCalendar();
  }, [profile?.id]);

  const handleSessionToggle = async () => {
    if (isSessionBusy) return;
    try {
      if (isSessionActive) {
        const finished = await endSession();
        if (finished?.task_id) {
          await markTaskCompleted(finished.task_id);
        }
      } else {
        if (!selectedTask?.id) {
          toast.error("Selecciona una tarea antes de registrar la llegada");
          return;
        }
        await startSession({ taskId: selectedTask.id });
      }
    } catch (error) {
      console.error("Error toggling work session", error);
    }
  };

  const openMapsForTask = useCallback((task: Task | null) => {
    if (!task) return;
    const candidate =
      task.data?.address ?? task.data?.location ?? task.data?.site ?? task.data?.client ?? "";
    if (!candidate) {
      toast.error("Esta tarea no tiene una direccion asociada");
      return;
    }
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(String(candidate))}`;
    if (typeof window !== "undefined") {
      window.open(url, "_blank", "noopener");
    }
  }, []);

  const handleReportIncident = async () => {
    if (!profile?.id) return;

    if (session?.id) {
      try {
        await supabase.rpc("report_incident", {
          p_session_id: session.id,
          p_reported_by: profile.id,
          p_incident_type: "alerta",
          p_severity: "medium",
          p_description: selectedTask?.data?.description ?? "Incidencia registrada desde Workday",
          p_task_id: selectedTask?.id ?? session.task_id ?? null,
          p_metadata: {
            source: "workday",
            reported_from: "operario",
          },
        });
      } catch (rpcError) {
        console.error("Error reporting incident via RPC", rpcError);
      }
    }

    const { error } = await supabase.from("communication_logs").insert({
      type: "incidencia",
      recipient: "panel-admin",
      subject: null,
      message: `Incidencia reportada por ${profile.full_name ?? "operario"} el ${new Date().toISOString()}`,
      status: "pending",
      metadata: {
        profile_id: profile.id,
        source: "workday",
        task_id: selectedTask?.id ?? null,
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

  const {
    data: detailsData,
    isLoading: detailsLoading,
  } = useQuery<{
    sessions: WorkSession[];
    incidents: WorkdayIncident[];
    locations: WorkdayLocation[];
  }>({
    queryKey: ["workday-task-details", profile?.id, detailsTask?.id],
    enabled: detailsOpen && Boolean(profile?.id && detailsTask?.id),
    queryFn: async () => {
      if (!profile?.id || !detailsTask?.id) {
        return { sessions: [], incidents: [], locations: [] };
      }

      const [sessionsResult, incidentReportsResult, communicationLogsResult] = await Promise.all([
        supabase
          .from("work_sessions")
          .select("*")
          .eq("profile_id", profile.id)
          .eq("task_id", detailsTask.id)
          .order("started_at", { ascending: false })
          .limit(10),
        supabase
          .from("incident_reports")
          .select("id, created_at, status, incident_type, severity, description, metadata")
          .eq("task_id", detailsTask.id)
          .order("created_at", { ascending: false })
          .limit(10),
        supabase
          .from("communication_logs")
          .select("id, created_at, message, status, metadata")
          .eq("type", "incidencia")
          .contains("metadata", { task_id: detailsTask.id })
          .order("created_at", { ascending: false })
          .limit(10),
      ]);

      if (sessionsResult.error) throw sessionsResult.error;
      if (incidentReportsResult.error) throw incidentReportsResult.error;
      if (communicationLogsResult.error) throw communicationLogsResult.error;

      const sessions = (sessionsResult.data ?? []) as WorkSession[];
      const incidentReports: WorkdayIncident[] = (incidentReportsResult.data ?? []).map((item: any) => ({
        id: item.id,
        created_at: item.created_at,
        status: item.status,
        incident_type: item.incident_type,
        severity: item.severity,
        description: item.description,
        metadata: item.metadata ?? null,
      }));

      const communicationIncidents: WorkdayIncident[] = (communicationLogsResult.data ?? []).map((item: any) => ({
        id: item.id,
        created_at: item.created_at,
        status: item.status,
        message: item.message,
        metadata: item.metadata ?? null,
      }));

      const sessionIds = sessions.map((session) => session.id);
      let locations: WorkdayLocation[] = [];
      if (sessionIds.length > 0) {
        const locationResult = await supabase
          .from("location_updates")
          .select("id, created_at, location, note, metadata, acknowledged_at, session_id")
          .in("session_id", sessionIds)
          .order("created_at", { ascending: false })
          .limit(10);
        if (locationResult.error) throw locationResult.error;
        locations = (locationResult.data ?? []).map((item: any) => ({
          id: item.id,
          created_at: item.created_at,
          location: item.location ?? null,
          note: item.note ?? null,
          metadata: item.metadata ?? null,
          acknowledged_at: item.acknowledged_at ?? null,
        }));
      }

      return {
        sessions,
        incidents: [...incidentReports, ...communicationIncidents]
          .sort((a, b) => new Date(b.created_at).valueOf() - new Date(a.created_at).valueOf())
          .slice(0, 10),
        locations,
      };
    },
  });

  return (
    <>
      <div className="space-y-6">
      <section className="flex flex-col gap-4 sm:gap-6">
        {(hasActiveSession || hasOutstandingTasks) && (
          <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <ul className="list-disc space-y-1 pl-4">
              {hasActiveSession && session?.started_at && (
                <li>
                  Sesion activa desde {dayjs(session.started_at).format("DD/MM HH:mm")}.
                  Recuerda registrar la salida al finalizar.
                </li>
              )}
              {hasOutstandingTasks && (
                <li>
                  Tienes {outstandingTasksData.length} tarea
                  {outstandingTasksData.length > 1 ? "s" : ""} sin completar. Se mantendran en tu agenda
                  hasta que marques la salida.
                </li>
              )}
            </ul>
          </div>
        )}
        <div className="rounded-2xl border bg-card/60 shadow-sm">
          <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-start sm:justify-between sm:p-6">
            <div className="flex flex-col gap-3">
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                {formattedDateTime}
              </span>
              <div className="space-y-2">
                <h1 className="text-2xl font-semibold leading-tight">
                  {greeting}, {profile?.full_name ?? "equipo"}
                </h1>
                <p className="text-sm text-muted-foreground">
                  Estado actual: <span className="font-semibold text-primary">{stateLabel}</span>. {lastEventLabel}.
                </p>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Duracion: <span className="text-foreground">{durationLabel}</span>
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-2 sm:min-w-[260px] sm:flex-row sm:items-center sm:justify-end">
              <Select
                value={selectedTaskId ?? undefined}
                onValueChange={(value) => setSelectedTaskId(value)}
                disabled={tasksForUser.length === 0}
              >
                <SelectTrigger className="w-full sm:w-60">
                  <SelectValue placeholder="Elige una tarea" />
                </SelectTrigger>
                <SelectContent>
                  {tasksForUser.length === 0 ? (
                    <SelectItem value="__none" disabled>
                      Sin tareas asignadas
                    </SelectItem>
                  ) : (
                    tasksForUser.map((task) => (
                      <SelectItem key={task.id} value={task.id}>
                        {task.data?.site ?? task.data?.location ?? "Tarea asignada"}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              <Button
                variant={isSessionActive ? "destructive" : "outline"}
                className="w-full gap-2 sm:w-auto"
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
              <Button className="w-full gap-2 sm:w-auto" onClick={handleReportIncident}>
                <AlertTriangle className="h-4 w-4" />
                Reportar incidencia
              </Button>
            </div>
          </div>
        </div>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Calendario personal</CardTitle>
            <CardDescription>
              Selecciona el dia que quieres revisar. Tus tareas se actualizaran automaticamente.
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
                  pending: calendarPendingDays,
                }}
                modifiersClassNames={{
                  hasTasks: "rdp-day_hasTasks",
                  pending: "rdp-day_pending",
                }}
              />
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-semibold">Tarea en curso</h2>
          <Button
            variant="secondary"
            size="sm"
            className="gap-2 self-start sm:self-auto"
            onClick={() => toast.success("Checklist enviado al administrador")}
            disabled={!activeTask}
          >
            <CheckCircle2 className="h-4 w-4" />
            Completar checklist
          </Button>
        </div>

        {activeTask ? (
          <Card className="overflow-hidden">
            <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <CardTitle>{activeTask.data?.site ?? "Tarea asignada"}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Ubicacion: {activeTask.data?.location ?? "Por confirmar"}
                </p>
              </div>
              <Badge variant="default" className="self-start uppercase sm:self-auto">
                {activeTask.state ?? "pendiente"}
              </Badge>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                {formatTaskWindow(activeTask)} | Responsable: {activeTask.responsible?.full_name ?? ""}
              </div>
              <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                <span>
                  Duracion: <span className="font-semibold text-foreground">{durationLabel}</span>
                </span>
                <span>Estado: {stateLabel}</span>
              </div>
              {activeTask.data?.description && (
                <p className="text-sm text-muted-foreground">{activeTask.data.description}</p>
              )}
              <Button
                variant="outline"
                className="w-full sm:w-auto"
                onClick={() => {
                  setDetailsTask(activeTask);
                  setDetailsOpen(true);
                }}
              >
                Ver detalles
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card className="overflow-hidden">
            <CardContent className="p-6 text-center text-sm text-muted-foreground">
              No tienes tareas activas para la fecha seleccionada.
            </CardContent>
          </Card>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-semibold">Proximas tareas</h2>
          <Button variant="ghost" size="sm">
            Ver agenda completa
          </Button>
        </div>
        <div className="grid gap-3">
          {loadingTasks ? (
            <div className="space-y-3">
              <div className="h-16 w-full animate-pulse rounded-md bg-muted" />
              <div className="h-16 w-full animate-pulse rounded-md bg-muted" />
            </div>
          ) : upcomingTasks.length === 0 ? (
            <div className="rounded-md border border-dashed border-muted p-6 text-center text-sm text-muted-foreground">
              No tienes mas tareas programadas para esta fecha.
            </div>
          ) : (
            upcomingTasks.map((task) => (
              <Card key={task.id} className="overflow-hidden">
                <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
                  <div className="min-w-0 space-y-2">
                    <div>
                      <p className="font-medium">
                        {task.data?.site ?? task.data?.location ?? "Tarea asignada"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {formatTaskWindow(task)} | {task.data?.location ?? "Lugar por confirmar"}
                      </p>
                      {task.responsible?.full_name && (
                        <p className="text-xs text-muted-foreground">
                          Responsable: {task.responsible.full_name}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-stretch gap-2 sm:items-end">
                    <Badge variant="secondary" className="self-start uppercase sm:self-end">
                      {task.state ?? "pendiente"}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="justify-start sm:justify-center"
                      onClick={() => {
                        setDetailsTask(task);
                        setDetailsOpen(true);
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
      </section>

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
    </div>

      <Dialog
        open={detailsOpen && Boolean(detailsTask)}
        onOpenChange={(open) => {
          setDetailsOpen(open);
          if (!open) {
            setDetailsTask(null);
          }
        }}
      >
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {detailsTask?.data?.site ?? detailsTask?.data?.location ?? "Detalle de la tarea"}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh] pr-2">
            <div className="space-y-6 py-2">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Resumen de la instalacion</p>
                <div className="rounded-lg border bg-muted/20 p-3">
                  <p className="text-base font-semibold">
                    {detailsTask?.data?.site ?? detailsTask?.data?.location ?? "Sin nombre"}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                    <span className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      {detailsTask ? formatTaskWindow(detailsTask) : "--:--"}
                    </span>
                    {detailsTask?.data?.location && (
                      <span className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        {detailsTask.data.location}
                      </span>
                    )}
                    {detailsTask?.responsible?.full_name && (
                      <span className="flex items-center gap-2">
                        Responsable: {detailsTask.responsible.full_name}
                      </span>
                    )}
                  </div>
                  <div className="mt-3">
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
                {detailsTask?.data?.description && (
                  <p className="rounded-lg border bg-muted/10 p-3 text-sm text-muted-foreground">
                    {detailsTask.data.description}
                  </p>
                )}
              </div>

              <Separator />

              <div>
                <h3 className="text-sm font-semibold text-foreground">Sesiones recientes</h3>
                <div className="mt-3 space-y-3 text-sm">
                  {detailsLoading ? (
                    <p className="text-muted-foreground">Cargando sesiones...</p>
                  ) : detailsData?.sessions && detailsData.sessions.length > 0 ? (
                    detailsData.sessions.map((item) => (
                      <div
                        key={item.id}
                        className="rounded-lg border bg-muted/10 p-3 leading-relaxed"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="font-medium text-foreground">
                            {dayjs(item.started_at).format("DD/MM/YYYY HH:mm")}
                          </span>
                          <Badge variant={item.status === "completed" ? "secondary" : "outline"}>
                            {item.status ?? "sin estado"}
                          </Badge>
                        </div>
                        <p className="mt-1 text-muted-foreground">
                          Finalizo:{" "}
                          {item.ended_at
                            ? dayjs(item.ended_at).format("DD/MM/YYYY HH:mm")
                            : "en curso"}
                        </p>
                        <p className="text-muted-foreground">
                          Duracion estimada:{" "}
                          {(() => {
                            const start = dayjs(item.started_at);
                            const end = item.ended_at ? dayjs(item.ended_at) : dayjs();
                            const diff = Math.max(0, end.diff(start, "second"));
                            const hours = Math.floor(diff / 3600)
                              .toString()
                              .padStart(2, "0");
                            const minutes = Math.floor((diff % 3600) / 60)
                              .toString()
                              .padStart(2, "0");
                            const seconds = (diff % 60).toString().padStart(2, "0");
                            return `${hours}:${minutes}:${seconds}`;
                          })()}
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="text-muted-foreground">Sin sesiones registradas para esta tarea.</p>
                  )}
                </div>
              </div>

              <Separator />

              <div>
                <h3 className="text-sm font-semibold text-foreground">Incidencias</h3>
                <div className="mt-3 space-y-3 text-sm">
                  {detailsLoading ? (
                    <p className="text-muted-foreground">Revisando incidencias...</p>
                  ) : detailsData?.incidents && detailsData.incidents.length > 0 ? (
                    detailsData.incidents.map((incident) => (
                      <div key={incident.id} className="rounded-lg border bg-muted/10 p-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="font-medium text-foreground">
                            {dayjs(incident.created_at).format("DD/MM/YYYY HH:mm")}
                          </span>
                          {incident.status && (
                            <Badge variant="outline" className="uppercase">
                              {incident.status}
                            </Badge>
                          )}
                        </div>
                        <p className="mt-1 text-muted-foreground">
                          {incident.description ?? incident.message ?? "Incidencia registrada"}
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="text-muted-foreground">
                      No hay incidencias asociadas a esta tarea.
                    </p>
                  )}
                </div>
              </div>

              <Separator />

              <div>
                <h3 className="text-sm font-semibold text-foreground">Ubicaciones enviadas</h3>
                <div className="mt-3 space-y-3 text-sm">
                  {detailsLoading ? (
                    <p className="text-muted-foreground">Recopilando ubicaciones...</p>
                  ) : detailsData?.locations && detailsData.locations.length > 0 ? (
                    detailsData.locations.map((location) => {
                      const lat =
                        typeof location.location?.lat === "number"
                          ? location.location.lat
                          : undefined;
                      const lng =
                        typeof location.location?.lng === "number"
                          ? location.location.lng
                          : undefined;
                      const coordsLabel =
                        lat !== undefined && lng !== undefined
                          ? `${lat.toFixed(5)}, ${lng.toFixed(5)}`
                          : "Sin coordenadas registradas";
                      return (
                        <div key={location.id} className="rounded-lg border bg-muted/10 p-3">
                          <div className="flex flex-wrap items-center justify-between gap-2 text-foreground">
                            <span>{dayjs(location.created_at).format("DD/MM/YYYY HH:mm")}</span>
                            {lat !== undefined && lng !== undefined && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="gap-2"
                                onClick={() => {
                                  const url = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
                                  window.open(url, "_blank", "noopener");
                                }}
                              >
                                <MapPin className="h-4 w-4" />
                                Ver en Maps
                              </Button>
                            )}
                          </div>
                          <p className="text-muted-foreground">{coordsLabel}</p>
                          {location.note && (
                            <p className="text-xs text-muted-foreground">Nota: {location.note}</p>
                          )}
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-muted-foreground">No hay ubicaciones asociadas todavia.</p>
                  )}
                </div>
              </div>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
}
