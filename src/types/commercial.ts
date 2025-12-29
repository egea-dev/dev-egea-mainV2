export type OrderStatus = 'PENDIENTE_PAGO' | 'PAGADO' | 'EN_PROCESO' | 'PTE_ENVIO' | 'ENVIADO' | 'ENTREGADO' | 'CANCELADO';
export type Region = 'PENINSULA' | 'BALEARES' | 'CANARIAS';

export interface OrderLine {
    width: string;
    height: string;
    material: string;
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
    customer_name: string;
    region?: Region;
    status: OrderStatus;

    // Technical Data
    fabric?: string;
    color?: string;
    quantity_total: number;

    // JSONB Structures
    lines: OrderLine[];
    documents: OrderDocument[];

    // Meta
    created_at: string;
    updated_at: string;
    delivery_date?: string;
    delivery_city?: string;
}
