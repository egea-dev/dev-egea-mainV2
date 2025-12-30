// Types for Production Module

export type WorkOrderStatus =
    | 'PENDIENTE'
    | 'CORTE'
    | 'CONFECCION'
    | 'TAPICERIA'
    | 'CONTROL_CALIDAD'
    | 'LISTO_ENVIO'
    | 'CANCELADO';

export type QualityCheckStatus = 'PENDIENTE' | 'APROBADO' | 'RECHAZADO';

export interface WorkOrder {
    id: string;
    order_id: string;
    order_number: string;
    status: WorkOrderStatus;
    priority: number;
    assigned_technician_id: string | null;
    start_date: string | null;
    end_date: string | null;
    technical_specs: any; // JSONB
    quality_check_status: QualityCheckStatus;
    notes: string | null;
    created_at: string;
    updated_at: string;
}

export interface ProductionActivity {
    id: string;
    work_order_id: string;
    operator_id: string | null;
    previous_status: WorkOrderStatus | null;
    new_status: WorkOrderStatus;
    notes: string | null;
    created_at: string;
}

export interface WorkOrderWithDetails extends WorkOrder {
    customer_name?: string;
    delivery_date?: string;
    fabric?: string;
}
