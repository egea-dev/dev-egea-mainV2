/**
 * ExpedicionesCalendar - Calendario específico para Expediciones
 * 
 * - Vista mensual por defecto
 * - Estados específicos: PTE_ENVIO, ENVIADO, ENTREGADO
 * - Sin tabs Comercial/Instalaciones
 * - Muestra pedidos pendientes Y procesados
 */

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
    GripVertical,
    LayoutList,
    Calendar as CalendarIcon,
    Package,
    Truck,
    CheckCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabaseProductivity } from '@/integrations/supabase';
import { toast } from 'sonner';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter
} from "@/components/ui/dialog";
import { ScrollArea } from '@/components/ui/scroll-area';

interface ExpedicionesCalendarProps {
    className?: string;
    onOrderClick?: (order: any) => void;
}

// Estados específicos de Expediciones
const EXPEDICIONES_STATUS_LEGEND = [
    { value: 'PTE_ENVIO', label: 'Pendiente Envío', color: 'bg-blue-500' },
    { value: 'ENVIADO', label: 'Procesado', color: 'bg-cyan-500' },
    { value: 'ENTREGADO', label: 'Entregado', color: 'bg-fuchsia-500' },
] as const;

const getExpedicionesStatusColor = (status: string) => {
    switch (status) {
        case 'PTE_ENVIO':
        case 'LISTO_ENVIO':
            return { bg: 'bg-card/90', text: 'text-blue-300', border: 'border-blue-500/50', badge: 'bg-blue-500' };
        case 'ENVIADO':
            return { bg: 'bg-card/90', text: 'text-cyan-300', border: 'border-cyan-500/50', badge: 'bg-cyan-500' };
        case 'ENTREGADO':
            return { bg: 'bg-card/90', text: 'text-fuchsia-300', border: 'border-fuchsia-500/50', badge: 'bg-fuchsia-500' };
        default:
            return { bg: 'bg-card/90', text: 'text-muted-foreground', border: 'border-border/60', badge: 'bg-muted-foreground' };
    }
};

const getExpedicionesStatusLabel = (status: string) => {
    if (status === 'ENVIADO') return 'PROCESADO';
    if (status === 'LISTO_ENVIO') return 'PTE_ENVIO';
    return status;
};

const getDisplayOrderNumber = (order: any) => order.admin_code || order.order_number || '';

interface ExpedicionOrder {
    id: string;
    order_number: string;
    admin_code?: string;
    customer_name?: string;
    customer_company?: string;
    status: string;
    delivery_date?: string | null;
    due_date?: string | null;
    region?: string;
    quantity_total?: number;
    fabric?: string;
}

export const ExpedicionesCalendar = ({
    className,
    onOrderClick
}: ExpedicionesCalendarProps) => {
    const queryClient = useQueryClient();
    const [viewMode, setViewMode] = useState<'week' | 'month'>('month'); // Mensual por defecto
    const [displayMode, setDisplayMode] = useState<'calendar' | 'list'>('calendar');
    const [currentDate, setCurrentDate] = useState(new Date());
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
    const [isDayDetailOpen, setIsDayDetailOpen] = useState(false);
    const [draggedItem, setDraggedItem] = useState<ExpedicionOrder | null>(null);
    const [dragOverDay, setDragOverDay] = useState<Date | null>(null);

    // Query para obtener TODOS los pedidos de expediciones (pendientes Y procesados)
    const { data: orders = [], refetch } = useQuery<ExpedicionOrder[]>({
        queryKey: ['expediciones-calendar-orders'],
        queryFn: async () => {
            const { data, error } = await supabaseProductivity
                .from('comercial_orders')
                .select('*')
                .in('status', ['PTE_ENVIO', 'LISTO_ENVIO', 'ENVIADO', 'ENTREGADO'])
                .order('created_at', { ascending: false });

            if (error) throw error;
            return (data || []) as ExpedicionOrder[];
        }
    });

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
        setSelectedDate(date);
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

    // Obtener pedidos para un día (por delivery_date o due_date)
    const getDayOrders = (day: Date) => {
        return orders.filter(order => {
            const dateField = order.delivery_date || order.due_date;
            if (!dateField) return false;
            const orderDate = parseISO(dateField);
            return isSameDay(orderDate, day);
        }).filter(order => !searchQuery ||
            getDisplayOrderNumber(order).toLowerCase().includes(searchQuery.toLowerCase()) ||
            (order.customer_company || order.customer_name || "").toLowerCase().includes(searchQuery.toLowerCase())
        );
    };

    // Drag and Drop Handlers
    const handleDragStart = (e: React.DragEvent, item: any) => {
        setDraggedItem(item);
        e.dataTransfer.effectAllowed = 'move';
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

        if (!draggedItem) return;

        const newDate = format(targetDay, 'yyyy-MM-dd');

        try {
            const { error } = await (supabaseProductivity as any)
                .from('comercial_orders')
                .update({ delivery_date: newDate })
                .eq('id', draggedItem.id);

            if (error) throw error;
            toast.success(`Pedido ${getDisplayOrderNumber(draggedItem)} movido a ${format(targetDay, 'd MMM', { locale: es })}`);
            refetch();
            queryClient.invalidateQueries({ queryKey: ['expediciones-orders'] });
        } catch (error) {
            console.error('Error moving order:', error);
            toast.error('Error al mover el pedido');
        }

        setDraggedItem(null);
        setDragOverDay(null);
    };

    // Contadores para estadísticas
    const stats = useMemo(() => {
        const pendientes = orders.filter(o => o.status === 'PTE_ENVIO' || o.status === 'LISTO_ENVIO').length;
        const procesados = orders.filter(o => o.status === 'ENVIADO').length;
        const entregados = orders.filter(o => o.status === 'ENTREGADO').length;
        return { pendientes, procesados, entregados, total: orders.length };
    }, [orders]);

    return (
        <div className={cn("flex flex-col gap-4 mb-6 select-none", className)}>
            {/* Header */}
            <div className="flex flex-col gap-4 p-4 rounded-3xl border border-border/60 bg-card backdrop-blur-md shadow-2xl">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <Truck className="w-5 h-5 text-primary" />
                        <div className="flex-1">
                            <h2 className="text-xl font-bold text-white tracking-tight">Calendario de Expediciones</h2>
                            <p className="text-xs text-slate-400 font-medium">
                                Previsión de entregas y envíos • {stats.total} pedidos
                            </p>
                        </div>
                    </div>

                    {/* Estadísticas rápidas */}
                    <div className="flex gap-2">
                        <Badge variant="outline" className="border-amber-500/50 text-amber-400 py-1 px-3">
                            <Package className="w-3 h-3 mr-1.5" />
                            {stats.pendientes} Pendiente
                        </Badge>
                        <Badge variant="outline" className="border-emerald-500/50 text-emerald-400 py-1 px-3">
                            <Truck className="w-3 h-3 mr-1.5" />
                            {stats.procesados} Procesado
                        </Badge>
                        <Badge variant="outline" className="border-blue-500/50 text-blue-400 py-1 px-3">
                            <CheckCircle className="w-3 h-3 mr-1.5" />
                            {stats.entregados} Entregado
                        </Badge>
                    </div>
                </div>

                <div className="h-px bg-border/60 w-full" />

                <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
                    <div className="flex items-center gap-2 w-full xl:w-auto">
                        <div className="relative w-full xl:w-72">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                            <Input
                                placeholder="Buscar pedido, cliente..."
                                className="pl-9 h-10 bg-muted/40 border-border/60 text-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary/50 rounded-xl text-sm"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-3 w-full xl:w-auto justify-between xl:justify-end">
                        <div className="flex items-center p-1 rounded-xl border border-border/60 bg-muted/40">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setDisplayMode('calendar')}
                                className={cn(
                                    "h-8 px-2 rounded-lg gap-2 text-xs font-semibold transition-all hover:bg-muted/60",
                                    displayMode === 'calendar' ? "bg-muted/60 text-white" : "text-slate-400 hover:text-slate-200"
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
                                    displayMode === 'list' ? "bg-muted/60 text-white" : "text-slate-400 hover:text-slate-200"
                                )}>
                                <LayoutList className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">Lista</span>
                            </Button>
                        </div>

                        <div className="flex items-center p-1 rounded-xl border border-border/60 bg-muted/40">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setViewMode('week')}
                                className={cn(
                                    "h-8 rounded-lg px-3 text-xs font-semibold transition-all hover:bg-muted/60",
                                    viewMode === 'week' ? "bg-muted/60 text-white" : "text-slate-400 hover:text-slate-200"
                                )}>
                                Semana
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setViewMode('month')}
                                className={cn(
                                    "h-8 rounded-lg px-3 text-xs font-semibold transition-all hover:bg-muted/60",
                                    viewMode === 'month' ? "bg-muted/60 text-white" : "text-slate-400 hover:text-slate-200"
                                )}>
                                Mes
                            </Button>
                        </div>

                        <div className="flex items-center gap-1 rounded-xl border border-border/60 bg-muted/40 p-1">
                            <Button variant="ghost" size="icon" onClick={handlePrev} className="h-8 w-8 text-slate-400 hover:text-white hover:bg-muted/60 rounded-lg">
                                <ChevronLeft className="h-4 w-4" />
                            </Button>

                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleToday}
                                className="h-8 text-xs font-semibold text-slate-300 hover:text-white hover:bg-muted/60 px-3"
                            >
                                Hoy
                            </Button>

                            <span className="text-xs font-mono font-medium text-white min-w-[100px] text-center px-2 border-l border-r border-border/60 h-5 flex items-center justify-center capitalize">
                                {dateRangeLabel}
                            </span>

                            <Button variant="ghost" size="icon" onClick={handleNext} className="h-8 w-8 text-slate-400 hover:text-white hover:bg-muted/60 rounded-lg">
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Leyenda de estados de Expediciones */}
                <div className="flex flex-wrap gap-2 pt-2 border-t border-border/60">
                    {EXPEDICIONES_STATUS_LEGEND.map((status) => (
                        <Badge
                            key={status.value}
                            variant="outline"
                            className="border-border/60 bg-card text-muted-foreground py-1 px-2.5 rounded-lg text-[10px]"
                        >
                            <div className={cn("w-1.5 h-1.5 rounded-full mr-2", status.color)} />
                            {status.label}
                        </Badge>
                    ))}
                </div>
            </div>

            {/* Calendar Grid */}
            {displayMode === 'calendar' ? (
                <div className="overflow-x-auto pb-2 -mx-2 px-2 sm:mx-0 sm:px-0">
                    <div className="min-w-[800px] sm:min-w-full grid grid-cols-6 gap-px bg-border/60 rounded-2xl overflow-hidden border border-border/60 shadow-xl shadow-black/20">
                        {weekDays.map((day) => (
                            <div key={day} className="bg-card py-3 text-center text-[10px] font-bold text-muted-foreground uppercase tracking-widest border-b border-border/60">
                                {day}
                            </div>
                        ))}

                        {workingDays.map((day) => {
                            const dayOrders = getDayOrders(day);
                            const isSelected = selectedDate ? isSameDay(day, selectedDate) : false;
                            const isTodayDate = isToday(day);
                            const isCurrentMonth = isSameMonth(day, currentDate);
                            const isDragOver = dragOverDay && isSameDay(day, dragOverDay);

                            const maxVisible = 4;
                            const visibleItems = dayOrders.slice(0, maxVisible);
                            const moreCount = dayOrders.length - maxVisible;

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
                                            "text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-lg transition-colors",
                                            isTodayDate
                                                ? "bg-primary text-primary-foreground shadow-lg shadow-primary/30"
                                                : isSelected ? "text-slate-200 bg-muted/60" : "text-slate-500 group-hover:text-slate-300"
                                        )}>
                                            {format(day, 'd')}
                                        </span>
                                        {dayOrders.length > 0 && (
                                            <Badge variant="secondary" className="text-[9px] h-4 px-1">
                                                {dayOrders.length}
                                            </Badge>
                                        )}
                                    </div>

                                    <div className="flex flex-col gap-1">
                                        {visibleItems.map((order: any) => {
                                            const statusStyle = getExpedicionesStatusColor(order.status);
                                            return (
                                                <div
                                                    key={order.id}
                                                    draggable
                                                    onDragStart={(e) => handleDragStart(e, order)}
                                                    onDragEnd={handleDragEnd}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onOrderClick?.(order);
                                                    }}
                                                    className={cn(
                                                        "text-[10px] px-2 py-1 rounded-md border truncate flex items-center gap-1.5 transition-all hover:scale-[1.02] cursor-move",
                                                        statusStyle.bg, statusStyle.border, statusStyle.text
                                                    )}
                                                >
                                                    <GripVertical className="w-2 h-2 opacity-50 flex-shrink-0" />
                                                    <div className={cn("w-1 h-1 rounded-full flex-shrink-0", statusStyle.badge)} />
                                                    <span className="font-mono opacity-80">{getDisplayOrderNumber(order)}</span>
                                                    <span className="truncate flex-1 font-medium">{order.customer_company || order.customer_name}</span>
                                                </div>
                                            );
                                        })}

                                        {moreCount > 0 && (
                                            <div className="text-[10px] text-slate-500 pl-1 font-medium hover:text-slate-300">
                                                + {moreCount} pedidos
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
                    <div className="space-y-2">
                        {orders.length === 0 ? (
                            <div className="text-center py-10 text-muted-foreground">
                                No hay pedidos en expediciones
                            </div>
                        ) : (
                            orders.map((order: any) => {
                                const statusStyle = getExpedicionesStatusColor(order.status);
                                return (
                                    <div
                                        key={order.id}
                                        onClick={() => onOrderClick?.(order)}
                                        className={cn(
                                            "p-4 rounded-xl border cursor-pointer transition-all hover:bg-muted/50",
                                            statusStyle.border
                                        )}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className={cn("w-2 h-2 rounded-full", statusStyle.badge)} />
                                                <div>
                                                    <p className="font-mono text-sm">{getDisplayOrderNumber(order)}</p>
                                                    <p className="text-xs text-muted-foreground">{order.customer_company || order.customer_name}</p>
                                                </div>
                                            </div>
                                            <Badge variant="outline" className={cn("text-xs", statusStyle.text, statusStyle.border)}>
                                                {getExpedicionesStatusLabel(order.status)}
                                            </Badge>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
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
                            Expediciones programadas para esta fecha.
                        </DialogDescription>
                    </DialogHeader>

                    <ScrollArea className="max-h-[60vh] mt-4 pr-4">
                        <div className="grid grid-cols-1 gap-3">
                            {selectedDate && getDayOrders(selectedDate).length > 0 ? (
                                getDayOrders(selectedDate).map((order: any) => {
                                    const statusStyle = getExpedicionesStatusColor(order.status);
                                    return (
                                        <div
                                            key={order.id}
                                            onClick={() => {
                                                onOrderClick?.(order);
                                                setIsDayDetailOpen(false);
                                            }}
                                            className={cn(
                                                "p-4 rounded-xl border bg-muted/30 hover:bg-muted/50 transition-all cursor-pointer group flex items-center justify-between",
                                                statusStyle.border
                                            )}
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className={cn("w-2 h-2 rounded-full", statusStyle.badge)} />
                                                <div>
                                                    <p className="font-mono text-xs text-muted-foreground">
                                                        {getDisplayOrderNumber(order)}
                                                    </p>
                                                    <p className="font-bold text-sm">
                                                        {order.customer_company || order.customer_name}
                                                    </p>
                                                </div>
                                            </div>
                                            <Badge variant="outline" className={cn("text-xs", statusStyle.text)}>
                                                {getExpedicionesStatusLabel(order.status)}
                                            </Badge>
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="text-center py-10 text-muted-foreground border border-dashed border-border/60 rounded-xl">
                                    No hay expediciones para este día.
                                </div>
                            )}
                        </div>
                    </ScrollArea>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setIsDayDetailOpen(false)}>Cerrar</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default ExpedicionesCalendar;
