import { useEffect, useRef, useState } from "react";
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
import { OrderStatusBadge } from "@/features/commercial/components/OrderStatusBadge";
import { Package, Eye, Plus, LayoutList, History, Mail, Bell } from "lucide-react";
import { useOrders, useCreateOrder, useUpdateOrderStatus, useDeleteOrder } from "@/hooks/use-orders";
import { supabase } from "@/integrations/supabase/client";
import { supabaseProductivity } from "@/integrations/supabase";
import { cn } from "@/lib/utils";
import { OrderDetailModal } from "@/features/commercial/components/OrderDetailModal";
import { CalendarModule } from "@/components/dashboard/CalendarModule";
import { OrderStatus } from "@/types/commercial";
import { toast } from "sonner";
import PageShell from "@/components/layout/PageShell";
import { useProfile } from "@/hooks/use-supabase";
import { resolveOrderStatus } from "@/lib/order-status";
import { summarizeMaterials } from "@/lib/materials";

export default function CommercialPage() {
  const { data: orders = [], isLoading } = useOrders();
  const createOrder = useCreateOrder();
  const updateOrderStatus = useUpdateOrderStatus();
  const deleteOrder = useDeleteOrder();
  const { data: profile } = useProfile();
  const syncRanRef = useRef(false);

  useEffect(() => {
    if (syncRanRef.current) return;
    if (!orders.length) return;

    const syncMissingWorkOrders = async () => {
      let failedCount = 0;
      try {
        const eligible = orders.filter((order) => {
          const resolved = resolveOrderStatus(order.status);
          const normalized = String(resolved || order.status || "")
            .trim()
            .toUpperCase();
          return ["PAGADO", "EN_PROCESO", "PTE_ENVIO", "ENVIADO"].includes(normalized);
        });

        if (!eligible.length) return;

        const resolvedRefs = eligible
          .map((order) => {
            // Priorizar admin_code si existe, luego order_number
            return order.admin_code || order.order_number || null;
          })
          .filter(Boolean);
        const orderNumbers = eligible
          .map((order) => order.order_number)
          .filter(Boolean);
        const adminCodes = eligible
          .map((order) => order.admin_code)
          .filter(Boolean);

        let existing: any[] = [];
        if (orderNumbers.length || adminCodes.length || resolvedRefs.length) {
          const escapedOrders = orderNumbers
            .map((value) => `"${String(value).replace(/"/g, '""')}"`)
            .join(",");
          const escapedAdmins = adminCodes
            .map((value) => `"${String(value).replace(/"/g, '""')}"`)
            .join(",");
          const escapedResolved = resolvedRefs
            .map((value) => `"${String(value).replace(/"/g, '""')}"`)
            .join(",");
          const { data } = await supabaseProductivity
            .from("produccion_work_orders")
            .select("id, order_number, admin_code, work_order_number")
            .or(
              [
                escapedOrders ? `order_number.in.(${escapedOrders})` : null,
                escapedOrders ? `work_order_number.in.(${escapedOrders})` : null,
                escapedAdmins ? `admin_code.in.(${escapedAdmins})` : null,
                escapedResolved ? `order_number.in.(${escapedResolved})` : null,
                escapedResolved ? `work_order_number.in.(${escapedResolved})` : null
              ].filter(Boolean).join(",")
            );
          existing = data as any[] || [];
        }

        const existingSet = new Set(
          (existing || []).flatMap((row: any) => [row.order_number, row.admin_code, row.work_order_number])
        );

        let createdCount = 0;
        let lastErrorMessage: string | null = null;

        for (const order of eligible) {
          const rawOrderNumber = String(order.order_number || "");
          // Priorizar admin_code si existe, luego order_number
          const orderRef = order.admin_code || rawOrderNumber || null;
          const adminRef = order.admin_code;
          if ((orderRef && existingSet.has(orderRef)) || (adminRef && existingSet.has(adminRef))) continue;
          const lines = order.lines || [];
          const firstLine = lines[0];
          const fabric = summarizeMaterials(lines, order.fabric || "N/D");
          const color = order.color || firstLine?.color || "N/D";
          const quantity = Number(order.quantity_total) || 0;

          const payload: any = {
            work_order_number: orderRef || adminRef,
            order_number: orderRef || adminRef,
            admin_code: adminRef || null,
            customer_name: order.customer_company || order.customer_name || "Cliente",
            status: "PENDIENTE",
            region: order.delivery_region || order.region || "PENINSULA",
            delivery_address: order.delivery_address || null,
            contact_name: order.contact_name || null,
            phone: order.phone || null,
            fabric,
            color,
            quantity_total: quantity,
            due_date: order.delivery_date || null,
            notes: `Backfill desde comercial (${order.order_number || "SIN-REF"})`,
            notes_internal: order.internal_notes || null
          };

          const { data: newWorkOrder, error } = await (supabaseProductivity as any)
            .from("produccion_work_orders")
            .insert([payload])
            .select("id")
            .single();

          if (error) {
            console.warn("No se pudo crear work order faltante:", error);
            failedCount += 1;
            lastErrorMessage = error.message || "Error desconocido";
          } else {
            if (lines.length > 0 && newWorkOrder?.id) {
              const linePayload = lines.map((line: any) => ({
                work_order_id: newWorkOrder.id,
                quantity: Number(line.quantity) || 0,
                width: Number(line.width) || 0,
                height: Number(line.height) || 0,
                notes: line.notes || null,
                material: line.material || line.fabric || null
              }));
              const { error: linesError } = await (supabaseProductivity as any)
                .from("produccion_work_order_lines")
                .insert(linePayload as any[]);
              if (linesError) {
                console.warn("No se pudieron crear lineas de work order:", linesError);
              }
            }
            createdCount += 1;
          }
        }

        if (createdCount > 0) {
          toast.success(`Sincronizadas ${createdCount} orden(es) de produccion`);
        } else if (failedCount > 0) {
          toast.error(lastErrorMessage || "No se pudieron sincronizar las ordenes de produccion");
        }
      } catch (error) {
        console.warn("Fallo al sincronizar work orders:", error);
      } finally {
        if (failedCount === 0) {
          // Mantener en true para evitar bucles, pero permitir ejecuciones controladas
          syncRanRef.current = true;
        }
      }
    };

    void syncMissingWorkOrders();
  }, [orders, profile?.role]);

  const [newOrderModal, setNewOrderModal] = useState(false);
  const [importOrderModal, setImportOrderModal] = useState(false);
  const [importOrderNumber, setImportOrderNumber] = useState("");
  const [comments, setComments] = useState<Record<string, string>>({});
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [viewMode, setViewMode] = useState<"ACTIVE" | "SHIPPED" | "ARCHIVED">("ACTIVE");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());

  const canDeleteOrders = profile?.role === "admin" || profile?.role === "manager";

  const activeOrders = orders.filter((o) => !["ENVIADO", "ENTREGADO", "CANCELADO"].includes(String(o.status).trim().toUpperCase()));
  const shippedOrders = orders.filter((o) => ["ENVIADO"].includes(String(o.status).trim().toUpperCase()));
  const archivedOrders = orders.filter((o) => ["ENTREGADO", "CANCELADO"].includes(String(o.status).trim().toUpperCase()));
  const pendingNotificationOrders = orders.filter((o: any) => o.shipping_notification_pending === true);
  const displayedOrders =
    viewMode === "ACTIVE"
      ? activeOrders
      : viewMode === "SHIPPED"
        ? shippedOrders
        : archivedOrders;

  const validateOrderReadyForProduction = (order: any): { valid: boolean; error?: string } => {
    // Validaciones básicas (siempre requeridas)
    if (!order.admin_code || order.admin_code.trim() === "") {
      return {
        valid: false,
        error: "Falta el Numero de Pedido (Ref. Administracion)",
      };
    }

    if (!order.customer_name || order.customer_name.trim() === "") {
      return {
        valid: false,
        error: "Falta el nombre del cliente",
      };
    }

    // Validación completa (con documentos) para pedidos normales
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
      fabric: "",
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

  const handleImportOrder = async () => {
    if (!importOrderNumber.trim()) {
      toast.error("Ingresa un número de pedido");
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Usuario no autenticado");
      return;
    }

    const newOrder = {
      order_number: importOrderNumber.trim(),
      created_by: user.id,
      admin_code: "",
      customer_name: "Cliente Importado",
      fabric: "",
      quantity_total: 0,
      status: "PENDIENTE_PAGO" as OrderStatus,
      lines: [],
      documents: [],
    };

    try {
      await createOrder.mutateAsync(newOrder);
      setImportOrderModal(false);
      setImportOrderNumber("");
      toast.success(`Pedido ${importOrderNumber} importado exitosamente`);
    } catch (error) {
      console.error("Error importing order:", error);
    }
  };

  const BYPASS_KEYWORDS = ["Mario", "Hacchi", "Manuel", "Carlos"];

  const changeStatus = async (order: any, newStatus: OrderStatus) => {
    // 1. Comentario obligatorio (individual por pedido)
    const orderComment = comments[order.id] || "";

    if (!orderComment) {
      toast.error("Comentario obligatorio");
      return;
    }

    // 2. Validación para PAGADO (envío a producción)
    if (newStatus === "PAGADO") {
      const check = validateOrderReadyForProduction(order);

      // Detectar palabras clave en el COMENTARIO
      const hasKeywordInComment = BYPASS_KEYWORDS.some(keyword =>
        orderComment.toLowerCase().includes(keyword.toLowerCase())
      );

      // Si hay palabra clave en comentario, verificar que sea admin/manager
      if (hasKeywordInComment) {
        const isAdminOrManager = profile?.role === 'admin' || profile?.role === 'manager';

        if (!isAdminOrManager) {
          toast.error(
            "⚠️ ACCESO DENEGADO\n\nSolo Admin/Manager pueden usar palabras clave de bypass.\n\nCompleta la documentación o contacta con un administrador."
          );
          return;
        }

        // Admin/Manager con palabra clave → bypass automático
        const confirmed = window.confirm(
          `✅ BYPASS DETECTADO (Admin/Manager)\n\nPalabra clave autorizada en nota: "${orderComment}"\n\n` +
          `El pedido se enviará a producción SIN validar documentos.\n\n¿Confirmas el envío?`
        );

        if (!confirmed) {
          return;
        }

        try {
          await updateOrderStatus.mutateAsync({
            orderId: order.id,
            status: newStatus,
            comment: `[BYPASS AUTORIZADO] ${orderComment}`,
          });
          setComments(prev => ({ ...prev, [order.id]: "" }));
          toast.success("Pedido enviado a producción (bypass autorizado)");
          return;
        } catch (error) {
          console.error("Error updating status:", error);
          return;
        }
      }

      // Si no es válido y NO hay palabra clave
      if (!check.valid) {
        const isAdminOrManager = profile?.role === 'admin' || profile?.role === 'manager';

        // Bloquear usuarios normales
        if (!isAdminOrManager) {
          toast.error(
            `NO SE PUEDE ENVIAR A PRODUCCIÓN:\n${check.error}\n\nCompleta la documentación y referencia antes de validar.`
          );
          return;
        }

        // Permitir override a admins/managers con confirmación
        if (isAdminOrManager) {
          const confirmed = window.confirm(
            `⚠️ ADVERTENCIA ADMIN:\n\n${check.error}\n\n¿Deseas FORZAR el envío a producción de todos modos?\n\nNota que se registrará: "${orderComment}"`
          );

          if (!confirmed) {
            return;
          }

          // Agregar prefijo [OVERRIDE ADMIN] al comentario para trazabilidad
          try {
            await updateOrderStatus.mutateAsync({
              orderId: order.id,
              status: newStatus,
              comment: `[OVERRIDE ADMIN] ${orderComment}`,
            });
            setComments(prev => ({ ...prev, [order.id]: "" }));
            toast.success("Pedido forzado a producción (override admin)");
            return;
          } catch (error) {
            console.error("Error updating status:", error);
            return;
          }
        }
      }
    }

    // 3. Actualizar estado normalmente (validación OK o estado diferente a PAGADO)
    try {
      await updateOrderStatus.mutateAsync({
        orderId: order.id,
        status: newStatus,
        comment: orderComment,
      });
      setComments(prev => ({ ...prev, [order.id]: "" }));
    } catch (error) {
      console.error("Error updating status:", error);
      const message = error instanceof Error ? error.message : "No se pudo actualizar el estado";
      toast.error(message);
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

        {/* Alerta de Notificaciones de Envío Pendientes */}
        {pendingNotificationOrders.length > 0 && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
            <div className="flex items-center gap-3 mb-3">
              <Bell className="w-5 h-5 text-amber-400 animate-pulse" />
              <h3 className="text-[hsl(var(--warning))] font-semibold">
                Notificaciones de Envío Pendientes ({pendingNotificationOrders.length})
              </h3>
            </div>
            <div className="space-y-2">
              {pendingNotificationOrders.map((order: any) => (
                <div key={order.id} className="flex items-center justify-between bg-background/50 rounded-md p-3">
                  <div className="flex items-center gap-3">
                    <Package className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <span className="font-medium text-foreground">
                        {order.admin_code || order.order_number}
                      </span>
                      <span className="text-muted-foreground text-sm ml-2">
                        {order.customer_company || order.customer_name || 'Sin cliente'}
                      </span>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-warning/50 text-[hsl(var(--warning))] hover:bg-warning/20"
                    onClick={() => setSelectedOrder(order)}
                  >
                    <Mail className="w-4 h-4 mr-2" />
                    Notificar Envío
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

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
            onClick={() => setViewMode("SHIPPED")}
            className={cn(
              "flex items-center gap-2 px-1 py-3 border-b-2 transition-colors text-sm font-medium",
              viewMode === "SHIPPED"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <Mail className="w-4 h-4" />
            Enviados
            <Badge variant="secondary" className="ml-1 text-xs">
              {shippedOrders.length}
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
                        {order.admin_code || order.order_number}
                      </CardTitle>
                      <CardDescription
                        className={cn(
                          "text-xs font-medium mt-1",
                          order.admin_code ? "text-muted-foreground" : "text-red-400"
                        )}
                      >
                        {order.admin_code ? order.order_number : "FALTA REF. ADMIN"}
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
                        {order.customer_company || order.customer_name}
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
                          value={comments[order.id] || ""}
                          onChange={(e) => setComments(prev => ({
                            ...prev,
                            [order.id]: e.target.value
                          }))}
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
          <Card className="border-border/60 bg-card/90 w-full max-w-lg">
            <CardHeader>
              <div className="w-12 h-12 bg-primary/15 rounded-full flex items-center justify-center mb-4">
                <Package className="w-6 h-6 text-primary" />
              </div>
              <CardTitle className="text-xl text-foreground">¿Cómo deseas crear el pedido?</CardTitle>
              <CardDescription className="text-muted-foreground">
                Elige el método de creación que prefieras
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <Button
                  variant="outline"
                  className="h-auto flex-col gap-3 p-6 hover:border-primary hover:bg-primary/5"
                  onClick={handleCreateOrder}
                  disabled={createOrder.isPending}
                >
                  <Plus className="w-8 h-8 text-primary" />
                  <div className="text-center">
                    <div className="font-semibold text-base mb-1">Generar pedido</div>
                    <div className="text-xs text-muted-foreground">
                      Crear un nuevo pedido desde cero
                    </div>
                  </div>
                </Button>
                <Button
                  variant="outline"
                  className="h-auto flex-col gap-3 p-6 hover:border-primary hover:bg-primary/5"
                  onClick={() => {
                    setNewOrderModal(false);
                    setImportOrderModal(true);
                  }}
                >
                  <Package className="w-8 h-8 text-primary" />
                  <div className="text-center">
                    <div className="font-semibold text-base mb-1">Añadir desde otra plataforma</div>
                    <div className="text-xs text-muted-foreground">
                      Importar pedido existente
                    </div>
                  </div>
                </Button>
              </div>
              <div className="flex justify-end">
                <Button variant="ghost" onClick={() => setNewOrderModal(false)}>
                  Cancelar
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {importOrderModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <Card className="border-border/60 bg-card/90 w-full max-w-md">
            <CardHeader>
              <div className="w-12 h-12 bg-primary/15 rounded-full flex items-center justify-center mb-4">
                <Package className="w-6 h-6 text-primary" />
              </div>
              <CardTitle className="text-xl text-foreground">Importar Pedido</CardTitle>
              <CardDescription className="text-muted-foreground">
                Ingresa el número de pedido de otra plataforma
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Número de Pedido
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: EXT-2025-001"
                    className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary outline-none"
                    value={importOrderNumber}
                    onChange={(e) => setImportOrderNumber(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleImportOrder()}
                    autoFocus
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Este número se usará como identificador del pedido
                  </p>
                </div>
                <div className="flex justify-end gap-3">
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setImportOrderModal(false);
                      setImportOrderNumber("");
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleImportOrder}
                    disabled={createOrder.isPending || !importOrderNumber.trim()}
                  >
                    {createOrder.isPending ? "Importando..." : "Importar Pedido"}
                  </Button>
                </div>
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
          userRole={profile?.role}
        />
      )}
    </PageShell>
  );
}
