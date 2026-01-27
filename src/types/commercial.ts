export type OrderStatus = 'PENDIENTE_PAGO' | 'PAGADO' | 'EN_PROCESO' | 'PTE_ENVIO' | 'ENVIADO' | 'ENTREGADO' | 'CANCELADO';
export type Region = 'PENINSULA' | 'BALEARES' | 'CANARIAS';

export interface OrderLine {
    width: string;
    height: string;
    material: string;
    color?: string; // NEW: Color column
    quantity: number;
    notes?: string;
}

export interface OrderDocument {
    type: 'PRESUPUESTO' | 'PEDIDO_ACEPTADO';
    url: string;
    storage_path: string;
    name: string;
    uploaded_at: string;
}

export interface Order {
    id: string;
    order_number: string;
    admin_code?: string;

    // Customer Data (from reference modal)
    customer_name: string; // NOMBRE COMPLETO
    customer_code?: string; // CÓDIGO SOLICITUD INTERESADO
    customer_company?: string; // CLIENTE / RAZÓN SOCIAL
    contact_name?: string; // NOMBRE CONTACTO
    phone?: string; // TELÉFONO
    email?: string; // EMAIL

    // Delivery Data
    delivery_region?: Region; // REGIÓN (PENINSULA, BALEARES, CANARIAS)
    delivery_address?: string; // DIRECCIÓN DE ENTREGA
    delivery_location_url?: string; // UBICACIÓN (MAPS)
    delivery_date?: string;
    delivery_city?: string;
    production_start_date?: string;
    shipped_date?: string;
    delivered_date?: string;

    // Order Status
    status: OrderStatus;

    // Technical Data
    fabric?: string;
    color?: string;
    quantity_total: number;

    // JSONB Structures
    lines: OrderLine[];
    documents: OrderDocument[];

    // Notes
    internal_notes?: string; // NOTAS INTERNAS

    // Shipping / Warehouse
    packages_count?: number;
    scanned_packages?: number;
    tracking_number?: string;
    needs_shipping_validation?: boolean;
    shipping_date?: string;
    quantity_shipped?: number;

    // Email Notifications
    shipping_notification_pending?: boolean;
    shipping_notification_sent_at?: string;
    shipping_notification_sent_by?: string;

    // QR
    qr_generated_at?: string;

    // Meta
    created_at: string;
    updated_at: string;
    created_by?: string;

    // Legacy compatibility
    region?: Region; // Deprecated, use delivery_region
}
