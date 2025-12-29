-- =====================================================================
-- MIGRACIÓN DE REPARACIÓN Y ACTUALIZACIÓN: ALMACEN + SHIPPING PERSISTENCE
-- =====================================================================
-- Fecha: 2025-12-24
-- Propósito: 
-- 1. Asegurar que el esquema 'almacen' existe.
-- 2. Asegurar que las tablas de logística existen.
-- 3. Añadir columnas de persistencia 'scanned_packages' y 'packages_count'.
-- =====================================================================

BEGIN;

-- 1. CREACIÓN DEL ESQUEMA
CREATE SCHEMA IF NOT EXISTS almacen;

-- GRANT PERMISSIONS
GRANT USAGE ON SCHEMA almacen TO anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA almacen GRANT ALL ON TABLES TO anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA almacen GRANT ALL ON SEQUENCES TO anon, authenticated;

-- 2. VERIFICACIÓN Y CREACIÓN DE TABLAS

-- TABLA STOCK
CREATE TABLE IF NOT EXISTS almacen.inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    -- work_order_id UUID REFERENCES produccion.work_orders(id) ON DELETE SET NULL, -- Comentado para evitar dependencia si produccion no existe
    work_order_id UUID,
    order_number TEXT NOT NULL,
    rack TEXT,
    shelf TEXT,
    status TEXT NOT NULL DEFAULT 'EN_ALMACEN' CHECK (status IN ('EN_ALMACEN', 'EMBALADO', 'EN_REPARTO', 'ENTREGADO', 'DEVUELTO')),
    packaging_type TEXT,
    weight_kg DECIMAL(10,2),
    dimensions_cm TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- TABLA EXPEDICIONES (SHIPMENTS)
CREATE TABLE IF NOT EXISTS almacen.shipments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tracking_number TEXT, -- Quitamos UNIQUE estricto por ahora para flexibilidad
    carrier_name TEXT,
    shipment_date TIMESTAMPTZ,
    estimated_arrival TIMESTAMPTZ,
    status TEXT DEFAULT 'PENDIENTE' CHECK (status IN ('PENDIENTE', 'TRANSITO', 'BULTOS_PENDIENTES', 'ENTREGADO', 'INCIDENCIA')),
    recipient_name TEXT,
    delivery_address TEXT,
    delivery_city TEXT,
    delivery_phone TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- RELACIÓN ITEMS
CREATE TABLE IF NOT EXISTS almacen.shipment_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shipment_id UUID REFERENCES almacen.shipments(id) ON DELETE CASCADE,
    inventory_id UUID REFERENCES almacen.inventory(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. AÑADIR COLUMNAS DE PERSISTENCIA (UPDATE 2025-12-24)
ALTER TABLE almacen.shipments
ADD COLUMN IF NOT EXISTS scanned_packages INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS packages_count INTEGER DEFAULT 0;

-- 4. ACTUALIZAR packages_count BASADO EN ITEMS EXISTENTES
UPDATE almacen.shipments s
SET packages_count = (
    SELECT count(*) 
    FROM almacen.shipment_items si 
    WHERE si.shipment_id = s.id
);

-- 5. TRIGGER PARA packages_count AUTOMÁTICO
CREATE OR REPLACE FUNCTION almacen.update_shipment_packages_count()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        UPDATE almacen.shipments
        SET packages_count = packages_count + 1
        WHERE id = NEW.shipment_id;
    ELSIF (TG_OP = 'DELETE') THEN
        UPDATE almacen.shipments
        SET packages_count = packages_count - 1
        WHERE id = OLD.shipment_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_update_shipment_packages_count ON almacen.shipment_items;

CREATE TRIGGER tr_update_shipment_packages_count
AFTER INSERT OR DELETE ON almacen.shipment_items
FOR EACH ROW EXECUTE FUNCTION almacen.update_shipment_packages_count();

-- 6. POLÍTICAS RLS Y GRANTS
ALTER TABLE almacen.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE almacen.shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE almacen.shipment_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow full access inventory" ON almacen.inventory;
CREATE POLICY "Allow full access inventory" ON almacen.inventory FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow full access shipments" ON almacen.shipments;
CREATE POLICY "Allow full access shipments" ON almacen.shipments FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow full access shipment_items" ON almacen.shipment_items;
CREATE POLICY "Allow full access shipment_items" ON almacen.shipment_items FOR ALL TO authenticated USING (true) WITH CHECK (true);

GRANT ALL ON ALL TABLES IN SCHEMA almacen TO anon, authenticated;

COMMIT;
