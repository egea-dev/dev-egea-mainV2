import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabaseProductivity } from '@/integrations/supabase/dual-client';
import { toast } from 'sonner';

export type WorkOrderStatus = 'PENDIENTE' | 'CORTE' | 'CONFECCION' | 'TAPICERIA' | 'CONTROL_CALIDAD' | 'LISTO_ENVIO' | 'CANCELADO';

export interface WorkOrder {
    id: string;
    order_id: string | null;
    order_number: string;
    status: WorkOrderStatus;
    priority: number;
    assigned_technician_id: string | null;
    start_date: string | null;
    end_date: string | null;
    technical_specs: any;
    quality_check_status: string | null;
    notes: string | null;
    created_at: string;
    updated_at: string;
}

export const useWorkOrders = (status?: WorkOrderStatus) => {
    return useQuery({
        queryKey: ['work-orders', status],
        queryFn: async () => {
            let query = supabaseProductivity
                .schema('produccion')
                .from('work_orders')
                .select('*')
                .order('priority', { ascending: false })
                .order('created_at', { ascending: true });

            if (status) {
                query = query.eq('status', status);
            }

            const { data, error } = await query;

            if (error) {
                console.error('Error fetching work orders:', error);
                throw error;
            }

            return data as WorkOrder[];
        },
    });
};

export const useUpdateWorkOrderStatus = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, status, notes }: { id: string, status: WorkOrderStatus, notes?: string }) => {
            const { data: currentOrder, error: fetchError } = await supabaseProductivity
                .schema('produccion')
                .from('work_orders')
                .select('status')
                .eq('id', id)
                .single();

            if (fetchError) throw fetchError;

            const { error: updateError } = await supabaseProductivity
                .schema('produccion')
                .from('work_orders')
                .update({
                    status,
                    updated_at: new Date().toISOString()
                })
                .eq('id', id);

            if (updateError) throw updateError;

            // Registrar actividad
            const { error: activityError } = await supabaseProductivity
                .schema('produccion')
                .from('production_activity')
                .insert({
                    work_order_id: id,
                    previous_status: currentOrder.status,
                    new_status: status,
                    notes: notes || `Cambio de estado a ${status}`
                });

            if (activityError) console.error('Error logging activity:', activityError);

            return { id, status };
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['work-orders'] });
            toast.success('Estado de orden actualizado');
        },
        onError: (error: any) => {
            toast.error(`Error al actualizar estado: ${error.message}`);
        }
    });
};

export const useWorkOrderById = (id: string | null) => {
    return useQuery({
        queryKey: ['work-order', id],
        queryFn: async () => {
            if (!id) return null;
            const { data, error } = await supabaseProductivity
                .schema('produccion')
                .from('work_orders')
                .select('*')
                .eq('id', id)
                .single();

            if (error) throw error;
            return data as WorkOrder;
        },
        enabled: !!id
    });
};

export const useCreateWorkOrder = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (orderData: {
            order_id: string,
            order_number: string,
            notes?: string,
            technical_specs?: any
        }) => {
            const { data, error } = await supabaseProductivity
                .schema('produccion')
                .from('work_orders')
                .insert({
                    order_id: orderData.order_id,
                    order_number: orderData.order_number,
                    status: 'PENDIENTE',
                    priority: 0,
                    notes: orderData.notes,
                    technical_specs: orderData.technical_specs || {}
                })
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['work-orders'] });
            toast.success('Pedido lanzado a producción con éxito');
        },
        onError: (error: any) => {
            toast.error(`Error al lanzar a producción: ${error.message}`);
        }
    });
};
