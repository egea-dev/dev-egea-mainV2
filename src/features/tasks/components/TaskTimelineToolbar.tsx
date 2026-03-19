import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Filter } from "lucide-react";

export type TimeScale = 'week' | '3days' | 'today';
export type TaskFilter = 'all' | 'instalaciones' | 'confeccion' | 'tapiceria';

interface TaskTimelineToolbarProps {
  timeScale: TimeScale;
  setTimeScale: (scale: TimeScale) => void;
  taskFilter: 'all' | 'instalaciones' | 'confeccion' | 'tapiceria';
  setTaskFilter: (filter: 'all' | 'instalaciones' | 'confeccion' | 'tapiceria') => void;
  selectedDate?: Date;
  onClearDate?: () => void;
  showFilter?: boolean;
}

export function TaskTimelineToolbar({
  timeScale,
  setTimeScale,
  taskFilter,
  setTaskFilter,
  selectedDate,
  onClearDate,
  showFilter = true
}: TaskTimelineToolbarProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-2">
      <div className="flex bg-muted rounded-md p-1 border">
        <Button 
          variant={timeScale === 'today' ? 'default' : 'ghost'} 
          size="sm" 
          onClick={() => setTimeScale('today')} 
          className="h-7 text-xs px-2"
        >
          Hoy
        </Button>
        <Button 
          variant={timeScale === '3days' ? 'default' : 'ghost'} 
          size="sm" 
          onClick={() => setTimeScale('3days')} 
          className="h-7 text-xs px-2"
        >
          3 Días
        </Button>
        <Button 
          variant={timeScale === 'week' ? 'default' : 'ghost'} 
          size="sm" 
          onClick={() => setTimeScale('week')} 
          className="h-7 text-xs px-2"
        >
          Semana
        </Button>
      </div>
      {showFilter && (
        <Select value={taskFilter} onValueChange={(value: 'all' | 'instalaciones' | 'confeccion' | 'tapiceria') => setTaskFilter(value)}>
          <SelectTrigger className="w-full sm:w-[150px] h-9 bg-background">
            <Filter className="mr-2 h-4 w-4" />
            <SelectValue placeholder="Filtrar por..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las salas</SelectItem>
            <SelectItem value="instalaciones">Instalaciones</SelectItem>
            <SelectItem value="confeccion">Confección</SelectItem>
            <SelectItem value="tapiceria">Tapicería</SelectItem>
          </SelectContent>
        </Select>
      )}
      {selectedDate && (
        <Button
          variant="outline"
          size="sm"
          onClick={onClearDate}
          className="whitespace-nowrap"
        >
          Limpiar filtro
        </Button>
      )}
    </div>
  );
}
