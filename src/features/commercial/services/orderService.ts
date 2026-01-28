import { supabaseProductivity as supabase } from "@/integrations/supabase";
import { supabase as supabaseMain } from "@/integrations/supabase/client";
import { Order, OrderStatus } from "@/types/commercial";
import { ORDER_STATUS_FLOW, resolveOrderStatus } from "@/lib/order-status";
import { generateQRPayload } from "@/lib/qr-utils";
import { getSLADays } from "@/hooks/use-sla-days";
import { summarizeMaterials } from "@/lib/materials";

export const OrderService = {
    /**
     * Sincroniza un pedido con el calendario comercial
     */
    async upsertCalendarEvent(order: any) {
        if (!order.delivery_date || order.delivery_date === 'null' || order.delivery_date === '') {
            return;
        }

        const { error } = await (supabase as any)
            .from('comercial_calendar_events')
            .upsert({
                order_id: order.id,
                title: `${order.order_number} - ${order.customer_company || order.customer_name}`,
                start_date: order.delivery_date,
                end_date: order.delivery_date,
                region: order.delivery_region || 'N/D',
                status: 'default'
            });

        if (error) {
            console.error("Error upserting calendar event:", error);
            throw error;
        }
    },

    /**
     * Valida si una transición de estado es permitida
     */
    validateStatusTransition(currentStatus: OrderStatus, nextStatus: OrderStatus) {
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

            if (nextIndex !== currentIndex + 1) {
                throw new Error("Transicion de estado no permitida");
            }
        }
    },

    /**
     * Crea una orden de trabajo en producción asociada a un pedido comercial
     */
    async createProductionWorkOrder(
        order: any,
        status: 'PENDIENTE' | 'CORTE',
        processStartAt?: string,
        dueDate?: string | null,
        slaDays?: number | null
    ) {
        const lines = order.lines || [];
        const firstLine = lines[0];
        const fabric = summarizeMaterials(lines, order.fabric || "N/D");
        const color = order.color || firstLine?.color || "N/D";
        const customerDisplay = order.customer_company || order.customer_name || "Cliente";
        const region = order.delivery_region || order.region || "PENINSULA";
        const quantity = Number(order.quantity_total) || 0;

        const rawOrderNumber = order.order_number || "";
        const adminCode = order.admin_code;
        const resolvedOrderNumber = adminCode || rawOrderNumber || "SIN-REF";

        const payload: any = {
            work_order_number: resolvedOrderNumber,
            order_number: resolvedOrderNumber,
            customer_name: customerDisplay,
            status,
            region,
            delivery_address: order.delivery_address || null,
            contact_name: order.contact_name || null,
            phone: order.phone || null,
            fabric,
            color,
            quantity_total: quantity,
            notes_internal: order.internal_notes || null,
            admin_code: order.admin_code || null,
            due_date: dueDate || order.delivery_date || null,
            process_start_at: processStartAt || null,
            sla_days: slaDays || null,
            qr_payload: generateQRPayload({
                orderNumber: resolvedOrderNumber,
                customerName: order.customer_company || order.customer_name || customerDisplay,
                region,
                deliveryDate: order.delivery_date || null,
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
            await (supabase as any)
                .from('produccion_work_order_lines')
                .insert(linePayload as any[]);
        }

        const finalDeliveryDate = dueDate || order.delivery_date;
        if (finalDeliveryDate) {
            await this.upsertCalendarEvent({
                id: order.id,
                order_number: resolvedOrderNumber,
                delivery_date: finalDeliveryDate,
                customer_company: order.customer_company,
                customer_name: order.customer_name,
                delivery_region: region
            });
        }

    },

    /**
     * Actualiza el estado de un pedido comercial y realiza todas las sincronizaciones necesarias (Producción, Calendario, Logs)
     */
    async updateOrderStatus(orderId: string, status: OrderStatus, comment: string = "Cambio de estado balanceado", userId: string = "unknown") {
        // 1. Obtener pedido actual
        const { data: currentOrder, error: currentError } = await (supabase as any)
            .from('comercial_orders')
            .select('*, lines:comercial_order_lines(*)')
            .eq('id', orderId)
            .single();

        if (currentError) throw currentError;
        if (!currentOrder) throw new Error("Pedido no encontrado");

        const currentStatus = resolveOrderStatus((currentOrder as any).status);
        const nextStatus = resolveOrderStatus(status);

        if (!nextStatus || !currentStatus) {
            throw new Error("Estado de pedido invalido");
        }

        // 2. Validar transición
        this.validateStatusTransition(currentStatus, nextStatus);

        const updates: any = { status: nextStatus, updated_at: new Date().toISOString() };
        let computedSlaDays: number | null = null;
        const now = new Date().toISOString();

        // 3. Lógica específica por estado (SLA / Fechas)
        if (nextStatus === "EN_PROCESO" && !(currentOrder as any)?.delivery_date) {
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

        const rawOrderNumber = (currentOrder as any)?.order_number || "";
        const adminCode = (currentOrder as any)?.admin_code;
        const resolvedOrderNumber = adminCode || rawOrderNumber || "SIN-REF";

        const escapeOrValue = (value?: string | null) => {
            if (!value) return null;
            return `"${String(value).replace(/"/g, '""')}"`;
        };

        const workOrderMatch = [
            resolvedOrderNumber ? `order_number.eq.${escapeOrValue(resolvedOrderNumber)}` : null,
            resolvedOrderNumber ? `work_order_number.eq.${escapeOrValue(resolvedOrderNumber)}` : null,
            adminCode ? `admin_code.eq.${escapeOrValue(adminCode)}` : null
        ].filter(Boolean).join(',');

        // 4. Sincronización con Producción
        if (nextStatus === "PAGADO" && currentStatus !== "PAGADO") {
            const { data: existingWorkOrder } = await supabase
                .from('produccion_work_orders')
                .select('id')
                .or(workOrderMatch)
                .maybeSingle();

            if (!existingWorkOrder) {
                await this.createProductionWorkOrder(currentOrder, 'PENDIENTE', undefined, updates.delivery_date, computedSlaDays);
            }
        }

        if (nextStatus === "EN_PROCESO" && currentStatus !== "EN_PROCESO") {
            const { data: existingWorkOrder } = await (supabase as any)
                .from('produccion_work_orders')
                .select('id, due_date')
                .or(workOrderMatch)
                .maybeSingle();

            if (existingWorkOrder) {
                const region = (currentOrder as any)?.delivery_region || (currentOrder as any)?.region || 'PENINSULA';
                const slaDays = computedSlaDays || getSLADays(region);
                const dueDate = updates.delivery_date || (currentOrder as any)?.delivery_date || null;

                await (supabase as any)
                    .from('produccion_work_orders')
                    .update({
                        status: 'CORTE',
                        process_start_at: now,
                        due_date: dueDate,
                        sla_days: slaDays
                    })
                    .eq('id', existingWorkOrder.id);
            } else {
                const dueDate = updates.delivery_date || (currentOrder as any)?.delivery_date || null;
                await this.createProductionWorkOrder(currentOrder, 'CORTE', now, dueDate, computedSlaDays);
            }
        }

        // 5. Actualizar Pedido Comercial
        const { data, error } = await (supabase as any)
            .from('comercial_orders')
            .update(updates)
            .eq('id', orderId)
            .select()
            .single();

        if (error) throw error;

        // 6. Sincronizar con Calendario
        const finalDeliveryDate = updates.delivery_date || (currentOrder as any)?.delivery_date;
        if (finalDeliveryDate) {
            await this.upsertCalendarEvent({
                id: orderId,
                order_number: resolvedOrderNumber,
                delivery_date: finalDeliveryDate,
                customer_company: (currentOrder as any)?.customer_company,
                customer_name: (currentOrder as any)?.customer_name,
                delivery_region: (currentOrder as any)?.delivery_region || (currentOrder as any)?.region
            });
        }

        // 7. Registrar Log
        await (supabase as any).from('status_log').insert({
            order_id: orderId,
            old_status: (currentOrder as any)?.status || null,
            new_status: nextStatus,
            notes: comment,
            changed_by: userId
        } as any);

        return data as Order;
    },

    /**
     * Crea un nuevo pedido comercial
     */
    async createOrder(orderData: Partial<Order>) {
        const { data, error } = await (supabase as any)
            .from('comercial_orders')
            .insert([orderData] as any[])
            .select()
            .single();

        if (error) {
            console.error("Error creating order:", error);
            throw error;
        }

        if (data?.id) await this.upsertCalendarEvent(data);
        return data as Order;
    },

    /**
     * Actualiza un pedido comercial y sincroniza dependencias
     */
    async updateOrder(order: Partial<Order>) {
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

        if (data?.id) {
            await this.upsertCalendarEvent(data);

            // Sincronizar con Orden de Producción si existe
            const rawOrderNumber = data.order_number || "";
            const resolvedOrderNumber = data.admin_code || rawOrderNumber || "SIN-REF";

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
                    } as any)
                    .or(workOrderMatch);
            }
        }

        return data as Order;
    }
};

