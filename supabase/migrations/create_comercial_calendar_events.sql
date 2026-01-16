-- ⚠️ IMPORTANTE: Este script debe ejecutarse en la base de datos PRODUCTIVITY
-- La tabla comercial_calendar_events se usa desde supabaseProductivity en use-orders.ts
--
-- Tabla para eventos de calendario comercial
-- Almacena eventos de entrega basados en delivery_date de pedidos

CREATE TABLE IF NOT EXISTS comercial_calendar_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Información del evento
    title TEXT NOT NULL,
    event_date DATE NOT NULL,
    
    -- Relación con pedido (Añadido UNIQUE para permitir UPSERT)
    order_id UUID UNIQUE REFERENCES comercial_orders(id) ON DELETE CASCADE,
    
    -- Información adicional
    customer_name TEXT,
    region TEXT,
    
    -- Metadatos
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_calendar_events_date ON comercial_calendar_events(event_date);
CREATE INDEX IF NOT EXISTS idx_calendar_events_order ON comercial_calendar_events(order_id);

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_comercial_calendar_events_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Borrar el trigger si ya existe para evitar errores al re-ejecutar el script
DROP TRIGGER IF EXISTS trigger_update_comercial_calendar_events_updated_at ON comercial_calendar_events;

CREATE TRIGGER trigger_update_comercial_calendar_events_updated_at
    BEFORE UPDATE ON comercial_calendar_events
    FOR EACH ROW
    EXECUTE FUNCTION update_comercial_calendar_events_updated_at();

-- Comentarios
COMMENT ON TABLE comercial_calendar_events IS 'Eventos de calendario para entregas de pedidos comerciales';
COMMENT ON COLUMN comercial_calendar_events.event_date IS 'Fecha de entrega del pedido (delivery_date)';
COMMENT ON COLUMN comercial_calendar_events.order_id IS 'Referencia al pedido comercial';
