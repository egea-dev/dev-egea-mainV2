import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye } from "lucide-react";
import { cn } from "@/lib/utils";
import { ORDER_STATUS_BADGES } from "@/lib/order-status";
import type { OrderStatus } from "@/types/commercial";

interface OrderCardProps {
    order: {
        id: string;
        order_number: string;
        admin_code?: string;
        customer_name: string;
        status: string;
        region?: string;
        delivery_date?: string;
        quantity_total?: number;
    };
    onViewDetails?: (order: any) => void;
}

const getStatusBadge = (status: string) => {
    const resolved = ORDER_STATUS_BADGES[status as OrderStatus];
    if (resolved) return resolved;
    if (status === "EN_PRODUCCION") return ORDER_STATUS_BADGES.EN_PROCESO;
    if (status === "LISTO_ENVIO") return ORDER_STATUS_BADGES.PTE_ENVIO;
    return "bg-muted/50 text-muted-foreground border-border/60";
};

export function OrderCard({ order, onViewDetails }: OrderCardProps) {
    return (
        <Card className="bg-card/90 border-border/60 hover:border-primary/30 transition-all">
            <CardContent className="p-4">
                <div className="space-y-3">
                    {/* Header */}
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm font-mono text-foreground font-semibold">
                                {order.order_number}
                            </p>
                            <p className={cn(
                                "text-xs mt-1",
                                order.admin_code ? "text-muted-foreground" : "text-red-400"
                            )}>
                                {order.admin_code || 'FALTA REF. ADMIN'}
                            </p>
                        </div>
                        <Badge
                            variant="outline"
                            className={cn(
                                "text-[10px] font-bold px-2 py-0.5",
                                getStatusBadge(order.status)
                            )}
                        >
                            {order.status.replace('_', ' ')}
                        </Badge>
                    </div>

                    {/* Content */}
                    <div className="space-y-2">
                        <div>
                            <p className="text-xs text-muted-foreground uppercase font-medium">Cliente</p>
                            <p className="text-sm text-foreground font-medium truncate">
                                {order.customer_name}
                            </p>
                        </div>
                        {order.region && (
                            <div>
                                <p className="text-xs text-muted-foreground uppercase font-medium">Region</p>
                                <p className="text-sm text-muted-foreground">{order.region}</p>
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="pt-2 border-t border-border/60">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onViewDetails?.(order)}
                            className="w-full text-primary hover:text-primary/80 hover:bg-primary/10 text-xs h-8"
                        >
                            <Eye className="w-3.5 h-3.5 mr-1.5" />
                            Ver / Editar
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
