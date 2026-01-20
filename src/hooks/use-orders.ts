import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabaseProductivity as supabase } from "@/integrations/supabase";
import { supabase as supabaseMain } from "@/integrations/supabase/client";
import { Order, OrderStatus } from "@/types/commercial";
import { toast } from "sonner";
import { ORDER_STATUS_FLOW, resolveOrderStatus } from "@/lib/order-status";
import { generateQRPayload } from "@/lib/qr-utils";
import { getSLADays } from "@/hooks/use-sla-days";
import { summarizeMaterials } from "@/lib/materials";

const upsertCalendarEvent = async (order: any) => {
    // Validación estricta: No sincronizar si no hay fecha de entrega
    if (!order.delivery_date || order.delivery_date === 'null' || order.delivery_date === '') {
        console.warn("Skipping calendar sync: delivery_date is missing for order", order.id);
        return;
    }

    const { error } = await (supabase as any)
        .from('comercial_calendar_events')
        .upsert({
            order_id: order.id,
            title: `Entrega: ${order.order_number || order.admin_code || 'SIN-REF'}`,
            event_date: order.delivery_date,
            customer_name: order.customer_company || order.customer_name,
            region: order.delivery_region || order.region || 'PENINSULA',
            updated_at: new Date().toISOString()
        }, { onConflict: 'order_id' });

    if (error) {
        console.error("Error syncing calendar event:", error);
    }
};

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
            const { data, error } = await (supabase as any)
                .from('comercial_orders')
                .insert([orderData] as any[])
                .select()
                .single();

            if (error) {
                console.error("Error creating order:", error);
                throw error;
            }

            return data as Order;
        },
        onSuccess: async (data) => {
            if (data?.id) await upsertCalendarEvent(data);
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
        mutationFn: async ({ orderId, status, comment = "Cambio de estado balanceado" }: { orderId: string; status: OrderStatus; comment?: string }) => {
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

            if (!currentOrder) {
                throw new Error("Pedido no encontrado");
            }

            const currentStatus = resolveOrderStatus((currentOrder as any).status);
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

            const lines = (currentOrder as any)?.lines || [];
            const firstLine = lines[0];
            const fabric = summarizeMaterials(lines, (currentOrder as any)?.fabric || "N/D");
            const color = (currentOrder as any)?.color || firstLine?.color || "N/D";
            const customerDisplay = (currentOrder as any)?.customer_company || (currentOrder as any)?.customer_name || "Cliente";
            const region = (currentOrder as any)?.delivery_region || (currentOrder as any)?.region || "PENINSULA";
            const quantity = Number((currentOrder as any)?.quantity_total) || 0;
            const resolvedOrderNumber = (() => {
                const rawOrderNumber = (currentOrder as any)?.order_number || "";
                const adminCode = (currentOrder as any)?.admin_code;
                // Priorizar admin_code si existe, luego order_number
                return adminCode || rawOrderNumber || "SIN-REF";
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
                    work_order_number: resolvedOrderNumber,
                    order_number: resolvedOrderNumber,
                    customer_name: customerDisplay,
                    status,
                    region,
                    delivery_address: (currentOrder as any)?.delivery_address || null,
                    contact_name: (currentOrder as any)?.contact_name || null,
                    phone: (currentOrder as any)?.phone || null,
                    fabric,
                    color,
                    quantity_total: quantity,
                    notes_internal: (currentOrder as any)?.internal_notes || null,
                    admin_code: (currentOrder as any)?.admin_code || null,
                    due_date: dueDate || (currentOrder as any)?.delivery_date || null,
                    process_start_at: processStartAt || null,
                    sla_days: slaDays || null,
                    // Eliminada columna 'lines' que no existe en produccion_work_orders
                    // Generar QR con customer_company (razón social)
                    qr_payload: generateQRPayload({
                        orderNumber: resolvedOrderNumber,
                        customerName: (currentOrder as any)?.customer_company || (currentOrder as any)?.customer_name || customerDisplay,
                        region,
                        deliveryDate: (currentOrder as any)?.delivery_date || null,
                        lines: lines?.map((line: any) => ({
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

                const { data: newWorkOrder, error: createError } = await (supabase as any)
                    .from('produccion_work_orders')
                    .insert([payload])
                    .select('id')
                    .single();

                if (createError) throw createError;

                if (lines.length > 0 && newWorkOrder?.id) {
                    const linePayload = lines.map((line: any) => ({
                        work_order_id: newWorkOrder.id,
                        quantity: Number(line.quantity) || 0,
                        width: Number(line.width) || 0,
                        height: Number(line.height) || 0,
                        notes: line.notes || null,
                        material: line.material || line.fabric || null
                    }));
                    const { error: linesError } = await (supabase as any)
                        .from('produccion_work_order_lines')
                        .insert(linePayload as any[]);
                    if (linesError) {
                        console.error("Error creating work order lines:", linesError);
                    }
                }

                // Crear/Actualizar evento en calendario comercial usando el helper
                const finalDeliveryDate = updates.delivery_date || (currentOrder as any)?.delivery_date;
                if (finalDeliveryDate) {
                    await upsertCalendarEvent({
                        id: (currentOrder as any)!.id,
                        order_number: resolvedOrderNumber,
                        delivery_date: finalDeliveryDate,
                        customer_company: (currentOrder as any)!.customer_company,
                        customer_name: (currentOrder as any)!.customer_name,
                        delivery_region: region
                    });
                }

                return newWorkOrder?.id;
            };

            // Get authenticated user from MAIN
            const { data: { user } } = await supabaseMain.auth.getUser();
            const userId = user?.id || 'unknown';

            const updates: any = { status: nextStatus };
            const now = new Date().toISOString();

            let computedSlaDays: number | null = null;

            if (nextStatus === "EN_PROCESO") {
                if (!(currentOrder as any)?.delivery_date) {
                    try {
                        const region = (currentOrder as any)?.delivery_region || (currentOrder as any)?.region || 'PENINSULA';
                        const days = getSLADays(region);
                        computedSlaDays = days;
                        const target = new Date();
                        target.setDate(target.getDate() + days);
                        updates.delivery_date = target.toISOString().slice(0, 10);
                    } catch (slaError) {
                        console.warn("No se pudo calcular SLA para fecha de entrega", slaError);
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
                (currentOrder as any)?.order_number ? `order_number.eq.${escapeOrValue((currentOrder as any).order_number)}` : null,
                (currentOrder as any)?.order_number ? `work_order_number.eq.${escapeOrValue((currentOrder as any).order_number)}` : null,
                (currentOrder as any)?.admin_code ? `admin_code.eq.${escapeOrValue((currentOrder as any).admin_code)}` : null
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
            const { data, error } = await (supabase as any)
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
                const { data: existingWorkOrder, error: existingError } = await (supabase as any)
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

                    const { error: updateError } = await (supabase as any)
                        .from('produccion_work_orders')
                        .update(payload)
                        .eq('id', existingWorkOrder.id);

                    if (updateError) {
                        console.error("Error updating production work order:", updateError);
                        throw updateError;
                    }
                };

                if (existingWorkOrder) {
                    const region = (currentOrder as any)?.delivery_region || (currentOrder as any)?.region || 'PENINSULA';
                    const slaDays = computedSlaDays || getSLADays(region);

                    const dueDate = updates.delivery_date || (currentOrder as any)?.delivery_date || null;
                    await updateWorkOrder(dueDate, slaDays || null);
                } else {
                    const dueDate = updates.delivery_date || (currentOrder as any)?.delivery_date || null;
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
                .from('status_log')
                .insert({
                    order_id: orderId,
                    old_status: (currentOrder as any)?.status || null,
                    new_status: nextStatus,
                    notes: comment,
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

            const { data, error } = await (supabase as any)
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
        onSuccess: async (data) => {
            if (data?.id) {
                await upsertCalendarEvent(data);

                // Sincronizar con Orden de Producción si existe
                const resolvedOrderNumber = (() => {
                    const rawOrderNumber = data.order_number || "";
                    // Priorizar admin_code si existe, luego order_number
                    return data.admin_code || rawOrderNumber || "SIN-REF";
                })();

                const escapeOrValue = (value?: string | null) => {
                    if (!value) return null;
                    return `"${String(value).replace(/"/g, '""')}"`;
                };

                const workOrderMatch = [
                    data.order_number ? `order_number.eq.${escapeOrValue(data.order_number)}` : null,
                    data.order_number ? `work_order_number.eq.${escapeOrValue(data.order_number)}` : null,
                    data.admin_code ? `admin_code.eq.${escapeOrValue(data.admin_code)}` : null
                ].filter(Boolean).join(',');

                if (workOrderMatch) {
                    await (supabase as any)
                        .from('produccion_work_orders')
                        .update({
                            due_date: data.delivery_date,
                            customer_name: data.customer_company || data.customer_name,
                            region: data.delivery_region || data.region,
                            fabric: summarizeMaterials(data.lines || [], data.fabric || "N/D"),
                            // Eliminada columna 'lines' que no existe en produccion_work_orders
                        })
                        .or(workOrderMatch);
                }
            }
            queryClient.invalidateQueries({ queryKey: ['orders'] });
            toast.success("Cambios guardados correctamente");
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

// Hook para marcar notificación de envío como enviada
export const useMarkShippingNotificationSent = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ orderId, userId }: { orderId: string; userId: string }) => {
            const { data, error } = await (supabase as any)
                .from('comercial_orders')
                .update({
                    shipping_notification_pending: false,
                    shipping_notification_sent_at: new Date().toISOString(),
                    shipping_notification_sent_by: userId
                })
                .eq('id', orderId)
                .select()
                .single();

            if (error) {
                console.error("Error marking shipping notification as sent:", error);
                throw error;
            }

            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['orders'] });
            toast.success("✅ Notificación de envío marcada como enviada");
        },
        onError: (error: any) => {
            toast.error(`Error: ${error.message}`);
        }
    });
};
