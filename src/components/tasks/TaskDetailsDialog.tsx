import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Task } from "@/types";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface TaskDetailsDialogProps {
  task: Task | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TaskDetailsDialog({ task, open, onOpenChange }: TaskDetailsDialogProps) {
  if (!task) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Detalles de la Tarea</DialogTitle>
          <DialogDescription>Información completa de la tarea</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Fecha de inicio</p>
              <p className="text-sm">{format(new Date(task.start_date + 'T00:00:00'), 'dd/MM/yyyy', { locale: es })}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Fecha de fin</p>
              <p className="text-sm">{format(new Date(task.end_date + 'T00:00:00'), 'dd/MM/yyyy', { locale: es })}</p>
            </div>
          </div>

          <div>
            <p className="text-sm font-medium text-muted-foreground mb-1">Sitio de trabajo</p>
            <p className="text-sm font-semibold">{task.site}</p>
          </div>

          <div>
            <p className="text-sm font-medium text-muted-foreground mb-1">Descripción</p>
            <p className="text-sm">{task.description}</p>
          </div>

          <div>
            <p className="text-sm font-medium text-muted-foreground mb-1">Ubicación</p>
            <p className="text-sm">{task.location || 'No especificada'}</p>
          </div>

          <div>
            <p className="text-sm font-medium text-muted-foreground mb-1">Estado</p>
            <Badge variant={task.state === 'urgente' ? 'destructive' : 'secondary'}>
              {task.state}
            </Badge>
          </div>

          {task.responsible && (
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">Responsable</p>
              <p className="text-sm">{task.responsible.full_name}</p>
            </div>
          )}

          <div>
            <p className="text-sm font-medium text-muted-foreground mb-2">Operarios asignados</p>
            <div className="flex flex-wrap gap-2">
              {task.assigned_users && task.assigned_users.length > 0 ? (
                task.assigned_users.map((user) => (
                  <div
                    key={user.id}
                    className="px-3 py-1.5 rounded-md text-sm bg-blue-50/70 dark:bg-blue-950/20 text-blue-700 dark:text-blue-200 ring-1 ring-blue-500/30"
                  >
                    {user.full_name}
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">Sin operarios asignados</p>
              )}
            </div>
          </div>

          <div>
            <p className="text-sm font-medium text-muted-foreground mb-2">Vehículos asignados</p>
            <div className="flex flex-wrap gap-2">
              {task.assigned_vehicles && task.assigned_vehicles.length > 0 ? (
                task.assigned_vehicles.map((vehicle) => {
                  const vehicleBgColor =
                    vehicle.type?.toLowerCase().includes('jumper') ? 'bg-blue-50/50 dark:bg-blue-950/10 text-blue-600 dark:text-blue-400 ring-1 ring-blue-500/20' :
                    vehicle.type?.toLowerCase().includes('camión') || vehicle.type?.toLowerCase().includes('camion') ? 'bg-yellow-50/50 dark:bg-yellow-950/10 text-yellow-600 dark:text-yellow-400 ring-1 ring-yellow-500/20' :
                    'bg-gray-50/50 dark:bg-gray-950/10 text-gray-600 dark:text-gray-400 ring-1 ring-gray-500/20';

                  return (
                    <div key={vehicle.id} className={`px-3 py-1.5 rounded-md text-sm ${vehicleBgColor}`}>
                      {vehicle.name}
                    </div>
                  );
                })
              ) : (
                <p className="text-sm text-muted-foreground">Sin vehículos asignados</p>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
