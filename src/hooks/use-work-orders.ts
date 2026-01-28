import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabaseProductivity as supabase } from "@/integrations/supabase";
import { WorkOrder, WorkOrderStatus, WorkOrderWithDetails } from "@/types/production";
import { toast } from "sonner";
import { summarizeMaterials } from "@/lib/materials";
import { WorkOrderService } from "@/features/production/services/workOrderService";

export const normalizeStatus = WorkOrderService.fromLegacyStatus;

// Hook para obtener todas las work orders
export const useWorkOrders = () => {
    return useQuery({
        queryKey: ['work-orders'],
        staleTime: 5000,
        queryFn: async () => {
            const { data, error } = await supabase
                .from('produccion_work_orders')
                .select('*')
                .order('priority', { ascending: false })
                .order('created_at', { ascending: false });

            if (error) {
                console.error("Error fetching work orders:", error);
                throw error;
            }

            let linesData: any[] | null = null;
            let commercialData: any[] | null = null;
            if (data && data.length > 0) {
                const { data: linesResponse } = await supabase
                    .from('produccion_work_order_lines')
                    .select('*')
                    .in('work_order_id', data.map((o: any) => o.id));
                linesData = linesResponse as any[] | null;

                const { data: commResponse } = await supabase
                    .from('comercial_orders')
                    .select('order_number, admin_code, delivery_region, region')
                    .in('order_number', data.map((o: any) => o.order_number).filter(Boolean));
                commercialData = commResponse as any[] | null;
            }

            return (data || []).map((order: any) => {
                const commOrder = commercialData?.find((c: any) => c.order_number === order.order_number || (order.admin_code && c.admin_code === order.admin_code));
                const specs = order.technical_specs || {};
                const lines = (Array.isArray(order.lines) && order.lines.length > 0)
                    ? order.lines
                    : (linesData?.filter((line: any) => line.work_order_id === order.id) || []);
                const materialList = summarizeMaterials(lines, specs.fabric || order.fabric || "N/D");

                const colorList = lines.length > 0
                    ? lines.map((l: any) => l.color).filter(Boolean).join(", ")
                    : (specs.color || order.color || "N/D");

                return {
                    ...order,
                    order_number: order.order_number || order.work_order_number || order.id,
                    quantity_total: order.quantity_total || order.quantity || specs.quantity,
                    status: WorkOrderService.fromLegacyStatus(order.status),
                    fabric: materialList,
                    color: colorList,
                    region: commOrder?.delivery_region || commOrder?.region || order.region || specs.region || "PENINSULA"
                };
            }) as WorkOrderWithDetails[];
        },
    });
};

// Hook para obtener work orders filtradas por estado
export const useWorkOrdersByStatus = (status?: WorkOrderStatus) => {
    return useQuery({
        queryKey: ['work-orders', status],
        staleTime: 5000,
        queryFn: async () => {
            let query = supabase
                .from('produccion_work_orders')
                .select('*')
                .order('priority', { ascending: false })
                .order('created_at', { ascending: false });

            if (status) {
                query = (query.eq('status', WorkOrderService.toLegacyStatus(status) as any) as any);
            }

            const { data, error } = await query;

            if (error) {
                console.error("Error fetching work orders by status:", error);
                throw error;
            }

            let linesData: any[] | null = null;
            if (data && data.length > 0) {
                const { data: linesResponse } = await supabase
                    .from('produccion_work_order_lines')
                    .select('*')
                    .in('work_order_id', data.map((o: any) => o.id));
                linesData = linesResponse as any[] | null;
            }

            return (data || []).map((order: any) => {
                const specs = order.technical_specs || {};
                const lines = linesData?.filter((line: any) => line.work_order_id === order.id) || [];
                const materialList = summarizeMaterials(lines, specs.fabric || order.fabric || "N/D");

                const colorList = lines.length > 0
                    ? lines.map((l: any) => l.color).filter(Boolean).join(", ")
                    : (specs.color || order.color || "N/D");

                return {
                    ...order,
                    order_number: order.order_number || order.work_order_number || order.id,
                    quantity_total: order.quantity_total || order.quantity || specs.quantity,
                    status: WorkOrderService.fromLegacyStatus(order.status),
                    fabric: materialList,
                    color: colorList
                };
            }) as WorkOrderWithDetails[];
        },
    });
};


// Hook para obtener una work order específica
export const useWorkOrder = (id: string) => {
    return useQuery({
        queryKey: ['work-order', id],
        staleTime: 5000,
        queryFn: async () => {
            const { data, error } = await supabase
                .from('produccion_work_orders')
                .select('*')
                .eq('id', id)
                .maybeSingle();

            if (error) {
                console.error("Error fetching work order by ID:", error);
                throw error;
            }

            if (!data) return null;

            const order = data as any;
            const specs = order.technical_specs || {};
            let linesData: any[] | null = null;
            if (!(Array.isArray(order.lines) && order.lines.length > 0)) {
                const { data: linesResponse } = await supabase
                    .from('produccion_work_order_lines')
                    .select('*')
                    .eq('work_order_id', order.id);
                linesData = linesResponse as any[] | null;
            }

            const lines = (Array.isArray(order.lines) && order.lines.length > 0)
                ? order.lines
                : (linesData || []);
            const materialList = summarizeMaterials(lines, specs.fabric || order.fabric || "N/D");

            const colorList = lines.length > 0
                ? lines.map((l: any) => l.color).filter(Boolean).join(", ")
                : (specs.color || order.color || "N/D");

            return {
                ...order,
                order_number: order.order_number || order.work_order_number || order.id,
                quantity_total: order.quantity_total || order.quantity || specs.quantity,
                status: WorkOrderService.fromLegacyStatus(order.status),
                fabric: materialList,
                color: colorList
            } as WorkOrderWithDetails;
        },
        enabled: !!id,
    });
};

export const useUpdateWorkOrderStatus = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            workOrderId,
            status
        }: {
            workOrderId: string;
            status: WorkOrderStatus;
            notes?: string;
        }) => {
            return WorkOrderService.updateStatus(workOrderId, status);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['work-orders'] });
            queryClient.invalidateQueries({ queryKey: ['orders'] });
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
            return WorkOrderService.assignTechnician(workOrderId, technicianId);
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
            return WorkOrderService.updatePriority(workOrderId, priority);
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
            return WorkOrderService.updateQualityCheck(workOrderId, qualityStatus, notes);
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
