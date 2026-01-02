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

export interface WorkOrderLine {
    id: string;
    work_order_id: string;
    quantity: number;
    width: number;
    height: number;
    notes?: string;
    material?: string;
    created_at: string;
    updated_at: string;
}

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

    // Campos de producción
    fabric?: string;
    color?: string;
    quantity_total?: number;
    packages_count?: number | null;
    scanned_packages?: number;
    tracking_number?: string | null;
    shipping_date?: string | null;
    needs_shipping_validation?: boolean;
    due_date?: string | null;
    process_start_at?: string | null;
    sla_days?: number;
    region?: string;
    delivery_address?: string | null;
    contact_name?: string | null;
    phone?: string | null;
    google_maps_link?: string | null;
    notes_internal?: string | null;
    admin_code?: string | null;
    qr_payload?: string;
    customer_name?: string;

    // Líneas de desglose
    lines?: WorkOrderLine[];
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
