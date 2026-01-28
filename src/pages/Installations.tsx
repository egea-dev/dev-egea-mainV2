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
  DragOverEvent,
  closestCenter,
  closestCorners
} from "@dnd-kit/core";
import { SortableContext, arrayMove, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { es } from "date-fns/locale";
import { format, parseISO, subDays, addDays, startOfWeek, endOfWeek } from "date-fns";
import { cn } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";

import { Profile, Vehicle, DetailedTask } from "@/integrations/supabase/types"; // Updated Types import
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Users, Car, Share2, Download, MessageSquare, Plus, Search, ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";

import "@/styles/installations.css";

import { DraggableSidebarItem } from "@/features/installations/components/DraggableSidebarItem";
import { WeeklyBoard } from "@/features/installations/components/WeeklyBoard";
import { TaskCard } from "@/features/installations/components/TaskCard";
import { TaskDialog } from "@/features/installations/components/TaskDialog";
import { UserDialog } from "@/components/users/UserDialog";
import { VehicleBadge } from "@/features/fleet/components/VehicleBadge";
import { StatusBadge } from "@/components/shared/ui/StatusBadge";

import { useAdminData } from "@/hooks/use-admin-data";
import {
  useTasksByDate, // This might need update to fetch range
  useUpdateTaskOrder,
  useAssignToTask,
  useCreateSharedPlan,
  useProfile,
} from "@/hooks/use-supabase"; // Assuming these exist or we will use directsupabase
import { useIsMobile } from "@/hooks/use-mobile";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";


export default function InstallationsPage() {
  const { users, vehicles, fetchData: refreshAdminData } = useAdminData();
  const isMobile = useIsMobile();
  const location = useLocation();
  const queryClient = useQueryClient();

  // State for Date Navigation (Weekly)
  const [currentDate, setCurrentDate] = useState(new Date());

  // Start/End of Current View
  const viewStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const viewEnd = endOfWeek(currentDate, { weekStartsOn: 1 });

  // Fetching Tasks for the RANGE (Need to implement range fetching or just fetch all active? 
  // For now we will use raw supabase query here to ensure we get the week's tasks)
  const [tasks, setTasks] = useState<DetailedTask[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(false);

  // Mutations
  const assignToTaskMutation = useAssignToTask(currentDate);

  // Data Loading
  const fetchTasks = async () => {
    setLoadingTasks(true);
    const startStr = format(subDays(viewStart, 1), 'yyyy-MM-dd'); // Buffer
    const endStr = format(addDays(viewEnd, 1), 'yyyy-MM-dd');

    const { data, error } = await supabase
      .from('detailed_tasks')
      .select('*')
      .gte('start_date', startStr)
      .lte('start_date', endStr)
      .order('start_date', { ascending: true });

    if (error) {
      toast.error("Error cargando tareas");
      console.error(error);
    } else {
      // Cast purely for TS safety if types mismatch slightly
      setTasks((data as any[]) || []);
    }
    setLoadingTasks(false);
  };

  useEffect(() => {
    fetchTasks();
  }, [currentDate]);

  // Dialog States
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<DetailedTask | null>(null); // Use DetailedTask
  const [draggedItem, setDraggedItem] = useState<{ type: "user" | "vehicle" | "task"; item: any } | null>(null);

  const [isUserDialogOpen, setIsUserDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [isSendingWhatsApp, setIsSendingWhatsApp] = useState(false);

  const { data: profile } = useProfile();
  // const isManagerView = profile?.role === "admin" || profile?.role === "manager"; // Assume Manager for this view for now

  // Filters Sidebar
  const [userSearch, setUserSearch] = useState("");
  const [vehicleSearch, setVehicleSearch] = useState("");

  const filteredUsers = useMemo(() => {
    const query = userSearch.toLowerCase();
    return users.filter(u =>
      !query || (u.full_name && u.full_name.toLowerCase().includes(query))
    );
  }, [users, userSearch]);

  const filteredVehicles = useMemo(() => {
    const query = vehicleSearch.toLowerCase();
    return vehicles.filter(v =>
      !query || (v.name && v.name.toLowerCase().includes(query))
    );
  }, [vehicles, vehicleSearch]);

  // DND Handlers
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const activeData = active.data.current;
    if (activeData) {
      setDraggedItem(activeData as any);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setDraggedItem(null);
    const { active, over } = event;

    if (!over) return;

    // 1. Assigning Resource (User/Vehicle) to Task
    const isResource = active.data.current?.type === 'user' || active.data.current?.type === 'vehicle';
    const isOverTask = over.data.current?.type === 'task-drop-zone';

    if (isResource && isOverTask) {
      const task = over.data.current?.task;
      const resource = active.data.current?.item;
      const type = active.data.current?.type;

      // Optimistic UI Update (Optional, skipping for simplicity/safety first)

      // Call Mutation
      await assignToTaskMutation.mutateAsync({
        taskId: task.id,
        itemId: resource.id,
        type: type
      });
      toast.success(`Asignado ${resource.name} a tarea`);
      queryClient.invalidateQueries({ queryKey: ['dashboard-tasks'] });
      fetchTasks(); // Refresh
      return;
    }

    // 2. Moving Task (Rescheduling)
    const isTask = active.data.current?.type === 'task';
    const isOverDay = over.data.current?.type === 'day-column';

    if (isTask && isOverDay) {
      const task = active.data.current?.item as DetailedTask;
      const newDate = over.data.current?.date as Date;

      // Calculate new start date (preserve time if possible, or default to 09:00 if not set)
      const oldStart = task.start_date ? new Date(task.start_date) : null;
      const newStartDateTime = new Date(newDate);

      if (oldStart) {
        newStartDateTime.setHours(oldStart.getHours(), oldStart.getMinutes());
      } else {
        newStartDateTime.setHours(9, 0);
      }

      const updates = { start_date: newStartDateTime.toISOString() };

      // Optimistic UI
      const updatedTasks = tasks.map(t =>
        t.id === task.id ? { ...t, ...updates } : t
      );
      setTasks(updatedTasks);

      const { error } = await (supabase.from('screen_data') as any)
        .update(updates)
        .eq('id', task.id);

      if (error) {
        toast.error("Error al mover la tarea");
        fetchTasks(); // Revert
      } else {
        toast.success("Tarea reagendada");
        queryClient.invalidateQueries({ queryKey: ['dashboard-tasks'] });
      }
    }
  };

  const currentWeekLabel = `${format(viewStart, 'd MMM', { locale: es })} - ${format(viewEnd, 'd MMM', { locale: es })}`;

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      collisionDetection={closestCenter}
    >
      <div className="h-[calc(100vh-100px)] flex flex-col gap-4">

        {/* Top Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-card/40 p-3 rounded-2xl border border-border/60 backdrop-blur">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <CalendarIcon className="h-6 w-6 text-emerald-500" />
              Instalaciones <span className="text-muted-foreground font-light text-lg">| Tablero Semanal</span>
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center bg-muted/50 rounded-lg p-1 border border-border/60">
              <Button variant="ghost" size="icon" onClick={() => setCurrentDate(prev => subDays(prev, 7))}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="px-4 font-mono font-bold text-foreground min-w-[140px] text-center">
                {currentWeekLabel}
              </div>
              <Button variant="ghost" size="icon" onClick={() => setCurrentDate(prev => addDays(prev, 7))}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <Button
              onClick={() => { setSelectedTask(null); setIsTaskDialogOpen(true); }}
              className="bg-emerald-500 hover:bg-emerald-600 text-white gap-2"
            >
              <Plus className="h-4 w-4" /> Nueva Tarea
            </Button>
          </div>
        </div>

        {/* Main Layout */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4 min-h-0">

          {/* Sidebar (Resources) */}
          <Card className="bg-card/30 border-border/60 flex flex-col min-h-0 h-full">
            <div className="p-3 border-b border-border/60">
              <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-2">Usuarios</h3>
              <div className="relative">
                <Search className="absolute left-2 top-2 h-4 w-4 text-muted-foreground/50" />
                <Input
                  placeholder="Buscar..."
                  className="h-8 pl-8 bg-muted/40 border-border/60 text-xs"
                  value={userSearch}
                  onChange={e => setUserSearch(e.target.value)}
                />
              </div>
            </div>

            <ScrollArea className="flex-1 p-2">
              <div className="space-y-1">
                {filteredUsers.map(user => (
                  <DraggableSidebarItem key={user.id} item={user}>
                    <div className="flex items-center gap-2 p-2 rounded hover:bg-muted/40 cursor-grab active:cursor-grabbing border border-transparent hover:border-border/60">
                      <div className={cn("w-2 h-2 rounded-full", user.status === 'activo' ? 'bg-emerald-500' : 'bg-red-500')} />
                      <span className="text-sm text-muted-foreground truncate">{user.full_name}</span>
                    </div>
                  </DraggableSidebarItem>
                ))}
              </div>
            </ScrollArea>

            <div className="p-3 border-t border-b border-border/60 mt-2">
              <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-2">Vehículos</h3>
              <div className="relative">
                <Search className="absolute left-2 top-2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar..."
                  className="h-8 pl-8 bg-muted/40 border-border/60 text-xs"
                  value={vehicleSearch}
                  onChange={e => setVehicleSearch(e.target.value)}
                />
              </div>
            </div>

            <ScrollArea className="h-1/3 p-2">
              <div className="space-y-1">
                {filteredVehicles.map(vehicle => (
                  <DraggableSidebarItem key={vehicle.id} item={{ ...vehicle, type: 'vehicle' }}>
                    <div className="flex items-center gap-2 p-2 rounded hover:bg-muted/40 cursor-grab active:cursor-grabbing border border-transparent hover:border-border/60">
                      <Car className="w-3 h-3 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground truncate">{vehicle.name}</span>
                    </div>
                  </DraggableSidebarItem>
                ))}
              </div>
            </ScrollArea>
          </Card>

          {/* Board Area */}
          <div className="min-h-0 h-full overflow-hidden flex flex-col">
            <WeeklyBoard
              currentDate={currentDate}
              tasks={tasks}
              onDateClick={(date) => { /* Optional: Navigate to daily view or open add modal */ }}
              onTaskEdit={(task) => {
                setSelectedTask(task);
                setIsTaskDialogOpen(true);
              }}
            />
          </div>

        </div>
      </div>

      {/* Drag Overlay (Preview) */}
      <DragOverlay>
        {draggedItem ? (
          draggedItem.type === 'task' ? (
            <div className="w-[200px]"><TaskCard task={draggedItem.item} isOverlay /></div>
          ) : (
            <div className="bg-card text-card-foreground p-2 rounded shadow-xl border border-primary font-bold flex items-center gap-2">
              {draggedItem.type === 'user' ? <Users className="w-4 h-4" /> : <Car className="w-4 h-4" />}
              {draggedItem.item.name || draggedItem.item.full_name}
            </div>
          )
        ) : null}
      </DragOverlay>

      {/* Dialogs */}
      {isTaskDialogOpen && (
        <TaskDialog
          open={isTaskDialogOpen}
          onOpenChange={setIsTaskDialogOpen}
          onSuccess={fetchTasks}
          task={selectedTask as any} // Conversión temporal
          selectedDate={currentDate}
          users={users}
          vehicles={vehicles}
          draggedItem={null}
        />
      )}
    </DndContext>
  );
}
