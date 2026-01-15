import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabaseProductivity as supabase } from "@/integrations/supabase";
import { WorkOrder, WorkOrderStatus, WorkOrderWithDetails } from "@/types/production";
import { toast } from "sonner";

// Hook para obtener todas las work orders
export const useWorkOrders = () => {
    return useQuery({
        queryKey: ['work-orders'],
        queryFn: async () => {
            const isMissingRelation = (error: any) => {
                const message = String(error?.message || '');
                return message.includes('does not exist') || message.includes('relation') || message.includes('schema');
            };

            let data: any[] | null = null;
            let error: any = null;

            const schemaProbe = await supabase
                .from('produccion_work_orders')
                .select('id')
                .limit(1);

            if (!schemaProbe.error && (schemaProbe.data?.length || 0) > 0) {
                const fallback = await supabase
                    .from('produccion_work_orders')
                    .select('*')
                    .order('created_at', { ascending: false });
                data = fallback.data as any[] | null;
                error = fallback.error;
            } else {
                const primary = await supabase
                    .from('produccion_work_orders')
                    .select('*')
                    .order('created_at', { ascending: false });
                data = primary.data as any[] | null;
                error = primary.error;

                if (error && isMissingRelation(error)) {
                    const fallback = await supabase
                        .from('produccion_work_orders')
                        .select('*')
                        .order('created_at', { ascending: false });
                    data = fallback.data as any[] | null;
                    error = fallback.error;
                }
            }

            if (error) {
                console.error("Error fetching work orders:", error);
                throw error;
            }

            const normalizeStatus = (raw?: string) => {
                const normalized = (raw || '').toUpperCase();
                const map: Record<string, string> = {
                    EN_CORTE: 'CORTE',
                    EN_CONFECCION: 'CONFECCION',
                    EN_CONTROL_CALIDAD: 'CONTROL_CALIDAD',
                    TERMINADO: 'LISTO_ENVIO'
                };
                return map[normalized] || normalized;
            };

            return (data || []).map((order: any) => ({
                ...order,
                order_number: order.order_number || order.work_order_number || order.id,
                quantity_total: order.quantity_total || order.quantity || order.technical_specs?.quantity,
                status: normalizeStatus(order.status),
            })) as WorkOrderWithDetails[];
        },
    });
};

// Hook para obtener work orders filtradas por estado
export const useWorkOrdersByStatus = (status?: WorkOrderStatus) => {
    return useQuery({
        queryKey: ['work-orders', status],
        queryFn: async () => {
            const isMissingRelation = (error: any) => {
                const message = String(error?.message || '');
                return message.includes('does not exist') || message.includes('relation') || message.includes('schema');
            };

            const normalizeStatus = (raw?: string) => {
                const normalized = (raw || '').toUpperCase();
                const map: Record<string, string> = {
                    EN_CORTE: 'CORTE',
                    EN_CONFECCION: 'CONFECCION',
                    EN_CONTROL_CALIDAD: 'CONTROL_CALIDAD',
                    TERMINADO: 'LISTO_ENVIO'
                };
                return map[normalized] || normalized;
            };

            const normalizedToLegacy = (raw?: WorkOrderStatus) => {
                if (!raw) return raw;
                switch (raw) {
                    case 'CORTE': return 'EN_CORTE';
                    case 'CONFECCION': return 'EN_CONFECCION';
                    case 'CONTROL_CALIDAD': return 'EN_CONTROL_CALIDAD';
                    case 'LISTO_ENVIO': return 'TERMINADO';
                    default: return raw;
                }
            };

            let data: any[] | null = null;
            let error: any = null;

            const schemaProbe = await supabase
                .from('produccion_work_orders')
                .select('id')
                .limit(1);

            if (!schemaProbe.error && (schemaProbe.data?.length || 0) > 0) {
                let fallbackQuery = supabase
                    .from('produccion_work_orders')
                    .select('*')
                    .order('created_at', { ascending: false });
                if (status) {
                    fallbackQuery = fallbackQuery.eq('status', normalizedToLegacy(status) as any);
                }
                const fallback = await fallbackQuery;
                data = fallback.data as any[] | null;
                error = fallback.error;
            } else {
                let query = supabase
                    .from('produccion_work_orders')
                    .select('*')
                    .order('priority', { ascending: false })
                    .order('created_at', { ascending: false });

                if (status) {
                    query = query.eq('status', status as any);
                }

                const primary = await query;
                data = primary.data as any[] | null;
                error = primary.error;

                if (error && isMissingRelation(error)) {
                    let fallbackQuery = supabase
                        .from('produccion_work_orders')
                        .select('*')
                        .order('created_at', { ascending: false });
                    if (status) {
                        fallbackQuery = fallbackQuery.eq('status', normalizedToLegacy(status) as any);
                    }
                    const fallback = await fallbackQuery;
                    data = fallback.data as any[] | null;
                    error = fallback.error;
                }
            }

            if (error) {
                console.error("Error fetching work orders:", error);
                throw error;
            }

            return (data || []).map((order: any) => ({
                ...order,
                order_number: order.order_number || order.work_order_number || order.id,
                quantity_total: order.quantity_total || order.quantity || order.technical_specs?.quantity,
                status: normalizeStatus(order.status),
            })) as WorkOrderWithDetails[];
        },
    });
};

// Hook para obtener una work order específica
export const useWorkOrder = (id: string) => {
    return useQuery({
        queryKey: ['work-order', id],
        queryFn: async () => {
            const isMissingRelation = (error: any) => {
                const message = String(error?.message || '');
                return message.includes('does not exist') || message.includes('relation') || message.includes('schema');
            };

            let data: any = null;
            let error: any = null;

            const schemaProbe = await supabase
                .from('produccion_work_orders')
                .select('id')
                .limit(1);

            if (!schemaProbe.error && (schemaProbe.data?.length || 0) > 0) {
                const fallback = await supabase
                    .from('produccion_work_orders')
                    .select('*')
                    .eq('id', id)
                    .single();
                data = fallback.data;
                error = fallback.error;
            } else {
                const primary = await supabase
                    .from('produccion_work_orders')
                    .select('*')
                    .eq('id', id)
                    .single();
                data = primary.data;
                error = primary.error;

                if (error && isMissingRelation(error)) {
                    const fallback = await supabase
                        .from('produccion_work_orders')
                        .select('*')
                        .eq('id', id)
                        .single();
                    data = fallback.data;
                    error = fallback.error;
                }
            }

            if (error) {
                console.error("Error fetching work order:", error);
                throw error;
            }

            if (!data) return data as WorkOrderWithDetails;

            const normalizeStatus = (raw?: string) => {
                const normalized = (raw || '').toUpperCase();
                const map: Record<string, string> = {
                    EN_CORTE: 'CORTE',
                    EN_CONFECCION: 'CONFECCION',
                    EN_CONTROL_CALIDAD: 'CONTROL_CALIDAD',
                    TERMINADO: 'LISTO_ENVIO'
                };
                return map[normalized] || normalized;
            };

            return {
                ...data,
                order_number: data.order_number || data.work_order_number || data.id,
                quantity_total: data.quantity_total || data.quantity || data.technical_specs?.quantity,
                status: normalizeStatus(data.status),
            } as WorkOrderWithDetails;
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
            const normalizedToLegacy = (raw: WorkOrderStatus) => {
                switch (raw) {
                    case 'CORTE': return 'EN_CORTE';
                    case 'CONFECCION': return 'EN_CONFECCION';
                    case 'CONTROL_CALIDAD': return 'EN_CONTROL_CALIDAD';
                    case 'LISTO_ENVIO': return 'TERMINADO';
                    default: return raw;
                }
            };

            const schemaProbe = await supabase
                .from('produccion_work_orders')
                .select('id')
                .limit(1);

            const useSchema = !schemaProbe.error && (schemaProbe.data?.length || 0) > 0;

            let data: any = null;
            let error: any = null;

            if (useSchema) {
                const fallback = await (supabase
                    .from('produccion_work_orders') as any)
                    .update({
                        status: normalizedToLegacy(status),
                        updated_at: new Date().toISOString()
                    } as any)
                    .eq('id', workOrderId)
                    .select()
                    .single();
                data = fallback.data as any;
                error = fallback.error;
            } else {
                let result = await (supabase
                    .from('produccion_work_orders') as any)
                    .update({
                        status,
                        updated_at: new Date().toISOString()
                    } as any)
                    .eq('id', workOrderId)
                    .select()
                    .single();

                data = result.data as any;
                error = result.error;

                if (error && String(error.message || '').includes('relation')) {
                    const fallback = await (supabase
                        .from('produccion_work_orders') as any)
                        .update({
                            status: normalizedToLegacy(status),
                            updated_at: new Date().toISOString()
                        } as any)
                        .eq('id', workOrderId)
                        .select()
                        .single();
                    data = fallback.data as any;
                    error = fallback.error;
                } else if (error && String(error.message || '').includes('violates check')) {
                    const fallback = await (supabase
                        .from('produccion_work_orders') as any)
                        .update({
                            status: normalizedToLegacy(status),
                            updated_at: new Date().toISOString()
                        } as any)
                        .eq('id', workOrderId)
                        .select()
                        .single();
                    data = fallback.data as any;
                    error = fallback.error;
                }
            }

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

// Hook para asignar usuario
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
            const { data, error } = await (supabase
                .from('produccion_work_orders') as any)
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
            toast.success("Usuario asignado exitosamente");
        },
        onError: (error: any) => {
            toast.error(`Error al asignar usuario: ${error.message}`);
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
            const { data, error } = await (supabase
                .from('produccion_work_orders') as any)
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

            const { data, error } = await (supabase
                .from('produccion_work_orders') as any)
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
