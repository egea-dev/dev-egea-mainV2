import React from 'react';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { DetailedTask, Profile, Vehicle } from '@/integrations/supabase/types';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, MapPin, Clock, Truck, Users as UsersIcon } from 'lucide-react';
import { format } from 'date-fns';

interface TaskCardProps {
    task: DetailedTask;
    isOverlay?: boolean;
    onEdit?: (task: DetailedTask) => void;
}

export const TaskCard = ({ task, isOverlay, onEdit }: TaskCardProps) => {
    // Draggable: The task itself can be moved (to change dates)
    const {
        attributes,
        listeners,
        setNodeRef: setDraggableRef,
        isDragging
    } = useDraggable({
        id: `task-${task.id}`,
        data: { type: 'task', item: task },
    });

    // Droppable: Accepts Operators and Vehicles
    const {
        setNodeRef: setDroppableRef,
        isOver,
        active
    } = useDroppable({
        id: task.id,
        data: { type: 'task-drop-zone', task },
    });

    // Merge refs
    const setNodeRef = (node: HTMLElement | null) => {
        setDraggableRef(node);
        setDroppableRef(node);
    };

    const isUrgent = task.state === 'urgente';
    const isCompleted = task.status === 'acabado' || task.state === 'terminado';

    // Check if we are dragging a resource over this task
    const isOverResource = isOver && active?.data.current?.type !== 'task';

    return (
        <Card
            ref={setNodeRef}
            onDoubleClick={() => onEdit?.(task)} // NUEVO: doble-click para editar
            style={isOverlay ? { cursor: 'grabbing', opacity: 0.9, scale: 1.05 } : undefined}
            className={cn(
                "relative group transition-all duration-200 border-none select-none",
                "bg-card/60 backdrop-blur-sm hover:bg-muted/80",
                isDragging ? "opacity-30" : "opacity-100",
                isOverResource ? "ring-2 ring-primary bg-primary/10" : "ring-1 ring-border/40",
                "shadow-sm",
                onEdit && "cursor-pointer" // NUEVO: indicar que es clickeable
            )}
        >
            <CardContent className="p-3">
                {/* Header: Title & Handle */}
                <div
                    className="flex justify-between items-start mb-2 cursor-grab active:cursor-grabbing"
                    {...listeners}
                    {...attributes}
                >
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                            {isUrgent && <AlertTriangle className="w-3 h-3 text-red-500 animate-pulse" />}
                            <span className={cn(
                                "font-bold text-sm truncate",
                                isCompleted ? "text-muted-foreground line-through" : "text-foreground"
                            )}>
                                {(typeof task.data?.site === 'string' ? task.data.site : null) || task.client || "Sin título"}
                            </span>
                        </div>
                        {task.data?.description && (
                            <div className="text-[10px] text-muted-foreground truncate mb-1">
                                {typeof task.data.description === 'string' ? task.data.description : ''}
                            </div>
                        )}
                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                            <MapPin className="w-3 h-3 text-muted-foreground/60" />
                            <span className="truncate max-w-[150px]">
                                {task.location || "Sin ubicación"}
                            </span>
                        </div>
                    </div>
                    <Badge
                        variant="outline"
                        className={cn(
                            "text-[9px] px-1.5 py-0 border-border/60 bg-muted/50 uppercase tracking-wide h-5 flex items-center shadow-none",
                            task.state === 'urgente'
                                ? "text-red-600 dark:text-red-400 border-red-500/30 bg-red-100/50 dark:bg-red-950/20"
                                : "text-emerald-600 dark:text-emerald-400 border-emerald-500/30 bg-emerald-100/50 dark:bg-emerald-950/20"
                        )}
                    >
                        {task.state?.substring(0, 3) || "PEN"}
                    </Badge>
                </div>

                {/* Time Info */}
                <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground/60 mb-2 font-mono ml-0.5">
                    <Clock className="w-3 h-3" />
                    <span>
                        {task.data?.startTime && task.data?.endTime &&
                            typeof task.data.startTime === 'string' &&
                            typeof task.data.endTime === 'string' ? (
                            <>
                                {task.data.startTime} - {task.data.endTime}
                                <span className="ml-2 text-emerald-400">
                                    ({(() => {
                                        const [startH, startM] = task.data.startTime.split(':').map(Number);
                                        const [endH, endM] = task.data.endTime.split(':').map(Number);
                                        const duration = (endH * 60 + endM) - (startH * 60 + startM);
                                        const hours = Math.floor(duration / 60);
                                        const minutes = duration % 60;
                                        return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
                                    })()})
                                </span>
                            </>
                        ) : (
                            <>
                                {task.start_date ? format(new Date(task.start_date), 'HH:mm') : '--:--'} - {task.end_date ? format(new Date(task.end_date), 'HH:mm') : '--:--'}
                            </>
                        )}
                    </span>
                </div>

                {/* Resources Section (Droppable Area Visual Enhancement) */}
                <div className="flex flex-col gap-1.5 pt-2 border-t border-border/40">

                    {/* Assigned Users */}
                    <div className="flex flex-wrap gap-1 items-center min-h-[1.25rem]">
                        <UsersIcon className="w-3 h-3 text-muted-foreground/50 mr-0.5" />
                        {(task.assigned_profiles as any[])?.length > 0 ? (
                            (task.assigned_profiles as any[]).map((user: any) => (
                                <div
                                    key={user.id}
                                    className="bg-muted text-foreground text-[9px] px-1.5 py-0.5 rounded flex items-center gap-1 border border-border/60 shadow-none font-medium"
                                    title={user.full_name}
                                >
                                    <span className="truncate max-w-[80px]">{user.full_name.split(' ')[0]}</span>
                                </div>
                            ))
                        ) : (
                            <span className="text-[9px] text-muted-foreground/60 italic">Sin operarios</span>
                        )}
                    </div>

                    {/* Assigned Vehicles */}
                    <div className="flex flex-wrap gap-1 items-center min-h-[1.25rem]">
                        <Truck className="w-3 h-3 text-muted-foreground/50 mr-0.5" />
                        {(task.assigned_vehicles as any[])?.length > 0 ? (
                            (task.assigned_vehicles as any[]).map((vehicle: any) => (
                                <div
                                    key={vehicle.id}
                                    className="bg-muted/60 text-muted-foreground text-[9px] px-1.5 py-0.5 rounded flex items-center gap-1 border border-border/60"
                                    title={vehicle.name}
                                >
                                    <span className="truncate max-w-[80px]">{vehicle.name}</span>
                                </div>
                            ))
                        ) : (
                            <span className="text-[9px] text-muted-foreground/60 italic">Sin vehículo</span>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};
