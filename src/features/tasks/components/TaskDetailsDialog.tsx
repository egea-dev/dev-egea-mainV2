import { useEffect, useRef, type ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import type { Task } from "@/types";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { buildMapsSearchUrl } from "@/utils/maps";
import { MapPin } from "lucide-react";
import { TaskActionButtons, type TaskActionConfig } from "./TaskActionButtons";
import { normalizeTaskLocation } from "@/utils/task";

interface TaskDetailsDialogProps {
  task: Task | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  actions?: TaskActionConfig[];
  description?: string;
  title?: string;
  children?: ReactNode;
}

export function TaskDetailsDialog({
  task,
  open,
  onOpenChange,
  actions = [],
  description = "Consulta la información actualizada de la tarea.",
  title = "Detalles de la tarea",
  children,
}: TaskDetailsDialogProps) {
  const ignoreOutsideRef = useRef(false);
  const ignoreTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevOpenRef = useRef(open);

  if (open && !prevOpenRef.current) {
    ignoreOutsideRef.current = true;
  }

  useEffect(() => {
    const prevOpen = prevOpenRef.current;

    if (open && !prevOpen) {
      ignoreOutsideRef.current = true;
      if (ignoreTimeoutRef.current) {
        clearTimeout(ignoreTimeoutRef.current);
      }
      ignoreTimeoutRef.current = setTimeout(() => {
        ignoreOutsideRef.current = false;
        ignoreTimeoutRef.current = null;
      }, 200);
    }

    if (!open && prevOpen) {
      if (ignoreTimeoutRef.current) {
        clearTimeout(ignoreTimeoutRef.current);
        ignoreTimeoutRef.current = null;
      }
      ignoreOutsideRef.current = false;
    }

    prevOpenRef.current = open;

    return () => {
      if (ignoreTimeoutRef.current) {
        clearTimeout(ignoreTimeoutRef.current);
        ignoreTimeoutRef.current = null;
      }
      ignoreOutsideRef.current = false;
    };
  }, [open]);

  const handleInteractOutside = (event: Event) => {
    if (ignoreOutsideRef.current) {
      event.preventDefault();
    }
  };

  if (!task) return null;

  const locationLabel = normalizeTaskLocation(task);
  const mapsUrl = locationLabel ? buildMapsSearchUrl(locationLabel) : null;

  const formatDate = (value: string | null | undefined) => {
    if (!value) return "Sin fecha";
    const safeValue = value.includes("T") ? value : `${value}T00:00:00`;
    return format(new Date(safeValue), "dd/MM/yyyy", { locale: es });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="relative max-w-2xl"
        onInteractOutside={handleInteractOutside}
        onPointerDownOutside={handleInteractOutside}
      >
        <DialogHeader>
          <DialogTitle className="capitalize">{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[70vh] pr-4">
          <div className="space-y-4 py-2">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Fecha de inicio</p>
                <p className="text-sm font-semibold">{formatDate(task.start_date)}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Fecha de cierre</p>
                <p className="text-sm font-semibold">{formatDate(task.end_date)}</p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Sitio</p>
                <p className="text-sm">{task.site ?? "Sin especificar"}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Estado</p>
                <Badge variant={task.state === "urgente" ? "destructive" : "secondary"}>
                  {task.state}
                </Badge>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Descripción</p>
              <p className="text-sm leading-relaxed text-foreground/90">
                {task.description ?? "Sin descripción disponible"}
              </p>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Ubicación</p>
              {locationLabel ? (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium text-foreground">{locationLabel}</span>
                  {mapsUrl && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-2"
                      onClick={() => {
                        if (typeof window !== "undefined") {
                          window.open(mapsUrl, "_blank", "noopener");
                        }
                      }}
                    >
                      <MapPin className="h-4 w-4" />
                      Abrir en Maps
                    </Button>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No especificada</p>
              )}
            </div>

            {task.responsible && (
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Responsable</p>
                <p className="text-sm">{task.responsible.full_name}</p>
              </div>
            )}

            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Usuarios asignados</p>
              <div className="flex flex-wrap gap-2">
                {task.assigned_users && task.assigned_users.length > 0 ? (
                  task.assigned_users.map((user) => (
                    <div
                      key={user.id}
                      className="rounded-md bg-muted/60 px-3 py-1.5 text-sm text-foreground ring-1 ring-border/60"
                    >
                      {user.full_name}
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">Sin usuarios asignados</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Vehículos asignados</p>
              <div className="flex flex-wrap gap-2">
                {task.assigned_vehicles && task.assigned_vehicles.length > 0 ? (
                  task.assigned_vehicles.map((vehicle) => {
                    const type = vehicle.type?.toLowerCase() ?? "";
                    const style = type.includes("jumper")
                      ? "bg-muted/60 text-foreground ring-border/60"
                      : type.includes("camión") || type.includes("camion")
                        ? "bg-amber-500/10 text-amber-300 ring-amber-500/30"
                        : "bg-muted/40 text-muted-foreground ring-border/60";

                    return (
                      <div
                        key={vehicle.id}
                        className={`rounded-md px-3 py-1.5 text-sm ring-1 ${style}`}
                      >
                        {vehicle.name}
                      </div>
                    );
                  })
                ) : (
                  <p className="text-sm text-muted-foreground">Sin vehículos asignados</p>
                )}
              </div>
            </div>

            {children}
          </div>
        </ScrollArea>
        {actions.length > 0 && (
          <TaskActionButtons actions={actions} className="pt-4" />
        )}
      </DialogContent>
    </Dialog>
  );
}
