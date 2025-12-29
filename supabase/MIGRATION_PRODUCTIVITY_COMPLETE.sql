-- MIGRATION_PRODUCTIVITY_COMPLETE.sql
-- Ejecutar este script ÍNTEGRO en el SQL Editor de la DB PRODUCTIVITY (zslcblcetrhbsdirkvza)
-- Este archivo consolida los esquemas Comercial, Producción y Almacén en el orden correcto de dependencias.

-- ==========================================
-- 1. ESQUEMA COMERCIAL (Fase 1 & 2)
-- ==========================================
CREATE SCHEMA IF NOT EXISTS comercial;
GRANT USAGE ON SCHEMA comercial TO anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA comercial GRANT ALL ON TABLES TO anon, authenticated;

CREATE TABLE IF NOT EXISTS comercial.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  contact_name TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  city TEXT,
  postal_code TEXT,
  region TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS comercial.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT UNIQUE NOT NULL,
  customer_id UUID REFERENCES comercial.customers(id),
  created_by UUID NOT NULL,
  admin_code TEXT,
  status TEXT DEFAULT 'PENDIENTE_PAGO' CHECK (status IN (
    'PENDIENTE_PAGO', 'PAGADO', 'EN_PRODUCCION', 
    'LISTO_ENVIO', 'ENVIADO', 'ENTREGADO', 'CANCELADO'
  )),
  customer_name TEXT,
  contact_name TEXT,
  email TEXT,
  phone TEXT,
  delivery_address TEXT,
  delivery_city TEXT,
  delivery_region TEXT,
  fabric TEXT,
  quantity_total INTEGER DEFAULT 0,
  notes TEXT,
  delivery_date DATE,
  production_start_date DATE,
  shipped_date DATE,
  delivered_date DATE,
  lines JSONB DEFAULT '[]'::jsonb,
  documents JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS comercial.sla_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  region TEXT UNIQUE NOT NULL,
  days INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- 2. ESQUEMA PRODUCCIÓN (Fase 3)
-- ==========================================
CREATE SCHEMA IF NOT EXISTS produccion;
GRANT USAGE ON SCHEMA produccion TO anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA produccion GRANT ALL ON TABLES TO anon, authenticated;

CREATE TABLE IF NOT EXISTS produccion.work_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES comercial.orders(id) ON DELETE CASCADE,
    order_number TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDIENTE' CHECK (status IN ('PENDIENTE', 'CORTE', 'CONFECCION', 'TAPICERIA', 'CONTROL_CALIDAD', 'LISTO_ENVIO', 'CANCELADO')),
    priority INTEGER DEFAULT 0,
    assigned_technician_id UUID,
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ,
    technical_specs JSONB DEFAULT '{}'::jsonb,
    quality_check_status TEXT DEFAULT 'PENDIENTE',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS produccion.production_activity (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    work_order_id UUID REFERENCES produccion.work_orders(id) ON DELETE CASCADE,
    operator_id UUID,
    previous_status TEXT,
    new_status TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ==========================================
-- 3. ESQUEMA ALMACÉN (Fase 4)
-- ==========================================
CREATE SCHEMA IF NOT EXISTS almacen;
GRANT USAGE ON SCHEMA almacen TO anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA almacen GRANT ALL ON TABLES TO anon, authenticated;

-- Tabla de Inventario (Bultos)
CREATE TABLE IF NOT EXISTS almacen.inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    work_order_id UUID REFERENCES produccion.work_orders(id) ON DELETE SET NULL, 
    order_number TEXT NOT NULL,
    rack TEXT,
    shelf TEXT,
    status TEXT NOT NULL CHECK (status IN ('EN_ALMACEN', 'EMBALADO', 'EN_REPARTO', 'ENTREGADO', 'DEVUELTO')) DEFAULT 'EN_ALMACEN',
    packaging_type TEXT, -- Caja, Rollo, Palet
    weight_kg DECIMAL(10,2),
    dimensions_cm TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabla de Envíos / Expediciones
CREATE TABLE IF NOT EXISTS almacen.shipments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tracking_number TEXT,
    carrier_name TEXT,
    shipment_date TIMESTAMP WITH TIME ZONE,
    estimated_arrival TIMESTAMP WITH TIME ZONE,
    status TEXT CHECK (status IN ('PENDIENTE', 'TRANSITO', 'ENTREGADO', 'INCIDENCIA')) DEFAULT 'PENDIENTE',
    recipient_name TEXT,
    delivery_address TEXT,
    delivery_city TEXT,
    delivery_phone TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabla Relacional Envío <-> Inventario
CREATE TABLE IF NOT EXISTS almacen.shipment_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shipment_id UUID REFERENCES almacen.shipments(id) ON DELETE CASCADE,
    inventory_id UUID REFERENCES almacen.inventory(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ==========================================
-- 4. ÍNDICES Y SEGURIDAD (RLS)
-- ==========================================
ALTER TABLE comercial.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE produccion.work_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE almacen.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE almacen.shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE almacen.shipment_items ENABLE ROW LEVEL SECURITY;

-- Políticas simplificadas (Permitir todo a autenticados para desarrollo)
DO $$ 
BEGIN
    EXECUTE 'CREATE POLICY "all_access" ON comercial.orders FOR ALL TO authenticated USING (true) WITH CHECK (true)';
EXCEPTION WHEN others THEN NULL; END $$;

DO $$ 
BEGIN
    EXECUTE 'CREATE POLICY "all_access" ON produccion.work_orders FOR ALL TO authenticated USING (true) WITH CHECK (true)';
EXCEPTION WHEN others THEN NULL; END $$;

DO $$ 
BEGIN
    EXECUTE 'CREATE POLICY "all_access" ON almacen.inventory FOR ALL TO authenticated USING (true) WITH CHECK (true)';
EXCEPTION WHEN others THEN NULL; END $$;

DO $$ 
BEGIN
    EXECUTE 'CREATE POLICY "all_access" ON almacen.shipments FOR ALL TO authenticated USING (true) WITH CHECK (true)';
EXCEPTION WHEN others THEN NULL; END $$;

DO $$ 
BEGIN
    EXECUTE 'CREATE POLICY "all_access" ON almacen.shipment_items FOR ALL TO authenticated USING (true) WITH CHECK (true)';
EXCEPTION WHEN others THEN NULL; END $$;

-- GRANTS FINALES
GRANT ALL ON ALL TABLES IN SCHEMA comercial TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA produccion TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA almacen TO anon, authenticated;

-- ==========================================
-- 5. AUTOMATIZACIÓN (Bridge Producción -> Almacén)
-- ==========================================

-- Función para mover orden terminada a inventario
CREATE OR REPLACE FUNCTION produccion.handle_finished_work_order()
RETURNS TRIGGER AS $$
BEGIN
    -- Si el estado cambia a LISTO_ENVIO y antes no lo era
    IF (NEW.status = 'LISTO_ENVIO' AND OLD.status <> 'LISTO_ENVIO') THEN
        INSERT INTO almacen.inventory (work_order_id, order_number, status, notes)
        VALUES (NEW.id, NEW.order_number, 'EN_ALMACEN', 'Entrada automática desde Producción');
        
        -- Opcional: Actualizar el estado del pedido comercial original
        UPDATE comercial.orders 
        SET status = 'LISTO_ENVIO' 
        WHERE id = NEW.order_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger
DROP TRIGGER IF EXISTS tr_on_work_order_finished ON produccion.work_orders;
CREATE TRIGGER tr_on_work_order_finished
AFTER UPDATE ON produccion.work_orders
FOR EACH ROW
EXECUTE FUNCTION produccion.handle_finished_work_order();
