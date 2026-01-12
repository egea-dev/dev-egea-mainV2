-- ============================================================================
-- SCRIPT SQL PARA SUPABASE PRODUCTIVITY - VERSIÓN SIMPLIFICADA
-- ============================================================================
-- Propósito: Añadir Primary Key a la tabla comercial_orders
-- Fecha: 9 de enero de 2026
-- Problema: Error "No suitable key or wrong key type" al crear pedidos
-- ============================================================================

-- OPCIÓN 1: Script completo con verificaciones
-- ============================================================================

DO $$
BEGIN
    -- Verificar que la tabla existe
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'comercial_orders'
    ) THEN
        RAISE EXCEPTION 'ERROR: La tabla comercial_orders no existe';
    END IF;
    
    RAISE NOTICE 'Tabla comercial_orders encontrada';

    -- Verificar que la columna 'id' existe
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'comercial_orders'
        AND column_name = 'id'
    ) THEN
        RAISE EXCEPTION 'ERROR: La columna id no existe';
    END IF;
    
    RAISE NOTICE 'Columna id encontrada';

    -- Eliminar constraint de PK si ya existe
    IF EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE table_schema = 'public' 
        AND table_name = 'comercial_orders'
        AND constraint_type = 'PRIMARY KEY'
    ) THEN
        EXECUTE 'ALTER TABLE public.comercial_orders DROP CONSTRAINT comercial_orders_pkey';
        RAISE NOTICE 'Primary Key existente eliminada';
    END IF;

    -- Añadir Primary Key
    EXECUTE 'ALTER TABLE public.comercial_orders ADD CONSTRAINT comercial_orders_pkey PRIMARY KEY (id)';
    
    RAISE NOTICE 'Primary Key añadida exitosamente';

    -- Verificar que la PK se añadió correctamente
    IF EXISTS (
        SELECT 1
        FROM information_schema.table_constraints 
        WHERE table_schema = 'public' 
        AND table_name = 'comercial_orders'
        AND constraint_type = 'PRIMARY KEY'
    ) THEN
        RAISE NOTICE 'Verificación exitosa: Primary Key configurada correctamente';
    ELSE
        RAISE EXCEPTION 'ERROR: Primary Key no se configuró correctamente';
    END IF;
END $$;

-- Mostrar información de la Primary Key
SELECT 
    tc.table_name AS tabla, 
    kcu.column_name AS columna_pk,
    tc.constraint_name AS nombre_constraint,
    tc.constraint_type AS tipo
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_schema = 'public'
    AND tc.table_name = 'comercial_orders' 
    AND tc.constraint_type = 'PRIMARY KEY';

-- ============================================================================
-- FIN DEL SCRIPT
-- ============================================================================


-- ============================================================================
-- OPCIÓN 2: Si la opción 1 falla, ejecuta SOLO estas 2 líneas:
-- ============================================================================

-- ALTER TABLE public.comercial_orders 
-- ADD CONSTRAINT comercial_orders_pkey PRIMARY KEY (id);

-- ============================================================================
-- Resultado esperado:
-- - Primary Key añadida a la columna 'id'
-- - Error "No suitable key or wrong key type" resuelto
-- - Creación de pedidos funcionando correctamente
-- ============================================================================
