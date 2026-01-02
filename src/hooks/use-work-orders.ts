import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabaseProductivity as supabase } from "@/integrations/supabase/dual-client";
import { WorkOrder, WorkOrderStatus, WorkOrderWithDetails } from "@/types/production";
import { toast } from "sonner";

// Hook para obtener todas las work orders
export const useWorkOrders = () => {
    return useQuery({
        queryKey: ['work-orders'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('produccion_work_orders')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) {
                console.error("Error fetching work orders:", error);
                throw error;
            }

            return (data || []) as WorkOrderWithDetails[];
        },
    });
};

// Hook para obtener work orders filtradas por estado
export const useWorkOrdersByStatus = (status?: WorkOrderStatus) => {
    return useQuery({
        queryKey: ['work-orders', status],
        queryFn: async () => {
            let query = supabase
                .from('produccion_work_orders')
                .select('*')
                .order('priority', { ascending: false })
                .order('created_at', { ascending: false });

            if (status) {
                query = query.eq('status', status);
            }

            const { data, error } = await query;

            if (error) {
                console.error("Error fetching work orders:", error);
                throw error;
            }

            return (data || []) as WorkOrderWithDetails[];
        },
    });
};

// Hook para obtener una work order específica
export const useWorkOrder = (id: string) => {
    return useQuery({
        queryKey: ['work-order', id],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('produccion_work_orders')
                .select('*')
                .eq('id', id)
                .single();

            if (error) {
                console.error("Error fetching work order:", error);
                throw error;
            }

            return data as WorkOrderWithDetails;
        },
        enabled: !!id,
    });
};

// Hook para actualizar estado de work order
export const useUpdateWorkOrderStatus = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            workOrderId,
            status,
            notes
        }: {
            workOrderId: string;
            status: WorkOrderStatus;
            notes?: string;
        }) => {
            const { data, error } = await supabase
                .from('produccion_work_orders')
                .update({
                    status,
                    updated_at: new Date().toISOString()
                } as any)
                .eq('id', workOrderId)
                .select()
                .single();

            if (error) {
                console.error("Error updating work order status:", error);
                throw error;
            }

            return data as WorkOrder;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['work-orders'] });
            toast.success("Estado actualizado exitosamente");
        },
        onError: (error: any) => {
            toast.error(`Error al actualizar estado: ${error.message}`);
        }
    });
};

// Hook para asignar operario
export const useAssignTechnician = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            workOrderId,
            technicianId
        }: {
            workOrderId: string;
            technicianId: string | null;
        }) => {
            const { data, error } = await supabase
                .from('produccion_work_orders')
                .update({
                    assigned_technician_id: technicianId,
                    updated_at: new Date().toISOString()
                } as any)
                .eq('id', workOrderId)
                .select()
                .single();

            if (error) {
                console.error("Error assigning technician:", error);
                throw error;
            }

            return data as WorkOrder;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['work-orders'] });
            toast.success("Operario asignado exitosamente");
        },
        onError: (error: any) => {
            toast.error(`Error al asignar operario: ${error.message}`);
        }
    });
};

// Hook para actualizar prioridad
export const useUpdateWorkOrderPriority = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            workOrderId,
            priority
        }: {
            workOrderId: string;
            priority: number;
        }) => {
            const { data, error } = await supabase
                .from('produccion_work_orders')
                .update({
                    priority,
                    updated_at: new Date().toISOString()
                } as any)
                .eq('id', workOrderId)
                .select()
                .single();

            if (error) {
                console.error("Error updating priority:", error);
                throw error;
            }

            return data as WorkOrder;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['work-orders'] });
            toast.success("Prioridad actualizada");
        },
        onError: (error: any) => {
            toast.error(`Error al actualizar prioridad: ${error.message}`);
        }
    });
};

// Hook para actualizar estado de control de calidad
export const useUpdateQualityCheck = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            workOrderId,
            qualityStatus,
            notes
        }: {
            workOrderId: string;
            qualityStatus: 'PENDIENTE' | 'APROBADO' | 'RECHAZADO';
            notes?: string;
        }) => {
            const updates: any = {
                quality_check_status: qualityStatus,
                updated_at: new Date().toISOString()
            };

            if (notes) {
                updates.notes = notes;
            }

            const { data, error } = await supabase
                .from('produccion_work_orders')
                .update(updates)
                .eq('id', workOrderId)
                .select()
                .single();

            if (error) {
                console.error("Error updating quality check:", error);
                throw error;
            }

            return data as WorkOrder;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['work-orders'] });
            toast.success("Control de calidad actualizado");
        },
        onError: (error: any) => {
            toast.error(`Error al actualizar QC: ${error.message}`);
        }
    });
};
