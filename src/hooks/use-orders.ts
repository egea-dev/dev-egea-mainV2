import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabaseProductivity as supabase } from "@/integrations/supabase";
import { supabase as supabaseMain } from "@/integrations/supabase/client";
import { Order, OrderStatus } from "@/types/commercial";
import { toast } from "sonner";
import { OrderService } from "@/features/commercial/services/orderService";

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
            return OrderService.createOrder(orderData);
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
        mutationFn: async ({ orderId, status, comment = "Cambio de estado balanceado" }: { orderId: string; status: OrderStatus; comment?: string }) => {
            const { data: { user } } = await supabaseMain.auth.getUser();
            return OrderService.updateOrderStatus(orderId, status, comment, user?.id || 'unknown');
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
            return OrderService.updateOrder(order);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['orders'] });
            toast.success("Cambios guardados correctamente");
        },
        onError: (error: any) => {
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

