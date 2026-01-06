import { useState, useEffect } from "react";
import { DndContext } from "@dnd-kit/core";
import PageShell from "@/components/layout/PageShell";
import { useIsMobile } from "@/hooks/use-mobile";
import { DetailedTask } from "@/integrations/supabase/types";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, startOfWeek, endOfWeek, subDays, addDays } from "date-fns";
import { es } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Loader2 } from "lucide-react";
import { MobileTaskList } from "@/components/installations/MobileTaskList"; // Import new component
import { WeeklyBoard } from "@/components/installations/WeeklyBoard"; // Reuse existing board
import { TaskDialog } from "@/components/installations/TaskDialog";
import { useAdminData } from "@/hooks/use-admin-data";

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

  // Fetch Tasks
  const fetchTasks = async () => {
    setLoadingTasks(true);
    const startStr = format(subDays(viewStart, isMobile ? 1 : 1), 'yyyy-MM-dd'); // Buffer logic
    const endStr = format(addDays(viewEnd, isMobile ? 1 : 1), 'yyyy-MM-dd');

    const { data, error } = await supabase
      .from('detailed_tasks')
      .select('*')
      .gte('start_date', startStr)
      .lte('start_date', endStr)
      .order('start_date', { ascending: true });

    if (error) {
      toast.error("Error cargando calendario");
      console.error(error);
    } else {
      setTasks((data as any[]) || []);
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
        <div className="flex items-center justify-between bg-background/50 p-2 rounded-lg border backdrop-blur sticky top-0 z-10">
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

          {!isMobile && (
            <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())}>
              Hoy
            </Button>
          )}
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
                  setSelectedTask(t);
                  setIsTaskDialogOpen(true);
                }}
              />
            ) : (
              /* Desktop: Weekly Board (Reusing Logic) */
              <div className="h-[calc(100vh-220px)] border rounded-xl overflow-hidden bg-background/50">
                <DndContext>
                  <WeeklyBoard
                    currentDate={currentDate}
                    tasks={tasks}
                    onTaskEdit={(t) => {
                      setSelectedTask(t);
                      setIsTaskDialogOpen(true);
                    }}
                    onDateClick={(d) => console.log('Date clicked', d)}
                  />
                </DndContext>
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
