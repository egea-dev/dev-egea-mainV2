-- ==============================================================================
-- FIX: Renombrar tabla orders a comercial_orders y agregar columnas faltantes
-- ==============================================================================
-- Fecha: 2025-12-30
-- Descripción: Soluciona el error "Could not find the 'region' column of 'comercial_orders'"
-- ==============================================================================

BEGIN;

-- 1. Renombrar la tabla si existe como 'orders'
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'orders'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'comercial_orders'
    ) THEN
        ALTER TABLE public.orders RENAME TO comercial_orders;
        RAISE NOTICE 'Tabla renombrada de orders a comercial_orders';
    END IF;
END $$;

-- 2. Agregar columnas faltantes si no existen
DO $$
BEGIN
    -- Agregar delivery_region si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'comercial_orders' 
        AND column_name = 'delivery_region'
    ) THEN
        ALTER TABLE public.comercial_orders 
        ADD COLUMN delivery_region TEXT CHECK (delivery_region IN ('PENINSULA', 'BALEARES', 'CANARIAS'));
        RAISE NOTICE 'Columna delivery_region agregada';
    END IF;

    -- Asegurar que region existe (debería existir ya)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'comercial_orders' 
        AND column_name = 'region'
    ) THEN
        ALTER TABLE public.comercial_orders 
        ADD COLUMN region TEXT CHECK (region IN ('PENINSULA', 'BALEARES', 'CANARIAS'));
        RAISE NOTICE 'Columna region agregada';
    END IF;

    -- Agregar delivery_date si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'comercial_orders' 
        AND column_name = 'delivery_date'
    ) THEN
        ALTER TABLE public.comercial_orders 
        ADD COLUMN delivery_date DATE;
        RAISE NOTICE 'Columna delivery_date agregada';
    END IF;

    -- Agregar contact_name si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'comercial_orders' 
        AND column_name = 'contact_name'
    ) THEN
        ALTER TABLE public.comercial_orders 
        ADD COLUMN contact_name TEXT;
        RAISE NOTICE 'Columna contact_name agregada';
    END IF;

    -- Agregar phone si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'comercial_orders' 
        AND column_name = 'phone'
    ) THEN
        ALTER TABLE public.comercial_orders 
        ADD COLUMN phone TEXT;
        RAISE NOTICE 'Columna phone agregada';
    END IF;

    -- Agregar email si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'comercial_orders' 
        AND column_name = 'email'
    ) THEN
        ALTER TABLE public.comercial_orders 
        ADD COLUMN email TEXT;
        RAISE NOTICE 'Columna email agregada';
    END IF;

    -- Agregar delivery_address si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'comercial_orders' 
        AND column_name = 'delivery_address'
    ) THEN
        ALTER TABLE public.comercial_orders 
        ADD COLUMN delivery_address TEXT;
        RAISE NOTICE 'Columna delivery_address agregada';
    END IF;

    -- Agregar delivery_location_url si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'comercial_orders' 
        AND column_name = 'delivery_location_url'
    ) THEN
        ALTER TABLE public.comercial_orders 
        ADD COLUMN delivery_location_url TEXT;
        RAISE NOTICE 'Columna delivery_location_url agregada';
    END IF;

    -- Agregar customer_code si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'comercial_orders' 
        AND column_name = 'customer_code'
    ) THEN
        ALTER TABLE public.comercial_orders 
        ADD COLUMN customer_code TEXT;
        RAISE NOTICE 'Columna customer_code agregada';
    END IF;

    -- Agregar customer_company si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'comercial_orders' 
        AND column_name = 'customer_company'
    ) THEN
        ALTER TABLE public.comercial_orders 
        ADD COLUMN customer_company TEXT;
        RAISE NOTICE 'Columna customer_company agregada';
    END IF;

    -- Agregar internal_notes si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'comercial_orders' 
        AND column_name = 'internal_notes'
    ) THEN
        ALTER TABLE public.comercial_orders 
        ADD COLUMN internal_notes TEXT;
        RAISE NOTICE 'Columna internal_notes agregada';
    END IF;

    -- Agregar qr_generated_at si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'comercial_orders' 
        AND column_name = 'qr_generated_at'
    ) THEN
        ALTER TABLE public.comercial_orders 
        ADD COLUMN qr_generated_at TIMESTAMPTZ;
        RAISE NOTICE 'Columna qr_generated_at agregada';
    END IF;
END $$;

-- 3. Migrar datos de region a delivery_region si delivery_region está vacío
UPDATE public.comercial_orders 
SET delivery_region = region 
WHERE delivery_region IS NULL AND region IS NOT NULL;

-- 4. Comentarios en las columnas
COMMENT ON COLUMN public.comercial_orders.region IS 'Región de entrega (LEGACY - usar delivery_region)';
COMMENT ON COLUMN public.comercial_orders.delivery_region IS 'Región de entrega (PENINSULA, BALEARES, CANARIAS)';
COMMENT ON COLUMN public.comercial_orders.delivery_date IS 'Fecha de entrega programada';
COMMENT ON COLUMN public.comercial_orders.contact_name IS 'Nombre de la persona de contacto';
COMMENT ON COLUMN public.comercial_orders.phone IS 'Teléfono de contacto';
COMMENT ON COLUMN public.comercial_orders.email IS 'Email de contacto';
COMMENT ON COLUMN public.comercial_orders.delivery_address IS 'Dirección de entrega completa';
COMMENT ON COLUMN public.comercial_orders.delivery_location_url IS 'URL de Google Maps para la ubicación';
COMMENT ON COLUMN public.comercial_orders.customer_code IS 'Código de solicitud del interesado';
COMMENT ON COLUMN public.comercial_orders.customer_company IS 'Cliente / Razón social';
COMMENT ON COLUMN public.comercial_orders.internal_notes IS 'Notas internas del equipo';
COMMENT ON COLUMN public.comercial_orders.qr_generated_at IS 'Fecha de generación del código QR';

-- 5. Verificar que la tabla existe
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'comercial_orders'
    ) THEN
        RAISE NOTICE '✅ Tabla public.comercial_orders existe y está lista';
    ELSE
        RAISE EXCEPTION '❌ ERROR: La tabla public.comercial_orders no existe';
    END IF;
END $$;

COMMIT;

-- ==============================================================================
-- VERIFICACIÓN FINAL
-- ==============================================================================
SELECT 
    'Columnas de comercial_orders:' as info,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'comercial_orders'
ORDER BY ordinal_position;
