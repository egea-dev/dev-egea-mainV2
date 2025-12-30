import React, { useState } from "react";
import { Package, Search, Clock, User } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useWorkOrders } from "@/hooks/use-work-orders";
import { WorkOrderStatus } from "@/types/production";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import PageShell from "@/components/layout/PageShell";

const STATUS_LABELS: Record<WorkOrderStatus, string> = {
  PENDIENTE: "Pendiente",
  CORTE: "Corte",
  CONFECCION: "Confeccion",
  TAPICERIA: "Tapiceria",
  CONTROL_CALIDAD: "Control calidad",
  LISTO_ENVIO: "Listo envio",
  CANCELADO: "Cancelado",
};

const STATUS_COLORS: Record<WorkOrderStatus, string> = {
  PENDIENTE: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  CORTE: "bg-sky-500/10 text-sky-400 border-sky-500/20",
  CONFECCION: "bg-violet-500/10 text-violet-400 border-violet-500/20",
  TAPICERIA: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
  CONTROL_CALIDAD: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  LISTO_ENVIO: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  CANCELADO: "bg-red-500/10 text-red-400 border-red-500/20",
};

const PRIORITY_STARS = (priority: number) => {
  return "*".repeat(Math.min(priority, 5));
};

export const ProductionPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<WorkOrderStatus | "ALL">("ALL");

  const { data: workOrders = [], isLoading } = useWorkOrders();

  const filteredOrders = workOrders.filter((wo) => {
    const matchesSearch =
      wo.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      wo.customer_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "ALL" || wo.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const statusCounts = workOrders.reduce((acc, wo) => {
    acc[wo.status] = (acc[wo.status] || 0) + 1;
    return acc;
  }, {} as Record<WorkOrderStatus, number>);

  return (
    <PageShell
      title="Produccion"
      description="Gestion de ordenes de trabajo en linea."
    >
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="border-border/60 bg-card/80 text-center">
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-amber-400">
                {statusCounts.PENDIENTE || 0}
              </div>
              <div className="text-xs text-muted-foreground">Pendientes</div>
            </CardContent>
          </Card>
          <Card className="border-border/60 bg-card/80 text-center">
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-violet-400">
                {(statusCounts.CORTE || 0) +
                  (statusCounts.CONFECCION || 0) +
                  (statusCounts.TAPICERIA || 0)}
              </div>
              <div className="text-xs text-muted-foreground">En proceso</div>
            </CardContent>
          </Card>
          <Card className="border-border/60 bg-card/80 text-center">
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-orange-400">
                {statusCounts.CONTROL_CALIDAD || 0}
              </div>
              <div className="text-xs text-muted-foreground">Control calidad</div>
            </CardContent>
          </Card>
          <Card className="border-border/60 bg-card/80 text-center">
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-emerald-400">
                {statusCounts.LISTO_ENVIO || 0}
              </div>
              <div className="text-xs text-muted-foreground">Listos</div>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por numero de pedido o cliente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2">
            <Button
              variant={statusFilter === "ALL" ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter("ALL")}
              className={cn(
                statusFilter === "ALL"
                  ? ""
                  : "border-border/60 text-muted-foreground"
              )}
            >
              Todos ({workOrders.length})
            </Button>
            {Object.entries(STATUS_LABELS).map(([status, label]) => (
              <Button
                key={status}
                variant={statusFilter === status ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter(status as WorkOrderStatus)}
                className={cn(
                  statusFilter === status
                    ? ""
                    : "border-border/60 text-muted-foreground"
                )}
              >
                {label} ({statusCounts[status as WorkOrderStatus] || 0})
              </Button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-20 text-muted-foreground">Cargando ordenes de trabajo...</div>
        ) : filteredOrders.length === 0 ? (
          <div className="text-center py-20 border border-dashed border-border rounded-2xl bg-background/40">
            <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">No se encontraron ordenes de trabajo.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredOrders.map((workOrder) => (
              <Card
                key={workOrder.id}
                className="border-border/60 bg-card/80 hover:border-primary/30 transition-all cursor-pointer"
              >
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-sm font-mono text-primary">
                        WO-{workOrder.order_number}
                      </CardTitle>
                      <CardDescription className="text-xs text-muted-foreground mt-1">
                        {workOrder.customer_name || "Sin cliente"}
                      </CardDescription>
                    </div>
                    <Badge
                      variant="outline"
                      className={cn("text-[10px] font-bold px-2 py-0.5", STATUS_COLORS[workOrder.status])}
                    >
                      {STATUS_LABELS[workOrder.status]}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <User className="w-3 h-3" />
                      <span>{workOrder.assigned_technician_id ? "Asignado" : "Sin asignar"}</span>
                    </div>
                    <div className="text-amber-400">{PRIORITY_STARS(workOrder.priority)}</div>
                  </div>

                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    <span>
                      Creado{" "}
                      {formatDistanceToNow(new Date(workOrder.created_at), {
                        addSuffix: true,
                        locale: es,
                      })}
                    </span>
                  </div>

                  {workOrder.quality_check_status !== "PENDIENTE" && (
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[10px]",
                        workOrder.quality_check_status === "APROBADO"
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                          : "bg-red-500/10 text-red-400 border-red-500/20"
                      )}
                    >
                      QC: {workOrder.quality_check_status}
                    </Badge>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </PageShell>
  );
};
