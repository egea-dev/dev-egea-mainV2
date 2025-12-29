-- =====================================================================
-- FIX COMPLETO: Instalaciones Screen Error
-- Ejecutar en DB MAIN (jyaudpctcqcuskzwmism)
-- =====================================================================

BEGIN;

-- 1. Verificar y crear pantalla de Instalaciones si no existe
DO $$
BEGIN
    -- Insertar pantalla de Instalaciones si no existe
    IF NOT EXISTS (
        SELECT 1 FROM public.screens 
        WHERE screen_group ILIKE '%instalacion%' 
        OR name ILIKE '%instalacion%'
    ) THEN
        INSERT INTO public.screens (
            name, 
            screen_group, 
            screen_type, 
            is_active,
            dashboard_section,
            dashboard_order,
            header_color,
            refresh_interval_sec
        )
        VALUES (
            'Instalaciones',
            'Instalaciones',
            'data',
            true,
            'main',
            1,
            '#10b981',
            30
        );
        
        RAISE NOTICE 'Pantalla de Instalaciones creada correctamente';
    ELSE
        RAISE NOTICE 'Pantalla de Instalaciones ya existe';
    END IF;
END $$;

-- 2. Asegurar que la pantalla está activa
UPDATE public.screens 
SET is_active = true 
WHERE screen_group ILIKE '%instalacion%' 
   OR name ILIKE '%instalacion%';

-- 3. Verificar estructura de la tabla screens
DO $$
BEGIN
    -- Añadir columnas si no existen
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'screens' 
        AND column_name = 'dashboard_section'
    ) THEN
        ALTER TABLE public.screens ADD COLUMN dashboard_section TEXT;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'screens' 
        AND column_name = 'dashboard_order'
    ) THEN
        ALTER TABLE public.screens ADD COLUMN dashboard_order INTEGER;
    END IF;
END $$;

-- 4. Mostrar pantallas disponibles para verificación
DO $$
DECLARE
    screen_record RECORD;
BEGIN
    RAISE NOTICE '=== PANTALLAS DISPONIBLES ===';
    FOR screen_record IN 
        SELECT id, name, screen_group, screen_type, is_active 
        FROM public.screens 
        ORDER BY screen_group, name
    LOOP
        RAISE NOTICE 'ID: %, Nombre: %, Grupo: %, Tipo: %, Activa: %', 
            screen_record.id, 
            screen_record.name, 
            screen_record.screen_group, 
            screen_record.screen_type, 
            screen_record.is_active;
    END LOOP;
END $$;

COMMIT;

-- =====================================================================
-- VERIFICACIÓN FINAL
-- =====================================================================
SELECT 
    'Verificación completada' as status,
    COUNT(*) as total_screens,
    COUNT(*) FILTER (WHERE is_active = true) as active_screens,
    COUNT(*) FILTER (WHERE screen_group ILIKE '%instalacion%') as instalaciones_screens
FROM public.screens;
