/**
 * ExpedicionesPage - Página de Expediciones/Logística
 * 
 * Estructura igual a CommercialPage:
 * - Sin versión móvil
 * - Tabs horizontales simples (Pendientes/Procesados/Calendario)
 * - Grid de cards para pedidos
 * - Modal para detalle de pedido
 */

import { useState, useMemo } from 'react';
import { supabaseProductivity } from '@/integrations/supabase';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Truck,
    Package,
    Eye,
    LayoutList,
    History,
    Calendar,
    MapPin,
    Clock
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { cn } from "@/lib/utils";
import { toast } from 'sonner';
import PageShell from '@/components/layout/PageShell';
import { sortWorkOrdersByPriority, getUrgencyBadge } from '@/services/priority-service';
import { getWorkdaysRemaining } from '@/utils/workday-utils';
import { ExpedicionesCalendar } from '@/features/logistics/components/ExpedicionesCalendar';
import ShippedOrdersPanel from '@/features/logistics/components/ShippedOrdersPanel';

// Tipos
interface Order {
    id: string;
    order_number: string;
    admin_code?: string;
    customer_name?: string;
    customer_company?: string;
    status: string;
    fabric?: string;
    region?: string;
    quantity_total?: number;
    packages_count?: number | null;
    scanned_packages?: number | null;
    due_date?: string | null;
    shipping_date?: string | null;
    tracking_number?: string;
    carrier_company?: string;
    processed_at?: string | null;
}

export default function ExpedicionesPage() {
    const [viewMode, setViewMode] = useState<"PENDING" | "PROCESSED" | "CALENDAR">("PENDING");
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

    // Query para obtener pedidos
    const { data: orders = [], isLoading, refetch } = useQuery({
        queryKey: ['expediciones-orders'],
        queryFn: async () => {
            const { data, error } = await supabaseProductivity
                .from('comercial_orders')
                .select('*')
                .in('status', ['PTE_ENVIO', 'LISTO_ENVIO', 'ENVIADO', 'ENTREGADO'])
                .order('created_at', { ascending: false });

            if (error) throw error;
            return sortWorkOrdersByPriority(data || []) as Order[];
        }
    });

    // Filtrar pedidos pendientes
    const pendingOrders = useMemo(() => {
        return orders.filter(o =>
            o.status === 'PTE_ENVIO' || o.status === 'LISTO_ENVIO'
        );
    }, [orders]);

    // Filtrar pedidos procesados
    const processedOrders = useMemo(() => {
        return orders.filter(o => o.status === 'ENVIADO' || o.status === 'ENTREGADO');
    }, [orders]);

    // Pedidos a mostrar según modo
    const displayedOrders = viewMode === "PENDING" ? pendingOrders : processedOrders;

    // Handler cuando se procesa un pedido
    const handleOrderProcessed = () => {
        refetch();
        setSelectedOrder(null);
        toast.success('Pedido procesado correctamente');
    };

    return (
        <PageShell
            title="Expediciones"
            description="Gestión de bultos, tracking y expedición de pedidos."
        >
            <div className="space-y-6">
                {/* Tabs horizontales estilo Comercial */}
                <div className="flex flex-wrap items-center gap-6 border-b border-border">
                    <button
                        onClick={() => setViewMode("PENDING")}
                        className={cn(
                            "flex items-center gap-2 px-1 py-3 border-b-2 transition-colors text-sm font-medium",
                            viewMode === "PENDING"
                                ? "border-primary text-primary"
                                : "border-transparent text-muted-foreground hover:text-foreground"
                        )}
                    >
                        <LayoutList className="w-4 h-4" />
                        Pendientes
                        <Badge variant="secondary" className="ml-1 text-xs">
                            {pendingOrders.length}
                        </Badge>
                    </button>
                    <button
                        onClick={() => setViewMode("PROCESSED")}
                        className={cn(
                            "flex items-center gap-2 px-1 py-3 border-b-2 transition-colors text-sm font-medium",
                            viewMode === "PROCESSED"
                                ? "border-primary text-primary"
                                : "border-transparent text-muted-foreground hover:text-foreground"
                        )}
                    >
                        <History className="w-4 h-4" />
                        Procesados
                        <Badge variant="secondary" className="ml-1 text-xs">
                            {processedOrders.length}
                        </Badge>
                    </button>
                    <button
                        onClick={() => setViewMode("CALENDAR")}
                        className={cn(
                            "flex items-center gap-2 px-1 py-3 border-b-2 transition-colors text-sm font-medium",
                            viewMode === "CALENDAR"
                                ? "border-primary text-primary"
                                : "border-transparent text-muted-foreground hover:text-foreground"
                        )}
                    >
                        <Calendar className="w-4 h-4" />
                        Calendario
                    </button>
                </div>

                {/* Contenido según modo */}
                {viewMode === "CALENDAR" ? (
                    <ExpedicionesCalendar
                        onOrderClick={(order) => setSelectedOrder(order)}
                    />
                ) : isLoading ? (
                    <div className="text-center py-20 text-muted-foreground">
                        Cargando pedidos...
                    </div>
                ) : displayedOrders.length === 0 ? (
                    <div className="text-center py-20 border border-dashed border-border rounded-2xl bg-background/40">
                        <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                        <p className="text-muted-foreground">
                            {viewMode === "PENDING"
                                ? "No hay expediciones pendientes."
                                : "No hay expediciones procesadas."}
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        {displayedOrders.map((order) => {
                            const daysRemaining = getWorkdaysRemaining(order.due_date);
                            const urgency = getUrgencyBadge(daysRemaining);
                            const isProcessed = order.status === 'ENVIADO' || order.status === 'ENTREGADO';
                            const statusLabel = order.status === 'ENTREGADO'
                                ? 'ENTREGADO'
                                : isProcessed
                                    ? 'PROCESADO'
                                    : 'PTE_ENVIO';

                            return (
                                <Card
                                    key={order.id}
                                    className="border-border/60 bg-card/80 hover:border-primary/30 transition-all"
                                >
                                    <CardHeader className="pb-3">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <CardTitle className="text-sm font-mono text-foreground">
                                                    {order.admin_code || order.order_number}
                                                </CardTitle>
                                                <CardDescription className="text-xs mt-1 text-muted-foreground">
                                                    {order.order_number}
                                                </CardDescription>
                                            </div>
                                            <div className="flex flex-col gap-1 items-end">
                                                <Badge
                                                    variant="outline"
                                                    className={cn(
                                                        "text-xs",
                                                        isProcessed
                                                            ? "border-emerald-500 text-emerald-400"
                                                            : "border-amber-500 text-amber-400"
                                                    )}
                                                >
                                                    {statusLabel}
                                                </Badge>
                                                {urgency && urgency.label && (
                                                    <Badge className={cn("text-xs", urgency.color)}>
                                                        {urgency.label}
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="pb-3">
                                        <div className="space-y-2">
                                            <div>
                                                <p className="text-xs text-muted-foreground uppercase font-medium">Cliente</p>
                                                <p className="text-sm text-foreground font-medium truncate">
                                                    {order.customer_company || order.customer_name || 'Sin cliente'}
                                                </p>
                                            </div>
                                            <div className="flex gap-4 text-xs text-muted-foreground">
                                                {order.region && (
                                                    <span className="flex items-center gap-1">
                                                        <MapPin className="w-3 h-3" />
                                                        {order.region}
                                                    </span>
                                                )}
                                                {order.packages_count && (
                                                    <span className="flex items-center gap-1">
                                                        <Package className="w-3 h-3" />
                                                        {order.scanned_packages || 0}/{order.packages_count}
                                                    </span>
                                                )}
                                                {order.due_date && (
                                                    <span className="flex items-center gap-1">
                                                        <Clock className="w-3 h-3" />
                                                        {new Date(order.due_date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </CardContent>
                                    <CardContent className="pt-3 border-t border-border/60 bg-background/30">
                                        <div className="flex items-center justify-between gap-2">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => setSelectedOrder(order)}
                                                className="text-primary hover:text-primary/80 hover:bg-primary/10 text-xs h-8"
                                            >
                                                <Eye className="w-3.5 h-3.5 mr-1.5" /> Gestionar
                                            </Button>
                                            {order.tracking_number && (
                                                <span className="text-xs text-muted-foreground font-mono">
                                                    {order.tracking_number}
                                                </span>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Modal de detalle de pedido */}
            {selectedOrder && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <Card className="border-border/60 bg-card w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle className="text-xl">
                                    Pedido {selectedOrder.admin_code || selectedOrder.order_number}
                                </CardTitle>
                                <CardDescription>
                                    {selectedOrder.customer_company || selectedOrder.customer_name}
                                </CardDescription>
                            </div>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setSelectedOrder(null)}
                            >
                                Cerrar
                            </Button>
                        </CardHeader>
                        <CardContent>
                            <ShippedOrdersPanel
                                order={{
                                    id: selectedOrder.id,
                                    order_number: selectedOrder.order_number,
                                    customer_name: selectedOrder.customer_name || selectedOrder.customer_company || 'Sin cliente',
                                    status: selectedOrder.status,
                                    region: selectedOrder.region,
                                    quantity_total: selectedOrder.quantity_total,
                                    fabric: selectedOrder.fabric,
                                    due_date: selectedOrder.due_date || undefined
                                }}
                                onProcessed={handleOrderProcessed}
                            />
                        </CardContent>
                    </Card>
                </div>
            )}
        </PageShell>
    );
}
