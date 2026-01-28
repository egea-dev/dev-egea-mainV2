/**
 * ShippingCalendar - Calendario responsivo para vista de envíos
 * 
 * Desktop (>1024px): Calendario mensual completo
 * Mobile (<1024px): Lista de tareas por día
 * 
 * Similar a ProductionCalendar pero optimizado para el flujo de envíos
 */

import React, { useState, useMemo } from 'react';
import {
    ChevronLeft,
    ChevronRight,
    Calendar as CalendarIcon,
    List,
    Truck,
    Package,
    MapPin
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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

interface ShippingOrder {
    id: string;
    order_number: string;
    customer_name: string;
    status: string;
    due_date?: string | null;
    region?: string;
    packages_count?: number;
    tracking_number?: string;
    carrier_company?: string;
}

interface ShippingCalendarProps {
    orders: ShippingOrder[];
    onOrderClick?: (order: ShippingOrder) => void;
    filterRegion?: string;
}

const ShippingCalendar: React.FC<ShippingCalendarProps> = ({
    orders,
    onOrderClick,
    filterRegion
}) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const deviceType = useDeviceType();
    const isMobile = deviceType === 'mobile' || deviceType === 'tablet';

    // Filtrar pedidos por región
    const filteredOrders = useMemo(() => {
        if (!filterRegion || filterRegion === 'ALL') return orders;
        return orders.filter(o => o.region?.toUpperCase() === filterRegion);
    }, [orders, filterRegion]);

    // Agrupar pedidos por fecha de vencimiento
    const ordersByDate = useMemo(() => {
        const map = new Map<string, ShippingOrder[]>();
        filteredOrders.forEach(order => {
            if (order.due_date) {
                const dateKey = format(new Date(order.due_date), 'yyyy-MM-dd');
                const existing = map.get(dateKey) || [];
                map.set(dateKey, [...existing, order]);
            }
        });
        return map;
    }, [filteredOrders]);

    // Navegación
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

    const getOrdersForDay = (date: Date): ShippingOrder[] => {
        const dateKey = format(date, 'yyyy-MM-dd');
        return ordersByDate.get(dateKey) || [];
    };

    // Vista móvil: Lista de tareas
    if (isMobile) {
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
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                        <Truck className="w-5 h-5 text-primary" />
                        Envíos por Día
                    </h3>
                    <Badge variant="outline" className="text-gray-400">
                        {filteredOrders.length} envíos
                    </Badge>
                </div>

                <div className="space-y-3">
                    {upcomingDays.map(day => {
                        const dayOrders = getOrdersForDay(day);
                        const isCurrentDay = isToday(day);

                        return (
                            <Card
                                key={day.toISOString()}
                                className={cn(
                                    "bg-card/50 border-border/60",
                                    isCurrentDay && "border-blue-500/50 bg-blue-500/5"
                                )}
                            >
                                <CardHeader className="py-3 px-4">
                                    <div className="flex items-center justify-between">
                                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                                            <CalendarIcon className="w-4 h-4 text-gray-400" />
                                            <span className={cn(isCurrentDay && "text-primary")}>
                                                {format(day, "EEEE d 'de' MMMM", { locale: es })}
                                            </span>
                                            {isCurrentDay && (
                                                <Badge className="bg-primary/20 text-primary text-xs">HOY</Badge>
                                            )}
                                        </CardTitle>
                                        <Badge variant="secondary" className="text-xs">
                                            {dayOrders.length} envíos
                                        </Badge>
                                    </div>
                                </CardHeader>
                                {dayOrders.length > 0 && (
                                    <CardContent className="py-2 px-4 space-y-2">
                                        {dayOrders.map(order => (
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
                                                    {order.packages_count && (
                                                        <Badge variant="outline" className="text-xs">
                                                            <Package className="w-3 h-3 mr-1" />
                                                            {order.packages_count}
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
                                    </CardContent>
                                )}
                                {dayOrders.length === 0 && (
                                    <CardContent className="py-2 px-4">
                                        <p className="text-gray-500 text-sm text-center">
                                            Sin envíos programados
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
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                        <Truck className="w-5 h-5 text-primary" />
                        Calendario de Envíos
                    </h3>
                    <Badge variant="outline" className="text-gray-400">
                        {filteredOrders.length} envíos
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

            {/* Días de la semana - Solo L-V */}
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
                                isSelected && "border-blue-500 ring-1 ring-blue-500",
                                isTodayDay && "border-blue-500/50",
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
                                    <Badge variant="secondary" className="text-[10px] h-4 px-1 bg-primary/20 text-primary">
                                        {dayOrders.length}
                                    </Badge>
                                )}
                            </div>
                            <div className="space-y-0.5 overflow-hidden">
                                {dayOrders.slice(0, 3).map(order => (
                                    <div
                                        key={order.id}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onOrderClick?.(order);
                                        }}
                                        className="text-[10px] px-1 py-0.5 rounded truncate cursor-pointer bg-primary/20 text-primary-foreground dark:text-primary-foreground"
                                    >
                                        {order.order_number}
                                    </div>
                                ))}
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

            {/* Panel de detalle */}
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
                                No hay envíos programados para este día
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
                                            {order.tracking_number && (
                                                <p className="text-xs text-primary">
                                                    Tracking: {order.tracking_number}
                                                </p>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {order.packages_count && (
                                                <Badge variant="outline" className="text-xs">
                                                    <Package className="w-3 h-3 mr-1" />
                                                    {order.packages_count} bultos
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

export default ShippingCalendar;
