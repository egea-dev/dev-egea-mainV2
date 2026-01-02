import { Card, CardContent } from "@/components/ui/card";
import { OrderStatusBadge } from "@/components/badges";
import { Button } from "@/components/ui/button";
import { Eye } from "lucide-react";
import { cn } from "@/lib/utils";

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
                        <OrderStatusBadge status={order.status} />
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
