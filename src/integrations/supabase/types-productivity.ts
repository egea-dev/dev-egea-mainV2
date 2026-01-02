// src/integrations/supabase/types-productivity.ts
// Tipos para la base de datos PRODUCTIVITY (zslcblcetrhbsdirkvza)

export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export interface Database {
    public: {
        Tables: {
            kiosk_screens: {
                Row: {
                    id: string
                    name: string
                    location: string | null
                    kiosk_type: 'MONITOR' | 'TABLET' | 'TERMINAL' | null
                    config: Json | null
                    is_active: boolean | null
                    last_ping: string | null
                    created_at: string | null
                }
                Insert: {
                    id?: string
                    name: string
                    location?: string | null
                    kiosk_type?: 'MONITOR' | 'TABLET' | 'TERMINAL' | null
                    config?: Json | null
                    is_active?: boolean | null
                    last_ping?: string | null
                    created_at?: string | null
                }
                Update: {
                    id?: string
                    name?: string
                    location?: string | null
                    kiosk_type?: 'MONITOR' | 'TABLET' | 'TERMINAL' | null
                    config?: Json | null
                    is_active?: boolean | null
                    last_ping?: string | null
                    created_at?: string | null
                }
            }
        };
        Views: {};
    };
    comercial: {
        Tables: {
            templates: { Row: any, Insert: any, Update: any },
            screens: { Row: any, Insert: any, Update: any },
            profiles: { Row: any, Insert: any, Update: any },
            screen_data: { Row: any, Insert: any, Update: any },
            customers: { Row: any, Insert: any, Update: any },
            orders: { Row: any, Insert: any, Update: any }
        };
        Views: {
            detailed_tasks: { Row: any }
        };
    };
    produccion: {
        Tables: {
            work_orders: {
                Row: {
                    id: string
                    order_id: string | null
                    order_number: string
                    status: 'PENDIENTE' | 'CORTE' | 'CONFECCION' | 'TAPICERIA' | 'CONTROL_CALIDAD' | 'LISTO_ENVIO' | 'CANCELADO'
                    priority: number | null
                    assigned_technician_id: string | null
                    start_date: string | null
                    end_date: string | null
                    technical_specs: Json | null
                    quality_check_status: string | null
                    notes: string | null
                    created_at: string | null
                    updated_at: string | null
                }
                Insert: {
                    id?: string
                    order_id?: string | null
                    order_number: string
                    status?: 'PENDIENTE' | 'CORTE' | 'CONFECCION' | 'TAPICERIA' | 'CONTROL_CALIDAD' | 'LISTO_ENVIO' | 'CANCELADO'
                    priority?: number | null
                    assigned_technician_id?: string | null
                    start_date?: string | null
                    end_date?: string | null
                    technical_specs?: Json | null
                    quality_check_status?: string | null
                    notes?: string | null
                    created_at?: string | null
                    updated_at?: string | null
                }
                Update: {
                    id?: string
                    order_id?: string | null
                    order_number?: string
                    status?: 'PENDIENTE' | 'CORTE' | 'CONFECCION' | 'TAPICERIA' | 'CONTROL_CALIDAD' | 'LISTO_ENVIO' | 'CANCELADO'
                    priority?: number | null
                    assigned_technician_id?: string | null
                    start_date?: string | null
                    end_date?: string | null
                    technical_specs?: Json | null
                    quality_check_status?: string | null
                    notes?: string | null
                    created_at?: string | null
                    updated_at?: string | null
                }
            }
            kiosk_screens: {
                Row: {
                    id: string
                    name: string
                    location: string | null
                    kiosk_type: 'MONITOR' | 'TABLET' | 'TERMINAL' | null
                    config: Json | null
                    is_active: boolean | null
                    last_ping: string | null
                    created_at: string | null
                }
                Insert: {
                    id?: string
                    name: string
                    location?: string | null
                    kiosk_type?: 'MONITOR' | 'TABLET' | 'TERMINAL' | null
                    config?: Json | null
                    is_active?: boolean | null
                    last_ping?: string | null
                    created_at?: string | null
                }
                Update: {
                    id?: string
                    name?: string
                    location?: string | null
                    kiosk_type?: 'MONITOR' | 'TABLET' | 'TERMINAL' | null
                    config?: Json | null
                    is_active?: boolean | null
                    last_ping?: string | null
                    created_at?: string | null
                }
            }
            production_activity: {
                Row: {
                    id: string
                    work_order_id: string | null
                    operator_id: string | null
                    previous_status: string | null
                    new_status: string | null
                    notes: string | null
                    created_at: string | null
                }
                Insert: {
                    id?: string
                    work_order_id?: string | null
                    operator_id?: string | null
                    previous_status?: string | null
                    new_status?: string | null
                    notes?: string | null
                    created_at?: string | null
                }
                Update: {
                    id?: string
                    work_order_id?: string | null
                    operator_id?: string | null
                    previous_status?: string | null
                    new_status?: string | null
                    notes?: string | null
                    created_at?: string | null
                }
            }
        };
        Views: {};
    };
    almacen: {
        Tables: {
            inventory: {
                Row: {
                    id: string
                    work_order_id: string | null
                    order_number: string
                    rack: string | null
                    shelf: string | null
                    status: 'EN_ALMACEN' | 'EMBALADO' | 'EN_REPARTO' | 'ENTREGADO' | 'DEVUELTO'
                    packaging_type: string | null
                    weight_kg: number | null
                    dimensions_cm: string | null
                    notes: string | null
                    created_at: string | null
                    updated_at: string | null
                }
                Insert: {
                    id?: string
                    work_order_id?: string | null
                    order_number: string
                    rack?: string | null
                    shelf?: string | null
                    status?: 'EN_ALMACEN' | 'EMBALADO' | 'EN_REPARTO' | 'ENTREGADO' | 'DEVUELTO'
                    packaging_type?: string | null
                    weight_kg?: number | null
                    dimensions_cm?: string | null
                    notes?: string | null
                    created_at?: string | null
                    updated_at?: string | null
                }
                Update: {
                    id?: string
                    work_order_id?: string | null
                    order_number?: string
                    rack?: string | null
                    shelf?: string | null
                    status?: 'EN_ALMACEN' | 'EMBALADO' | 'EN_REPARTO' | 'ENTREGADO' | 'DEVUELTO'
                    packaging_type?: string | null
                    weight_kg?: number | null
                    dimensions_cm?: string | null
                    notes?: string | null
                    created_at?: string | null
                    updated_at?: string | null
                }
            }
            shipments: {
                Row: {
                    id: string
                    tracking_number: string | null
                    carrier_name: string | null
                    shipment_date: string | null
                    estimated_arrival: string | null
                    status: 'PENDIENTE' | 'TRANSITO' | 'ENTREGADO' | 'INCIDENCIA' | null
                    recipient_name: string | null
                    delivery_address: string | null
                    delivery_city: string | null
                    delivery_phone: string | null
                    scanned_packages: number | null
                    packages_count: number | null
                    created_at: string | null
                    updated_at: string | null
                }
                Insert: {
                    id?: string
                    tracking_number?: string | null
                    carrier_name?: string | null
                    shipment_date?: string | null
                    estimated_arrival?: string | null
                    status?: 'PENDIENTE' | 'TRANSITO' | 'ENTREGADO' | 'INCIDENCIA' | null
                    recipient_name?: string | null
                    delivery_address?: string | null
                    delivery_city?: string | null
                    delivery_phone?: string | null
                    scanned_packages?: number | null
                    packages_count?: number | null
                    created_at?: string | null
                    updated_at?: string | null
                }
                Update: {
                    id?: string
                    tracking_number?: string | null
                    carrier_name?: string | null
                    shipment_date?: string | null
                    estimated_arrival?: string | null
                    status?: 'PENDIENTE' | 'TRANSITO' | 'ENTREGADO' | 'INCIDENCIA' | null
                    recipient_name?: string | null
                    delivery_address?: string | null
                    delivery_city?: string | null
                    delivery_phone?: string | null
                    scanned_packages?: number | null
                    packages_count?: number | null
                    created_at?: string | null
                    updated_at?: string | null
                }
            }
            shipment_items: {
                Row: {
                    id: string
                    shipment_id: string | null
                    inventory_id: string | null
                    created_at: string | null
                }
                Insert: {
                    id?: string
                    shipment_id?: string | null
                    inventory_id?: string | null
                    created_at?: string | null
                }
                Update: {
                    id?: string
                    shipment_id?: string | null
                    inventory_id?: string | null
                    created_at?: string | null
                }
            }
        };
        Views: {};
    };
}
