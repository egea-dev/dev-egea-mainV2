import { useState, useMemo } from "react";
import dayjs from "dayjs";
import "dayjs/locale/es";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

dayjs.locale("es");

interface WeeklyCalendarProps {
    selectedDate: Date;
    onSelectDate: (date: Date) => void;
    daysWithTasks?: Date[];
    className?: string;
}

export function WeeklyCalendar({
    selectedDate,
    onSelectDate,
    daysWithTasks = [],
    className,
}: WeeklyCalendarProps) {
    const [currentWeekStart, setCurrentWeekStart] = useState(() => {
        return dayjs(selectedDate).startOf("week");
    });

    // Generar los 7 días de la semana actual
    const weekDays = useMemo(() => {
        const days = [];
        for (let i = 0; i < 7; i++) {
            days.push(currentWeekStart.add(i, "day"));
        }
        return days;
    }, [currentWeekStart]);

    // Verificar si un día tiene tareas
    const hasTasksOnDay = (date: dayjs.Dayjs) => {
        return daysWithTasks.some((taskDate) =>
            dayjs(taskDate).isSame(date, "day")
        );
    };

    // Verificar si un día está seleccionado
    const isSelectedDay = (date: dayjs.Dayjs) => {
        return dayjs(selectedDate).isSame(date, "day");
    };

    // Verificar si un día es hoy
    const isToday = (date: dayjs.Dayjs) => {
        return date.isSame(dayjs(), "day");
    };

    // Navegar a la semana anterior
    const goToPreviousWeek = () => {
        setCurrentWeekStart(currentWeekStart.subtract(7, "day"));
    };

    // Navegar a la semana siguiente
    const goToNextWeek = () => {
        setCurrentWeekStart(currentWeekStart.add(7, "day"));
    };

    // Ir a la semana actual
    const goToCurrentWeek = () => {
        setCurrentWeekStart(dayjs().startOf("week"));
    };

    return (
        <div className={cn("space-y-4", className)}>
            {/* Header con navegación */}
            <div className="flex items-center justify-between">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={goToPreviousWeek}
                    className="h-8 w-8"
                >
                    <ChevronLeft className="h-4 w-4" />
                </Button>

                <div className="flex flex-col items-center">
                    <p className="text-sm font-semibold">
                        {currentWeekStart.format("MMMM YYYY")}
                    </p>
                    <Button
                        variant="link"
                        size="sm"
                        onClick={goToCurrentWeek}
                        className="h-auto p-0 text-xs text-muted-foreground"
                    >
                        Ir a hoy
                    </Button>
                </div>

                <Button
                    variant="ghost"
                    size="icon"
                    onClick={goToNextWeek}
                    className="h-8 w-8"
                >
                    <ChevronRight className="h-4 w-4" />
                </Button>
            </div>

            {/* Días de la semana */}
            <div className="grid grid-cols-7 gap-1">
                {weekDays.map((day) => {
                    const selected = isSelectedDay(day);
                    const today = isToday(day);
                    const hasTasks = hasTasksOnDay(day);

                    return (
                        <button
                            key={day.format("YYYY-MM-DD")}
                            onClick={() => onSelectDate(day.toDate())}
                            className={cn(
                                "relative flex flex-col items-center justify-center rounded-lg p-2 transition-colors",
                                "hover:bg-accent hover:text-accent-foreground",
                                selected && "bg-primary text-primary-foreground hover:bg-primary/90",
                                !selected && today && "border-2 border-primary",
                                !selected && !today && "border border-transparent"
                            )}
                        >
                            {/* Día de la semana */}
                            <span className="text-xs font-medium uppercase">
                                {day.format("dd")}
                            </span>

                            {/* Número del día */}
                            <span className={cn(
                                "text-lg font-semibold",
                                selected && "text-primary-foreground",
                                !selected && today && "text-primary"
                            )}>
                                {day.format("D")}
                            </span>

                            {/* Indicador de tareas */}
                            {hasTasks && (
                                <div className={cn(
                                    "absolute bottom-1 h-1.5 w-1.5 rounded-full",
                                    selected ? "bg-primary-foreground" : "bg-primary"
                                )} />
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
