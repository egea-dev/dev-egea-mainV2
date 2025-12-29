import React, { useState, useMemo, useEffect } from 'react';
import {
    format,
    startOfWeek,
    endOfWeek,
    startOfMonth,
    endOfMonth,
    eachDayOfInterval,
    isSameMonth,
    isSameDay,
    addDays,
    subDays,
    addMonths,
    subMonths,
    isToday,
    parseISO
} from 'date-fns';
import { es } from 'date-fns/locale';
import {
    ChevronLeft,
    ChevronRight,
    Calendar as CalendarIcon,
    Search,
    Filter,
    Package,
    Hammer,
    ChevronDown,
    ChevronUp
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { useDashboardCalendarData, CalendarMode } from '@/hooks/use-dashboard-data';

interface CalendarModuleProps {
    className?: string;
    isMobile?: boolean;
    selectedDate?: Date;
    onDateSelect?: (date: Date) => void;
    embedded?: boolean; // New prop for Commercial Dashboard
}

// Helper to map Order Status to Colors
const getOrderColor = (status: string) => {
    switch (status) {
        case 'PENDIENTE_PAGO': return { bg: 'bg-slate-500', text: 'text-slate-300', border: 'border-slate-600', badge: 'bg-slate-500' };
        case 'PAGADO': return { bg: 'bg-blue-950/40', text: 'text-blue-400', border: 'border-blue-900/40', badge: 'bg-blue-500' };
        case 'EN_PRODUCCION': return { bg: 'bg-amber-950/40', text: 'text-amber-400', border: 'border-amber-900/40', badge: 'bg-amber-500' };
        case 'LISTO_ENVIO': return { bg: 'bg-indigo-950/40', text: 'text-indigo-400', border: 'border-indigo-900/40', badge: 'bg-indigo-500' };
        case 'ENVIADO': return { bg: 'bg-emerald-950/40', text: 'text-emerald-400', border: 'border-emerald-900/40', badge: 'bg-emerald-500' };
        case 'ENTREGADO': return { bg: 'bg-emerald-950/40', text: 'text-emerald-400', border: 'border-emerald-900/40', badge: 'bg-emerald-600' };
        case 'CANCELADO': return { bg: 'bg-red-950/40', text: 'text-red-400', border: 'border-red-900/40', badge: 'bg-red-500' };
        default: return { bg: 'bg-slate-800', text: 'text-slate-400', border: 'border-slate-700', badge: 'bg-slate-500' };
    }
};

export const CalendarModule = ({
    className,
    isMobile = false,
    selectedDate: propSelectedDate,
    onDateSelect,
    embedded = false
}: CalendarModuleProps) => {
    // State
    const [mode, setMode] = useState<CalendarMode>('commercial');
    const [viewMode, setViewMode] = useState<'week' | 'month'>('week');
    const [currentDate, setCurrentDate] = useState(new Date());
    const [searchQuery, setSearchQuery] = useState('');
    const [isCollapsed, setIsCollapsed] = useState(false);

    // Internal state for selection if not controlled, or sync
    const [internalSelectedDate, setInternalSelectedDate] = useState<Date | undefined>(new Date());

    const selectedDate = propSelectedDate !== undefined ? propSelectedDate : internalSelectedDate;

    // Data Fetching
    const { orders, tasks } = useDashboardCalendarData(currentDate, mode, viewMode);

    // Logic...
    // ... existing hooks ...
    const calendarDays = useMemo(() => {
        let start, end;
        if (viewMode === 'week') {
            start = startOfWeek(currentDate, { weekStartsOn: 1 });
            end = endOfWeek(currentDate, { weekStartsOn: 1 });
        } else {
            start = startOfWeek(startOfMonth(currentDate), { weekStartsOn: 1 });
            end = endOfWeek(endOfMonth(currentDate), { weekStartsOn: 1 });
        }
        return eachDayOfInterval({ start, end });
    }, [currentDate, viewMode]);

    const weekDays = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const workingDays = useMemo(() => calendarDays.filter(day => day.getDay() !== 0), [calendarDays]);

    // Handlers
    const handlePrev = () => {
        const fn = viewMode === 'week' ? subDays : subMonths;
        const amount = viewMode === 'week' ? 7 : 1;
        setCurrentDate(fn(currentDate, amount));
    };

    const handleNext = () => {
        const fn = viewMode === 'week' ? addDays : addMonths;
        const amount = viewMode === 'week' ? 7 : 1;
        setCurrentDate(fn(currentDate, amount));
    };

    const handleDateClick = (date: Date) => {
        setInternalSelectedDate(date);
        if (onDateSelect) onDateSelect(date);
    };

    if (embedded) {
        return (
            <div className={cn("flex flex-col h-full bg-card/50 backdrop-blur-sm rounded-xl border border-border/50", embedded ? "h-auto border-none bg-transparent shadow-none" : "", className)}>
                {!embedded && (
                    <div className="flex items-center justify-between p-4 border-b border-border/50">
                        {/* Full Header Content */}
                        {/* ... (Keep existing full header logic here if any, or simplify) ... */}
                    </div>
                )}

                {/* Embedded Header */}
                <div className={cn("flex items-center justify-between p-2", embedded ? "pb-0" : "p-4")}>
                    <div className="flex items-center gap-2">
                        <span className="text-lg font-bold text-foreground capitalize">
                            {format(currentDate, 'MMMM yyyy', { locale: es })}
                        </span>
                        <div className="flex items-center bg-secondary/50 rounded-lg p-0.5">
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handlePrev}><ChevronLeft className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleNext}><ChevronRight className="h-4 w-4" /></Button>
                        </div>
                    </div>
                    {!embedded && (
                        <div className="flex items-center gap-2">
                            {/* View toggles etc */}
                        </div>
                    )}
                </div>

                {/* Calendar Grid */}
                <div className="p-2 flex-1 overflow-auto">
                    <div className={cn("grid gap-2", viewMode === 'week' ? "grid-cols-6" : "grid-cols-7")}>
                        {workingDays.map(day => {
                            const isSelected = selectedDate && isSameDay(day, selectedDate);
                            const isTodayDate = isToday(day);

                            // Map and filter items based on mode
                            const rawItems = mode === 'commercial' ? orders : tasks;
                            const dayItems = rawItems.filter((item: any) => {
                                const dateStr = mode === 'commercial' ? item.delivery_date : item.start_date;
                                if (!dateStr) return false;
                                return isSameDay(parseISO(dateStr), day);
                            }).map((item: any) => ({
                                id: item.id,
                                title: mode === 'commercial' ? (item.customer_name || item.order_number) : (item.description || item.client?.full_name || "Tarea"),
                                status: mode === 'commercial' ? item.status : (item.state === 'urgente' ? 'URGENTE' : 'NORMAL'),
                                original: item
                            }));

                            return (
                                <div
                                    key={day.toISOString()}
                                    onClick={() => handleDateClick(day)}
                                    className={cn(
                                        "min-h-[80px] p-2 rounded-lg border transition-all cursor-pointer hover:border-primary/50",
                                        isSelected ? "bg-primary/10 border-primary" : "bg-card/40 border-border/50",
                                        isTodayDate && "ring-1 ring-primary/30"
                                    )}
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <span className={cn("text-sm font-medium", isSelected ? "text-primary" : "text-muted-foreground")}>
                                            {format(day, 'EEE d', { locale: es })}
                                        </span>
                                        {dayItems.length > 0 && (
                                            <Badge variant="secondary" className="text-[10px] h-4 px-1">
                                                {dayItems.length}
                                            </Badge>
                                        )}
                                    </div>
                                    <div className="space-y-1">
                                        {dayItems.slice(0, embedded ? 2 : 4).map((item, i) => (
                                            <div key={i} className="text-[10px] truncate text-muted-foreground flex items-center gap-1">
                                                <div className={cn("w-1.5 h-1.5 rounded-full",
                                                    mode === 'commercial'
                                                        ? getOrderColor(item.status).badge
                                                        : (item.status === 'URGENTE' ? 'bg-red-500' : 'bg-slate-500')
                                                )} />
                                                {item.title}
                                            </div>
                                        ))}
                                        {dayItems.length > (embedded ? 2 : 4) && (
                                            <div className="text-[10px] text-muted-foreground/60 pl-2">
                                                +{dayItems.length - (embedded ? 2 : 4)} más
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        );
    };

    // 2. Navegación


    const handleToday = () => {
        const today = new Date();
        setCurrentDate(today);
        handleDateClick(today);
    };



    // 3. Labels
    const dateRangeLabel = useMemo(() => {
        if (viewMode === 'week') {
            const start = startOfWeek(currentDate, { weekStartsOn: 1 });
            const end = endOfWeek(currentDate, { weekStartsOn: 1 });
            return `${format(start, 'd MMM', { locale: es })} - ${format(end, 'd MMM', { locale: es })}`;
        }
        return format(currentDate, 'MMMM yyyy', { locale: es });
    }, [currentDate, viewMode]);

    // 4. Data Filtering for Cell
    const getDayData = (day: Date) => {
        if (mode === 'commercial') {
            return orders.filter(order => {
                if (!order.delivery_date) return false;
                const orderDate = parseISO(order.delivery_date);
                return isSameDay(orderDate, day);
            }).filter(order => !searchQuery ||
                order.order_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
                order.customer_name.toLowerCase().includes(searchQuery.toLowerCase())
            );
        } else {
            return tasks.filter(task => {
                if (!task.start_date) return false;
                const taskDate = parseISO(task.start_date);
                return isSameDay(taskDate, day);
            }).filter(task => !searchQuery ||
                ((task as any).client?.full_name?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
                (task.description?.toLowerCase() || "").includes(searchQuery.toLowerCase())
            );
        }
    };

    return (
        <div className={cn("flex flex-col gap-4 mb-6 select-none", className)}>
            {/* Header Compacto tipo Dashboard */}
            <div className="flex flex-col gap-4 p-4 rounded-3xl border border-slate-800 bg-slate-900/60 backdrop-blur-md shadow-2xl">

                {/* Top Row: Title & View Switcher */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className={cn(
                            "p-2.5 rounded-xl border transition-colors",
                            mode === 'commercial' ? "bg-indigo-500/10 border-indigo-500/20 text-indigo-400" : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                        )}>
                            {mode === 'commercial' ? <Package className="w-5 h-5" /> : <Hammer className="w-5 h-5" />}
                        </div>
                        <div className="flex-1">
                            <h2 className="text-xl font-bold text-white tracking-tight">Calendario</h2>
                            <p className="text-xs text-slate-400 font-medium">
                                {mode === 'commercial' ? 'Vista de Pedidos y Entregas' : 'Vista de Instalaciones y Montajes'}
                            </p>
                        </div>
                        {/* Botón de colapso */}
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setIsCollapsed(!isCollapsed)}
                            className="h-8 w-8 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg"
                        >
                            {isCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
                        </Button>
                    </div>

                    {/* Mode Toggle */}
                    <div className="flex p-1 bg-slate-950/50 rounded-xl border border-slate-800/50">
                        <button
                            onClick={() => setMode('commercial')}
                            className={cn(
                                "px-4 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200",
                                mode === 'commercial' ? "bg-indigo-600 text-white shadow-lg shadow-indigo-900/20" : "text-slate-400 hover:text-slate-200"
                            )}
                        >
                            Comercial
                        </button>
                        <button
                            onClick={() => setMode('installations')}
                            className={cn(
                                "px-4 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200",
                                mode === 'installations' ? "bg-emerald-600 text-white shadow-lg shadow-emerald-900/20" : "text-slate-400 hover:text-slate-200"
                            )}
                        >
                            Instalaciones
                        </button>
                    </div>
                </div>

                <div className="h-px bg-slate-800/50 w-full" />

                {/* Bottom Row: Controls */}
                <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
                    {/* Search & Filter */}
                    <div className="flex items-center gap-2 w-full xl:w-auto">
                        <div className="relative w-full xl:w-72">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                            <Input
                                placeholder={mode === 'commercial' ? "Buscar pedido, cliente..." : "Buscar tarea, sitio..."}
                                className="pl-9 h-10 bg-slate-950/30 border-slate-800 text-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 rounded-xl text-sm"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <Button variant="ghost" size="icon" className="h-10 w-10 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl border border-slate-800 bg-slate-950/30">
                            <Filter className="w-4 h-4" />
                        </Button>
                    </div>

                    {/* View & Nav */}
                    <div className="flex items-center gap-3 w-full xl:w-auto justify-between xl:justify-end">
                        {/* View Toggle */}
                        <div className="flex items-center p-1 rounded-xl border border-slate-800 bg-slate-950/30">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setViewMode('week')}
                                className={cn(
                                    "h-8 rounded-lg px-3 text-xs font-semibold transition-all hover:bg-slate-800",
                                    viewMode === 'week' ? "bg-slate-800 text-white" : "text-slate-400 hover:text-slate-200"
                                )}>
                                Semana
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setViewMode('month')}
                                className={cn(
                                    "h-8 rounded-lg px-3 text-xs font-semibold transition-all hover:bg-slate-800",
                                    viewMode === 'month' ? "bg-slate-800 text-white" : "text-slate-400 hover:text-slate-200"
                                )}>
                                Mes
                            </Button>
                        </div>

                        {/* Nav Controls */}
                        <div className="flex items-center gap-1 rounded-xl border border-slate-800 bg-slate-950/30 p-1">
                            <Button variant="ghost" size="icon" onClick={handlePrev} className="h-8 w-8 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg">
                                <ChevronLeft className="h-4 w-4" />
                            </Button>

                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleToday}
                                className="h-8 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 px-3"
                            >
                                Hoy
                            </Button>

                            <span className="text-xs font-mono font-medium text-white min-w-[100px] text-center px-2 border-l border-r border-slate-800/50 h-5 flex items-center justify-center">
                                {dateRangeLabel}
                            </span>

                            <Button variant="ghost" size="icon" onClick={handleNext} className="h-8 w-8 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg">
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Leyendas Dinámicas */}
                <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-800/50">
                    {mode === 'commercial' ? (
                        <>
                            <Badge variant="outline" className="border-slate-800 bg-slate-900/50 text-slate-400 py-1 px-2.5 rounded-lg text-[10px]"><div className="w-1.5 h-1.5 rounded-full bg-slate-500 mr-2" />Pendiente Pago</Badge>
                            <Badge variant="outline" className="border-slate-800 bg-slate-900/50 text-slate-400 py-1 px-2.5 rounded-lg text-[10px]"><div className="w-1.5 h-1.5 rounded-full bg-blue-500 mr-2" />Pagado</Badge>
                            <Badge variant="outline" className="border-slate-800 bg-slate-900/50 text-slate-400 py-1 px-2.5 rounded-lg text-[10px]"><div className="w-1.5 h-1.5 rounded-full bg-amber-500 mr-2" />En Producción</Badge>
                            <Badge variant="outline" className="border-slate-800 bg-slate-900/50 text-slate-400 py-1 px-2.5 rounded-lg text-[10px]"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-2" />Enviado</Badge>
                        </>
                    ) : (
                        <>
                            <Badge variant="outline" className="border-slate-800 bg-slate-900/50 text-slate-400 py-1 px-2.5 rounded-lg text-[10px]"><div className="w-1.5 h-1.5 rounded-full bg-slate-500 mr-2" />Pendiente</Badge>
                            <Badge variant="outline" className="border-slate-800 bg-slate-900/50 text-slate-400 py-1 px-2.5 rounded-lg text-[10px]"><div className="w-1.5 h-1.5 rounded-full bg-red-500 mr-2" />Urgente</Badge>
                            <Badge variant="outline" className="border-slate-800 bg-slate-900/50 text-slate-400 py-1 px-2.5 rounded-lg text-[10px]"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-2" />Terminado</Badge>
                        </>
                    )}
                </div>
            </div>

            {/* Grid del Calendario - Colapsable */}
            {!isCollapsed && (
                <div className="overflow-x-auto pb-2 -mx-2 px-2 sm:mx-0 sm:px-0">
                    <div className="min-w-[800px] sm:min-w-full grid grid-cols-6 gap-px bg-slate-800/50 rounded-2xl overflow-hidden border border-slate-800 shadow-xl shadow-black/20">
                        {/* Cabecera Días */}
                        {weekDays.map((day) => (
                            <div key={day} className="bg-slate-900/95 py-3 text-center text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-800">
                                {day}
                            </div>
                        ))}

                        {/* Celdas Días */}
                        {workingDays.map((day, idx) => {
                            const items = getDayData(day);
                            const isSelected = selectedDate ? isSameDay(day, selectedDate) : false;
                            const isTodayDate = isToday(day);
                            const isCurrentMonth = isSameMonth(day, currentDate);

                            // Sort by urgency/time
                            const sortedTasks = [...items].sort((a: any, b: any) => {
                                // Primero por urgencia
                                if (a.state === 'urgente' && b.state !== 'urgente') return -1;
                                if (a.state !== 'urgente' && b.state === 'urgente') return 1;

                                // Luego por hora de inicio
                                const timeA = (typeof a.data?.startTime === 'string' ? a.data.startTime : '23:59');
                                const timeB = (typeof b.data?.startTime === 'string' ? b.data.startTime : '23:59');

                                return timeA.localeCompare(timeB);
                            });

                            const maxVisible = 4;
                            const visibleItems = sortedTasks.slice(0, maxVisible);
                            const moreCount = sortedTasks.length - maxVisible;

                            return (
                                <div
                                    key={day.toISOString()}
                                    onClick={() => handleDateClick(day)}
                                    className={cn(
                                        "min-h-[140px] p-2 transition-all cursor-pointer relative group flex flex-col gap-1.5",
                                        "hover:bg-slate-800/60",
                                        !isCurrentMonth && viewMode === 'month' && "bg-slate-950/30 opacity-50",
                                        isCurrentMonth || viewMode === 'week' ? "bg-slate-900/20" : "bg-slate-950/50",
                                        isSelected && "bg-slate-800/40 ring-1 ring-inset ring-slate-700 z-10",
                                        "border-r border-b border-slate-800/50 last:border-r-0"
                                    )}
                                >
                                    {/* Top Row: Date */}
                                    <div className="flex items-center justify-between mb-1">
                                        <span className={cn(
                                            "text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-lg transition-colors",
                                            isTodayDate
                                                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/30"
                                                : isSelected ? "text-slate-200 bg-slate-800" : "text-slate-500 group-hover:text-slate-300"
                                        )}>
                                            {format(day, 'd')}
                                        </span>
                                    </div>

                                    {/* Items Pills */}
                                    <div className="flex flex-col gap-1">
                                        {visibleItems.map((item: any) => {
                                            // Discriminator
                                            const isOrder = mode === 'commercial';

                                            if (isOrder) {
                                                const statusStyle = getOrderColor(item.status);
                                                return (
                                                    <div
                                                        key={item.id}
                                                        className={cn(
                                                            "text-[10px] px-2 py-1 rounded-md border truncate flex items-center gap-1.5 transition-all hover:scale-[1.02]",
                                                            statusStyle.bg, statusStyle.border, statusStyle.text
                                                        )}
                                                    >
                                                        <div className={cn("w-1 h-1 rounded-full flex-shrink-0", statusStyle.badge)} />
                                                        <span className="font-mono opacity-80">{item.order_number}</span>
                                                        <span className="truncate flex-1 font-medium">{item.customer_name}</span>
                                                    </div>
                                                );
                                            } else {
                                                // Task Item
                                                const isUrgent = item.state === 'urgente';
                                                const isTerminated = item.state === 'terminado';

                                                let bgClass = "bg-slate-800 border-slate-700 text-slate-300";
                                                let dotClass = "bg-slate-500";

                                                if (isUrgent) {
                                                    bgClass = "bg-red-950/30 border-red-900/30 text-red-300";
                                                    dotClass = "bg-red-500";
                                                } else if (isTerminated) {
                                                    bgClass = "bg-emerald-950/30 border-emerald-900/30 text-emerald-300";
                                                    dotClass = "bg-emerald-500";
                                                }

                                                return (
                                                    <div
                                                        key={item.id}
                                                        className={cn(
                                                            "text-[10px] px-2 py-1 rounded-md border truncate flex items-center gap-1.5 transition-all hover:scale-[1.02]",
                                                            bgClass
                                                        )}
                                                    >
                                                        <div className={cn("w-1 h-1 rounded-full flex-shrink-0", dotClass)} />
                                                        <span className="truncate flex-1 font-medium">
                                                            {item.data?.site || item.description || item.client?.full_name || "Sin título"}
                                                        </span>
                                                    </div>
                                                );
                                            }
                                        })}

                                        {moreCount > 0 && (
                                            <div className="text-[10px] text-slate-500 pl-1 font-medium hover:text-slate-300">
                                                + {moreCount} {mode === 'commercial' ? 'pedidos' : 'tareas'}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};
