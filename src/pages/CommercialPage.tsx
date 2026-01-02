import { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { OrderStatusBadge } from "@/components/badges";
import { Package, Eye, Plus, LayoutList, History } from "lucide-react";
import { useOrders, useCreateOrder, useUpdateOrderStatus, useDeleteOrder } from "@/hooks/use-orders";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { OrderDetailModal } from "@/components/commercial/OrderDetailModal";
import { CalendarModule } from "@/components/dashboard/CalendarModule";
import { OrderStatus } from "@/types/commercial";
import { toast } from "sonner";
import PageShell from "@/components/layout/PageShell";
import { useProfile } from "@/hooks/use-supabase";

export default function CommercialPage() {
  const { data: orders = [], isLoading } = useOrders();
  const createOrder = useCreateOrder();
  const updateOrderStatus = useUpdateOrderStatus();
  const deleteOrder = useDeleteOrder();
  const { data: profile } = useProfile();

  const [newOrderModal, setNewOrderModal] = useState(false);
  const [comment, setComment] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [viewMode, setViewMode] = useState<"ACTIVE" | "ARCHIVED">("ACTIVE");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());

  const canDeleteOrders = profile?.role === "admin" || profile?.role === "manager";

  const activeOrders = orders.filter((o) => o.status !== "ENTREGADO" && o.status !== "CANCELADO");
  const archivedOrders = orders.filter((o) => o.status === "ENTREGADO" || o.status === "CANCELADO");
  const displayedOrders = viewMode === "ACTIVE" ? activeOrders : archivedOrders;

  const validateOrderReadyForProduction = (order: any): { valid: boolean; error?: string } => {
    if (!order.admin_code || order.admin_code.trim() === "") {
      return {
        valid: false,
        error: "Falta el Numero de Pedido (Ref. Administracion)",
      };
    }

    const hasPresupuesto = order.documents?.some((d: any) => d.type === "PRESUPUESTO");
    const hasPedido = order.documents?.some((d: any) => d.type === "PEDIDO_ACEPTADO");

    if (!hasPresupuesto && !hasPedido) {
      return {
        valid: false,
        error: "Faltan ambos documentos: Presupuesto y Pedido Aceptado",
      };
    }
    if (!hasPresupuesto) {
      return {
        valid: false,
        error: "Falta subir el Presupuesto",
      };
    }
    if (!hasPedido) {
      return {
        valid: false,
        error: "Falta subir el Pedido Aceptado",
      };
    }

    if (!order.customer_name || order.customer_name.trim() === "") {
      return {
        valid: false,
        error: "Falta el nombre del cliente",
      };
    }

    if (!order.lines || order.lines.length === 0) {
      return {
        valid: false,
        error: "El desglose de medidas esta vacio (anade al menos 1 linea)",
      };
    }

    const regionValue = order.delivery_region || order.region;
    if (!regionValue) {
      return {
        valid: false,
        error: "Falta definir la region de entrega",
      };
    }

    if (!order.delivery_date) {
      return {
        valid: false,
        error: "Falta definir la fecha de entrega",
      };
    }

    if (!order.delivery_address || order.delivery_address.trim() === "") {
      return {
        valid: false,
        error: "Falta la direccion de entrega",
      };
    }

    if (!order.quantity_total || order.quantity_total <= 0) {
      return {
        valid: false,
        error: "La cantidad total debe ser mayor que cero",
      };
    }

    return { valid: true };
  };

  const handleCreateOrder = async () => {
    const orderNum = `INT-2025-${Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, "0")}`;

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Usuario no autenticado");
      return;
    }

    const newOrder = {
      order_number: orderNum,
      created_by: user.id,
      admin_code: "",
      customer_name: "Cliente Nuevo",
      fabric: "Lino",
      quantity_total: 0,
      status: "PENDIENTE_PAGO" as OrderStatus,
      lines: [],
      documents: [],
    };

    try {
      await createOrder.mutateAsync(newOrder);
      setNewOrderModal(false);
    } catch (error) {
      console.error("Error creating order:", error);
    }
  };

  const changeStatus = async (order: any, newStatus: OrderStatus) => {
    if (!comment) {
      toast.error("Comentario obligatorio");
      return;
    }

    if (newStatus === "PAGADO") {
      const check = validateOrderReadyForProduction(order);
      if (!check.valid) {
        toast.error(`No se puede validar el pedido:\n${check.error}`);
        return;
      }
    }

    try {
      await updateOrderStatus.mutateAsync({
        orderId: order.id,
        status: newStatus,
        comment,
      });
      setComment("");
    } catch (error) {
      console.error("Error updating status:", error);
    }
  };

  return (
    <PageShell
      title="Comercial"
      description="Administracion de pedidos, clientes y flujo comercial."
      actions={
        <Button onClick={() => setNewOrderModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Nuevo pedido
        </Button>
      }
    >
      <div className="space-y-6">
        <CalendarModule selectedDate={selectedDate} onDateSelect={setSelectedDate} mode="commercial" />

        <div className="flex flex-wrap items-center gap-6 border-b border-border">
          <button
            onClick={() => setViewMode("ACTIVE")}
            className={cn(
              "flex items-center gap-2 px-1 py-3 border-b-2 transition-colors text-sm font-medium",
              viewMode === "ACTIVE"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <LayoutList className="w-4 h-4" />
            Pedidos activos
          <Badge variant="secondary" className="ml-1 text-xs">
            {activeOrders.length}
          </Badge>
          </button>
          <button
            onClick={() => setViewMode("ARCHIVED")}
            className={cn(
              "flex items-center gap-2 px-1 py-3 border-b-2 transition-colors text-sm font-medium",
              viewMode === "ARCHIVED"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <History className="w-4 h-4" />
            Historial
            <Badge variant="secondary" className="ml-1 text-xs">
              {archivedOrders.length}
            </Badge>
          </button>
        </div>

        {isLoading ? (
          <div className="text-center py-20 text-muted-foreground">Cargando pedidos...</div>
        ) : displayedOrders.length === 0 ? (
          <div className="text-center py-20 border border-dashed border-border rounded-2xl bg-background/40">
            <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">No se encontraron pedidos.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {displayedOrders.map((order) => (
              <Card
                key={order.id}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData("application/json-order", JSON.stringify(order));
                  e.dataTransfer.effectAllowed = "move";
                }}
                className="border-border/60 bg-card/80 hover:border-primary/30 transition-all cursor-move active:scale-95"
              >
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-sm font-mono text-foreground">
                        {order.order_number}
                      </CardTitle>
                      <CardDescription
                        className={cn(
                          "text-xs font-medium mt-1",
                          order.admin_code ? "text-muted-foreground" : "text-red-400"
                        )}
                      >
                        {order.admin_code || "FALTA REF. ADMIN"}
                      </CardDescription>
                    </div>
                    <OrderStatusBadge status={order.status} />
                  </div>
                </CardHeader>
                <CardContent className="pb-3">
                  <div className="space-y-2">
                    <div>
                      <p className="text-xs text-muted-foreground uppercase font-medium">Cliente</p>
                      <p className="text-sm text-foreground font-medium truncate">
                        {order.customer_name}
                      </p>
                    </div>
                    {(order.delivery_region || order.region) && (
                      <div>
                      <p className="text-xs text-muted-foreground uppercase font-medium">Region</p>
                        <p className="text-sm text-muted-foreground">{order.delivery_region || order.region}</p>
                      </div>
                    )}
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
                      <Eye className="w-3.5 h-3.5 mr-1.5" /> Ver / Editar
                    </Button>
                    {order.status === "PENDIENTE_PAGO" && (
                      <div className="flex gap-2">
                        <Input
                          type="text"
                          placeholder="Nota..."
                          className="h-7 w-24 text-xs"
                          value={comment}
                          onChange={(e) => setComment(e.target.value)}
                        />
                        <Button
                          size="sm"
                          onClick={() => changeStatus(order, "PAGADO")}
                          className="h-7 text-[10px] px-2 font-bold"
                        >
                          Validar
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {newOrderModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <Card className="border-border/60 bg-card/90 w-full max-w-md">
            <CardHeader>
              <div className="w-12 h-12 bg-primary/15 rounded-full flex items-center justify-center mb-4">
                <Package className="w-6 h-6 text-primary" />
              </div>
              <CardTitle className="text-xl text-foreground">Crear nuevo pedido</CardTitle>
              <CardDescription className="text-muted-foreground">
                Se insertara un nuevo registro en la base de datos de Egea.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex justify-end gap-3">
                <Button variant="ghost" onClick={() => setNewOrderModal(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleCreateOrder} disabled={createOrder.isPending}>
                  {createOrder.isPending ? "Generando..." : "Generar pedido"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {selectedOrder && (
        <OrderDetailModal
          isOpen={!!selectedOrder}
          onClose={() => setSelectedOrder(null)}
          order={selectedOrder}
          canDelete={canDeleteOrders}
          onDelete={async (orderId) => {
            await deleteOrder.mutateAsync(orderId);
            setSelectedOrder(null);
          }}
          onSave={() => setSelectedOrder(null)}
        />
      )}
    </PageShell>
  );
}
