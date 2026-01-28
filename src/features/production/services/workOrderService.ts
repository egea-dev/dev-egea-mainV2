import { supabaseProductivity as supabase } from "@/integrations/supabase";
import { WorkOrder, WorkOrderStatus } from "@/types/production";

export const WorkOrderService = {
    /**
     * Convierte un estado "limpio" de la UI al estado "legacy" de la base de datos
     */
    toLegacyStatus(status: WorkOrderStatus): string {
        switch (status) {
            case 'CORTE': return 'EN_CORTE';
            case 'CONFECCION': return 'EN_CONFECCION';
            case 'CONTROL_CALIDAD': return 'EN_CONTROL_CALIDAD';
            case 'LISTO_ENVIO': return 'TERMINADO';
            default: return status;
        }
    },

    /**
     * Convierte un estado "legacy" de la base de datos al estado "limpio" de la UI
     */
    fromLegacyStatus(raw?: string): WorkOrderStatus {
        const normalized = (raw || '').toUpperCase();
        const map: Record<string, WorkOrderStatus> = {
            PAGADO: 'PENDIENTE',
            EN_PROCESO: 'CORTE',
            EN_CORTE: 'CORTE',
            EN_CONFECCION: 'CONFECCION',
            EN_CONTROL_CALIDAD: 'CONTROL_CALIDAD',
            TERMINADO: 'LISTO_ENVIO'
        };
        return map[normalized] || (normalized as WorkOrderStatus) || 'PENDIENTE';
    },

    /**
     * Mapea el estado de producción al estado comercial correspondiente
     */
    mapProductionToCommercial(status: string): string | null {
        switch (status.toUpperCase()) {
            case 'LISTO_ENVIO':
            case 'TERMINADO':
                return 'PTE_ENVIO';
            case 'ENVIADO':
                return 'ENVIADO';
            case 'ENTREGADO':
                return 'ENTREGADO';
            default:
                return null;
        }
    },

    /**
     * Actualiza el estado de una orden de trabajo y sincroniza con comercial si es necesario
     */
    async updateStatus(workOrderId: string, status: WorkOrderStatus) {
        const { data, error } = await (supabase
            .from('produccion_work_orders') as any)
            .update({
                status: this.toLegacyStatus(status),
                updated_at: new Date().toISOString()
            } as any)
            .eq('id', workOrderId)
            .select()
            .single();

        if (error) {
            console.error("Error updating work order status:", error);
            throw error;
        }

        // Sincronización con Comercial
        if (data?.order_number) {
            const commercialStatus = this.mapProductionToCommercial(data.status);
            if (commercialStatus) {
                const { error: syncError } = await (supabase
                    .from('comercial_orders') as any)
                    .update({
                        status: commercialStatus,
                        updated_at: new Date().toISOString()
                    })
                    .eq('order_number', data.order_number);

                if (syncError) {
                    console.error("Error syncing commercial order status:", syncError);
                }
            }
        }

    },

    /**
     * Asigna un técnico a una orden de trabajo
     */
    async assignTechnician(workOrderId: string, technicianId: string | null) {
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

    /**
     * Actualiza la prioridad de una orden de trabajo
     */
    async updatePriority(workOrderId: string, priority: number) {
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

    /**
     * Actualiza el estado del control de calidad
     */
    async updateQualityCheck(workOrderId: string, qualityStatus: 'PENDIENTE' | 'APROBADO' | 'RECHAZADO', notes?: string) {
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
    }
};

