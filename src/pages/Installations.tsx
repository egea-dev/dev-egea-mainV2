import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragEndEvent, DragStartEvent, DragOverlay } from '@dnd-kit/core';
import { arrayMove, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Task, Profile, Vehicle } from '@/types';
import dayjs from 'dayjs';
import 'dayjs/locale/es';
import { es } from 'date-fns/locale';
import { format, subDays } from 'date-fns';
import { cn } from '@/lib/utils';
dayjs.locale('es');

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, User, Car, Share2, Download, Users, MessageSquare, Send } from 'lucide-react';

import { DailyTaskTable } from '@/components/installations/DailyTaskTable';
import { DraggableSidebarItem } from '@/components/installations/DraggableSidebarItem';
import { TaskDialog } from '@/components/installations/TaskDialog';
import { useAdminData } from '@/hooks/use-admin-data';
import { useTasksByDate, useUpdateTaskOrder, useAssignToTask, useCreateSharedPlan } from '@/hooks/use-supabase';
import { useIsMobile } from '@/hooks/use-mobile';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { UserDialog } from '@/components/users/UserDialog';
import { VehicleBadge, StatusBadge } from '@/components/badges';
import { Badge } from '@/components/ui/badge';

export default function InstallationsPage() {
   const { users, vehicles, fetchData: onDataUpdate } = useAdminData();
   const isMobile = useIsMobile();

  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const dateFromQuery = queryParams.get('date');
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
  const [draggedItem, setDraggedItem] = useState<{ type: string; item: Profile | Vehicle } | null>(null);
  
  const [isUserDialogOpen, setIsUserDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [isSendingWhatsApp, setIsSendingWhatsApp] = useState(false);

  const sensors = useSensors(useSensor(PointerSensor));

  // Cargar días con tareas para el calendario
  useEffect(() => {
    const fetchCalendarData = async () => {
      try {
        const sixtyDaysAgo = subDays(new Date(), 60);
        const { data: recentTasks, error } = await supabase
          .from("detailed_tasks")
          .select("start_date, state, screen_group")
          .gte("start_date", sixtyDaysAgo.toISOString());

        if (error) {
          console.error("Error fetching calendar data:", error);
          return;
        }

        if (recentTasks) {
          const today = new Date();
          today.setHours(0, 0, 0, 0);

          const daysWithDataMap = new Map<string, { hasPending: boolean; hasTasks: boolean }>();

          recentTasks.forEach((task) => {
            const taskDate = new Date(task.start_date);
            taskDate.setHours(0, 0, 0, 0);
            const dateKey = format(taskDate, "yyyy-MM-dd");

            const isPast = taskDate < today;
            const isPending = task.state !== 'terminado' && task.screen_group === 'Instalaciones';

            if (!daysWithDataMap.has(dateKey)) {
              daysWithDataMap.set(dateKey, { hasPending: false, hasTasks: false });
            }

            daysWithDataMap.get(dateKey)!.hasTasks = true;

            if (isPast && isPending) {
              daysWithDataMap.get(dateKey)!.hasPending = true;
            }
          });

          const pendingDays = Array.from(daysWithDataMap.entries())
            .filter(([, { hasPending }]) => hasPending)
            .map(([dateStr]) => new Date(dateStr + "T00:00:00"));

          const taskDays = Array.from(daysWithDataMap.entries())
            .filter(([, { hasTasks }]) => hasTasks)
            .map(([dateStr]) => new Date(dateStr + "T00:00:00"));

          setDaysWithPendingTasks(pendingDays);
          setDaysWithTasks(taskDays);
        }
      } catch (error) {
        console.error("Error fetching calendar data:", error);
      }
    };

    fetchCalendarData();
  }, []);

  const handleEditTask = (task: Task) => {
    setSelectedTask(task);
    setIsTaskDialogOpen(true);
  };
  
  const handleEditUser = (user: Profile) => {
    setSelectedUser(user);
    setIsUserDialogOpen(true);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    // Always clear dragged item
    setDraggedItem(null);

    if (!over) {
      return;
    }

    const activeIsDraggableItem = active.id.toString().startsWith('sidebar-item-');
    const overIsTaskRow = tasks.some(t => t.id === over.id);

    if (activeIsDraggableItem && overIsTaskRow) {
      // Handle assignment of users/vehicles to tasks
      const { type, item } = active.data.current as { type: string; item: Profile | Vehicle };
      const taskId = over.id.toString();
      console.log('Assigning', type, item.id, 'to task', taskId);
      assignToTaskMutation.mutate(
        { taskId, itemId: item.id, type: type as 'user' | 'vehicle' },
        {
          onSuccess: () => {
            console.log('Assignment successful');
            refetch(); // Force refetch to update UI immediately
          },
          onError: (error) => {
            console.error('Assignment failed:', error);
            toast.error(`Error al asignar ${type === 'user' ? 'operario' : 'vehículo'}`);
          }
        }
      );
    }
    else if (active.id !== over.id) {
      // Handle task reordering with optimistic updates
      const oldIndex = tasks.findIndex((t) => t.id === active.id);
      const newIndex = tasks.findIndex((t) => t.id === over.id);

      if (oldIndex === -1 || newIndex === -1) {
        return;
      }

      // Optimistic update: immediately reorder the local state
      const newTasksOrder = arrayMove(tasks, oldIndex, newIndex);

      // Update local state immediately for better UX
      // Note: This will be overridden by the query refetch, but provides instant feedback
      // We need to be careful not to cause infinite re-renders

      // Call the mutation to persist the order
      updateOrderMutation.mutate(newTasksOrder, {
        onSuccess: () => {
          console.log('Task order updated successfully');
          // The query will refetch automatically due to the mutation
        },
        onError: (error) => {
          console.error('Failed to update task order:', error);
          toast.error('Error al reordenar tareas');
          // Note: The UI will be corrected by the next successful query refetch
        }
      });
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    if (event.active.id.toString().startsWith('sidebar-item-')) {
      setDraggedItem(event.active.data.current as { type: string; item: Profile | Vehicle });
    }
  };
  
  const handleShare = () => {
    if (date) {
        createSharedPlanMutation.mutate(date);
    }
  };

  const handleSendWhatsApp = async () => {
    if (!date || tasks.length === 0) {
      toast.error('No hay tareas para compartir');
      return;
    }

    setIsSendingWhatsApp(true);
    try {
      // Agrupar tareas por operario
      const tasksByUser = tasks.reduce((acc, task) => {
        task.assigned_users.forEach(user => {
          if (!acc[user.id]) {
            acc[user.id] = {
              user,
              tasks: []
            };
          }
          acc[user.id].tasks.push(task);
        });
        return acc;
      }, {} as Record<string, { user: Profile; tasks: Task[] }>);

      // Enviar notificación a cada operario
      const notifications = [];
      
      for (const [userId, { user, tasks: userTasks }] of Object.entries(tasksByUser)) {
        if (!user.phone) {
          console.warn(`Usuario ${user.full_name} no tiene teléfono`);
          continue;
        }

        // Generar token único
        const accessToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        
        // Guardar notificación en base de datos
        const { data: notification, error: notificationError } = await supabase
          .from('task_notifications')
          .insert({
            profile_id: userId,
            task_ids: userTasks.map(t => t.id),
            plan_date: date.toISOString(),
            access_token: accessToken,
            sent_at: new Date().toISOString()
          })
          .select()
          .single();

        if (notificationError) {
          console.error('Error saving notification:', notificationError);
          continue;
        }

        // Preparar mensaje para WhatsApp
        const tasksForMessage = userTasks.map(task => ({
          site: task.data?.site || 'Sin sitio',
          address: task.data?.address || 'Sin dirección',
          time: `${dayjs(task.start_date).format('HH:mm')} - ${dayjs(task.end_date).format('HH:mm')}`,
          vehicle: task.assigned_vehicles?.map(v => v.name).join(', ')
        }));

        const message = `Hola ${user.full_name}, aquí está tu plan de trabajo para hoy (${dayjs(date).format('DD/MM/YYYY')}):`;

        // Llamar a la Edge Function
        const { error: whatsappError } = await supabase.functions.invoke('send-whatsapp-notification', {
          body: {
            to: user.phone,
            message,
            tasks: tasksForMessage
          }
        });

        if (whatsappError) {
          console.error('Error sending WhatsApp:', whatsappError);
          toast.error(`Error al enviar WhatsApp a ${user.full_name}`);
        } else {
          notifications.push({ user: user.full_name, sent: true });
        }
      }

      if (notifications.length > 0) {
        toast.success(`Notificaciones enviadas a ${notifications.length} operarios`);
      } else {
        toast.error('No se pudo enviar ninguna notificación');
      }

    } catch (error) {
      console.error('Error in handleSendWhatsApp:', error);
      toast.error('Error al enviar notificaciones por WhatsApp');
    } finally {
      setIsSendingWhatsApp(false);
    }
  };

  const refreshData = () => {
    refetch();
    onDataUpdate();
  };

  return (
    <>
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setDraggedItem(null)}
      >
        <DragOverlay>
          {draggedItem && (
            <div className="bg-white border-2 border-primary rounded-md shadow-lg p-2 opacity-90">
              {draggedItem.type === 'user' ? (
                <div className="flex items-center gap-2">
                  <StatusBadge
                    status={(draggedItem.item as Profile).status}
                    size="sm"
                  />
                  <span className="font-medium">{(draggedItem.item as Profile).full_name}</span>
                </div>
              ) : (
                <VehicleBadge
                  name={(draggedItem.item as Vehicle).name}
                  type={(draggedItem.item as Vehicle).type}
                  size="sm"
                />
              )}
            </div>
          )}
        </DragOverlay>
        {/* 2-column responsive grid layout */}
        <div className="grid grid-cols-1 lg:grid-cols-[350px_1fr] gap-4">
          {/* Left column: Calendar + Operators + Vehicles */}
          <div className="space-y-4">
            {/* Calendar at top left */}
            <Card>
              <CardContent className="pt-6 flex justify-center">
                <Calendar
                   mode="single"
                   selected={date}
                   onSelect={setDate}
                   locale={es}
                   modifiers={{
                     today: new Date(),
                     pastWithPending: (date) => {
                       const today = new Date();
                       today.setHours(0, 0, 0, 0);
                       const dateKey = format(date, "yyyy-MM-dd");
                       return date < today && daysWithPendingTasks.some(d => format(d, "yyyy-MM-dd") === dateKey);
                     },
                     hasTasks: daysWithTasks,
                   }}
                   modifiersClassNames={{
                     today: "bg-orange-500 text-white hover:bg-orange-600 rounded-md font-medium ring-2 ring-orange-300",
                     pastWithPending: "bg-orange-100 border-2 border-orange-400 text-orange-700 hover:bg-orange-200 rounded-md font-medium",
                     hasTasks: "hasTasks",
                   }}
                 />
              </CardContent>
            </Card>

            {/* Operators card below calendar */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Operarios
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-64">
                  <div className="space-y-2">
                    {users.map(user => {
                      const tasksCount = tasks.filter(t => t.assigned_users.some(u => u.id === user.id)).length;
                      const isOverloaded = tasksCount > 1;

                      return (
                        <div key={user.id} className="group flex items-center gap-2">
                          <DraggableSidebarItem item={{...user, tasksCount}}>
                            <div className={`flex items-center gap-2 px-4 py-2 rounded-md flex-1 ${
                                user.status === 'activo' ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300' :
                                user.status === 'vacaciones' ? 'bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300' :
                                'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300'
                            }`}>
                                <User className="h-4 w-4 flex-shrink-0" />
                                <span className="text-sm font-medium">{user.full_name}</span>
                            </div>
                            {isOverloaded && (
                                <Badge variant="destructive" className="h-6 w-6 p-0 flex items-center justify-center rounded-full text-xs">
                                    {tasksCount}
                                </Badge>
                            )}
                          </DraggableSidebarItem>
                          <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => handleEditUser(user)}
                            >
                              <User className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Vehicles card below operators */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Car className="h-4 w-4" />
                  Vehículos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-64">
                  <div className="space-y-2">
                    {vehicles.map(vehicle => (
                      <DraggableSidebarItem key={vehicle.id} item={{...vehicle, type: 'vehicle'}}>
                        <VehicleBadge
                          name={vehicle.name}
                          type={vehicle.type}
                          size="sm"
                          className="w-full justify-start"
                        />
                      </DraggableSidebarItem>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          {/* Right column: Planning section at the same level as calendar */}
          <div className="space-y-4">
            <div className="flex flex-col gap-4">
              <h2 className="text-xl sm:text-2xl font-bold">
                Planificación para: {date ? dayjs(date).format('dddd, D [de] MMMM') : '...'}
              </h2>
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
                  <span className="hidden sm:inline">{isSendingWhatsApp ? 'Enviando...' : 'Enviar WhatsApp'}</span>
                  <span className="sm:hidden">{isSendingWhatsApp ? '...' : 'WA'}</span>
                </Button>
                <Button variant="outline" size="sm" className="sm:size-default">
                  <Download className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Exportar</span>
                </Button>
                <Button onClick={() => { setSelectedTask(null); setIsTaskDialogOpen(true); }} size="sm" className="sm:size-default">
                  <Plus className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Añadir Tarea</span>
                  <span className="sm:hidden">Nueva</span>
                </Button>
              </div>
            </div>

            <Card>
              <CardContent className="p-0">
                {loadingTasks ? <div className="p-8 text-center">Cargando...</div> : (
                  <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
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
            onSuccess={onDataUpdate}
            user={selectedUser}
        />
      )}
    </>
  );
}