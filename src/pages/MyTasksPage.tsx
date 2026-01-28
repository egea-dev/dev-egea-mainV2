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
import { TaskStateBadge } from "@/features/tasks/components/TaskStateBadge";
import { VehicleBadge } from "@/features/fleet/components/VehicleBadge";
import { format } from "date-fns";
import { es } from "date-fns/locale";
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
        .rpc('get_tasks_by_token', { p_token: token }) as any;

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
        } as any)
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

  const renderTaskCard = (task: Task, { showStatusActions }: { showStatusActions: boolean }) => {
    const locationLabel =
      task.location || task.data.address || task.data.site || task.data.client || "";
    const hasLocation = Boolean(locationLabel && locationLabel.trim());

    return (
      <Card key={task.id} className="w-full bg-slate-900/50 border-slate-800 backdrop-blur-sm shadow-xl">
        <CardHeader className="pb-3 border-b border-slate-800/50">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-2 mb-1">
                <TaskStateBadge state={task.state} />
                <span className="text-xs font-mono text-slate-500 uppercase">{task.data.client || "Sin Cliente"}</span>
              </div>
              <CardTitle className="text-xl font-bold text-white tracking-tight">
                {task.data.site ?? "Tarea asignada"}
              </CardTitle>
              {(task.data.client || task.data.site) && (
                <p className="text-sm text-slate-400 font-medium">
                  {task.data.client ? `Cliente: ${task.data.client}` : `Sitio: ${task.data.site}`}
                </p>
              )}
            </div>
            {hasLocation && (
              <Button
                size="icon"
                variant="outline"
                className="h-10 w-10 rounded-full border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white shrink-0"
                onClick={() => window.open(getMapsUrl(locationLabel), "_blank")}
              >
                <MapPin className="h-5 w-5" />
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-950/30 border border-slate-800/50">
              <Clock className="h-4 w-4 text-slate-500" />
              <span className="font-mono text-slate-300">
                {format(new Date(task.start_date), "HH:mm")} - {format(new Date(task.end_date), "HH:mm")}
              </span>
            </div>

            {hasLocation && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-950/30 border border-slate-800/50">
                <MapPin className="h-4 w-4 text-slate-500" />
                <span className="truncate text-slate-300">{locationLabel}</span>
              </div>
            )}

            {task.data.description && (
              <div className="col-span-1 sm:col-span-2 flex items-start gap-3 p-3 rounded-lg bg-slate-950/30 border border-slate-800/50">
                <div className="mt-0.5"><div className="w-1.5 h-1.5 rounded-full bg-blue-500" /></div>
                <p className="text-slate-400 italic">{task.data.description}</p>
              </div>
            )}
          </div>

          {task.assigned_vehicles && task.assigned_vehicles.length > 0 && (
            <div className="flex items-center gap-3 pt-2">
              <Car className="h-4 w-4 text-slate-500" />
              <div className="flex flex-wrap gap-2">
                {task.assigned_vehicles.map((vehicle) => (
                  <VehicleBadge key={vehicle.id} name={vehicle.name} type={vehicle.type} size="sm" />
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-3 pt-4 border-t border-slate-800/50">
            {hasLocation && (
              <Button
                size="sm"
                variant="outline"
                className="border-slate-700 hover:bg-slate-800 hover:text-white text-slate-400"
                onClick={() => window.open(getDirectionsUrl(locationLabel), "_blank")}
              >
                <Car className="h-4 w-4 mr-2" />
                Cómo Llegar
              </Button>
            )}

            {showStatusActions && (
              <>
                <Button
                  size="sm"
                  variant="destructive"
                  className="bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20"
                  onClick={() => updateTaskState(task.id, "incidente")}
                  disabled={updatingTask === task.id}
                >
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  {updatingTask === task.id ? "..." : "Reportar Incidente"}
                </Button>
                <Button
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white ml-auto"
                  onClick={() => updateTaskState(task.id, "terminado")}
                  disabled={updatingTask === task.id}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  {updatingTask === task.id ? "Completando..." : "Completar Tarea"}
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f1115] flex flex-col items-center justify-center text-slate-400">
        <div className="w-12 h-12 border-4 border-slate-800 border-t-blue-500 rounded-full animate-spin mb-6"></div>
        <p className="animate-pulse font-medium">Cargando tus tareas asignadas...</p>
      </div>
    );
  }

  if (!notificationData) {
    return (
      <div className="min-h-screen bg-[#0f1115] flex items-center justify-center p-4">
        <Card className="max-w-md w-full bg-slate-900 border-slate-800">
          <CardHeader className="text-center">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <CardTitle className="text-white">Enlace no válido</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-slate-400 mb-6">
              Este enlace ha expirado o no es válido. Contacta con tu supervisor para obtener uno nuevo.
            </p>
            <Button variant="outline" className="border-slate-700 text-white hover:bg-slate-800" onClick={() => navigate("/")}>
              Volver al inicio
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f1115] text-slate-200 selection:bg-blue-500/30">
      {/* Header Monocromático */}
      <div className="border-b border-slate-800 bg-slate-950/50 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-4xl mx-auto p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
              <span className="text-3xl">📋</span>
              Plan de Trabajo
            </h1>
            <p className="text-slate-400 mt-1">
              {format(new Date(notificationData.plan_date), "dd 'de' MMMM, yyyy", { locale: es })}
            </p>
          </div>

          <div className="flex flex-col items-end gap-1">
            <div className="text-sm font-medium text-white bg-slate-800 px-3 py-1 rounded-full border border-slate-700">
              👤 {notificationData.profile.full_name}
            </div>
            {notificationData.profile.phone && (
              <div className="text-xs text-slate-500 font-mono">
                {notificationData.profile.phone}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tasks List */}
      <div className="max-w-4xl mx-auto p-6 space-y-8">
        <ScrollArea className="h-[calc(100vh-200px)] lg:h-auto pr-4">
          <section className="space-y-4 mb-8">
            <h2 className="text-sm font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
              Tareas pendientes
            </h2>
            {pendingTasks.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-900/20 p-8 text-center">
                <CheckCircle className="mx-auto mb-4 h-12 w-12 text-emerald-500/50" />
                <h3 className="text-lg font-medium text-white">¡Estás al día!</h3>
                <p className="text-slate-500 mt-2">
                  No tienes tareas pendientes en este momento.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {pendingTasks.map((task) => renderTaskCard(task, { showStatusActions: true }))}
              </div>
            )}
          </section>

          <section className="space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Historial completado
            </h2>
            {completedTasks.length === 0 ? (
              <div className="p-8 text-center text-slate-600 text-sm italic">
                Aún no has completado ninguna tarea hoy.
              </div>
            ) : (
              <div className="space-y-4 opacity-80 hover:opacity-100 transition-opacity">
                {completedTasks.map((task) => renderTaskCard(task, { showStatusActions: false }))}
              </div>
            )}
          </section>

          <div className="border-t border-slate-800 mt-8 pt-6 text-center">
            <p className="text-xs font-mono text-slate-600 mb-3">Última sincro: {format(new Date(), "HH:mm:ss")}</p>
            <Button
              size="sm"
              variant="outline"
              onClick={loadTasks}
              className="border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white gap-2"
            >
              <RefreshCw className="h-3 w-3" />
              Verificar Actualizaciones
            </Button>
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
