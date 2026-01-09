-- ============================================================================
-- SCRIPT DE DIAGNÓSTICO PARA SUPABASE PRODUCTIVITY
-- ============================================================================
-- Propósito: Verificar el estado de la tabla comercial_orders
-- ============================================================================

-- 1. Verificar Primary Key existente
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

-- 2. Verificar todas las columnas de la tabla
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
    AND table_name = 'comercial_orders'
ORDER BY ordinal_position;

-- 3. Verificar constraints NOT NULL
SELECT 
    column_name,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
    AND table_name = 'comercial_orders'
    AND is_nullable = 'NO'
ORDER BY column_name;

-- 4. Intentar insertar un registro de prueba (esto fallará pero mostrará el error real)
-- DESCOMENTA ESTAS LÍNEAS PARA PROBAR:
-- INSERT INTO public.comercial_orders (order_number, customer_name, status)
-- VALUES ('TEST-001', 'Cliente Prueba', 'PENDIENTE_PAGO')
-- RETURNING id, order_number, customer_name;

-- ============================================================================
-- RESULTADO ESPERADO:
-- - Deberías ver que la PK ya existe en la columna 'id'
-- - Deberías ver todas las columnas y sus tipos
-- - Deberías ver qué columnas son NOT NULL
-- ============================================================================
