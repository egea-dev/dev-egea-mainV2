/**
 * ProductionCalendar - Calendario responsivo para vista de producción
 * 
 * Desktop (>1024px): Calendario mensual completo
 * Mobile (<1024px): Lista de tareas por día
 */

import React, { useState, useMemo } from 'react';
import {
    ChevronLeft,
    ChevronRight,
    Calendar as CalendarIcon,
    List,
    Package,
    Clock,
    MapPin
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useOrientation, useDeviceType } from '@/hooks/useOrientation';
import { isWorkday, getWorkdaysRemaining } from '@/utils/workday-utils';
import { cn } from '@/lib/utils';
import {
    format,
    startOfMonth,
    endOfMonth,
    startOfWeek,
    endOfWeek,
    addDays,
    addMonths,
    subMonths,
    isSameMonth,
    isSameDay,
    isToday,
    isWeekend
} from 'date-fns';
import { es } from 'date-fns/locale';

interface WorkOrder {
    id: string;
    order_number: string;
    customer_name: string;
    status: string;
    due_date?: string | null;
    region?: string;
    fabric?: string;
    quantity_total?: number;
}

interface ProductionCalendarProps {
    orders: WorkOrder[];
    onOrderClick?: (order: WorkOrder) => void;
    filterRegion?: string;
}

const ProductionCalendar: React.FC<ProductionCalendarProps> = ({
    orders,
    onOrderClick,
    filterRegion
}) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const deviceType = useDeviceType();
    const isMobile = deviceType === 'mobile' || deviceType === 'tablet';

    // Filtrar pedidos por región si aplica
    const filteredOrders = useMemo(() => {
        if (!filterRegion || filterRegion === 'ALL') return orders;
        return orders.filter(o => o.region?.toUpperCase() === filterRegion);
    }, [orders, filterRegion]);

    // Agrupar pedidos por fecha de vencimiento
    const ordersByDate = useMemo(() => {
        const map = new Map<string, WorkOrder[]>();
        filteredOrders.forEach(order => {
            if (order.due_date) {
                const dateKey = format(new Date(order.due_date), 'yyyy-MM-dd');
                const existing = map.get(dateKey) || [];
                map.set(dateKey, [...existing, order]);
            }
        });
        return map;
    }, [filteredOrders]);

    // Navegación del calendario
    const handlePrevMonth = () => setCurrentDate(subMonths(currentDate, 1));
    const handleNextMonth = () => setCurrentDate(addMonths(currentDate, 1));
    const handleToday = () => {
        setCurrentDate(new Date());
        setSelectedDate(new Date());
    };

    // Generar días del calendario (solo días laborables L-V)
    const calendarDays = useMemo(() => {
        const start = startOfWeek(startOfMonth(currentDate), { weekStartsOn: 1 });
        const end = endOfWeek(endOfMonth(currentDate), { weekStartsOn: 1 });
        const days: Date[] = [];
        let day = start;
        while (day <= end) {
            // Solo añadir días laborables (L-V)
            if (!isWeekend(day)) {
                days.push(day);
            }
            day = addDays(day, 1);
        }
        return days;
    }, [currentDate]);

    // Obtener pedidos de un día específico
    const getOrdersForDay = (date: Date): WorkOrder[] => {
        const dateKey = format(date, 'yyyy-MM-dd');
        return ordersByDate.get(dateKey) || [];
    };

    // Badge de urgencia
    const getUrgencyBadge = (daysRemaining: number) => {
        if (daysRemaining < 0) return { label: 'Vencido', color: 'bg-red-500/20 text-red-400 border-red-500/30' };
        if (daysRemaining <= 2) return { label: 'Urgente', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' };
        if (daysRemaining <= 5) return { label: 'Próximo', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' };
        return { label: 'A tiempo', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' };
    };

    // Vista móvil: Lista de tareas
    if (isMobile) {
        // Obtener próximos 7 días laborables
        const upcomingDays: Date[] = [];
        let checkDate = new Date();
        while (upcomingDays.length < 7) {
            if (isWorkday(checkDate)) {
                upcomingDays.push(new Date(checkDate));
            }
            checkDate = addDays(checkDate, 1);
        }

        return (
            <div className="space-y-4">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                        <List className="w-5 h-5 text-primary" />
                        Tareas por Día
                    </h3>
                    <Badge variant="outline" className="text-gray-400">
                        {filteredOrders.length} pedidos
                    </Badge>
                </div>

                {/* Lista de días */}
                <div className="space-y-3">
                    {upcomingDays.map(day => {
                        const dayOrders = getOrdersForDay(day);
                        const isCurrentDay = isToday(day);

                        return (
                            <Card
                                key={day.toISOString()}
                                className={cn(
                                    "bg-card/50 border-border/60",
                                    isCurrentDay && "border-primary/50 bg-primary/5"
                                )}
                            >
                                <CardHeader className="py-3 px-4">
                                    <div className="flex items-center justify-between">
                                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                                            <CalendarIcon className="w-4 h-4 text-gray-400" />
                                            <span className={cn(
                                                isCurrentDay && "text-primary"
                                            )}>
                                                {format(day, "EEEE d 'de' MMMM", { locale: es })}
                                            </span>
                                            {isCurrentDay && (
                                                <Badge className="bg-primary/20 text-primary text-xs">HOY</Badge>
                                            )}
                                        </CardTitle>
                                        <Badge variant="secondary" className="text-xs">
                                            {dayOrders.length} pedidos
                                        </Badge>
                                    </div>
                                </CardHeader>
                                {dayOrders.length > 0 && (
                                    <CardContent className="py-2 px-4 space-y-2">
                                        {dayOrders.map(order => {
                                            const daysRemaining = getWorkdaysRemaining(order.due_date);
                                            const urgency = getUrgencyBadge(daysRemaining);

                                            return (
                                                <div
                                                    key={order.id}
                                                    onClick={() => onOrderClick?.(order)}
                                                    className="flex items-center justify-between p-2 bg-muted/30 rounded-lg cursor-pointer hover:bg-muted/50"
                                                >
                                                    <div>
                                                        <p className="font-medium text-foreground text-sm">
                                                            {order.order_number}
                                                        </p>
                                                        <p className="text-xs text-gray-400">
                                                            {order.customer_name}
                                                        </p>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        {order.region && (
                                                            <Badge variant="outline" className="text-xs">
                                                                <MapPin className="w-3 h-3 mr-1" />
                                                                {order.region}
                                                            </Badge>
                                                        )}
                                                        <Badge className={cn("text-xs border", urgency.color)}>
                                                            {daysRemaining}d
                                                        </Badge>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </CardContent>
                                )}
                                {dayOrders.length === 0 && (
                                    <CardContent className="py-2 px-4">
                                        <p className="text-gray-500 text-sm text-center">
                                            Sin tareas programadas
                                        </p>
                                    </CardContent>
                                )}
                            </Card>
                        );
                    })}
                </div>
            </div>
        );
    }

    // Vista desktop: Calendario completo
    return (
        <div className="space-y-4">
            {/* Header con navegación */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                        <CalendarIcon className="w-5 h-5 text-primary" />
                        Calendario de Producción
                    </h3>
                    <Badge variant="outline" className="text-gray-400">
                        {filteredOrders.length} pedidos
                    </Badge>
                </div>
                <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" onClick={handlePrevMonth}>
                        <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={handleToday}>
                        Hoy
                    </Button>
                    <span className="text-foreground font-medium min-w-[150px] text-center">
                        {format(currentDate, "MMMM yyyy", { locale: es })}
                    </span>
                    <Button size="sm" variant="outline" onClick={handleNextMonth}>
                        <ChevronRight className="w-4 h-4" />
                    </Button>
                </div>
            </div>

            {/* Cabecera días de la semana - Solo L-V */}
            <div className="grid grid-cols-5 gap-1">
                {['Lun', 'Mar', 'Mié', 'Jue', 'Vie'].map((day) => (
                    <div
                        key={day}
                        className="text-center text-xs font-medium py-2 text-gray-400"
                    >
                        {day}
                    </div>
                ))}
            </div>

            {/* Días del calendario - Solo laborables */}
            <div className="grid grid-cols-5 gap-1">
                {calendarDays.map(day => {
                    const dayOrders = getOrdersForDay(day);
                    const isCurrentMonth = isSameMonth(day, currentDate);
                    const isSelected = selectedDate && isSameDay(day, selectedDate);
                    const isTodayDay = isToday(day);

                    return (
                        <div
                            key={day.toISOString()}
                            onClick={() => setSelectedDate(day)}
                            className={cn(
                                "min-h-[100px] p-1 border border-border/40 rounded-lg cursor-pointer transition-colors",
                                !isCurrentMonth && "opacity-40",
                                "bg-card/30",
                                isSelected && "border-primary ring-1 ring-primary",
                                isTodayDay && "border-primary/50",
                                "hover:bg-muted/30"
                            )}
                        >
                            <div className="flex items-center justify-between mb-1">
                                <span className={cn(
                                    "text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full",
                                    isTodayDay && "bg-primary text-primary-foreground",
                                    !isTodayDay && "text-muted-foreground"
                                )}>
                                    {format(day, 'd')}
                                </span>
                                {dayOrders.length > 0 && (
                                    <Badge variant="secondary" className="text-[10px] h-4 px-1">
                                        {dayOrders.length}
                                    </Badge>
                                )}
                            </div>
                            <div className="space-y-0.5 overflow-hidden">
                                {dayOrders.slice(0, 3).map(order => {
                                    const daysRemaining = getWorkdaysRemaining(order.due_date);
                                    return (
                                        <div
                                            key={order.id}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onOrderClick?.(order);
                                            }}
                                            className={cn(
                                                "text-[10px] px-1 py-0.5 rounded truncate cursor-pointer",
                                                daysRemaining < 0 && "bg-red-500/30 text-red-300",
                                                daysRemaining >= 0 && daysRemaining <= 2 && "bg-amber-500/30 text-amber-300",
                                                daysRemaining > 2 && "bg-emerald-500/20 text-emerald-300"
                                            )}
                                        >
                                            {order.order_number}
                                        </div>
                                    );
                                })}
                                {dayOrders.length > 3 && (
                                    <p className="text-[10px] text-gray-500 text-center">
                                        +{dayOrders.length - 3} más
                                    </p>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Panel de detalle del día seleccionado */}
            {selectedDate && (
                <Card className="bg-card/50 border-border/60">
                    <CardHeader className="py-3">
                        <CardTitle className="text-sm flex items-center gap-2">
                            <CalendarIcon className="w-4 h-4 text-primary" />
                            {format(selectedDate, "EEEE d 'de' MMMM yyyy", { locale: es })}
                            {isToday(selectedDate) && (
                                <Badge className="bg-primary/20 text-primary text-xs">HOY</Badge>
                            )}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {getOrdersForDay(selectedDate).length === 0 ? (
                            <p className="text-gray-400 text-sm text-center py-4">
                                No hay pedidos programados para este día
                            </p>
                        ) : (
                            <div className="space-y-2">
                                {getOrdersForDay(selectedDate).map(order => (
                                    <div
                                        key={order.id}
                                        onClick={() => onOrderClick?.(order)}
                                        className="flex items-center justify-between p-3 bg-muted/30 rounded-lg cursor-pointer hover:bg-muted/50"
                                    >
                                        <div>
                                            <p className="font-medium text-foreground">{order.order_number}</p>
                                            <p className="text-sm text-muted-foreground">{order.customer_name}</p>
                                            {order.fabric && (
                                                <p className="text-xs text-muted-foreground/60">{order.fabric}</p>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {order.quantity_total && (
                                                <Badge variant="outline" className="text-xs">
                                                    <Package className="w-3 h-3 mr-1" />
                                                    {order.quantity_total} uds
                                                </Badge>
                                            )}
                                            {order.region && (
                                                <Badge variant="outline" className="text-xs">
                                                    <MapPin className="w-3 h-3 mr-1" />
                                                    {order.region}
                                                </Badge>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}
        </div>
    );
};

export default ProductionCalendar;
