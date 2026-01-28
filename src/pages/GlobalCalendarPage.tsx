import { useState, useEffect } from "react";
import { DndContext } from "@dnd-kit/core";
import PageShell from "@/components/layout/PageShell";
import { useIsMobile } from "@/hooks/use-mobile";
import { DetailedTask } from "@/integrations/supabase/types";
import { supabase, supabaseProductivity } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, startOfWeek, endOfWeek, subDays, addDays } from "date-fns";
import { es } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Loader2 } from "lucide-react";
import { MobileTaskList } from "@/features/installations/components/MobileTaskList"; // Import new component
import { WeeklyBoard } from "@/features/installations/components/WeeklyBoard"; // Reuse existing board
import { TaskDialog } from "@/features/installations/components/TaskDialog";
import { useAdminData } from "@/hooks/use-admin-data";
import { CalendarModule } from "@/components/dashboard/CalendarModule";

export default function GlobalCalendarPage() {
  const isMobile = useIsMobile();
  const { users, vehicles } = useAdminData();

  // Date State
  const [currentDate, setCurrentDate] = useState(new Date());
  const viewStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const viewEnd = endOfWeek(currentDate, { weekStartsOn: 1 });

  // Tasks State
  const [tasks, setTasks] = useState<DetailedTask[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(false);

  // Dialog State
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<DetailedTask | null>(null);
  const [viewType, setViewType] = useState<'week' | 'month'>('week');

  // Fetch Tasks
  const fetchTasks = async () => {
    setLoadingTasks(true);
    const startStr = format(subDays(viewStart, isMobile ? 1 : 1), 'yyyy-MM-dd'); // Buffer logic
    const endStr = format(addDays(viewEnd, isMobile ? 1 : 1), 'yyyy-MM-dd');

    // 1. Fetch Installation Tasks
    const { data: installationTasks, error: installationError } = await supabase
      .from('detailed_tasks')
      .select('*')
      .gte('start_date', startStr)
      .lte('start_date', endStr)
      .order('start_date', { ascending: true });

    // 2. Fetch Commercial Delivery Events FROM PRODUCTIVITY
    const { data: commercialEvents, error: commercialError } = await supabaseProductivity
      .from('comercial_calendar_events')
      .select('*')
      .gte('event_date', startStr)
      .lte('event_date', endStr);

    if (installationError || commercialError) {
      toast.error("Error cargando calendario");
      console.error("Installation Error:", installationError);
      console.error("Commercial Error:", commercialError);
    } else {
      // 3. Map Commercial Events to Task format (Synthetic DetailedTask)
      const mappedCommercial: any[] = (commercialEvents as any[] || []).map(event => ({
        id: event.id,
        title: event.title, // Keep for synthetic use
        description: event.title, // Map to existing field in DetailedTask
        start_date: event.event_date,
        end_date: event.event_date,
        client: event.customer_name,
        status: 'ENTREGA' as any,
        service_type: 'ENTREGA COMERCIAL',
        notes: `Región: ${event.region}`,
        // Required fields for DetailedTask to avoid UI crashes
        screen_id: 'commercial',
        state: 'comercial',
        order: 999,
        screen_name: 'Comercial',
        data: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }));

      // 4. Combine and Sort
      const combined = [...(installationTasks as any[] || []), ...mappedCommercial];
      setTasks(combined.sort((a, b) =>
        new Date(a.start_date!).getTime() - new Date(b.start_date!).getTime()
      ));
    }
    setLoadingTasks(false);
  };

  useEffect(() => {
    fetchTasks();
  }, [currentDate, isMobile]);

  const currentPeriodLabel = isMobile
    ? format(currentDate, "EEEE d 'de' MMMM", { locale: es }) // Mobile: "Lunes 12 de Enero"
    : `${format(viewStart, 'd MMM', { locale: es })} - ${format(viewEnd, 'd MMM', { locale: es })}`; // Desktop: "12 Ene - 18 Ene"

  const handlePrev = () => {
    setCurrentDate(prev => isMobile ? subDays(prev, 1) : subDays(prev, 7));
  };

  const handleNext = () => {
    setCurrentDate(prev => isMobile ? addDays(prev, 1) : addDays(prev, 7));
  };

  // Filter tasks for mobile day view
  const mobileDisplayTasks = isMobile
    ? tasks.filter(t => t.start_date && format(new Date(t.start_date), 'yyyy-MM-dd') === format(currentDate, 'yyyy-MM-dd'))
    : tasks;

  return (
    <PageShell
      title="Calendario Global"
      description={isMobile ? "Vista de tareas diarias." : "Interconexión de tareas y vista semanal."}
    >
      <div className={`flex flex-col gap-4 ${isMobile ? 'min-h-[50vh]' : 'h-full'}`}>
        {/* Navigation Header */}
        <div className="flex items-center justify-between bg-background/50 p-2 rounded-lg border border-border/60 backdrop-blur sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={handlePrev}>
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <div className="text-sm font-medium capitalize min-w-[140px] text-center">
              {currentPeriodLabel}
            </div>
            <Button variant="ghost" size="icon" onClick={handleNext}>
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>

          <div className="flex items-center gap-2">
            {!isMobile && (
              <div className="flex p-1 bg-muted/40 rounded-lg border border-border/60 mr-2">
                <Button
                  variant={viewType === 'week' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setViewType('week')}
                  className="h-7 px-3 text-xs font-semibold"
                >
                  Semana
                </Button>
                <Button
                  variant={viewType === 'month' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setViewType('month')}
                  className="h-7 px-3 text-xs font-semibold"
                >
                  Mes
                </Button>
              </div>
            )}
            {!isMobile && (
              <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())}>
                Hoy
              </Button>
            )}
          </div>
        </div>

        {/* Content */}
        {loadingTasks ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="flex-1 min-h-0">
            {isMobile ? (
              /* Mobile: List View */
              <MobileTaskList
                tasks={mobileDisplayTasks}
                onTaskClick={(t) => {
                  if (t.status === 'ENTREGA') {
                    toast.info(`Entrega: ${(t as any).title || t.description}`);
                    return;
                  }
                  setSelectedTask(t);
                  setIsTaskDialogOpen(true);
                }}
              />
            ) : viewType === 'week' ? (
              /* Desktop: Weekly Board (Reusing Logic) */
              <div className="h-[calc(100vh-220px)] border border-border/60 rounded-xl overflow-hidden bg-background/50">
                <DndContext>
                  <WeeklyBoard
                    currentDate={currentDate}
                    tasks={tasks}
                    onTaskEdit={(t) => {
                      if (t.status === 'ENTREGA') {
                        toast.info(`Detalle Entrega: ${(t as any).title || t.description}`);
                        return;
                      }
                      setSelectedTask(t);
                      setIsTaskDialogOpen(true);
                    }}
                    onDateClick={(d) => console.log('Date clicked', d)}
                  />
                </DndContext>
              </div>
            ) : (
              /* Desktop: Month View (CalendarModule) */
              <div className="p-4 border border-border/60 rounded-xl bg-background/50">
                <CalendarModule
                  mode="installations"
                  selectedDate={currentDate}
                  onDateSelect={setCurrentDate}
                  onTaskClick={(t) => {
                    // Normalize task from CalendarModule to match DetailedTask expected by TaskDialog
                    // useDashboardCalendarData might return simplified tasks
                    setSelectedTask(t as any);
                    setIsTaskDialogOpen(true);
                  }}
                />
              </div>
            )}
          </div>
        )}

      </div>

      {/* Task Dialog */}
      {isTaskDialogOpen && (
        <TaskDialog
          open={isTaskDialogOpen}
          onOpenChange={setIsTaskDialogOpen}
          onSuccess={fetchTasks}
          task={selectedTask as any}
          selectedDate={currentDate}
          users={users} // Pass real users hooks if available or empty for now
          vehicles={vehicles}
          draggedItem={null}
        />
      )}
    </PageShell>
  );
}
