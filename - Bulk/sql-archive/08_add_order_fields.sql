-- MIGRACIÓN: Añadir campos faltantes al modal de pedido
-- Ejecutar en PRODUCTIVITY DB (zslcblcetrhbsdirkvza)

-- 1. Añadir columnas faltantes a comercial_orders
ALTER TABLE public.comercial_orders
ADD COLUMN IF NOT EXISTS customer_code TEXT,
ADD COLUMN IF NOT EXISTS customer_company TEXT,
ADD COLUMN IF NOT EXISTS delivery_address TEXT,
ADD COLUMN IF NOT EXISTS delivery_location_url TEXT,
ADD COLUMN IF NOT EXISTS internal_notes TEXT,
ADD COLUMN IF NOT EXISTS qr_generated_at TIMESTAMPTZ;

-- 2. Comentarios para documentación
COMMENT ON COLUMN public.comercial_orders.customer_code IS 'Código de solicitud del interesado';
COMMENT ON COLUMN public.comercial_orders.customer_company IS 'Cliente / Razón social';
COMMENT ON COLUMN public.comercial_orders.delivery_address IS 'Dirección de entrega completa';
COMMENT ON COLUMN public.comercial_orders.delivery_location_url IS 'URL de Google Maps para la ubicación';
COMMENT ON COLUMN public.comercial_orders.internal_notes IS 'Notas internas del equipo';
COMMENT ON COLUMN public.comercial_orders.qr_generated_at IS 'Fecha de generación del código QR';

-- 3. Verificar estructura
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'comercial_orders'
ORDER BY ordinal_position;

-- 4. Actualizar pedidos existentes con valores por defecto
UPDATE public.comercial_orders
SET 
    customer_company = customer_name,
    delivery_address = ''
WHERE customer_company IS NULL;
