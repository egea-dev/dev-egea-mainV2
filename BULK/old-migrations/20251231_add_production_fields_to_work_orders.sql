-- Migración: Crear tabla produccion_work_orders
-- Base de datos: PRODUCTIVITY DB
-- Fecha: 2025-12-31

-- Limpiar tablas existentes si hay errores previos
DROP TABLE IF EXISTS public.produccion_work_order_lines CASCADE;
DROP TABLE IF EXISTS public.produccion_work_orders CASCADE;

-- Crear tabla de órdenes de trabajo de producción
CREATE TABLE IF NOT EXISTS public.produccion_work_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number VARCHAR(100) UNIQUE NOT NULL,
  customer_name VARCHAR(255),
  status VARCHAR(50) DEFAULT 'PENDIENTE',
  priority INTEGER DEFAULT 0,
  
  -- Producción
  fabric VARCHAR(255),
  color VARCHAR(100),
  quantity_total INTEGER DEFAULT 0,
  packages_count INTEGER,
  scanned_packages INTEGER DEFAULT 0,
  
  -- Envío
  tracking_number VARCHAR(255),
  shipping_date TIMESTAMPTZ,
  needs_shipping_validation BOOLEAN DEFAULT false,
  
  -- Fechas y SLA
  due_date TIMESTAMPTZ,
  process_start_at TIMESTAMPTZ,
  sla_days INTEGER,
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  
  -- Información del cliente
  region VARCHAR(100),
  delivery_address TEXT,
  contact_name VARCHAR(255),
  phone VARCHAR(50),
  google_maps_link TEXT,
  
  -- Notas y metadatos
  notes TEXT,
  notes_internal TEXT,
  admin_code VARCHAR(100),
  qr_payload TEXT,
  
  -- Control de calidad
  quality_check_status VARCHAR(50) DEFAULT 'PENDIENTE',
  assigned_technician_id UUID,
  technical_specs JSONB,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Crear tabla para líneas de desglose
CREATE TABLE IF NOT EXISTS public.produccion_work_order_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id UUID NOT NULL REFERENCES public.produccion_work_orders(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL,
  width NUMERIC(10,2) NOT NULL,
  height NUMERIC(10,2) NOT NULL,
  notes TEXT,
  material VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_produccion_work_orders_status ON public.produccion_work_orders(status);
CREATE INDEX IF NOT EXISTS idx_produccion_work_orders_due_date ON public.produccion_work_orders(due_date);
CREATE INDEX IF NOT EXISTS idx_produccion_work_orders_order_number ON public.produccion_work_orders(order_number);
CREATE INDEX IF NOT EXISTS idx_produccion_work_order_lines_work_order_id ON public.produccion_work_order_lines(work_order_id);

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_produccion_work_orders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_produccion_work_orders_updated_at
  BEFORE UPDATE ON public.produccion_work_orders
  FOR EACH ROW
  EXECUTE FUNCTION update_produccion_work_orders_updated_at();

CREATE TRIGGER trigger_update_produccion_work_order_lines_updated_at
  BEFORE UPDATE ON public.produccion_work_order_lines
  FOR EACH ROW
  EXECUTE FUNCTION update_produccion_work_orders_updated_at();

-- RLS Policies
ALTER TABLE public.produccion_work_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.produccion_work_order_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Work orders are viewable by authenticated users"
  ON public.produccion_work_orders FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Work orders are insertable by authenticated users"
  ON public.produccion_work_orders FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Work orders are updatable by authenticated users"
  ON public.produccion_work_orders FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Work order lines are viewable by authenticated users"
  ON public.produccion_work_order_lines FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Work order lines are insertable by authenticated users"
  ON public.produccion_work_order_lines FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Work order lines are updatable by authenticated users"
  ON public.produccion_work_order_lines FOR UPDATE
  TO authenticated
  USING (true);

-- Comentarios
COMMENT ON TABLE public.produccion_work_orders IS 'Órdenes de trabajo de producción con información completa';
COMMENT ON TABLE public.produccion_work_order_lines IS 'Líneas de desglose de medidas para cada orden de trabajo';

-- Verificación
DO $$
BEGIN
  RAISE NOTICE 'Migración completada exitosamente';
  RAISE NOTICE 'Tabla produccion_work_orders creada';
  RAISE NOTICE 'Tabla produccion_work_order_lines creada';
END $$;

