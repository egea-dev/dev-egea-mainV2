import React, { useState, useMemo } from 'react';
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
    Search,
    Filter,
    Package,
    Hammer,
    ChevronDown,
    ChevronUp,
    GripVertical,
    LayoutList,
    Calendar as CalendarIcon,
    Clock
} from 'lucide-react';
import { TaskListView } from './TaskListView';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { getTaskStateColor } from '@/lib/constants';
import { getOrderStatusLabel } from '@/lib/order-status';
import { useDashboardCalendarData, CalendarMode } from '@/hooks/use-dashboard-data';
import { useQueryClient } from "@tanstack/react-query";
import { supabase, supabaseProductivity } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useOrders } from '@/hooks/use-orders';
import { OrderCard } from '@/features/commercial/components/OrderCard';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter
} from "@/components/ui/dialog";
import { ScrollArea } from '@/components/ui/scroll-area';
import { OrderDetailModal } from '@/features/commercial/components/OrderDetailModal';
import { useDeleteOrder } from '@/hooks/use-orders';
import { useProfile } from '@/hooks/use-supabase';


interface CalendarModuleProps {
    className?: string;
    isMobile?: boolean;
    selectedDate?: Date;
    onDateSelect?: (date: Date) => void;
    embedded?: boolean;
    mode?: CalendarMode;
    onTaskClick?: (task: any) => void;
}

const getOrderColor = (status: string) => {
    switch (status) {
        case 'PENDIENTE_PAGO':
            return {
                bg: 'bg-muted/50 dark:bg-card/90',
                text: 'text-muted-foreground',
                border: 'border-border',
                badge: 'bg-muted-foreground'
            };
        case 'PAGADO':
            return {
                bg: 'bg-emerald-100 dark:bg-emerald-500/20',
                text: 'text-emerald-800 dark:text-emerald-300',
                border: 'border-emerald-500/30',
                badge: 'bg-emerald-500'
            };
        case 'EN_PROCESO':
        case 'EN_PRODUCCION':
            return {
                bg: 'bg-amber-100 dark:bg-amber-500/20',
                text: 'text-amber-800 dark:text-amber-300',
                border: 'border-amber-500/30',
                badge: 'bg-amber-500'
            };
        case 'PTE_ENVIO':
        case 'LISTO_ENVIO':
            return {
                bg: 'bg-blue-100 dark:bg-blue-500/20',
                text: 'text-blue-800 dark:text-blue-300',
                border: 'border-blue-500/30',
                badge: 'bg-blue-500'
            };
        case 'ENVIADO':
            return {
                bg: 'bg-cyan-100 dark:bg-cyan-500/20',
                text: 'text-cyan-800 dark:text-cyan-300',
                border: 'border-cyan-500/30',
                badge: 'bg-cyan-500'
            };
        case 'ENTREGADO':
            return {
                bg: 'bg-fuchsia-100 dark:bg-fuchsia-500/20',
                text: 'text-fuchsia-800 dark:text-fuchsia-300',
                border: 'border-fuchsia-500/30',
                badge: 'bg-fuchsia-500'
            };
        case 'CANCELADO':
            return {
                bg: 'bg-red-100 dark:bg-red-500/20',
                text: 'text-red-800 dark:text-red-300',
                border: 'border-red-500/30',
                badge: 'bg-red-500'
            };
        default:
            return {
                bg: 'bg-muted/30 dark:bg-card/90',
                text: 'text-muted-foreground',
                border: 'border-border/60',
                badge: 'bg-muted-foreground'
            };
    }
};

const ORDER_STATUS_LEGEND = [
    'PENDIENTE_PAGO',
    'PAGADO',
    'EN_PROCESO',
    'PTE_ENVIO',
    'ENVIADO',
    'ENTREGADO',
    'CANCELADO'
] as const;

export const CalendarModule = ({
    className,
    isMobile = false,
    selectedDate: propSelectedDate,
    onDateSelect,
    embedded = false,
    mode: propMode,
    onTaskClick
}: CalendarModuleProps) => {
    const [mode, setMode] = useState<CalendarMode>(propMode || 'commercial');
    const [displayMode, setDisplayMode] = useState<'calendar' | 'list'>('calendar');
    const queryClient = useQueryClient();
    const [viewMode, setViewMode] = useState<'week' | 'month'>('week');
    const [currentDate, setCurrentDate] = useState(new Date());
    const [searchQuery, setSearchQuery] = useState('');
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [internalSelectedDate, setInternalSelectedDate] = useState<Date | undefined>(new Date());
    const [draggedItem, setDraggedItem] = useState<any>(null);
    const [dragOverDay, setDragOverDay] = useState<Date | null>(null);
    const [isDayDetailOpen, setIsDayDetailOpen] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState<any>(null);
    const { data: profile } = useProfile();
    const deleteOrder = useDeleteOrder();

    const canDeleteOrders = profile?.role === "admin" || profile?.role === "manager";


    const { data: allOrders = [], isLoading: ordersLoading } = useOrders();
    const activeOrders = useMemo(() => {
        if (!allOrders) return [];
        return allOrders.filter(o => o.status !== 'ENTREGADO' && o.status !== 'CANCELADO');
    }, [allOrders]);

    const selectedDate = propSelectedDate !== undefined ? propSelectedDate : internalSelectedDate;
    const { orders, tasks, refetch } = useDashboardCalendarData(currentDate, mode, viewMode);

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
        setIsDayDetailOpen(true);
    };


    const handleToday = () => {
        const today = new Date();
        setCurrentDate(today);
        handleDateClick(today);
    };

    const dateRangeLabel = useMemo(() => {
        if (viewMode === 'week') {
            const start = startOfWeek(currentDate, { weekStartsOn: 1 });
            const end = endOfWeek(currentDate, { weekStartsOn: 1 });
            return `${format(start, 'd MMM', { locale: es })} - ${format(end, 'd MMM', { locale: es })}`;
        }
        return format(currentDate, 'MMMM yyyy', { locale: es });
    }, [currentDate, viewMode]);

    const getDisplayOrderNumber = (order: any) => order.admin_code || order.order_number || '';

    const getDayData = (day: Date) => {
        if (mode === 'commercial') {
            return orders.filter(order => {
                if (!order.delivery_date) return false;
                const orderDate = parseISO(order.delivery_date);
                return isSameDay(orderDate, day);
            }).filter(order => !searchQuery ||
                getDisplayOrderNumber(order).toLowerCase().includes(searchQuery.toLowerCase()) ||
                (order.customer_company || order.customer_name || "").toLowerCase().includes(searchQuery.toLowerCase())
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

    // Drag and Drop Handlers
    const handleDragStart = (e: React.DragEvent, item: any) => {
        setDraggedItem(item);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/html', e.currentTarget.innerHTML);
        (e.target as HTMLElement).style.opacity = '0.4';
    };

    const handleDragEnd = (e: React.DragEvent) => {
        (e.target as HTMLElement).style.opacity = '1';
        setDraggedItem(null);
        setDragOverDay(null);
    };

    const handleDragOver = (e: React.DragEvent, day: Date) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        setDragOverDay(day);
    };

    const handleDragLeave = () => {
        setDragOverDay(null);
    };

    const handleDrop = async (e: React.DragEvent, targetDay: Date) => {
        e.preventDefault();
        e.stopPropagation();

        let itemToMove = draggedItem;

        // Try to get item from dataTransfer if internal state is null
        if (!itemToMove) {
            try {
                const orderData = e.dataTransfer.getData('application/json-order');
                if (orderData) {
                    itemToMove = JSON.parse(orderData);
                }
            } catch (err) {
                console.error("Error parsing dropped order data:", err);
            }
        }

        if (!itemToMove) return;

        const newDate = format(targetDay, 'yyyy-MM-dd');

        try {
            if (mode === 'commercial') {
                // Update order delivery_date in PRODUCTIVITY database
                const { error } = await (supabaseProductivity as any)
                    .from('comercial_orders')
                    .update({ delivery_date: newDate })
                    .eq('id', itemToMove.id);

                if (error) throw error;
                toast.success(`Pedido ${itemToMove.order_number} asignado a ${format(targetDay, 'd MMM', { locale: es })}`);
            } else {
                // Update task start_date in screen_data
                const { error } = await (supabase as any)
                    .from('screen_data')
                    .update({ start_date: newDate })
                    .eq('id', itemToMove.id);

                if (error) throw error;
                toast.success(`Tarea movida a ${format(targetDay, 'd MMM', { locale: es })}`);
            }

            // Refetch data
            refetch();
            queryClient.invalidateQueries({ queryKey: [mode === 'commercial' ? 'commercial-orders-calendar' : 'dashboard-tasks'] });
            queryClient.invalidateQueries({ queryKey: ['orders'] }); // Also invalidate orders for CommercialPage
        } catch (error) {
            console.error('Error moving item:', error);
            toast.error('Error al mover el elemento');
        }

        setDraggedItem(null);
        setDragOverDay(null);
    };

    if (embedded) {
        return (
            <div className={cn("flex flex-col h-full bg-card/50 backdrop-blur-sm rounded-xl border border-border/50", embedded ? "h-auto border-none bg-transparent shadow-none" : "", className)}>
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
                </div>

                <div className="p-2 flex-1 overflow-auto">
                    <div className={cn("grid gap-2", viewMode === 'week' ? "grid-cols-6" : "grid-cols-7")}>
                        {workingDays.map(day => {
                            const isSelected = selectedDate && isSameDay(day, selectedDate);
                            const isTodayDate = isToday(day);
                            const isDragOver = dragOverDay && isSameDay(day, dragOverDay);

                            const rawItems = mode === 'commercial' ? orders : tasks;
                            const dayItems = rawItems.filter((item: any) => {
                                const dateStr = mode === 'commercial' ? item.delivery_date : item.start_date;
                                if (!dateStr) return false;
                                return isSameDay(parseISO(dateStr), day);
                            }).map((item: any) => ({
                                id: item.id,
                                title: mode === 'commercial'
                                    ? (item.customer_company || item.customer_name || getDisplayOrderNumber(item))
                                    : (item.description || item.client?.full_name || "Tarea"),
                                status: mode === 'commercial' ? item.status : (item.state === 'urgente' ? 'URGENTE' : 'NORMAL'),
                                original: item
                            }));

                            return (
                                <div
                                    key={day.toISOString()}
                                    onClick={() => handleDateClick(day)}
                                    onDragOver={(e) => handleDragOver(e, day)}
                                    onDragLeave={handleDragLeave}
                                    onDrop={(e) => handleDrop(e, day)}
                                    className={cn(
                                        "min-h-[80px] p-2 rounded-lg border transition-all cursor-pointer hover:border-primary/50",
                                        isSelected ? "bg-primary/10 border-primary" : "bg-card/40 border-border/50",
                                        isTodayDate && "ring-1 ring-primary/30",
                                        isDragOver && "bg-primary/20 border-primary ring-2 ring-primary/50"
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
                                            <div
                                                key={i}
                                                draggable
                                                onDragStart={(e) => handleDragStart(e, item.original)}
                                                onDragEnd={handleDragEnd}
                                                className="text-[10px] truncate text-muted-foreground flex items-center gap-1 cursor-move hover:bg-primary/10 rounded px-1"
                                            >
                                                <GripVertical className="w-2 h-2 opacity-50" />
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
    }

    return (
        <div className={cn("flex flex-col gap-4 mb-6 select-none", className)}>
            {/* Header */}
            <div className="flex flex-col gap-4 p-4 rounded-3xl border border-border/60 bg-card backdrop-blur-md shadow-2xl">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className={cn(
                            "p-2.5 rounded-xl border transition-colors",
                            mode === 'commercial' ? "bg-primary/10 border-primary/20 text-primary" : "bg-neutral-500/10 border-neutral-500/20 text-neutral-400"
                        )}>
                            {mode === 'commercial' ? <Package className="w-5 h-5" /> : <Hammer className="w-5 h-5" />}
                        </div>
                        <div className="flex-1">
                            <h2 className="text-xl font-bold text-foreground tracking-tight">Calendario</h2>
                            <p className="text-xs text-muted-foreground font-medium">
                                {mode === 'commercial' ? 'Vista de Pedidos y Entregas' : 'Vista de Instalaciones y Montajes'}
                            </p>
                        </div>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setIsCollapsed(!isCollapsed)}
                            className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted/60 rounded-lg"
                        >
                            {isCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
                        </Button>
                    </div>

                    <div className="flex p-1 bg-muted/40 rounded-xl border border-border/60">
                        <button
                            onClick={() => setMode('commercial')}
                            className={cn(
                                "px-4 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200",
                                mode === 'commercial' ? "bg-primary text-primary-foreground shadow-lg shadow-primary/30" : "text-slate-400 hover:text-slate-200"
                            )}
                        >
                            Comercial
                        </button>
                        <button
                            onClick={() => setMode('installations')}
                            className={cn(
                                "px-4 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200",
                                mode === 'installations' ? "bg-primary text-primary-foreground shadow-lg shadow-primary/30" : "text-slate-400 hover:text-slate-200"
                            )}
                        >
                            Instalaciones
                        </button>
                    </div>
                </div>

                <div className="h-px bg-border/60 w-full" />

                <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
                    <div className="flex items-center gap-2 w-full xl:w-auto">
                        <div className="relative w-full xl:w-72">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                                placeholder={mode === 'commercial' ? "Buscar pedido, cliente..." : "Buscar tarea, sitio..."}
                                className="pl-9 h-10 bg-muted/40 border-border/60 text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary/50 rounded-xl text-sm"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <Button variant="ghost" size="icon" className="h-10 w-10 text-muted-foreground hover:text-foreground hover:bg-muted/60 rounded-xl border border-border bg-muted/20">
                            <Filter className="w-4 h-4" />
                        </Button>
                    </div>

                    <div className="flex items-center gap-3 w-full xl:w-auto justify-between xl:justify-end">
                        <div className="flex items-center p-1 rounded-xl border border-border/60 bg-muted/40">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setDisplayMode('calendar')}
                                className={cn(
                                    "h-8 px-2 rounded-lg gap-2 text-xs font-semibold transition-all hover:bg-muted/60",
                                    displayMode === 'calendar' ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"
                                )}>
                                <CalendarIcon className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">Calendario</span>
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setDisplayMode('list')}
                                className={cn(
                                    "h-8 px-2 rounded-lg gap-2 text-xs font-semibold transition-all hover:bg-muted/60",
                                    displayMode === 'list' ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"
                                )}>
                                <LayoutList className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">Lista</span>
                            </Button>
                        </div>

                        <div className="flex items-center p-1 rounded-xl border border-border/60 bg-muted/40">
                            <Button
                                variant={viewMode === 'week' ? 'secondary' : 'ghost'}
                                size="sm"
                                onClick={() => setViewMode('week')}
                                className={cn(
                                    "h-8 rounded-lg px-3 text-xs font-semibold transition-all hover:bg-muted/60",
                                    viewMode === 'week' ? "bg-background text-foreground shadow-sm dark:bg-muted/60 dark:text-white" : "text-muted-foreground"
                                )}>
                                Semana
                            </Button>
                            <Button
                                variant={viewMode === 'month' ? 'secondary' : 'ghost'}
                                size="sm"
                                onClick={() => setViewMode('month')}
                                className={cn(
                                    "h-8 rounded-lg px-3 text-xs font-semibold transition-all hover:bg-muted/60",
                                    viewMode === 'month' ? "bg-background text-foreground shadow-sm dark:bg-muted/60 dark:text-white" : "text-muted-foreground"
                                )}>
                                Mes
                            </Button>
                        </div>

                        <div className="flex items-center gap-1 rounded-xl border border-border/60 bg-muted/40 p-1">
                            <Button variant="ghost" size="icon" onClick={handlePrev} className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted/60 rounded-lg">
                                <ChevronLeft className="h-4 w-4" />
                            </Button>

                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleToday}
                                className="h-8 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/60 px-3"
                            >
                                Hoy
                            </Button>

                            <span className="text-xs font-mono font-bold text-foreground min-w-[100px] text-center px-2 border-l border-r border-border/60 h-5 flex items-center justify-center">
                                {dateRangeLabel}
                            </span>

                            <Button variant="ghost" size="icon" onClick={handleNext} className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted/60 rounded-lg">
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </div>

                <div className="flex flex-wrap gap-2 pt-2 border-t border-border/60">
                    {mode === 'commercial' ? (
                        <>
                            {ORDER_STATUS_LEGEND.map((status) => {
                                const style = getOrderColor(status);
                                return (
                                    <Badge
                                        key={status}
                                        variant="outline"
                                        className="border-border/60 bg-card text-muted-foreground py-1 px-2.5 rounded-lg text-[10px]"
                                    >
                                        <div className={cn("w-1.5 h-1.5 rounded-full mr-2", style.badge)} />
                                        {getOrderStatusLabel(status)}
                                    </Badge>
                                );
                            })}
                        </>
                    ) : (
                        <>
                            <Badge variant="outline" className="border-border bg-card text-muted-foreground py-1 px-2.5 rounded-lg text-[10px] font-medium"><div className="w-1.5 h-1.5 rounded-full bg-slate-400 mr-2" />Pendiente</Badge>
                            <Badge variant="outline" className="border-border bg-card text-muted-foreground py-1 px-2.5 rounded-lg text-[10px] font-medium"><div className="w-1.5 h-1.5 rounded-full bg-red-500 mr-2" />Urgente</Badge>
                            <Badge variant="outline" className="border-border bg-card text-muted-foreground py-1 px-2.5 rounded-lg text-[10px] font-medium"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-2" />Terminado</Badge>
                        </>
                    )}
                </div>
            </div>

            {/* Calendar Grid */}
            {!isCollapsed && (
                displayMode === 'calendar' ? (
                    <div className="overflow-x-auto pb-2 -mx-2 px-2 sm:mx-0 sm:px-0">
                        <div className="min-w-[800px] sm:min-w-full grid grid-cols-6 gap-px bg-border/60 rounded-2xl overflow-hidden border border-border/60 shadow-xl shadow-black/20">
                            {weekDays.map((day) => (
                                <div key={day} className="bg-card py-3 text-center text-[10px] font-bold text-muted-foreground uppercase tracking-widest border-b border-border/60">
                                    {day}
                                </div>
                            ))}

                            {workingDays.map((day) => {
                                const items = getDayData(day);
                                const isSelected = selectedDate ? isSameDay(day, selectedDate) : false;
                                const isTodayDate = isToday(day);
                                const isCurrentMonth = isSameMonth(day, currentDate);
                                const isDragOver = dragOverDay && isSameDay(day, dragOverDay);

                                const sortedTasks = [...items].sort((a: any, b: any) => {
                                    if (a.state === 'urgente' && b.state !== 'urgente') return -1;
                                    if (a.state !== 'urgente' && b.state === 'urgente') return 1;
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
                                        onDragOver={(e) => handleDragOver(e, day)}
                                        onDragLeave={handleDragLeave}
                                        onDrop={(e) => handleDrop(e, day)}
                                        className={cn(
                                            "min-h-[140px] p-2 transition-all cursor-pointer relative group flex flex-col gap-1.5",
                                            "hover:bg-muted/60",
                                            !isCurrentMonth && viewMode === 'month' && "bg-muted/40 opacity-50",
                                            isCurrentMonth || viewMode === 'week' ? "bg-card" : "bg-muted/40",
                                            isSelected && "bg-muted/60 ring-1 ring-inset ring-border/60 z-10",
                                            isDragOver && "bg-primary/20 ring-2 ring-inset ring-primary/50",
                                            "border-r border-b border-border/60 last:border-r-0"
                                        )}
                                    >
                                        <div className="flex items-center justify-between mb-1">
                                            <span className={cn(
                                                "text-xs font-bold w-6 h-6 flex items-center justify-center rounded-lg transition-colors",
                                                isTodayDate
                                                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/30"
                                                    : isSelected ? "text-foreground bg-muted font-bold" : "text-muted-foreground group-hover:text-foreground"
                                            )}>
                                                {format(day, 'd')}
                                            </span>
                                        </div>

                                        <div className="flex flex-col gap-1">
                                            {visibleItems.map((item: any) => {
                                                const isOrder = mode === 'commercial';

                                                if (isOrder) {
                                                    const statusStyle = getOrderColor(item.status);
                                                    return (
                                                        <div
                                                            key={item.id}
                                                            draggable
                                                            onDragStart={(e) => handleDragStart(e, item)}
                                                            onDragEnd={handleDragEnd}
                                                            className={cn(
                                                                "text-[10px] px-2 py-1 rounded-md border truncate flex items-center gap-1.5 transition-all hover:scale-[1.02] cursor-move",
                                                                statusStyle.bg, statusStyle.border, statusStyle.text
                                                            )}
                                                        >
                                                            <GripVertical className="w-2 h-2 opacity-50 flex-shrink-0" />
                                                            <div className={cn("w-1 h-1 rounded-full flex-shrink-0", statusStyle.badge)} />
                                                            <span className="font-mono opacity-80">{getDisplayOrderNumber(item)}</span>
                                                            <span className="truncate flex-1 font-medium">{item.customer_company || item.customer_name}</span>
                                                        </div>
                                                    );
                                                } else {
                                                    const isUrgent = item.state === 'urgente';
                                                    const stateClass = getTaskStateColor(item.state);
                                                    const dotClass = isUrgent ? "bg-amber-400" : "bg-slate-400";

                                                    return (
                                                        <div
                                                            key={item.id}
                                                            draggable
                                                            onDragStart={(e) => handleDragStart(e, item)}
                                                            onDragEnd={handleDragEnd}
                                                            className={cn(
                                                                "text-[11px] px-2.5 py-1.5 rounded-md border-2 truncate flex items-center gap-2 transition-all hover:scale-[1.02] cursor-move shadow-sm",
                                                                "border-l-4",
                                                                stateClass
                                                            )}
                                                        >
                                                            <GripVertical className="w-2 h-2 opacity-50 flex-shrink-0" />
                                                            <div className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", dotClass)} />
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
                ) : (
                    <div className="pt-2">
                        <TaskListView
                            tasks={mode === 'commercial' ? orders : tasks}
                            mode={mode}
                        />
                    </div>
                )
            )}
            {/* Day Detail Modal */}
            <Dialog open={isDayDetailOpen} onOpenChange={setIsDayDetailOpen}>
                <DialogContent className="max-w-2xl bg-card border-border/60">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold flex items-center gap-2">
                            <CalendarIcon className="w-5 h-5 text-primary" />
                            {selectedDate ? format(selectedDate, "EEEE d 'de' MMMM", { locale: es }) : 'Detalle del día'}
                        </DialogTitle>
                        <DialogDescription>
                            {mode === 'commercial' ? 'Pedidos programados para esta fecha.' : 'Tareas de instalación para esta fecha.'}
                        </DialogDescription>
                    </DialogHeader>

                    <ScrollArea className="max-h-[60vh] mt-4 pr-4">
                        <div className="grid grid-cols-1 gap-3">
                            {selectedDate && getDayData(selectedDate).length > 0 ? (
                                getDayData(selectedDate).map((item: any) => (
                                    <div
                                        key={item.id}
                                        onClick={() => {
                                            if (mode === 'commercial') {
                                                setSelectedOrder(item);
                                            } else if (onTaskClick) {
                                                onTaskClick(item);
                                            }
                                        }}
                                        className={cn(
                                            "p-4 rounded-xl border border-border/60 bg-muted/30 hover:bg-muted/50 transition-all cursor-pointer group flex items-center justify-between",
                                            mode === 'commercial' && getOrderColor(item.status).border
                                        )}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className={cn("w-2 h-2 rounded-full",
                                                mode === 'commercial'
                                                    ? getOrderColor(item.status).badge
                                                    : (item.state === 'urgente' ? 'bg-red-500' : 'bg-slate-500')
                                            )} />
                                            <div>
                                                <p className="font-mono text-xs text-muted-foreground">
                                                    {getDisplayOrderNumber(item)}
                                                </p>
                                                <p className="font-bold text-sm">
                                                    {mode === 'commercial'
                                                        ? (item.customer_company || item.customer_name)
                                                        : (item.data?.site || item.description || item.client?.full_name || "Sin título")}
                                                </p>
                                            </div>
                                        </div>
                                        {mode === 'commercial' && <Badge variant="outline">{getOrderStatusLabel(item.status)}</Badge>}
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-10 text-muted-foreground border border-dashed border-border/60 rounded-xl">
                                    No hay {mode === 'commercial' ? 'pedidos' : 'tareas'} para este día.
                                </div>
                            )}
                        </div>
                    </ScrollArea>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setIsDayDetailOpen(false)}>Cerrar</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Order Detail Modal for Commercial mode inside Calendar */}
            {
                selectedOrder && (
                    <OrderDetailModal
                        isOpen={!!selectedOrder}
                        onClose={() => setSelectedOrder(null)}
                        order={selectedOrder}
                        canDelete={canDeleteOrders}
                        onDelete={async (orderId) => {
                            await deleteOrder.mutateAsync(orderId);
                            setSelectedOrder(null);
                            refetch();
                        }}
                        onSave={() => {
                            setSelectedOrder(null);
                            refetch();
                        }}
                        userRole={profile?.role}
                    />
                )
            }
        </div >
    );
};
