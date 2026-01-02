-- supabase/migrations/20250101_comercial_schema.sql
-- Ejecutar en DB PRODUCTIVITY (zslcblcetrhbsdirkvza)

CREATE SCHEMA IF NOT EXISTS comercial;

-- =====================================================================
-- 1. TABLAS DEL ESQUEMA COMERCIAL
-- =====================================================================

-- Clientes
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

-- Pedidos
CREATE TABLE IF NOT EXISTS comercial.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT UNIQUE NOT NULL,
  customer_id UUID REFERENCES comercial.customers(id),
  
  -- Referencia a usuario de DB MAIN (UUID)
  created_by UUID NOT NULL,
  
  admin_code TEXT,
  status TEXT DEFAULT 'PENDIENTE_PAGO' CHECK (status IN (
    'PENDIENTE_PAGO', 'PAGADO', 'EN_PRODUCCION', 
    'LISTO_ENVIO', 'ENVIADO', 'ENTREGADO', 'CANCELADO'
  )),
  
  -- Datos del pedido (denormalizados por seguridad)
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
  
  -- Fechas
  delivery_date DATE,
  production_start_date DATE,
  shipped_date DATE,
  delivered_date DATE,
  
  -- JSONB para flexibilidad (líneas de pedido, documentos)
  lines JSONB DEFAULT '[]'::jsonb,
  documents JSONB DEFAULT '[]'::jsonb,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Actividad de pedidos (Audit log comercial)
CREATE TABLE IF NOT EXISTS comercial.order_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES comercial.orders(id) ON DELETE CASCADE,
  order_number TEXT NOT NULL,
  action TEXT NOT NULL,
  user_id UUID, -- Referencia a DB MAIN
  user_role TEXT,
  status_snapshot TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Configuración de SLA por regiones
CREATE TABLE IF NOT EXISTS comercial.sla_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  region TEXT UNIQUE NOT NULL,
  days INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================================
-- 2. ÍNDICES
-- =====================================================================
CREATE INDEX IF NOT EXISTS idx_orders_customer ON comercial.orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON comercial.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_by ON comercial.orders(created_by);
CREATE INDEX IF NOT EXISTS idx_order_activity_order ON comercial.order_activity(order_id);

-- =====================================================================
-- 3. RLS POLICIES
-- =====================================================================
ALTER TABLE comercial.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE comercial.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE comercial.order_activity ENABLE ROW LEVEL SECURITY;

-- Nota: Como el esquema 'comercial' es nuevo, las políticas deben crearse
DROP POLICY IF EXISTS "authenticated_view_orders" ON comercial.orders;
CREATE POLICY "authenticated_view_orders"
  ON comercial.orders FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "authenticated_manage_orders" ON comercial.orders;
CREATE POLICY "authenticated_manage_orders"
  ON comercial.orders FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_view_customers" ON comercial.customers;
CREATE POLICY "authenticated_view_customers"
  ON comercial.customers FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "authenticated_manage_customers" ON comercial.customers;
CREATE POLICY "authenticated_manage_customers"
  ON comercial.customers FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- =====================================================================
-- 4. PERMISOS DE ESQUEMA Y TABLAS
-- =====================================================================

-- Otorgar uso del esquema
GRANT USAGE ON SCHEMA comercial TO anon, authenticated;

-- Otorgar privilegios sobre tablas existentes
GRANT ALL ON ALL TABLES IN SCHEMA comercial TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA comercial TO anon, authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA comercial TO anon, authenticated;

-- Asegurar que futuras tablas también tengan permisos
ALTER DEFAULT PRIVILEGES IN SCHEMA comercial GRANT ALL ON TABLES TO anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA comercial GRANT ALL ON SEQUENCES TO anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA comercial GRANT ALL ON FUNCTIONS TO anon, authenticated;

-- =====================================================================
-- 5. DATOS INICIALES (SEED)
-- =====================================================================
INSERT INTO comercial.sla_config (region, days) VALUES
  ('Barcelona', 7),
  ('Madrid', 10),
  ('Valencia', 8),
  ('Resto España', 14)
ON CONFLICT (region) DO UPDATE SET days = EXCLUDED.days;
