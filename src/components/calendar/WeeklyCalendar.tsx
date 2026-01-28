import { useState, useMemo } from "react";
import { format, startOfWeek, addDays, isSameDay, subDays, isValid } from 'date-fns';
import { es } from 'date-fns/locale';
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

// Tipos para indicadores de estado
export interface DayTaskInfo {
    date: Date;
    hasOverdue?: boolean;   // Tareas atrasadas (rojo)
    hasPending?: boolean;   // Tareas pendientes (amarillo)
    hasCompleted?: boolean; // Tareas completadas (verde)
    taskCount?: number;     // Número de tareas
}

interface WeeklyCalendarProps {
    selectedDate: Date;
    onSelectDate: (date: Date) => void;
    daysWithTasks?: Date[];
    dayTaskInfo?: DayTaskInfo[];
    className?: string;
}

export function WeeklyCalendar({
    selectedDate,
    onSelectDate,
    daysWithTasks = [],
    dayTaskInfo = [],
    className,
}: WeeklyCalendarProps) {
    const [currentWeekStart, setCurrentWeekStart] = useState(() => {
        return startOfWeek(selectedDate, { weekStartsOn: 1 });
    });

    // Generar los 7 días de la semana actual
    const weekDays = useMemo(() => {
        const days = [];
        for (let i = 0; i < 7; i++) {
            days.push(addDays(currentWeekStart, i));
        }
        return days;
    }, [currentWeekStart]);

    // Obtener información de tareas para un día
    const getTaskInfoForDay = (date: Date): DayTaskInfo | undefined => {
        return dayTaskInfo.find((info) => isSameDay(info.date, date));
    };

    // Verificar si un día tiene tareas (legacy support)
    const hasTasksOnDay = (date: Date) => {
        if (dayTaskInfo.length > 0) {
            const info = getTaskInfoForDay(date);
            return info && (info.hasOverdue || info.hasPending || info.hasCompleted);
        }
        return daysWithTasks.some((taskDate) => isSameDay(taskDate, date));
    };

    // Verificar si un día está seleccionado
    const isSelectedDay = (date: Date) => {
        return isSameDay(selectedDate, date);
    };

    // Verificar si un día es hoy
    const isToday = (date: Date) => {
        return isSameDay(date, new Date());
    };

    // Navegar a la semana anterior
    const goToPreviousWeek = () => {
        setCurrentWeekStart(subDays(currentWeekStart, 7));
    };

    // Navegar a la semana siguiente
    const goToNextWeek = () => {
        setCurrentWeekStart(addDays(currentWeekStart, 7));
    };

    // Ir a la semana actual
    const goToCurrentWeek = () => {
        setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }));
        onSelectDate(new Date());
    };

    // Obtener el color del indicador basado en el estado de las tareas
    const getIndicatorColor = (taskInfo?: DayTaskInfo, isSelected: boolean = false) => {
        if (!taskInfo) return null;

        if (taskInfo.hasOverdue) {
            return isSelected ? "bg-red-200" : "bg-red-500";
        }
        if (taskInfo.hasPending) {
            return isSelected ? "bg-amber-200" : "bg-amber-500";
        }
        if (taskInfo.hasCompleted) {
            return isSelected ? "bg-emerald-200" : "bg-emerald-500";
        }
        return isSelected ? "bg-primary-foreground" : "bg-primary";
    };

    return (
        <div className={cn("space-y-4", className)}>
            {/* Header con navegación */}
            <div className="flex items-center justify-between">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={goToPreviousWeek}
                    className="h-9 w-9"
                >
                    <ChevronLeft className="h-5 w-5" />
                </Button>

                <div className="flex flex-col items-center">
                    <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-primary" />
                        <p className="text-sm font-semibold capitalize">
                            {format(currentWeekStart, "MMMM yyyy", { locale: es })}
                        </p>
                    </div>
                    <Button
                        variant="link"
                        size="sm"
                        onClick={goToCurrentWeek}
                        className="h-auto p-0 text-xs text-primary hover:text-primary/80"
                    >
                        Ir a hoy
                    </Button>
                </div>

                <Button
                    variant="ghost"
                    size="icon"
                    onClick={goToNextWeek}
                    className="h-9 w-9"
                >
                    <ChevronRight className="h-5 w-5" />
                </Button>
            </div>

            {/* Días de la semana */}
            <div className="grid grid-cols-7 gap-1.5">
                {weekDays.map((day) => {
                    const selected = isSelectedDay(day);
                    const today = isToday(day);
                    const hasTasks = hasTasksOnDay(day);
                    const taskInfo = getTaskInfoForDay(day);
                    const indicatorColor = getIndicatorColor(taskInfo, selected);

                    return (
                        <button
                            key={format(day, "yyyy-MM-dd")}
                            onClick={() => onSelectDate(day)}
                            className={cn(
                                "relative flex flex-col items-center justify-center rounded-xl p-2.5 transition-all duration-200",
                                "hover:bg-accent hover:text-accent-foreground hover:scale-105",
                                selected && "bg-primary text-primary-foreground shadow-md hover:bg-primary/90",
                                !selected && today && "ring-2 ring-primary ring-offset-2 ring-offset-background",
                                !selected && !today && "border border-border/50 hover:border-border"
                            )}
                        >
                            {/* Día de la semana */}
                            <span className={cn(
                                "text-[10px] font-medium uppercase tracking-wider",
                                selected ? "text-primary-foreground/80" : "text-muted-foreground"
                            )}>
                                {format(day, "ee", { locale: es })}
                            </span>

                            {/* Número del día */}
                            <span className={cn(
                                "text-xl font-bold",
                                selected && "text-primary-foreground",
                                !selected && today && "text-primary"
                            )}>
                                {format(day, "d")}
                            </span>

                            {/* Indicador de tareas mejorado */}
                            {hasTasks && (
                                <div className="absolute -bottom-0.5 flex gap-0.5">
                                    {taskInfo?.hasOverdue && (
                                        <div className={cn(
                                            "h-1.5 w-1.5 rounded-full",
                                            selected ? "bg-red-200" : "bg-red-500"
                                        )} />
                                    )}
                                    {taskInfo?.hasPending && (
                                        <div className={cn(
                                            "h-1.5 w-1.5 rounded-full",
                                            selected ? "bg-amber-200" : "bg-amber-500"
                                        )} />
                                    )}
                                    {taskInfo?.hasCompleted && (
                                        <div className={cn(
                                            "h-1.5 w-1.5 rounded-full",
                                            selected ? "bg-emerald-200" : "bg-emerald-500"
                                        )} />
                                    )}
                                    {!taskInfo && (
                                        <div className={cn(
                                            "h-1.5 w-1.5 rounded-full",
                                            selected ? "bg-primary-foreground" : "bg-primary"
                                        )} />
                                    )}
                                </div>
                            )}

                            {/* Badge de contador de tareas */}
                            {taskInfo?.taskCount && taskInfo.taskCount > 0 && (
                                <span className={cn(
                                    "absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold",
                                    selected
                                        ? "bg-primary-foreground text-primary"
                                        : "bg-primary text-primary-foreground"
                                )}>
                                    {taskInfo.taskCount > 9 ? "9+" : taskInfo.taskCount}
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Leyenda de colores */}
            <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                    <div className="h-2 w-2 rounded-full bg-red-500" />
                    <span>Atrasadas</span>
                </div>
                <div className="flex items-center gap-1">
                    <div className="h-2 w-2 rounded-full bg-amber-500" />
                    <span>Pendientes</span>
                </div>
                <div className="flex items-center gap-1">
                    <div className="h-2 w-2 rounded-full bg-emerald-500" />
                    <span>Completadas</span>
                </div>
            </div>
        </div>
    );
}
