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
import { CalendarCheck, Users, Car, ClipboardList, MoreHorizontal, Archive, Eye, Pencil, Filter, Clock, Settings, LogOut, User, AlertTriangle, CheckCircle, RotateCcw } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState, useCallback } from "react";
import { subDays, format, parseISO, isSameDay, isBefore } from "date-fns";
import { es } from 'date-fns/locale';
import { toast } from "sonner";
import { TaskDetailsDialog } from "@/components/tasks/TaskDetailsDialog";
import { useNavigate } from "react-router-dom";
import { StatusBadge, VehicleBadge, TaskStateBadge } from "@/components/badges";
import { useDashboardTasks, useDashboardStats } from "@/hooks/use-detailed-tasks";
import { useUsers, useVehicles } from "@/hooks/use-supabase";
import { useIsMobile } from "@/hooks/use-mobile";
import type { DetailedTask } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";

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

const getCandidateFields = (group: string | null | undefined, type: 'site' | 'description') => {
  const mapping = SCREEN_FIELD_MAP[group ?? ''];
  const defaults = type === 'site' ? DEFAULT_SITE_FIELDS : DEFAULT_DESCRIPTION_FIELDS;
  const groupFields = mapping ? mapping[type] : [];
  return Array.from(new Set([...groupFields, ...defaults]));
};

const extractFieldValue = (task: DetailedTask, candidates: string[]) => {
  const data = (task.data ?? {}) as Record<string, any>;
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
      const valueFromTask = (task as unknown as Record<string, any>)[key];
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

export default function AdminPage() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [calendarTaskDays, setCalendarTaskDays] = useState<Date[]>([]);
  const [calendarPendingDays, setCalendarPendingDays] = useState<Date[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedTask, setSelectedTask] = useState<DetailedTask | null>(null);

  // Usar hooks personalizados para datos del dashboard
  const { confeccionTasks, tapiceriaTasks, pendingTasks, loading: tasksLoading, refresh: refreshDashboardTasks } = useDashboardTasks();
  const { stats, loading: statsLoading } = useDashboardStats();
  const { data: users = [] } = useUsers();
  const { data: vehicles = [] } = useVehicles();
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [taskFilter, setTaskFilter] = useState<'all' | 'instalaciones' | 'confeccion' | 'tapiceria'>('instalaciones');
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());
  const [currentUser, setCurrentUser] = useState<SimpleProfile | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

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

      (data ?? []).forEach((task) => {
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
    const candidates = getCandidateFields(task.screen_group, 'site');
    const value = extractFieldValue(task, candidates);
    return value || 'Sin sitio definido';
  }, []);

  const getTaskDescriptionLabel = useCallback((task: DetailedTask) => {
    const candidates = getCandidateFields(task.screen_group, 'description');
    const value = extractFieldValue(task, candidates);
    return value || 'Sin descripción';
  }, []);

  const archiveTask = useCallback(async (taskId: string, options?: { skipRefresh?: boolean }) => {
    try {
      const { data, error } = await supabase.rpc('archive_task_by_id', {
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
      const updates: Record<string, any> = { state: newState };
      if (newState === 'terminado') {
        updates.status = 'acabado';
      }

      const { error } = await supabase
        .from('screen_data')
        .update(updates)
        .eq('id', taskId);

      if (error) {
        throw error;
      }

      if (newState === 'terminado') {
        await archiveTask(taskId, { skipRefresh: true });
        toast.success('Tarea marcada como terminada y archivada');
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
  }, [archiveTask, refreshAllData]);

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
    setSelectedTask(task);
    setDetailsDialogOpen(true);
  };

  const handleEditTask = (taskId: string) => {
    navigate('/admin/installations', { state: { editTaskId: taskId } });
  };

  // Filtrar tareas según la categoría seleccionada y fecha
  const filteredTasks = pendingTasks.filter(task => {
    // Filtro por categoría
    let categoryMatch = false;
    if (taskFilter === 'all') categoryMatch = true;
    else if (taskFilter === 'confeccion') categoryMatch = task.screen_group === 'Confección';
    else if (taskFilter === 'tapiceria') categoryMatch = task.screen_group === 'Tapicería';
    else if (taskFilter === 'instalaciones') categoryMatch = task.screen_group === 'Instalaciones';

    // Filtro por fecha si hay una fecha seleccionada
    let dateMatch = true;
    if (selectedDate) {
      if (!task.start_date) {
        dateMatch = true;
      } else {
        const taskDate = parseISO(task.start_date);
        dateMatch = isSameDay(taskDate, selectedDate) || isBefore(taskDate, selectedDate);
      }
    }

    return categoryMatch && dateMatch;
  });

  return (
    <div className="space-y-6">
      {/* Cabecera mejorada con reloj y avatar */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-4">
            <Clock className="h-8 w-8 text-primary" />
            <div className="text-4xl font-bold text-primary">
              {format(currentTime, 'HH:mm:ss')}
            </div>
          </div>
          <div className="text-2xl font-semibold text-muted-foreground">
            {format(currentTime, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })}
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-sm text-muted-foreground">Bienvenido</div>
            <div className="font-semibold">{currentUser?.full_name || 'Usuario'}</div>
            <div className="text-xs text-muted-foreground capitalize">{currentUser?.role || 'Administrador'}</div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-12 w-12 rounded-full">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={currentUser?.avatar_url} alt={currentUser?.full_name} />
                  <AvatarFallback>
                    {currentUser?.full_name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuItem onClick={() => navigate('/admin/settings')}>
                <User className="mr-2 h-4 w-4" />
                <span>Perfil</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/admin/settings')}>
                <Settings className="mr-2 h-4 w-4" />
                <span>Configuración</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Cerrar sesión</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      {/* Responsive Dashboard Layout */}
      <div className="space-y-6">
        {/* Metrics Cards - Responsive Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tareas Totales</CardTitle>
              <CalendarCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {statsLoading ? (
                  <div className="animate-pulse bg-muted h-8 w-12 rounded"></div>
                ) : (
                  stats?.total_tasks || 0
                )}
              </div>
              <p className="text-xs text-muted-foreground">Tareas en el sistema</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Usuarios Activos</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {statsLoading ? (
                  <div className="animate-pulse bg-muted h-8 w-12 rounded"></div>
                ) : (
                  stats?.active_users || 0
                )}
              </div>
              <p className="text-xs text-muted-foreground">Operarios activos</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Vehículos</CardTitle>
              <Car className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {statsLoading ? (
                  <div className="animate-pulse bg-muted h-8 w-12 rounded"></div>
                ) : (
                  stats?.active_vehicles || 0
                )}
              </div>
              <p className="text-xs text-muted-foreground">Vehículos registrados</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pendientes</CardTitle>
              <ClipboardList className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {statsLoading ? (
                  <div className="animate-pulse bg-muted h-8 w-12 rounded"></div>
                ) : (
                  stats?.pending_tasks || 0
                )}
              </div>
              <p className="text-xs text-muted-foreground">Tareas pendientes</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content - Single Row with 4 Columns */}
        <div className="flex flex-row flex-nowrap gap-6">
          {/* Calendar Card */}
          <Card className="flex-1">
            <CardHeader>
              <CardTitle className="text-base">Calendario</CardTitle>
            </CardHeader>
            <CardContent className="flex justify-center">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                numberOfMonths={isMobile ? 1 : 1}
                locale={es}
                className="rounded-lg"
                modifiers={{
                  today: new Date(),
                  pending: calendarPendingDays,
                  hasTasks: calendarTaskDays
                }}
                modifiersClassNames={{
                  today: "bg-orange-500 text-white hover:bg-orange-600 rounded-md font-medium ring-2 ring-orange-300",
                  pending: "rdp-day_pending",
                  hasTasks: "hasTasks"
                }}
              />
            </CardContent>
          </Card>

          {/* Online Users Card */}
          <Card className="flex-1">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                Usuarios Online
              </CardTitle>
              <CardDescription>
                Operarios actualmente disponibles
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-[320px] overflow-y-auto">
                {users
                  .filter(user => user.status === 'activo')
                  .map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="relative">
                        <Avatar className="h-9 w-9">
                          <AvatarImage src={user.avatar_url} alt={user.full_name} />
                          <AvatarFallback className="text-xs">
                            {user.full_name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-background"></div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{user.full_name}</p>
                        <p className="text-xs text-muted-foreground capitalize">{user.role || 'Operario'}</p>
                      </div>
                    </div>
                  ))}
                {users.filter(user => user.status === 'activo').length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No hay usuarios online</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Confección Card */}
          <Card className="flex-1">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                Confección
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-sm">#</TableHead>
                      <TableHead className="text-sm">Tipo</TableHead>
                      <TableHead className="text-sm">Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tasksLoading ? (
                      Array.from({ length: 3 }).map((_, i) => (
                        <TableRow key={i}>
                          <TableCell><div className="animate-pulse bg-muted h-4 w-8 rounded"></div></TableCell>
                          <TableCell><div className="animate-pulse bg-muted h-4 w-16 rounded"></div></TableCell>
                          <TableCell><div className="animate-pulse bg-muted h-4 w-20 rounded"></div></TableCell>
                        </TableRow>
                      ))
                    ) : confeccionTasks.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                          No hay tareas de confección
                        </TableCell>
                      </TableRow>
                    ) : (
                      confeccionTasks.map((task, index) => {
                        const statusColor =
                          task.state === 'urgente' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                          task.state === 'en fabricacion' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' :
                          task.state === 'a la espera' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                          task.state === 'terminado' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                          'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';

                        return (
                          <TableRow key={task.id}>
                            <TableCell className="text-sm font-medium">#{index + 1}</TableCell>
                            <TableCell className="text-sm">
                              {String((task.data as Record<string, unknown>)?.tipo || task.site || 'N/A')}
                            </TableCell>
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

          {/* Tapicería Card */}
          <Card className="flex-1">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                Tapicería
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-sm">#</TableHead>
                      <TableHead className="text-sm">Gestor</TableHead>
                      <TableHead className="text-sm">Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tasksLoading ? (
                      Array.from({ length: 3 }).map((_, i) => (
                        <TableRow key={i}>
                          <TableCell><div className="animate-pulse bg-muted h-4 w-8 rounded"></div></TableCell>
                          <TableCell><div className="animate-pulse bg-muted h-4 w-16 rounded"></div></TableCell>
                          <TableCell><div className="animate-pulse bg-muted h-4 w-20 rounded"></div></TableCell>
                        </TableRow>
                      ))
                    ) : tapiceriaTasks.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                          No hay tareas de tapicería
                        </TableCell>
                      </TableRow>
                    ) : (
                      tapiceriaTasks.map((task, index) => {
                        const statusColor =
                          task.state === 'en fabricacion' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' :
                          task.state === 'a la espera' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                          'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';

                        const displayContent = task.state === 'pendiente'
                          ? format(new Date(task.created_at), 'dd/MM/yyyy')
                          : String((task.data as Record<string, unknown>)?.gestor || 'N/A');

                        return (
                          <TableRow key={task.id}>
                            <TableCell className="text-sm font-medium">#{index + 1}</TableCell>
                            <TableCell className="text-sm">{displayContent}</TableCell>
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
                      checked={selectedTaskIds.size === filteredTasks.length && filteredTasks.length > 0}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedTaskIds(new Set(filteredTasks.map(t => t.id)));
                        } else {
                          setSelectedTaskIds(new Set());
                        }
                      }}
                    />
                  </TableHead>
                  <TableHead className="text-sm min-w-[100px]">Fecha</TableHead>
                  <TableHead className="text-sm min-w-[120px]">Operarios</TableHead>
                  <TableHead className="text-sm min-w-[150px]">Sitio de Trabajo</TableHead>
                  <TableHead className="text-sm min-w-[200px]">Descripción</TableHead>
                  <TableHead className="text-sm min-w-[120px]">Vehículos</TableHead>
                  <TableHead className="text-sm min-w-[100px]">Estado</TableHead>
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
                      <TableCell><div className="animate-pulse bg-muted h-8 w-8 rounded"></div></TableCell>
                    </TableRow>
                  ))
                ) : filteredTasks.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-12">
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
                  filteredTasks.map((task) => (
                    <TableRow key={task.id} className="hover:bg-muted/50">
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
                          {task.assigned_profiles && task.assigned_profiles.length > 0 ? (
                            task.assigned_profiles.map((profile: any) => {
                              const taskCount = pendingTasks.filter(
                                t => t.assigned_profiles?.some((p: any) => p.id === profile.id)
                              ).length;

                              const bgColor = 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200';

                              return (
                                <div key={profile.id} className={`flex items-center gap-1 px-2 py-1 rounded text-xs ${bgColor}`}>
                                  <User className="h-3 w-3 flex-shrink-0" />
                                  <span className="truncate max-w-[80px]">{profile.full_name}</span>
                                  {taskCount > 1 && (
                                    <Badge variant="secondary" className="h-4 w-4 p-0 flex items-center justify-center text-xs text-blue-800 dark:text-blue-200">
                                      {taskCount}
                                    </Badge>
                                  )}
                                </div>
                              );
                            })
                          ) : (
                            <span className="text-xs text-muted-foreground">Sin asignar</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm font-medium">{getTaskSiteLabel(task)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[220px] truncate" title={getTaskDescriptionLabel(task)}>
                        {getTaskDescriptionLabel(task)}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {task.assigned_vehicles && task.assigned_vehicles.length > 0 ? (
                            task.assigned_vehicles.map((vehicle: any) => (
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
                        <TaskStateBadge state={task.state} />
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleViewDetails(task)}>
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
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {selectedTask && (
        <TaskDetailsDialog
          task={{
            id: selectedTask.id,
            created_at: selectedTask.created_at,
            start_date: selectedTask.start_date,
            end_date: selectedTask.end_date,
            order: 0,
            state: selectedTask.state as 'urgente' | 'pendiente' | 'a la espera' | 'en fabricacion' | 'terminado',
            location: selectedTask.location as 'en la isla' | 'fuera',
            data: selectedTask.data,
            responsible_profile_id: selectedTask.responsible_profile_id,
            site: selectedTask.site,
            description: selectedTask.description,
            responsible: selectedTask.responsible_name ? {
              id: selectedTask.responsible_profile_id || '',
              full_name: selectedTask.responsible_name,
              email: selectedTask.responsible_email,
              role: selectedTask.responsible_role as 'admin' | 'responsable' | 'operario',
              status: selectedTask.responsible_status as 'activo' | 'baja' | 'vacaciones'
            } : null,
            assigned_users: selectedTask.assigned_name ? [{
              id: selectedTask.responsible_profile_id || '',
              full_name: selectedTask.assigned_name,
              email: selectedTask.assigned_email,
              role: selectedTask.assigned_role as 'admin' | 'responsable' | 'operario',
              status: selectedTask.assigned_status as 'activo' | 'baja' | 'vacaciones'
            }] : [],
            assigned_vehicles: selectedTask.vehicle_type ? [{
              id: selectedTask.id,
              name: selectedTask.vehicle_type,
              type: selectedTask.vehicle_type
            }] : []
          }}
          open={detailsDialogOpen}
          onOpenChange={setDetailsDialogOpen}
        />
      )}
    </div>
  );
}
