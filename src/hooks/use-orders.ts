import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabaseProductivity as supabase } from "@/integrations/supabase";
import { supabase as supabaseMain } from "@/integrations/supabase/client";
import { Order, OrderStatus } from "@/types/commercial";
import { toast } from "sonner";
import { ORDER_STATUS_FLOW, resolveOrderStatus } from "@/lib/order-status";
import { generateQRPayload } from "@/lib/qr-utils";

export const useOrders = () => {
    return useQuery({
        queryKey: ['orders'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('comercial_orders')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) {
                console.error("Error fetching orders:", error);
                throw error;
            }

            // Transform data to match Order interface if needed
            return (data as any[]).map(order => ({
                ...order,
                lines: order.lines || [],
                documents: order.documents || []
            })) as Order[];
        }
    });
};

export const useCreateOrder = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (orderData: Partial<Order>) => {
            const { data, error } = await supabase
                .from('comercial_orders')
                .insert([orderData])
                .select()
                .single();

            if (error) {
                console.error("Error creating order:", error);
                throw error;
            }

            return data as Order;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['orders'] });
            toast.success("Pedido creado exitosamente");
        },
        onError: (error: any) => {
            toast.error(`Error al crear pedido: ${error.message}`);
        }
    });
};

export const useUpdateOrderStatus = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ orderId, status, comment }: { orderId: string; status: OrderStatus; comment: string }) => {
            // Get current order to track old status and apply business rules
            const { data: currentOrder, error: currentError } = await supabase
                .from('comercial_orders')
                .select('status, delivery_region, region, delivery_date, lines, order_number, admin_code, customer_name, customer_company, contact_name, phone, delivery_address, delivery_city, email, fabric, quantity_total, internal_notes')
                .eq('id', orderId)
                .single();

            if (currentError) {
                console.error("Error fetching current order:", currentError);
                throw currentError;
            }

            const currentStatus = resolveOrderStatus(currentOrder?.status);
            const nextStatus = resolveOrderStatus(status);

            if (!nextStatus) {
                throw new Error("Estado de pedido invalido");
            }

            if (!currentStatus) {
                throw new Error("Estado actual de pedido invalido");
            }

            const isTerminal = currentStatus === "CANCELADO" || currentStatus === "ENTREGADO";
            if (isTerminal && nextStatus !== currentStatus) {
                throw new Error("No se puede cambiar el estado de un pedido finalizado");
            }

            if (nextStatus === "CANCELADO") {
                if (currentStatus === "ENVIADO" || currentStatus === "ENTREGADO") {
                    throw new Error("No se puede cancelar un pedido ya enviado o entregado");
                }
            } else if (currentStatus !== nextStatus) {
                const currentIndex = ORDER_STATUS_FLOW.indexOf(currentStatus);
                const nextIndex = ORDER_STATUS_FLOW.indexOf(nextStatus);

                // Simplified validation - removed columns that don't exist
                if (nextIndex !== currentIndex + 1) {
                    throw new Error("Transicion de estado no permitida");
                }
            }

            const firstLine = (currentOrder?.lines || [])[0];
            const fabric = currentOrder?.fabric || firstLine?.material || "N/D";
            const color = currentOrder?.color || firstLine?.color || "N/D";
            const customerDisplay = currentOrder?.customer_company || currentOrder?.customer_name || "Cliente";
            const region = currentOrder?.delivery_region || currentOrder?.region || "PENINSULA";
            const quantity = Number(currentOrder?.quantity_total) || 0;
            const orderNumber = currentOrder?.order_number || currentOrder?.admin_code || "SIN-REF";
            const resolvedOrderNumber = (() => {
                const rawOrderNumber = currentOrder?.order_number || "";
                if (rawOrderNumber.toUpperCase().startsWith("INT-")) return rawOrderNumber;
                return currentOrder?.admin_code || rawOrderNumber || "SIN-REF";
            })();
            const createProductionWorkOrder = async ({
                status,
                processStartAt,
                dueDate,
                slaDays
            }: {
                status: 'PENDIENTE' | 'CORTE';
                processStartAt?: string;
                dueDate?: string | null;
                slaDays?: number | null;
            }) => {
                const payload: any = {
                    order_number: resolvedOrderNumber,
                    customer_name: customerDisplay,
                    status,
                    region,
                    delivery_address: currentOrder?.delivery_address || null,
                    contact_name: currentOrder?.contact_name || null,
                    phone: currentOrder?.phone || null,
                    fabric,
                    color,
                    quantity_total: quantity,
                    notes_internal: currentOrder?.internal_notes || null,
                    admin_code: currentOrder?.admin_code || null,
                    due_date: dueDate || currentOrder?.delivery_date || null,
                    process_start_at: processStartAt || null,
                    sla_days: slaDays || null,
                    // Usar la nueva utilidad para generar QR con desglose de líneas
                    qr_payload: generateQRPayload({
                        orderNumber: resolvedOrderNumber,
                        customerName: customerDisplay,
                        region,
                        deliveryDate: currentOrder?.delivery_date || null,
                        lines: currentOrder?.lines?.map(line => ({
                            material: line.material,
                            quantity: line.quantity
                        })) || [],
                        status,
                    }),
                    technical_specs: {
                        fabric,
                        color,
                        quantity,
                        customer_name: customerDisplay,
                        region
                    }
                };

                const { data: newWorkOrder, error: createError } = await supabase
                    .from('produccion_work_orders')
                    .insert([payload])
                    .select('id')
                    .single();

                if (createError) throw createError;
                return newWorkOrder?.id;
            };

            // Get authenticated user from MAIN
            const { data: { user } } = await supabaseMain.auth.getUser();
            const userId = user?.id || 'unknown';

            const updates: any = { status: nextStatus };
            const now = new Date().toISOString();

            let computedSlaDays: number | null = null;

            if (nextStatus === "EN_PROCESO") {
                // Removed production_start_date - column doesn't exist in DB

                if (!currentOrder?.delivery_date) {
                    try {
                        const { data: slaConfig } = await supabase
                            .from("comercial_sla_config")
                            .select("days")
                            .eq("region", currentOrder?.delivery_region || currentOrder?.region || null)
                            .maybeSingle();
                        const days = Number(slaConfig?.days) || 7;
                        computedSlaDays = days;
                        const target = new Date();
                        target.setDate(target.getDate() + days);
                        updates.delivery_date = target.toISOString().slice(0, 10);
                    } catch (slaError) {
                        console.warn("No se pudo cargar SLA para calcular fecha de entrega", slaError);
                    }
                }
            }

            if (nextStatus === "ENVIADO") {
                // Removed shipped_date - column doesn't exist in DB
            }

            if (nextStatus === "ENTREGADO") {
                // Removed delivered_date - column doesn't exist in DB
            }

            const escapeOrValue = (value?: string | null) => {
                if (!value) return null;
                return `"${String(value).replace(/"/g, '""')}"`;
            };
            const workOrderMatch = [
                currentOrder?.order_number ? `order_number.eq.${escapeOrValue(currentOrder.order_number)}` : null,
                currentOrder?.admin_code ? `admin_code.eq.${escapeOrValue(currentOrder.admin_code)}` : null
            ].filter(Boolean).join(',');

            if (nextStatus === "PAGADO" && currentStatus !== "PAGADO") {
                const { data: existingWorkOrder, error: existingError } = await supabase
                    .from('produccion_work_orders')
                    .select('id')
                    .or(workOrderMatch)
                    .maybeSingle();

                if (existingError) {
                    console.error("Error checking production work order:", existingError);
                    throw existingError;
                }

                if (!existingWorkOrder) {
                    await createProductionWorkOrder({ status: 'PENDIENTE' });
                }
            }

            // Update order status
            const { data, error } = await supabase
                .from('comercial_orders')
                .update(updates as any)
                .eq('id', orderId)
                .select()
                .single();

            if (error) {
                console.error("Error updating order status:", error);
                throw error;
            }

            if (nextStatus === "EN_PROCESO" && currentStatus !== "EN_PROCESO") {
                const { data: existingWorkOrder, error: existingError } = await supabase
                    .from('produccion_work_orders')
                    .select('id, due_date')
                    .or(workOrderMatch)
                    .maybeSingle();

                if (existingError) {
                    console.error("Error fetching production work order:", existingError);
                    throw existingError;
                }

                const updateWorkOrder = async (resolvedDueDate: string | null, resolvedSlaDays: number | null) => {
                    const payload: any = {
                        status: 'CORTE',
                        process_start_at: now,
                        due_date: resolvedDueDate || null,
                        sla_days: resolvedSlaDays
                    };

                    const { error: updateError } = await supabase
                        .from('produccion_work_orders')
                        .update(payload)
                        .eq('id', existingWorkOrder.id);

                    if (updateError) {
                        console.error("Error updating production work order:", updateError);
                        throw updateError;
                    }
                };

                if (existingWorkOrder) {
                    let slaDays = computedSlaDays;
                    if (!slaDays) {
                        try {
                            const { data: slaConfig } = await supabase
                                .from("comercial_sla_config")
                                .select("days")
                                .eq("region", currentOrder?.delivery_region || currentOrder?.region || null)
                                .maybeSingle();
                            slaDays = Number(slaConfig?.days) || 7;
                        } catch (slaError) {
                            console.warn("No se pudo cargar SLA para produccion", slaError);
                        }
                    }

                    const dueDate = (existingWorkOrder as any)?.due_date || updates.delivery_date || currentOrder?.delivery_date || null;
                    await updateWorkOrder(dueDate, slaDays || null);
                } else {
                    const dueDate = updates.delivery_date || currentOrder?.delivery_date || null;
                    const workOrderId = await createProductionWorkOrder({
                        status: 'CORTE',
                        processStartAt: now,
                        dueDate,
                        slaDays: computedSlaDays
                    });
                    void workOrderId;
                }
            }

            // Insert log entry
            const { error: logError } = await supabase
                .from('comercial_order_status_log')
                .insert({
                    order_id: orderId,
                    old_status: currentOrder?.status || null,
                    new_status: nextStatus,
                    comment,
                    changed_by: userId
                } as any);

            if (logError) {
                console.error("Error creating status log:", logError);
                // Don't throw - log is secondary to status update
            }

            return data as Order;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['orders'] });
            toast.success("Estado actualizado exitosamente");
        },
        onError: (error: any) => {
            toast.error(`Error al actualizar estado: ${error.message}`);
        }
    });
};

export const useUpdateOrder = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (order: Partial<Order>) => {
            if (!order.id) throw new Error("ID de pedido requerido para actualizar");

            const { data, error } = await supabase
                .from('comercial_orders')
                .update(order as any)
                .eq('id', order.id)
                .select()
                .single();

            if (error) {
                console.error("Error updating order:", error);
                throw error;
            }

            return data as Order;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['orders'] });
            // toast.success("Cambios guardados correctamente"); // Opcional, ya que el modal suele mostrar alert
        },
        onError: (error: any) => {
            console.error("Mutation Error:", error);
            toast.error(`Error al guardar cambios: ${error.message}`);
        }
    });
};

export const useDeleteOrder = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (orderId: string) => {
            const { error } = await supabase
                .from('comercial_orders')
                .delete()
                .eq('id', orderId);

            if (error) {
                console.error("Error deleting order:", error);
                throw error;
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['orders'] });
            toast.success("Pedido eliminado correctamente");
        },
        onError: (error: any) => {
            toast.error(`Error al eliminar pedido: ${error.message}`);
        }
    });
};

