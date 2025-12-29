-- 03_almacen_schema.sql
-- Destino: DB PRODUCTIVITY (zslcblcetrhbsdirkvza)
-- Propósito: Gestión de almacén de producto terminado, embalaje y expediciones.

-- CREACIÓN DEL ESQUEMA
CREATE SCHEMA IF NOT EXISTS almacen;

-- GRANT PERMISSIONS
GRANT USAGE ON SCHEMA almacen TO anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA almacen GRANT ALL ON TABLES TO anon, authenticated;

-- TABLA DE STOCK DE PRODUCTO TERMINADO
CREATE TABLE IF NOT EXISTS almacen.inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    work_order_id UUID REFERENCES produccion.work_orders(id) ON DELETE SET NULL,
    order_number TEXT NOT NULL,
    
    -- Ubicación en almacén
    rack TEXT, -- Estantería
    shelf TEXT, -- Balda
    
    -- Estado del bulto
    status TEXT NOT NULL DEFAULT 'EN_ALMACEN' CHECK (status IN ('EN_ALMACEN', 'EMBALADO', 'EN_REPARTO', 'ENTREGADO', 'DEVUELTO')),
    packaging_type TEXT, -- Caja, Palet, etc.
    
    -- Pesos y dimensiones (para logística)
    weight_kg DECIMAL(10,2),
    dimensions_cm TEXT, -- "LxAnxAl"
    
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- TABLA DE EXPEDICIONES (Envíos)
CREATE TABLE IF NOT EXISTS almacen.shipments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tracking_number TEXT UNIQUE,
    carrier_name TEXT, -- Transportista (Seur, DHL, Propio, etc.)
    shipment_date TIMESTAMPTZ,
    estimated_arrival TIMESTAMPTZ,
    
    status TEXT DEFAULT 'PENDIENTE' CHECK (status IN ('PENDIENTE', 'TRANSITO', 'ENTREGADO', 'INCIDENCIA')),
    
    -- Referencia a la dirección de entrega (Desnormalizada desde pedidos para integridad histórica)
    recipient_name TEXT,
    delivery_address TEXT,
    delivery_city TEXT,
    delivery_phone TEXT,
    
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- RELACIÓN MUCHOS A MUCHOS: ENVÍOS Y BULTOS
CREATE TABLE IF NOT EXISTS almacen.shipment_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shipment_id UUID REFERENCES almacen.shipments(id) ON DELETE CASCADE,
    inventory_id UUID REFERENCES almacen.inventory(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- INDEXACIÓN
CREATE INDEX IF NOT EXISTS idx_inventory_status ON almacen.inventory(status);
CREATE INDEX IF NOT EXISTS idx_shipments_tracking ON almacen.shipments(tracking_number);
CREATE INDEX IF NOT EXISTS idx_inventory_order_number ON almacen.inventory(order_number);

-- RLS POLICIES
ALTER TABLE almacen.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE almacen.shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE almacen.shipment_items ENABLE ROW LEVEL SECURITY;

-- Políticas universales para autenticados
CREATE POLICY "Allow authenticated full access on inventory" ON almacen.inventory FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated full access on shipments" ON almacen.shipments FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated full access on shipment_items" ON almacen.shipment_items FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- GRANTS FINALES
GRANT ALL ON ALL TABLES IN SCHEMA almacen TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA almacen TO anon, authenticated;
