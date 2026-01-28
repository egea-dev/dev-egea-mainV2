import React from 'react';
import { DetailedTask } from '@/integrations/supabase/types';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, MapPin, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface MobileTaskListProps {
    tasks: DetailedTask[];
    onTaskClick?: (task: DetailedTask) => void;
}

export const MobileTaskList = ({ tasks, onTaskClick }: MobileTaskListProps) => {
    if (tasks.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-8 text-center bg-muted/20 rounded-lg border border-dashed text-muted-foreground mt-4">
                <p className="text-sm">No hay tareas programadas para este período.</p>
            </div>
        );
    }

    return (
        <div className="space-y-3 mt-4 pb-20">
            {tasks.map((task) => {
                const isUrgent = task.state === 'urgente';
                const isCompleted = task.status === 'acabado' || task.state === 'terminado';

                return (
                    <Card
                        key={task.id}
                        className="overflow-hidden bg-card/60 backdrop-blur-sm active:scale-[0.98] transition-all duration-200"
                        onClick={() => onTaskClick?.(task)}
                    >
                        <CardContent className="p-4">
                            <div className="flex justify-between items-start mb-2">
                                <div className="flex-1 min-w-0 pr-2">
                                    <div className="flex items-center gap-1.5 mb-1">
                                        {isUrgent && <AlertTriangle className="w-3.5 h-3.5 text-red-500 animate-pulse" />}
                                        <h3 className={`font-semibold text-sm truncate ${isCompleted ? 'text-muted-foreground line-through' : ''}`}>
                                            {(typeof task.data?.site === 'string' ? task.data.site : null) || task.client || "Sin título"}
                                        </h3>
                                    </div>
                                    <div>
                                        <Badge variant="outline" className={`text-[10px] px-1.5 h-5 mb-1.5 ${isUrgent ? 'border-red-500/30 text-red-500 bg-red-500/10' :
                                            isCompleted ? 'border-border text-muted-foreground' : 'border-primary/30 text-primary bg-primary/5'
                                            }`}>
                                            {task.state || 'PENDIENTE'}
                                        </Badge>
                                    </div>
                                    {task.data?.description && (
                                        <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                                            {typeof task.data.description === 'string' ? task.data.description : ''}
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div className="flex flex-col gap-1.5 text-xs text-muted-foreground border-t pt-3 mt-1">
                                <div className="flex items-center gap-2">
                                    <Clock className="w-3.5 h-3.5" />
                                    <span>
                                        {task.start_date ? format(new Date(task.start_date), 'dd MMM', { locale: es }) : ''}
                                        {task.start_date && task.end_date && ' • '}
                                        {task.start_date ? format(new Date(task.start_date), 'HH:mm') : '--:--'} - {task.end_date ? format(new Date(task.end_date), 'HH:mm') : '--:--'}
                                    </span>
                                </div>
                                {task.location && (
                                    <div className="flex items-center gap-2">
                                        <MapPin className="w-3.5 h-3.5 shrink-0" />
                                        <span className="truncate">{task.location}</span>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                );
            })}
        </div>
    );
};
