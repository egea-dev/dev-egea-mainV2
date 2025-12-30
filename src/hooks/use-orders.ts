import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabaseProductivity as supabase } from "@/integrations/supabase/dual-client";
import { supabase as supabaseMain } from "@/integrations/supabase/client";
import { Order, OrderStatus } from "@/types/commercial";
import { toast } from "sonner";

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
            // Get current order to track old status
            const { data: currentOrder } = await supabase
                .from('comercial_orders')
                .select('status')
                .eq('id', orderId)
                .single();

            // Get authenticated user from MAIN
            const { data: { user } } = await supabaseMain.auth.getUser();
            const userId = user?.id || 'unknown';

            // Update order status
            const { data, error } = await supabase
                .from('comercial_orders')
                .update({ status })
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
                    new_status: status,
                    comment,
                    changed_by: userId
                });

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

