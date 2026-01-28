import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { DetailedTask } from '@/integrations/supabase/types';
import { cn } from '@/lib/utils';
import { format, isSameDay, addDays, startOfWeek } from 'date-fns';
import { es } from 'date-fns/locale';
import { TaskCard } from './TaskCard';

interface WeeklyBoardProps {
    currentDate: Date;
    tasks: DetailedTask[];
    onDateClick: (date: Date) => void;
    onTaskEdit?: (task: DetailedTask) => void; // NUEVO
}

const DayColumn = ({ day, tasks, isToday, onTaskEdit }: {
    day: Date;
    tasks: DetailedTask[];
    isToday: boolean;
    onTaskEdit?: (task: DetailedTask) => void; // NUEVO
}) => {
    const { setNodeRef, isOver } = useDroppable({
        id: `day-${day.toISOString()}`,
        data: { type: 'day-column', date: day },
    });

    return (
        <div
            ref={setNodeRef}
            className={cn(
                "flex flex-col h-full min-h-[500px] rounded-xl transition-colors border",
                isOver ? "bg-muted/50 border-primary/50" : "bg-card/20 border-border/40 hover:bg-muted/40"
            )}
        >
            {/* Column Header */}
            <div className={cn(
                "p-3 text-center border-b border-border/40 rounded-t-xl",
                isToday ? "bg-emerald-500/10 dark:bg-emerald-500/20" : "bg-muted/40"
            )}>
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold mb-1">
                    {format(day, 'EEE', { locale: es })}
                </div>
                <div className={cn(
                    "text-2xl font-bold leading-none",
                    isToday ? "text-emerald-600 dark:text-emerald-400" : "text-foreground"
                )}>
                    {format(day, 'd')}
                </div>
            </div>

            {/* Tasks Container */}
            <div className="flex-1 p-2 space-y-2">
                {tasks
                    .sort((a, b) => {
                        // Primero ordenar por estado (urgente primero)
                        if (a.state === 'urgente' && b.state !== 'urgente') return -1;
                        if (a.state !== 'urgente' && b.state === 'urgente') return 1;

                        // Luego ordenar por hora de inicio
                        const timeA = (typeof a.data?.startTime === 'string' ? a.data.startTime : '23:59');
                        const timeB = (typeof b.data?.startTime === 'string' ? b.data.startTime : '23:59');

                        return timeA.localeCompare(timeB);
                    })
                    .map(task => (
                        <TaskCard key={task.id} task={task} onEdit={onTaskEdit} />
                    ))}
                {tasks.length === 0 && (
                    <div className="h-full flex items-center justify-center pointer-events-none">
                        <span className="text-[10px] text-muted-foreground/60 italic">Sin tareas</span>
                    </div>
                )}
            </div>
        </div>
    );
};

export const WeeklyBoard = ({ currentDate, tasks, onDateClick, onTaskEdit }: WeeklyBoardProps) => {
    const start = startOfWeek(currentDate, { weekStartsOn: 1 });
    // Generar 7 días pero filtrar domingo (día 0)
    const allDays = Array.from({ length: 7 }).map((_, i) => addDays(start, i));
    const weekDays = allDays.filter(day => day.getDay() !== 0); // Eliminar domingo
    const today = new Date();

    return (
        <div className="grid grid-cols-1 md:grid-cols-6 gap-2 h-full min-h-[600px] overflow-x-auto pb-4">
            {weekDays.map((day) => {
                const dayTasks = tasks.filter(t => t.start_date && isSameDay(new Date(t.start_date), day));
                // Sort by time
                const sortedTasks = [...dayTasks].sort((a, b) => {
                    const timeA = a.start_date ? new Date(a.start_date).getTime() : 0;
                    const timeB = b.start_date ? new Date(b.start_date).getTime() : 0;
                    return timeA - timeB;
                });

                return (
                    <DayColumn
                        key={day.toISOString()}
                        day={day}
                        tasks={sortedTasks}
                        isToday={isSameDay(day, today)}
                        onTaskEdit={onTaskEdit}
                    />
                );
            })}
        </div>
    );
};
