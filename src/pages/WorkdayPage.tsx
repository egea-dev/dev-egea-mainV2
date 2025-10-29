import { useCallback, useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import "dayjs/locale/es";
import relativeTime from "dayjs/plugin/relativeTime";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Separator } from "@/components/ui/separator";
import { Clock, CheckCircle, CheckCircle2, MessageCircle, AlertTriangle, MapPin, Info } from "lucide-react";
import { useProfile, useTasksByDate } from "@/hooks/use-supabase";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Task } from "@/types";
import { useWorkSession } from "@/hooks/use-work-session";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { WorkSession } from "@/types";
import { buildMapsSearchUrl } from "@/utils/maps";
import { normalizeTaskLocation } from "@/utils/task";
import { TaskActionButtons, type TaskActionConfig } from "@/components/tasks/TaskActionButtons";
import { TaskDetailsDialog } from "@/components/tasks/TaskDetailsDialog";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const hasMeaningfulText = (value: unknown): boolean => {
  if (typeof value !== "string") return false;
  const trimmed = value.trim();
  if (!trimmed.length) return false;
  const normalized = trimmed.toLowerCase();
  return normalized !== "n/a" && normalized !== "sin descripcion" && normalized !== "sin descripción";
};

const hasTaskDetails = (task?: Task | null, locationLabel?: string): boolean => {
  if (!task) return false;

  const descriptionCandidates = [
    task.description,
    task.site,
    task.data?.description,
    task.data?.notes,
    task.data?.detalle,
  ];

  if (descriptionCandidates.some(hasMeaningfulText)) {
    return true;
  }

  const locationCandidate = typeof locationLabel === "string" ? locationLabel : normalizeTaskLocation(task);
  if (hasMeaningfulText(locationCandidate)) {
    return true;
  }

  if (Array.isArray(task.assigned_users) && task.assigned_users.length > 0) {
    return true;
  }

  if (Array.isArray(task.assigned_vehicles) && task.assigned_vehicles.length > 0) {
    return true;
  }

  if (task.data) {
    const hasExtraStrings = Object.values(task.data).some((entry) => hasMeaningfulText(entry));
    if (hasExtraStrings) return true;
  }

  return false;
};

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

type ScreenDataResponsibleRow = {
  id: string;
  state: string | null;
  start_date: string | null;
  data: Record<string, unknown> | null;
  responsible?: { id: string; full_name: string } | null;
};

type CalendarScreenDataRow = {
  id: string;
  start_date: string | null;
  state: string | null;
  responsible_profile_id: string | null;
  task_profiles?: { profile_id: string | null }[] | null;
};

type IncidentReportRow = {
  id: string;
  created_at: string;
  status: string | null;
  incident_type: string | null;
  severity: string | null;
  description: string | null;
  metadata: Record<string, unknown> | null;
};

type CommunicationLogRow = {
  id: string;
  created_at: string;
  message?: string | null;
  status?: string | null;
  metadata?: Record<string, unknown> | null;
};

type LocationUpdateRow = {
  id: string;
  created_at: string;
  location: Record<string, unknown> | null;
  note: string | null;
  metadata: Record<string, unknown> | null;
  acknowledged_at?: string | null;
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
  const [incidentDialogOpen, setIncidentDialogOpen] = useState(false);
  const [incidentTargetTask, setIncidentTargetTask] = useState<Task | null>(null);
  const [incidentForm, setIncidentForm] = useState({ type: "", description: "" });
  const [incidentErrors, setIncidentErrors] = useState<{ type?: string; description?: string }>({});
  const [isReportingIncident, setIsReportingIncident] = useState(false);
  const [completedTaskIds, setCompletedTaskIds] = useState<Set<string>>(new Set());

  const tasksForUser = useMemo(() => {
    if (!profile?.id) return [];
    return allTasks.filter((task) => {
      if (task.responsible_profile_id === profile.id) return true;
      const assigned = task.assigned_users ?? [];
      return assigned.some((user) => user.id === profile.id);
    });
  }, [allTasks, profile?.id]);

  useEffect(() => {
    setCompletedTaskIds((prev) => {
      const next = new Set(prev);
      let changed = false;

      tasksForUser.forEach((task) => {
        if (task.state === "terminado" && !next.has(task.id)) {
          next.add(task.id);
          changed = true;
        }
      });

      // Remove ids that no longer exist in tasksForUser to keep state clean
      for (const id of Array.from(next)) {
        if (!tasksForUser.some((task) => task.id === id && task.state === "terminado")) {
          next.delete(id);
          changed = true;
        }
      }

      return changed ? next : prev;
    });
  }, [tasksForUser]);

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

  const activeTaskLocation = useMemo(() => normalizeTaskLocation(activeTask), [activeTask]);
  const isActiveTaskCompleted = useMemo(() => {
    if (!activeTask) return false;
    return completedTaskIds.has(activeTask.id) || activeTask.state === "terminado";
  }, [activeTask, completedTaskIds]);

  const upcomingTasks = useMemo(() => {
    if (!activeTask) return tasksForUser;
    return tasksForUser.filter((task) => task.id !== activeTask.id);
  }, [tasksForUser, activeTask]);

  const canShowActiveTaskDetails = useMemo(
    () => hasTaskDetails(activeTask, activeTaskLocation),
    [activeTask, activeTaskLocation]
  );

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
  } = useWorkSession({ profileId: profile?.id, taskId: activeTask?.id ?? null, task: activeTask ?? null });

  const isSessionBusy = isStarting || isEnding;

  const { data: outstandingTasksData = [] } = useQuery<OutstandingTask[]>({
    queryKey: ["outstanding-tasks", profile?.id],
    enabled: Boolean(profile?.id),
    staleTime: 60_000,
    queryFn: async () => {
      if (!profile?.id) return [];

      const [responsibleResult, taskProfileResult] = await Promise.all([
        supabase
          .from("screen_data")
          .select(
            `id, state, start_date, data,
             responsible:responsible_profile_id(id, full_name)`
          )
          .neq("state", "terminado")
          .eq("responsible_profile_id", profile.id),
        supabase
          .from("task_profiles")
          .select("task_id")
          .eq("profile_id", profile.id),
      ]);

      if (responsibleResult.error) throw responsibleResult.error;
      if (taskProfileResult.error) throw taskProfileResult.error;

      const assignedTaskIds = (taskProfileResult.data ?? []).map((row) => row.task_id);
      let assignedTasks: OutstandingTask[] = [];

      if (assignedTaskIds.length > 0) {
        const { data: assignedData, error: assignedError } = await supabase
          .from("screen_data")
          .select(
            `id, state, start_date, data,
             responsible:responsible_profile_id(id, full_name)`
          )
          .neq("state", "terminado")
          .in("id", assignedTaskIds);

        if (assignedError) throw assignedError;

        const assignedRows = (assignedData ?? []) as ScreenDataResponsibleRow[];
        assignedTasks =
          assignedRows.map((row) => ({
            id: row.id,
            state: row.state ?? "pendiente",
            start_date: row.start_date ?? null,
            data: row.data ?? null,
            responsible: row.responsible
              ? { id: row.responsible.id, full_name: row.responsible.full_name }
              : null,
          })) ?? [];
      }

      const responsibleRows = (responsibleResult.data ?? []) as ScreenDataResponsibleRow[];
      const responsibleTasks =
        responsibleRows.map((row) => ({
          id: row.id,
          state: row.state ?? "pendiente",
          start_date: row.start_date ?? null,
          data: row.data ?? null,
          responsible: row.responsible
            ? { id: row.responsible.id, full_name: row.responsible.full_name }
            : null,
        })) ?? [];

      const unique = new Map<string, OutstandingTask>();
      [...responsibleTasks, ...assignedTasks].forEach((task) => {
        if (!unique.has(task.id)) {
          unique.set(task.id, task);
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

      toast.success("Tarea marcada como terminada. El administrador podrá archivarla cuando lo valide.");

      setCompletedTaskIds((prev) => {
        const next = new Set(prev);
        next.add(taskId);
        return next;
      });

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

      const rows = (data ?? []) as CalendarScreenDataRow[];
      const relevant = rows.filter((task) => {
        if (!task) return false;
        if (task.responsible_profile_id === profile.id) return true;
        const profiles = Array.isArray(task.task_profiles) ? task.task_profiles : [];
        return profiles.some((tp: { profile_id?: string }) => tp?.profile_id === profile.id);
      });

      const taskDates = new Set<string>();
      const pendingDates = new Set<string>();

      relevant.forEach((task) => {
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

  const handleSessionToggleForTask = async (target: Task | null) => {
    if (isSessionBusy) return;
    try {
      if (isSessionActive) {
        const finished = await endSession();
        if (finished?.task_id) {
          await markTaskCompleted(finished.task_id);
        }
      } else {
        const chosen = target ?? activeTask ?? null;
        if (!chosen?.id) {
          toast.error("Selecciona una tarea antes de registrar la llegada");
          return;
        }
        setSelectedTaskId(chosen.id);
        await startSession({
          taskId: chosen.id,
          taskLocation: normalizeTaskLocation(chosen),
        });
      }
    } catch (error) {
      console.error("Error toggling work session", error);
    }
  };

  const openMapsForTask = useCallback((task: Task | null) => {
    if (!task) return;
    const candidate = normalizeTaskLocation(task);
    if (!candidate) {
      toast.error("Esta tarea no tiene una direccion asociada");
      return;
    }
    const url = buildMapsSearchUrl(String(candidate));
    if (typeof window !== "undefined") {
      window.open(url, "_blank", "noopener");
    }
  }, []);

  const resetIncidentForm = useCallback(() => {
    setIncidentForm({ type: "", description: "" });
    setIncidentErrors({});
    setIncidentTargetTask(null);
  }, []);

  const openIncidentDialog = (targetTask?: Task | null) => {
    if (!profile?.id) return;
    if (!session?.id) {
      toast.error("Debes iniciar la sesión antes de reportar una incidencia");
      return;
    }
    const taskContext = targetTask ?? selectedTask ?? activeTask ?? null;
    setIncidentTargetTask(taskContext);
    setIncidentForm({
      type: "",
      description:
        (taskContext?.data?.description as string | undefined)?.trim() ??
        "Describe brevemente lo ocurrido",
    });
    setIncidentErrors({});
    setIncidentDialogOpen(true);
  };

  const validateIncidentForm = () => {
    const errors: { type?: string; description?: string } = {};
    if (!incidentForm.type.trim()) {
      errors.type = "Indica el tipo o título de la incidencia.";
    }
    if (!incidentForm.description.trim()) {
      errors.description = "Describe lo ocurrido antes de enviar la incidencia.";
    }
    setIncidentErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const submitIncidentReport = async () => {
    if (!profile?.id || !session?.id) return;
    if (!validateIncidentForm()) {
      toast.error("Completa la información de la incidencia antes de enviarla.");
      return;
    }

    const taskId = incidentTargetTask?.id ?? session.task_id ?? null;

    if (!taskId) {
      toast.error("No se pudo identificar la tarea asociada a la incidencia.");
      return;
    }

    setIsReportingIncident(true);
    try {
      await supabase.rpc("report_incident", {
        p_session_id: session.id,
        p_reported_by: profile.id,
        p_incident_type: incidentForm.type.trim(),
        p_severity: "medium",
        p_description: incidentForm.description.trim(),
        p_task_id: taskId,
        p_metadata: {
          source: "workday",
          reported_from: "operario",
        },
      });
      toast.success("Incidencia registrada correctamente");
      setIncidentDialogOpen(false);
      resetIncidentForm();
      queryClient.invalidateQueries({ queryKey: ["workday-task-details", profile.id, taskId] });
    } catch (rpcError) {
      console.error("Error reporting incident via RPC", rpcError);
      toast.error("No se pudo registrar la incidencia");
    } finally {
      setIsReportingIncident(false);
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
      const incidentRows = (incidentReportsResult.data ?? []) as IncidentReportRow[];
      const incidentReports: WorkdayIncident[] = incidentRows.map((item) => ({
        id: item.id,
        created_at: item.created_at,
        status: item.status,
        incident_type: item.incident_type,
        severity: item.severity,
        description: item.description,
        metadata: item.metadata ?? null,
      }));

      const communicationRows = (communicationLogsResult.data ?? []) as CommunicationLogRow[];
      const communicationIncidents: WorkdayIncident[] = communicationRows.map((item) => ({
        id: item.id,
        created_at: item.created_at,
        status: item.status ?? null,
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
        const locationRows = (locationResult.data ?? []) as LocationUpdateRow[];
        locations = locationRows.map((item) => ({
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
      <div className="space-y-4 sm:space-y-6">
      <section className="flex flex-col gap-3 sm:gap-6">
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
        <div className="rounded-2xl border bg-card/60">
          <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6 sm:p-6">
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
                className="w-full rounded-md border"
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
                  Ubicacion: {activeTaskLocation || "Por confirmar"}
                </p>
                <p className="text-xs text-muted-foreground">
                  Montaje:{" "}
                  {activeTask.start_date
                    ? dayjs(activeTask.start_date).format("DD/MM/YYYY")
                    : "Sin fecha asignada"}
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
              {activeTask.data?.client && (
                <p className="text-xs text-muted-foreground">
                  Cliente: {activeTask.data.client}
                </p>
              )}
              <div className="flex justify-center">
                <TaskActionButtons
                  actions={[
                    {
                      id: "toggle-session",
                      label: isSessionActive ? "Registrar salida" : "Registrar llegada",
                      icon: <Clock className="h-4 w-4" />,
                      variant: "primary",
                      onClick: async () => {
                        setSelectedTaskId(activeTask.id);
                        await handleSessionToggleForTask(activeTask);
                      },
                      loading: isSessionBusy,
                      disabled: !profile?.id || isActiveTaskCompleted,
                    },
                    {
                      id: "maps",
                      label: "Ver en Maps",
                      icon: <MapPin className="h-4 w-4" />,
                      variant: "outline-success",
                      onClick: () => openMapsForTask(activeTask),
                      disabled: !activeTaskLocation,
                    },
                    {
                      id: "details",
                      label: "Ver detalles",
                      icon: <Info className="h-4 w-4" />,
                      variant: "outline-success",
                      onClick: () => {
                        setSelectedTaskId(activeTask.id);
                        setDetailsTask(activeTask);
                        setDetailsOpen(true);
                      },
                      disabled: !canShowActiveTaskDetails,
                    },
                    {
                      id: "incident",
                      label: "Reportar incidencia",
                      icon: <AlertTriangle className="h-4 w-4" />,
                      variant: "outline-warning",
                      onClick: () => openIncidentDialog(activeTask),
                      disabled: activeTask.state === "terminado",
                    },
                  ]}
                />
              </div>
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
            upcomingTasks.map((task) => {
              const locationLabel = normalizeTaskLocation(task);
              const hasDetails = hasTaskDetails(task, locationLabel);
              const isTaskCompleted = completedTaskIds.has(task.id) || task.state === "terminado";

              return (
                <Card key={task.id} className="overflow-hidden">
                  <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
                    <div className="min-w-0 space-y-2">
                      <div>
                        <p className="font-medium">
                          {task.data?.site ?? task.data?.location ?? "Tarea asignada"}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {formatTaskWindow(task)} | {locationLabel || "Lugar por confirmar"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Montaje:{" "}
                          {task.start_date
                            ? dayjs(task.start_date).format("DD/MM/YYYY")
                            : "Sin fecha"}
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
                        {isTaskCompleted ? "realizado" : task.state ?? "pendiente"}
                      </Badge>
                      <TaskActionButtons
                        actions={[
                          {
                            id: "register",
                            label: "Registrar llegada",
                            icon: <Clock className="h-4 w-4" />,
                            variant: "primary",
                            onClick: async () => {
                              setSelectedTaskId(task.id);
                              await handleSessionToggleForTask(task);
                            },
                            loading: isSessionBusy,
                            disabled: isTaskCompleted,
                          },
                          {
                            id: "maps",
                            label: "Ver en Maps",
                            icon: <MapPin className="h-4 w-4" />,
                            variant: "outline-success",
                            onClick: () => openMapsForTask(task),
                            disabled: !locationLabel,
                          },
                          {
                            id: "details",
                            label: "Ver detalles",
                            icon: <Info className="h-4 w-4" />,
                            variant: "outline-success",
                            onClick: () => {
                              setSelectedTaskId(task.id);
                              setDetailsTask(task);
                              setDetailsOpen(true);
                            },
                            disabled: !hasDetails,
                          },
                          {
                            id: "incident",
                            label: "Reportar incidencia",
                            icon: <AlertTriangle className="h-4 w-4" />,
                            variant: "outline-warning",
                            onClick: () => openIncidentDialog(task),
                            disabled: isTaskCompleted,
                          },
                        ]}
                      />
                    </div>
                  </CardContent>
                </Card>
              );
            })
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

      <TaskDetailsDialog
        task={detailsTask}
        open={detailsOpen && Boolean(detailsTask)}
        onOpenChange={(open) => {
          setDetailsOpen(open);
          if (!open) {
            setDetailsTask(null);
          }
        }}
        title={detailsTask?.data?.site ?? detailsTask?.data?.location ?? "Detalle de la tarea"}
        description="Información detallada de la tarea seleccionada."
        actions={
          detailsTask
            ? [
                ...(detailsTask.state !== "terminado"
                  ? [
                      {
                        id: "toggle-session",
                        label:
                          session?.task_id === detailsTask.id && isSessionActive
                            ? "Registrar salida"
                            : "Registrar llegada",
                        icon: <Clock className="h-4 w-4" />,
                        variant: "primary",
                        onClick: async () => {
                          setSelectedTaskId(detailsTask.id);
                          await handleSessionToggleForTask(detailsTask);
                        },
                        loading: isSessionBusy,
                      } satisfies TaskActionConfig,
                    ]
                  : []),
                {
                  id: "maps",
                  label: "Ver en Maps",
                  icon: <MapPin className="h-4 w-4" />,
                  variant: "outline-success",
                  onClick: () => openMapsForTask(detailsTask),
                  disabled: !normalizeTaskLocation(detailsTask),
                } satisfies TaskActionConfig,
                {
                  id: "incident",
                  label: "Reportar incidencia",
                  icon: <AlertTriangle className="h-4 w-4" />,
                  variant: "outline-warning",
                  onClick: () => openIncidentDialog(detailsTask),
                  disabled: (detailsTask?.state ?? "") === "terminado",
                } satisfies TaskActionConfig,
              ]
            : []
        }
      >
        <div className="space-y-6 py-2">
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
                              if (typeof window !== "undefined") {
                                window.open(url, "_blank", "noopener");
                              }
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
      </TaskDetailsDialog>

      <Dialog
        open={incidentDialogOpen}
        onOpenChange={(open) => {
          setIncidentDialogOpen(open);
          if (!open) {
            resetIncidentForm();
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reportar incidencia</DialogTitle>
            <DialogDescription>
              Completa los detalles de la incidencia detectada para la tarea
              {incidentTargetTask ? ` "${incidentTargetTask.data?.site ?? "sin título"}".` : "."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="incident-type">Tipo de incidencia *</Label>
              <Input
                id="incident-type"
                value={incidentForm.type}
                onChange={(event) => setIncidentForm((prev) => ({ ...prev, type: event.target.value }))}
                placeholder="Ej. Retraso, Falta de material, Seguridad..."
              />
              {incidentErrors.type && (
                <p className="text-xs text-destructive">{incidentErrors.type}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="incident-description">Descripción *</Label>
              <Textarea
                id="incident-description"
                value={incidentForm.description}
                onChange={(event) =>
                  setIncidentForm((prev) => ({ ...prev, description: event.target.value }))
                }
                placeholder="Describe qué ocurrió y qué impacto tiene."
                rows={4}
              />
              {incidentErrors.description && (
                <p className="text-xs text-destructive">{incidentErrors.description}</p>
              )}
            </div>
          </div>
          <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <DialogClose asChild>
              <Button variant="outline">Cancelar</Button>
            </DialogClose>
            <Button onClick={submitIncidentReport} disabled={isReportingIncident}>
              {isReportingIncident ? "Enviando..." : "Enviar incidencia"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
