import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  MapPin,
  Clock,
  Car,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import { TaskStateBadge, VehicleBadge } from "@/components/badges";
import dayjs from "dayjs";
import { buildMapsDirectionsUrl, buildMapsSearchUrl } from "@/utils/maps";

interface Task {
  id: string;
  location?: string | null;
  data: {
    site: string;
    client?: string;
    address?: string;
    description?: string;
  };
  state: string;
  start_date: string;
  end_date: string;
  assigned_vehicles?: Array<{
    id: string;
    name: string;
    type: string;
  }>;
}

interface NotificationData {
  profile: {
    full_name: string;
    phone?: string;
  };
  plan_date: string;
  tasks: Task[];
}

export default function MyTasksPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [notificationData, setNotificationData] = useState<NotificationData | null>(null);
  const [updatingTask, setUpdatingTask] = useState<string | null>(null);

  const loadTasks = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .rpc('get_tasks_by_token', { p_token: token });

      if (error) {
        const message = error.message ?? '';
        if (message.includes('Rate limit exceeded')) {
          toast.error("Demasiadas solicitudes. Inténtalo de nuevo en un minuto.");
        } else if (message.includes('Enlace no válido')) {
          toast.error("Enlace no válido o expirado");
        } else {
          throw error;
        }
        return;
      }

      if (!data || data.length === 0) {
        toast.error("Enlace no válido o expirado");
        return;
      }

      const notification = data[0];

      // Cargar las tareas asociadas
      const { data: tasks, error: tasksError } = await supabase
        .from('detailed_tasks')
        .select('*')
        .in('id', notification.task_ids)
        .order('start_date', { ascending: true });

      if (tasksError) throw tasksError;

      setNotificationData({
        profile: notification.profile,
        plan_date: notification.plan_date,
        tasks: tasks || []
      });

    } catch (error) {
      console.error('Error loading tasks:', error);
      toast.error("Error al cargar las tareas");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!token) {
      navigate("/");
      return;
    }

    void loadTasks();
  }, [token, navigate, loadTasks]);

  const updateTaskState = async (taskId: string, newState: string) => {
    setUpdatingTask(taskId);
    try {
      const { error } = await supabase
        .from('screen_data')
        .update({ 
          state: newState,
          updated_at: new Date().toISOString()
        })
        .eq('id', taskId);

      if (error) throw error;

      // Actualizar estado local
      if (notificationData) {
        setNotificationData({
          ...notificationData,
          tasks: notificationData.tasks.map(task => 
            task.id === taskId ? { ...task, state: newState } : task
          )
        });
      }

      toast.success(`Tarea marcada como ${newState}`);

    } catch (error) {
      console.error('Error updating task:', error);
      toast.error("Error al actualizar el estado de la tarea");
    } finally {
      setUpdatingTask(null);
    }
  };

  const getMapsUrl = (address: string) => buildMapsSearchUrl(address);
  const getDirectionsUrl = (address: string) => buildMapsDirectionsUrl(address);

  const tasks = useMemo(
    () => (notificationData ? notificationData.tasks : []),
    [notificationData]
  );

  const pendingTasks = useMemo(
    () => tasks.filter((task) => task.state !== "terminado"),
    [tasks]
  );

  const completedTasks = useMemo(
    () => tasks.filter((task) => task.state === "terminado"),
    [tasks]
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Cargando tus tareas...</p>
        </div>
      </div>
    );
  }

  if (!notificationData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <CardTitle>Enlace no válido</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-muted-foreground mb-4">
              Este enlace ha expirado o no es válido. Contacta con tu supervisor.
            </p>
            <Button onClick={() => navigate("/")}>
              Volver al inicio
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const renderTaskCard = (task: Task, { showStatusActions }: { showStatusActions: boolean }) => {
    const locationLabel =
      task.location || task.data.address || task.data.site || task.data.client || "";
    const hasLocation = Boolean(locationLabel && locationLabel.trim());

    return (
      <Card key={task.id} className="w-full">
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 space-y-2">
              <CardTitle className="text-lg">
                📍 {task.data.site ?? "Tarea asignada"}
              </CardTitle>
              {(task.data.client || task.data.site) && (
                <p className="text-muted-foreground">
                  {task.data.client ? `Cliente: ${task.data.client}` : `Sitio: ${task.data.site}`}
                </p>
              )}
              {hasLocation && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  <span className="truncate">{locationLabel}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>
                  {dayjs(task.start_date).format("HH:mm")} - {dayjs(task.end_date).format("HH:mm")}
                </span>
              </div>
            </div>
            <TaskStateBadge state={task.state} />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {task.data.description && (
            <p className="text-sm text-muted-foreground">{task.data.description}</p>
          )}

          {task.assigned_vehicles && task.assigned_vehicles.length > 0 && (
            <div className="flex items-center gap-2">
              <Car className="h-4 w-4 text-muted-foreground" />
              <div className="flex flex-wrap gap-2">
                {task.assigned_vehicles.map((vehicle) => (
                  <VehicleBadge key={vehicle.id} name={vehicle.name} type={vehicle.type} size="sm" />
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-2 border-t pt-4">
            {hasLocation && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => window.open(getMapsUrl(locationLabel), "_blank")}
                >
                  <MapPin className="h-4 w-4 mr-2" />
                  Ver en Maps
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => window.open(getDirectionsUrl(locationLabel), "_blank")}
                >
                  <Car className="h-4 w-4 mr-2" />
                  Cómo Llegar
                </Button>
              </>
            )}

            {showStatusActions && (
              <>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => updateTaskState(task.id, "incidente")}
                  disabled={updatingTask === task.id}
                >
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  {updatingTask === task.id ? "Actualizando..." : "Incidente"}
                </Button>
                <Button
                  size="sm"
                  onClick={() => updateTaskState(task.id, "terminado")}
                  disabled={updatingTask === task.id}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  {updatingTask === task.id ? "Actualizando..." : "Terminado"}
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-primary text-primary-foreground p-6">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold mb-2">
            📋 Plan de Trabajo - {dayjs(notificationData.plan_date).format('DD/MM/YYYY')}
          </h1>
          <p className="text-primary-foreground/90">
            Hola, {notificationData.profile.full_name}! Aquí están tus tareas para hoy.
          </p>
          {notificationData.profile.phone && (
            <p className="text-primary-foreground/80 text-sm mt-2">
              📞 {notificationData.profile.phone}
            </p>
          )}
        </div>
      </div>

      {/* Tasks List */}
      <div className="max-w-4xl mx-auto p-6 space-y-4">
        <ScrollArea className="h-[calc(100vh-200px)] space-y-6">
          <section className="space-y-3">
            <h2 className="text-lg font-semibold">Tareas pendientes</h2>
            {pendingTasks.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <CheckCircle className="mx-auto mb-4 h-12 w-12 text-green-500" />
                  <h3 className="text-lg font-semibold">¡No tienes tareas pendientes!</h3>
                  <p className="text-muted-foreground">
                    Revisa las tareas completadas para confirmar tu jornada.
                  </p>
                </CardContent>
              </Card>
            ) : (
              pendingTasks.map((task) => renderTaskCard(task, { showStatusActions: true }))
            )}
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">Tareas completadas</h2>
            {completedTasks.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  Aún no tienes tareas registradas como completadas.
                </CardContent>
              </Card>
            ) : (
              completedTasks.map((task) => renderTaskCard(task, { showStatusActions: false }))
            )}
          </section>

          <div className="border-t pt-4 text-center text-sm text-muted-foreground">
            <p>Última actualización: {dayjs().format("HH:mm:ss")}</p>
            <Button
              size="sm"
              variant="ghost"
              onClick={loadTasks}
              className="mt-2 gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Actualizar
            </Button>
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
