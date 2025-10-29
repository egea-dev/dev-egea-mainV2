import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useLocation } from "react-router-dom";
import {
  DndContext,
  PointerSensor,
  DragOverlay,
  DragEndEvent,
  DragStartEvent,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, verticalListSortingStrategy } from "@dnd-kit/sortable";
import dayjs from "dayjs";
import "dayjs/locale/es";
import { es } from "date-fns/locale";
import { format, parseISO, subDays } from "date-fns";
import { cn } from "@/lib/utils";

import { Task, Profile, Vehicle } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Users, Car, Share2, Download, MessageSquare, Plus, Search } from "lucide-react";

import "@/styles/installations.css";

import { DailyTaskTable } from "@/components/installations/DailyTaskTable";
import { DraggableSidebarItem } from "@/components/installations/DraggableSidebarItem";
import { TaskDialog } from "@/components/installations/TaskDialog";
import { UserDialog } from "@/components/users/UserDialog";
import { VehicleBadge, StatusBadge } from "@/components/badges";

import { useAdminData } from "@/hooks/use-admin-data";
import {
  useTasksByDate,
  useUpdateTaskOrder,
  useAssignToTask,
  useCreateSharedPlan,
  useProfile,
} from "@/hooks/use-supabase";
import { useIsMobile } from "@/hooks/use-mobile";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

dayjs.locale("es");

const CALENDAR_CLASSNAMES = {
  today: "bg-orange-500 text-white hover:bg-orange-600 rounded-md font-medium ring-2 ring-orange-300",
  pending: "bg-amber-200 text-amber-900 dark:bg-amber-900 dark:text-amber-200 rounded-md font-medium",
  busy: "bg-orange-200 text-orange-900 dark:bg-orange-900/50 dark:text-orange-200 rounded-md font-medium",
};

export default function InstallationsPage() {
  const { users, vehicles, fetchData: refreshAdminData } = useAdminData();
  const isMobile = useIsMobile();
  const location = useLocation();

  const queryParams = new URLSearchParams(location.search);
  const dateFromQuery = queryParams.get("date");
  const initialDate = dateFromQuery ? dayjs(dateFromQuery).toDate() : new Date();

  const [date, setDate] = useState<Date | undefined>(initialDate);
  const [daysWithPendingTasks, setDaysWithPendingTasks] = useState<Date[]>([]);
  const [daysWithTasks, setDaysWithTasks] = useState<Date[]>([]);

  const { data: tasks = [], isLoading: loadingTasks, refetch } = useTasksByDate(date!);
  const updateOrderMutation = useUpdateTaskOrder(date);
  const assignToTaskMutation = useAssignToTask(date);
  const createSharedPlanMutation = useCreateSharedPlan();

  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [draggedItem, setDraggedItem] = useState<{ type: "user" | "vehicle"; item: Profile | Vehicle } | null>(null);

  const [isUserDialogOpen, setIsUserDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [isSendingWhatsApp, setIsSendingWhatsApp] = useState(false);

  const { data: profile } = useProfile();
  const isManagerView = profile?.role === "admin" || profile?.role === "manager";

  const [operatorSearch, setOperatorSearch] = useState("");
  const [vehicleSearch, setVehicleSearch] = useState("");

  const filteredUsers = useMemo(() => {
    const normalizedQuery = operatorSearch.trim().toLowerCase();
    if (!normalizedQuery) return users;
    return users.filter((user) => {
      const name = user.full_name?.toLowerCase() ?? "";
      const email = user.email?.toLowerCase() ?? "";
      return name.includes(normalizedQuery) || email.includes(normalizedQuery);
    });
  }, [operatorSearch, users]);

  const taskCountByProfile = useMemo(() => {
    const counts = new Map<string, number>();
    tasks.forEach((task) => {
      task.assigned_users.forEach((assigned) => {
        counts.set(assigned.id, (counts.get(assigned.id) ?? 0) + 1);
      });
    });
    return counts;
  }, [tasks]);

  const activeVehicles = useMemo(
    () => vehicles.filter((vehicle) => vehicle.is_active !== false),
    [vehicles]
  );

  const filteredVehicles = useMemo(() => {
    const normalizedQuery = vehicleSearch.trim().toLowerCase();
    if (!normalizedQuery) return activeVehicles;

    return activeVehicles.filter((vehicle) => {
      const name = vehicle.name?.toLowerCase() ?? "";
      const type = (vehicle.type as string | undefined)?.toLowerCase() ?? "";
      const license = vehicle.license_plate?.toLowerCase() ?? "";
      return (
        name.includes(normalizedQuery) ||
        type.includes(normalizedQuery) ||
        license.includes(normalizedQuery)
      );
    });
  }, [activeVehicles, vehicleSearch]);
  const sensors = useSensors(useSensor(PointerSensor));

  const calendarModifiers = useMemo(
    () => ({
      today: new Date(),
      pending: daysWithPendingTasks,
      busy: daysWithTasks,
    }),
    [daysWithPendingTasks, daysWithTasks]
  );

  const formatTaskTime = (task: Task) => {
    const startLabel = task.start_date ? dayjs(task.start_date).format("HH:mm") : "--";
    const endLabel = task.end_date ? dayjs(task.end_date).format("HH:mm") : "--";
    return `${startLabel} - ${endLabel}`;
  };

  const refreshCalendarData = useCallback(async () => {
    try {
      const sixtyDaysAgo = subDays(new Date(), 60);
      const startDateFilter = format(sixtyDaysAgo, "yyyy-MM-dd");

      const { data, error } = await supabase
        .from("detailed_tasks")
        .select("start_date, state")
        .eq("screen_group", "Instalaciones")
        .gte("start_date", startDateFilter);

      if (error) {
        console.error("Error fetching calendar data:", error);
        return;
      }

      const pendingDays = new Set<string>();
      const taskDays = new Set<string>();

      (data ?? []).forEach((task) => {
        if (!task?.start_date) return;
        const taskDate = parseISO(task.start_date);
        if (Number.isNaN(taskDate.getTime())) return;

        const key = format(taskDate, "yyyy-MM-dd");
        taskDays.add(key);
        if (task.state !== "terminado") {
          pendingDays.add(key);
        }
      });

      setDaysWithPendingTasks(Array.from(pendingDays).map((entry) => parseISO(entry)));
      setDaysWithTasks(Array.from(taskDays).map((entry) => parseISO(entry)));
    } catch (error) {
      console.error("Error refreshing calendar markers:", error);
    }
  }, []);

  useEffect(() => {
    refreshCalendarData();
  }, [refreshCalendarData]);

  useEffect(() => {
    const channel = supabase
      .channel("installations-calendar")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "screen_data" },
        () => refreshCalendarData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refreshCalendarData]);

  const handleEditTask = (task: Task) => {
    setSelectedTask(task);
    setIsTaskDialogOpen(true);
  };

  const handleEditUser = (user: Profile) => {
    setSelectedUser(user);
    setIsUserDialogOpen(true);
  };

  const handleDragStart = (event: DragStartEvent) => {
    if (event.active.id.toString().startsWith("sidebar-item-")) {
      setDraggedItem(event.active.data.current as { type: "user" | "vehicle"; item: Profile | Vehicle });
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setDraggedItem(null);
    const { active, over } = event;
    if (!over) return;

    const activeIsDraggableItem = active.id.toString().startsWith("sidebar-item-");
    const overIsTaskRow = tasks.some((task) => task.id === over.id);

    if (activeIsDraggableItem && overIsTaskRow) {
      const payload = active.data.current as { type: "user" | "vehicle"; item: Profile | Vehicle };
      assignToTaskMutation.mutate(
        { taskId: over.id.toString(), itemId: payload.item.id, type: payload.type },
        {
          onSuccess: () => refetch(),
          onError: () =>
            toast.error(
              `Error al asignar ${payload.type === "user" ? "operario" : "vehiculo"}`
            ),
        }
      );
      return;
    }

    if (active.id === over.id) return;
    const oldIndex = tasks.findIndex((task) => task.id === active.id);
    const newIndex = tasks.findIndex((task) => task.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const nextOrder = arrayMove(tasks, oldIndex, newIndex);
    updateOrderMutation.mutate(nextOrder, {
      onError: () => toast.error("Error al reordenar tareas"),
    });
  };

  const handleShare = () => {
    if (date) {
      createSharedPlanMutation.mutate(date);
    }
  };

  const handleSendWhatsApp = async () => {
    if (!date || tasks.length === 0) {
      toast.error("No hay tareas para compartir");
      return;
    }

    setIsSendingWhatsApp(true);
    try {
      const tasksByUser = tasks.reduce<Record<string, { user: Profile; tasks: Task[] }>>((acc, task) => {
        task.assigned_users.forEach((user) => {
          if (!acc[user.id]) {
            acc[user.id] = { user, tasks: [] };
          }
          acc[user.id].tasks.push(task);
        });
        return acc;
      }, {});

      const notificationsSent: string[] = [];

      for (const { user, tasks: userTasks } of Object.values(tasksByUser)) {
        if (!user.phone) continue;

        const { data: notification, error: notificationError } = await supabase
          .from("task_notifications")
          .insert({
            profile_id: user.id,
            task_ids: userTasks.map((task) => task.id),
            plan_date: date.toISOString(),
            access_token: crypto.randomUUID(),
            sent_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (notificationError) {
          console.error("Error saving notification", notificationError);
          continue;
        }

        const whatsappTasks = userTasks.map((task) => ({
          site: task.data?.site || "Sin sitio",
          address: task.data?.address || "Sin direccion",
          time: `${dayjs(task.start_date).format("HH:mm")} - ${dayjs(task.end_date).format("HH:mm")}`,
          vehicle: task.assigned_vehicles?.map((vehicle) => vehicle.name).join(", "),
        }));

        const message = `Hola ${user.full_name}, aqui esta tu plan de trabajo para hoy (${dayjs(date).format(
          "DD/MM/YYYY"
        )}):`;

        const { error: whatsappError } = await supabase.functions.invoke("send-whatsapp-notification", {
          body: {
            to: user.phone,
            message,
            tasks: whatsappTasks,
          },
        });

        if (whatsappError) {
          console.error("Error sending WhatsApp", whatsappError);
          toast.error(`No se pudo enviar WhatsApp a ${user.full_name}`);
        } else {
          notificationsSent.push(notification?.id ?? "");
        }
      }

      if (notificationsSent.length > 0) {
        toast.success(`Notificaciones enviadas a ${notificationsSent.length} operarios`);
      } else {
        toast.error("No se pudo enviar ninguna notificacion");
      }
    } catch (error) {
      console.error("Error in handleSendWhatsApp:", error);
      toast.error("Error al enviar notificaciones por WhatsApp");
    } finally {
      setIsSendingWhatsApp(false);
    }
  };

  const refreshData = () => {
    refetch();
    refreshAdminData();
  };

  if (!isManagerView) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold">Calendario de instalaciones</CardTitle>
            <CardDescription>
              Selecciona una fecha para ver las tareas asignadas. Los dias resaltados en naranja tienen tareas pendientes.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Calendar
              mode="single"
              selected={date}
              onSelect={setDate}
              initialFocus
              modifiers={calendarModifiers}
              modifiersClassNames={CALENDAR_CLASSNAMES}
              className="rounded-md border"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold">
              Tareas para {date ? dayjs(date).format("dddd, D [de] MMMM") : "..."}
            </CardTitle>
            <CardDescription>Visualiza tus asignaciones del dia. Esta vista es solo informativa.</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingTasks ? (
              <div className="space-y-3">
                <div className="h-16 w-full animate-pulse rounded-xl bg-muted" />
                <div className="h-16 w-full animate-pulse rounded-xl bg-muted" />
              </div>
            ) : tasks.length === 0 ? (
              <div className="rounded-md border-2 border-dashed border-muted p-6 text-center text-sm text-muted-foreground">
                No hay tareas programadas para esta fecha.
              </div>
            ) : (
              <div className="space-y-3">
                {tasks.map((task) => (
                  <Card key={task.id}>
                    <CardContent className="space-y-3 p-4">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div className="space-y-1">
                          <h3 className="text-base font-semibold">
                            {task.data?.site ?? task.data?.location ?? "Sin sitio definido"}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {formatTaskTime(task)} · Responsable: {task.responsible?.full_name ?? "Falta responsable"}
                          </p>
                          {task.data?.description && (
                            <p className="text-sm text-muted-foreground">{task.data.description}</p>
                          )}
                        </div>
                        <Badge className="self-start uppercase">{task.state ?? "pendiente"}</Badge>
                      </div>
                      {task.assigned_users.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {task.assigned_users.map((user) => (
                            <Badge key={user.id} variant="outline" className="capitalize">
                              {user.full_name}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setDraggedItem(null)}
      >
        <DragOverlay>
          {draggedItem && (
            <div className="rounded-md border border-slate-200 bg-card px-3 py-2">
              {draggedItem.type === "user" ? (
                <div className="flex items-center gap-2">
                  <StatusBadge status={(draggedItem.item as Profile).status} size="sm" />
                  <span className="text-sm font-medium">{(draggedItem.item as Profile).full_name}</span>
                </div>
              ) : (
                <VehicleBadge
                  name={(draggedItem.item as Vehicle).name}
                  type={(draggedItem.item as Vehicle).type}
                  size="sm"
                  className="text-sm"
                />
              )}
            </div>
          )}
        </DragOverlay>

        <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
          <div className="space-y-4">
            <Card>
              <CardContent className="flex justify-center pt-6">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  locale={es}
                  modifiers={calendarModifiers}
                  modifiersClassNames={CALENDAR_CLASSNAMES}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <CardTitle className="flex items-center gap-2 text-base font-semibold">
                  <Users className="h-4 w-4" />
                  Operarios
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    aria-label="Buscar operario"
                    value={operatorSearch}
                    onChange={(event) => setOperatorSearch(event.target.value)}
                    placeholder="Buscar operario..."
                    className="pl-9"
                  />
                </div>
                <ScrollArea className="h-72 pr-2">
                  {filteredUsers.length === 0 ? (
                    <div className="flex h-full items-center justify-center px-3 text-sm text-muted-foreground">
                      {operatorSearch ? "Sin resultados para la busqueda" : "No hay operarios activos"}
                    </div>
                  ) : (
                    <div className="space-y-2 pr-1">
                      {filteredUsers.map((user) => {
                        const taskAmount = taskCountByProfile.get(user.id) ?? 0;
                        const isOverloaded = taskAmount > 1;
                        const statusClasses =
                          user.status === "activo"
                            ? "bg-[#e8f5ed] text-[#276749] dark:bg-emerald-900/40 dark:text-emerald-200"
                            : user.status === "vacaciones"
                            ? "bg-[#fff3e6] text-[#b36109] dark:bg-amber-900/40 dark:text-amber-200"
                            : "bg-[#ffe8e6] text-[#b91c1c] dark:bg-red-900/40 dark:text-red-200";

                        return (
                          <div key={user.id} className="group flex items-center gap-2">
                            <DraggableSidebarItem item={{ ...user, tasksCount: taskAmount }} className="min-w-0 flex-1">
                              <div
                                className={cn(
                                  "flex w-full items-center justify-between gap-2 rounded-md px-3 py-2 text-sm font-medium",
                                  statusClasses
                                )}
                              >
                                <div className="flex min-w-0 items-center gap-2">
                                  <Users className="h-4 w-4" />
                                  <span className="max-w-[180px] truncate text-sm font-medium">{user.full_name}</span>
                                </div>
                                {taskAmount > 0 && (
                                  <Badge
                                    variant={isOverloaded ? "destructive" : "secondary"}
                                    className="h-5 min-w-[1.5rem] justify-center px-2 text-xs"
                                    title={`${taskAmount} tareas asignadas`}
                                  >
                                    {taskAmount}
                                  </Badge>
                                )}
                              </div>
                            </DraggableSidebarItem>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 opacity-0 transition-opacity group-hover:opacity-100"
                              onClick={() => handleEditUser(user)}
                            >
                              <Users className="h-4 w-4" />
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="flex items-center gap-2 text-base font-semibold">
                  <Car className="h-4 w-4" />
                  Vehiculos
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    aria-label="Buscar vehiculo"
                    value={vehicleSearch}
                    onChange={(event) => setVehicleSearch(event.target.value)}
                    placeholder="Buscar vehiculo..."
                    className="pl-9"
                  />
                </div>
                <ScrollArea className="h-72 pr-2">
                  {filteredVehicles.length === 0 ? (
                    <div className="flex h-full items-center justify-center px-3 text-sm text-muted-foreground">
                      {vehicleSearch ? "Sin resultados para la busqueda" : "No hay vehiculos activos"}
                    </div>
                  ) : (
                    <div className="space-y-2 pr-1">
                      {filteredVehicles.map((vehicle) => (
                        <DraggableSidebarItem key={vehicle.id} item={{ ...vehicle, type: "vehicle" }} className="block">
                          <VehicleBadge
                            name={vehicle.name}
                            type={vehicle.type}
                            size="sm"
                            className="w-full justify-start"
                          />
                        </DraggableSidebarItem>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            <div className="flex flex-col gap-3 rounded-md border border-dashed border-muted bg-card/40 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-semibold">
                  Planificacion para: {date ? dayjs(date).format("dddd, D [de] MMMM") : "..."}
                </h2>
                <p className="text-sm text-muted-foreground">
                  Gestiona las tareas para esta fecha, asigna equipos y comparte el plan.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={handleShare} size="sm" className="sm:size-default">
                  <Share2 className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Compartir</span>
                </Button>
                <Button
                  variant="outline"
                  onClick={handleSendWhatsApp}
                  disabled={isSendingWhatsApp || tasks.length === 0}
                  size="sm"
                  className="sm:size-default"
                >
                  <MessageSquare className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">
                    {isSendingWhatsApp ? "Enviando..." : "Enviar WhatsApp"}
                  </span>
                  <span className="sm:hidden">{isSendingWhatsApp ? "..." : "WA"}</span>
                </Button>
                <Button variant="outline" size="sm" className="sm:size-default">
                  <Download className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Exportar</span>
                </Button>
                <Button
                  onClick={() => {
                    setSelectedTask(null);
                    setIsTaskDialogOpen(true);
                  }}
                  size="sm"
                  className="sm:size-default"
                >
                  <Plus className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Anadir Tarea</span>
                  <span className="sm:hidden">Nueva</span>
                </Button>
              </div>
            </div>

            <Card>
              <CardContent className="p-0">
                {loadingTasks ? (
                  <div className="p-8 text-center text-sm text-muted-foreground">Cargando...</div>
                ) : (
                  <SortableContext items={tasks.map((task) => task.id)} strategy={verticalListSortingStrategy}>
                    <DailyTaskTable tasks={tasks} onEditTask={handleEditTask} onRefresh={refreshData} />
                  </SortableContext>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </DndContext>

      {isTaskDialogOpen && (
        <TaskDialog
          open={isTaskDialogOpen}
          onOpenChange={setIsTaskDialogOpen}
          onSuccess={refreshData}
          task={selectedTask}
          selectedDate={date || new Date()}
          users={users}
          vehicles={vehicles}
          draggedItem={draggedItem}
        />
      )}

      {isUserDialogOpen && (
        <UserDialog
          open={isUserDialogOpen}
          onOpenChange={setIsUserDialogOpen}
          onSuccess={refreshAdminData}
          user={selectedUser}
        />
      )}
    </div>
  );
}
