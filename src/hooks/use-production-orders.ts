import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabaseProductivity } from '@/integrations/supabase';
import { WorkOrder, WorkOrderLine, WorkOrderStatus } from '@/types/production';
import { toast } from 'sonner';
import { useSLADays } from '@/hooks/use-sla-days';

// Hook para obtener todas las órdenes de trabajo CON sus líneas
export const useProductionOrders = () => {
    return useQuery({
        queryKey: ['production-orders'],
        queryFn: async () => {
            // Primero obtener las órdenes
            const { data: orders, error: ordersError } = await supabaseProductivity
                .from('produccion_work_orders')
                .select('*')
                .order('created_at', { ascending: false });

            if (ordersError) {
                console.error('Error fetching production orders:', ordersError);
                throw ordersError;
            }

            if (!orders || orders.length === 0) {
                return [];
            }

            // Luego obtener todas las líneas
            const { data: lines, error: linesError } = await supabaseProductivity
                .from('produccion_work_order_lines')
                .select('*')
                .in('work_order_id', orders.map((o: any) => o.id));

            if (linesError) {
                console.error('Error fetching work order lines:', linesError);
                // No lanzar error, solo continuar sin líneas
            }

            // Combinar órdenes con sus líneas
            const ordersWithLines = orders.map((order: any) => ({
                ...order,
                lines: lines?.filter((line: any) => line.work_order_id === order.id) || []
            }));

            return ordersWithLines as WorkOrder[];
        },
    });
};

// Hook para obtener líneas de una orden
export const useWorkOrderLines = (workOrderId: string) => {
    return useQuery({
        queryKey: ['work-order-lines', workOrderId],
        queryFn: async () => {
            const { data, error } = await supabaseProductivity
                .from('produccion_work_order_lines')
                .select('*')
                .eq('work_order_id', workOrderId)
                .order('created_at', { ascending: true });

            if (error) {
                console.error('Error fetching work order lines:', error);
                throw error;
            }

            return data as WorkOrderLine[];
        },
        enabled: !!workOrderId,
    });
};

// Hook para actualizar una orden de trabajo
export const useUpdateProductionOrder = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, updates }: { id: string; updates: Partial<WorkOrder> }) => {
            const { data, error } = await supabaseProductivity
                .from('produccion_work_orders')
                .update(updates)
                .eq('id', id)
                .select()
                .single();

            if (error) {
                console.error('Error updating production order:', error);
                throw error;
            }

            return data as WorkOrder;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['production-orders'] });
        },
        onError: (error: any) => {
            toast.error(`Error al actualizar orden: ${error.message}`);
        },
    });
};

// Hook para iniciar producción
export const useStartProduction = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, region }: { id: string; region: string }) => {
            // Importar dinámicamente para evitar problemas de dependencias circulares
            const { addWorkdays } = await import('@/utils/workday-utils');

            // SLA por región (días LABORABLES)
            const slaConfig: Record<string, number> = {
                // Baleares - 7 días laborables
                'MALLORCA': 7,
                'MENORCA': 7,
                'IBIZA': 7,
                'FORMENTERA': 7,
                'BALEARES': 7,

                // Península - 10 días laborables
                'PENINSULA': 10,

                // Canarias - 20 días laborables
                'CANARIAS': 20,
                'TENERIFE': 20,
                'GRAN_CANARIA': 20,
                'LANZAROTE': 20,
                'FUERTEVENTURA': 20,
                'LA_PALMA': 20,
                'LA_GOMERA': 20,
                'EL_HIERRO': 20,

                'DEFAULT': 10,
            };

            const sla = slaConfig[region] || slaConfig['DEFAULT'];
            const now = new Date();
            // Usar días LABORABLES para calcular fecha de vencimiento
            const due = addWorkdays(now, sla);

            const updates = {
                status: 'CORTE' as WorkOrderStatus,
                sla_days: sla,
                process_start_at: now.toISOString(),
                due_date: due.toISOString(),
            };

            const { data, error } = await supabaseProductivity
                .from('produccion_work_orders')
                .update(updates)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            return data as WorkOrder;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['production-orders'] });
            toast.success('Producción iniciada exitosamente');
        },
        onError: (error: any) => {
            toast.error(`Error al iniciar producción: ${error.message}`);
        },
    });
};

// Hook para finalizar producción
export const useFinishProduction = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            id,
            packagesCount,
            dueDate
        }: {
            id: string;
            packagesCount: number;
            dueDate: string | null;
        }) => {
            // Calcular si necesita validación urgente (2 días o menos)
            const diffDays = dueDate
                ? Math.ceil((new Date(dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                : 0;
            const needsValidation = diffDays <= 2;

            const updates = {
                status: 'LISTO_ENVIO' as WorkOrderStatus,
                packages_count: packagesCount,
                needs_shipping_validation: needsValidation,
            };

            const { data, error } = await supabaseProductivity
                .from('produccion_work_orders')
                .update(updates)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            return data as WorkOrder;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['production-orders'] });
            toast.success('Producción finalizada. Orden lista para envío');
        },
        onError: (error: any) => {
            toast.error(`Error al finalizar producción: ${error.message}`);
        },
    });
};
