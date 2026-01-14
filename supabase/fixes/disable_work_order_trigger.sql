-- =====================================================================
-- SOLUCIÓN TEMPORAL: Deshabilitar trigger de work orders
-- =====================================================================
-- Ejecutar en SQL Editor de PRODUCTIVITY DB (zslcblcetrhbsdirkvza)
-- Fecha: 14 de enero de 2026
-- =====================================================================

-- Deshabilitar trigger temporalmente
DROP TRIGGER IF EXISTS tr_create_work_order ON public.comercial_orders;
DROP FUNCTION IF EXISTS public.create_work_order_from_order();

-- =====================================================================
-- VERIFICACIÓN
-- =====================================================================

-- Verificar que el trigger fue eliminado
SELECT 
    tgname as trigger_name,
    tgrelid::regclass as table_name
FROM pg_trigger
WHERE tgname = 'tr_create_work_order';

-- Debería devolver 0 filas (trigger eliminado)

-- =====================================================================
-- NOTAS
-- =====================================================================
-- Este script DESHABILITA el trigger que crea work orders automáticamente
-- Ahora podrás validar pedidos sin que intente crear work orders
-- Las work orders se crearán manualmente desde el módulo de Producción
