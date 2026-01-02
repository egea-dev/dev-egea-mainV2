-- 02_produccion_schema.sql
-- Destino: DB PRODUCTIVITY (zslcblcetrhbsdirkvza)
-- Propósito: Esquema para el control de producción industrial y kioscos.

-- CREACIÓN DEL ESQUEMA
CREATE SCHEMA IF NOT EXISTS produccion;

-- GRANT PERMISSIONS
GRANT USAGE ON SCHEMA produccion TO anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA produccion GRANT ALL ON TABLES TO anon, authenticated;

-- TABLA DE ÓRDENES DE TRABAJO (Conexión entre Comercial e Industrial)
CREATE TABLE IF NOT EXISTS produccion.work_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES comercial.orders(id) ON DELETE CASCADE,
    order_number TEXT NOT NULL, -- Desnormalizado para búsquedas rápidas en kiosco
    
    -- Estado de producción
    status TEXT NOT NULL DEFAULT 'PENDIENTE' CHECK (status IN ('PENDIENTE', 'CORTE', 'CONFECCION', 'TAPICERIA', 'CONTROL_CALIDAD', 'LISTO_ENVIO', 'CANCELADO')),
    priority INTEGER DEFAULT 0, -- 0 normal, 1 alta, 2 urgente
    
    -- Seguimiento
    assigned_technician_id UUID, -- Referencia a MAIN.profiles.id (UUID virtual)
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ,
    
    -- Datos técnicos
    technical_specs JSONB DEFAULT '{}'::jsonb, -- Medidas refinadas, tipos de riel, etc.
    quality_check_status TEXT DEFAULT 'PENDIENTE',
    
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- TABLA DE CONFIGURACIÓN DE KIOSCOS (Pantallas industriales)
CREATE TABLE IF NOT EXISTS produccion.kiosk_screens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE, -- Ej: 'CORTE-01', 'TAP-A'
    location TEXT,
    kiosk_type TEXT CHECK (kiosk_type IN ('MONITOR', 'TABLET', 'TERMINAL')),
    
    -- Configuración visual
    config JSONB DEFAULT '{
        "refresh_interval": 30,
        "show_metrics": true,
        "allowed_statuses": ["PENDIENTE", "CORTE"]
    }'::jsonb,
    
    is_active BOOLEAN DEFAULT true,
    last_ping TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- REGISTRO DE ACTIVIDAD DE PRODUCCIÓN (Trazabilidad micro)
CREATE TABLE IF NOT EXISTS produccion.production_activity (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    work_order_id UUID REFERENCES produccion.work_orders(id) ON DELETE CASCADE,
    operator_id UUID, -- Referencia virtual a MAIN.profiles
    previous_status TEXT,
    new_status TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- INDEXACIÓN PARA RENDIMIENTO
CREATE INDEX IF NOT EXISTS idx_work_orders_status ON produccion.work_orders(status);
CREATE INDEX IF NOT EXISTS idx_work_orders_order_number ON produccion.work_orders(order_number);
CREATE INDEX IF NOT EXISTS idx_production_activity_work_order ON produccion.production_activity(work_order_id);

-- RLS POLICIES (Simples para fase inicial)
ALTER TABLE produccion.work_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE produccion.kiosk_screens ENABLE ROW LEVEL SECURITY;
ALTER TABLE produccion.production_activity ENABLE ROW LEVEL SECURITY;

-- Política de lectura universal para autenticados (Admin/Operario)
CREATE POLICY "Allow all authenticated read on work_orders" ON produccion.work_orders FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow all authenticated write on work_orders" ON produccion.work_orders FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow all authenticated read on kiosk_screens" ON produccion.kiosk_screens FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow all authenticated read on production_activity" ON produccion.production_activity FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow all authenticated insert on production_activity" ON produccion.production_activity FOR INSERT TO authenticated WITH CHECK (true);

-- GRANTS FINALES
GRANT ALL ON ALL TABLES IN SCHEMA produccion TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA produccion TO anon, authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA produccion TO anon, authenticated;
