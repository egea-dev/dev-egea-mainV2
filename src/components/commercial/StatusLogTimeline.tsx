import React from 'react';
import { Clock, User } from 'lucide-react';
import { useOrderStatusLog } from '@/hooks/use-order-status-log';
import { ORDER_STATUS_LABELS, ORDER_STATUS_TEXT } from '@/lib/order-status';
import type { OrderStatus } from '@/types/commercial';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface StatusLogTimelineProps {
    orderId: string;
}

const STATUS_LABELS: Record<string, string> = {
    ...ORDER_STATUS_LABELS,
    EN_PRODUCCION: "En produccion",
    LISTO_ENVIO: "Listo para envio",
};

const STATUS_COLORS: Record<string, string> = {
    PENDIENTE_PAGO: ORDER_STATUS_TEXT.PENDIENTE_PAGO,
    PAGADO: ORDER_STATUS_TEXT.PAGADO,
    EN_PROCESO: ORDER_STATUS_TEXT.EN_PROCESO,
    PTE_ENVIO: ORDER_STATUS_TEXT.PTE_ENVIO,
    ENVIADO: ORDER_STATUS_TEXT.ENVIADO,
    ENTREGADO: ORDER_STATUS_TEXT.ENTREGADO,
    CANCELADO: ORDER_STATUS_TEXT.CANCELADO,
    EN_PRODUCCION: ORDER_STATUS_TEXT.EN_PROCESO,
    LISTO_ENVIO: ORDER_STATUS_TEXT.PTE_ENVIO,
};

export const StatusLogTimeline: React.FC<StatusLogTimelineProps> = ({ orderId }) => {
    const { data: logs = [], isLoading } = useOrderStatusLog(orderId);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-400"></div>
            </div>
        );
    }

    if (logs.length === 0) {
        return (
            <div className="text-center p-8 text-muted-foreground italic">
                No hay historial de cambios
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {logs.map((log, index) => (
                <div key={log.id} className="relative pl-8 pb-4 last:pb-0">
                    {/* Timeline line */}
                    {index !== logs.length - 1 && (
                        <div className="absolute left-[11px] top-6 bottom-0 w-0.5 bg-border/70"></div>
                    )}

                    {/* Timeline dot */}
                    <div className={`absolute left-0 top-1 w-6 h-6 rounded-full border-2 border-border bg-muted flex items-center justify-center ${STATUS_COLORS[log.new_status as OrderStatus] || 'text-muted-foreground'}`}>
                        <div className="w-2 h-2 rounded-full bg-current"></div>
                    </div>

                    {/* Content */}
                    <div className="bg-card rounded-lg p-4 border border-border/60">
                        <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                    {log.old_status && (
                                        <>
                                            <span className={`text-sm font-medium ${STATUS_COLORS[log.old_status as OrderStatus] || "text-muted-foreground"}`}>
                                                {STATUS_LABELS[log.old_status] || log.old_status}
                                            </span>
                                            <span className="text-muted-foreground">-></span>
                                        </>
                                    )}
                                    <span className={`text-sm font-bold ${STATUS_COLORS[log.new_status as OrderStatus] || "text-muted-foreground"}`}>
                                        {STATUS_LABELS[log.new_status] || log.new_status}
                                    </span>
                                </div>
                                <p className="text-sm text-muted-foreground mt-2">{log.comment}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                            <div className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                <span>
                                    {formatDistanceToNow(new Date(log.changed_at), {
                                        addSuffix: true,
                                        locale: es
                                    })}
                                </span>
                            </div>
                            <div className="flex items-center gap-1">
                                <User className="w-3 h-3" />
                                <span>Usuario</span>
                            </div>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
};
