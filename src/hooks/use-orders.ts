import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabaseProductivity as supabase } from "@/integrations/supabase";
import { supabase as supabaseMain } from "@/integrations/supabase/client";
import { Order, OrderStatus } from "@/types/commercial";
import { toast } from "sonner";
import { ORDER_STATUS_FLOW, resolveOrderStatus } from "@/lib/order-status";

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
                .select('status, delivery_region, region, delivery_date, lines')
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

            // Get authenticated user from MAIN
            const { data: { user } } = await supabaseMain.auth.getUser();
            const userId = user?.id || 'unknown';

            const updates: any = { status: nextStatus };
            const now = new Date().toISOString();

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

