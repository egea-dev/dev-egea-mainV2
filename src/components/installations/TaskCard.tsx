import React from 'react';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { DetailedTask, Profile, Vehicle } from '@/integrations/supabase/types';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, MapPin, Clock, Truck, Users as UsersIcon } from 'lucide-react';
import dayjs from 'dayjs';

interface TaskCardProps {
    task: DetailedTask;
    isOverlay?: boolean;
    onEdit?: (task: DetailedTask) => void; // NUEVO: callback para edición
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
                "bg-slate-900/60 backdrop-blur-sm hover:bg-slate-800/80",
                isDragging ? "opacity-30" : "opacity-100",
                isOverResource ? "ring-2 ring-emerald-500 bg-emerald-900/20" : "ring-1 ring-slate-800",
                "shadow-lg shadow-black/20",
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
                                isCompleted ? "text-slate-500 line-through" : "text-slate-200"
                            )}>
                                {(typeof task.data?.site === 'string' ? task.data.site : null) || task.client || "Sin título"}
                            </span>
                        </div>
                        {task.data?.description && (
                            <div className="text-[10px] text-slate-400 truncate mb-1">
                                {typeof task.data.description === 'string' ? task.data.description : ''}
                            </div>
                        )}
                        <div className="flex items-center gap-1 text-[10px] text-slate-400">
                            <MapPin className="w-3 h-3 text-slate-500" />
                            <span className="truncate max-w-[150px]">
                                {task.location || "Sin ubicación"}
                            </span>
                        </div>
                    </div>
                    <Badge
                        variant="outline"
                        className={cn(
                            "text-[9px] px-1.5 py-0 border-slate-700 bg-slate-950/50 uppercase tracking-wider h-5 flex items-center",
                            task.state === 'urgente' ? "text-red-400 border-red-900/30 bg-red-950/20" : "text-emerald-400"
                        )}
                    >
                        {task.state?.substring(0, 3) || "PEN"}
                    </Badge>
                </div>

                {/* Time Info */}
                <div className="flex items-center gap-1.5 text-[10px] text-slate-500 mb-2 font-mono ml-0.5">
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
                                {task.start_date ? dayjs(task.start_date).format('HH:mm') : '--:--'} - {task.end_date ? dayjs(task.end_date).format('HH:mm') : '--:--'}
                            </>
                        )}
                    </span>
                </div>

                {/* Resources Section (Droppable Area Visual Enhancement) */}
                <div className="flex flex-col gap-1.5 pt-2 border-t border-slate-800/50">

                    {/* Assigned Users */}
                    <div className="flex flex-wrap gap-1 items-center min-h-[1.25rem]">
                        <UsersIcon className="w-3 h-3 text-slate-600 mr-0.5" />
                        {(task.assigned_profiles as any[])?.length > 0 ? (
                            (task.assigned_profiles as any[]).map((user: any) => (
                                <div
                                    key={user.id}
                                    className="bg-slate-800 text-slate-300 text-[9px] px-1.5 py-0.5 rounded flex items-center gap-1 border border-slate-700"
                                    title={user.full_name}
                                >
                                    <span className="truncate max-w-[80px]">{user.full_name.split(' ')[0]}</span>
                                </div>
                            ))
                        ) : (
                            <span className="text-[9px] text-slate-600 italic">Sin operarios</span>
                        )}
                    </div>

                    {/* Assigned Vehicles */}
                    <div className="flex flex-wrap gap-1 items-center min-h-[1.25rem]">
                        <Truck className="w-3 h-3 text-slate-600 mr-0.5" />
                        {(task.assigned_vehicles as any[])?.length > 0 ? (
                            (task.assigned_vehicles as any[]).map((vehicle: any) => (
                                <div
                                    key={vehicle.id}
                                    className="bg-indigo-950/30 text-indigo-300 text-[9px] px-1.5 py-0.5 rounded flex items-center gap-1 border border-indigo-900/30"
                                    title={vehicle.name}
                                >
                                    <span className="truncate max-w-[80px]">{vehicle.name}</span>
                                </div>
                            ))
                        ) : (
                            <span className="text-[9px] text-slate-600 italic">Sin vehículo</span>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};
