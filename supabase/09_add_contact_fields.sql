-- MIGRACIÓN: Añadir campos phone, email, contact_name
-- Ejecutar en PRODUCTIVITY DB

-- Añadir columnas faltantes
ALTER TABLE public.comercial_orders
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS contact_name TEXT;

-- Comentarios
COMMENT ON COLUMN public.comercial_orders.phone IS 'Teléfono de contacto';
COMMENT ON COLUMN public.comercial_orders.email IS 'Email de contacto';
COMMENT ON COLUMN public.comercial_orders.contact_name IS 'Nombre de la persona de contacto';

-- Verificar
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'comercial_orders'
  AND column_name IN ('phone', 'email', 'contact_name');
