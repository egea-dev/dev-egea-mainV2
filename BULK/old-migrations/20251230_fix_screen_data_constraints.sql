-- =====================================================================
-- Verificar y corregir constraints de screen_data
-- Ejecutar en DB MAIN (jyaudpctcqcuskzwmism)
-- =====================================================================

BEGIN;

-- 1. Verificar constraint actual de status
DO $$
DECLARE
    constraint_def TEXT;
BEGIN
    SELECT pg_get_constraintdef(oid) INTO constraint_def
    FROM pg_constraint
    WHERE conname = 'screen_data_status_check'
      AND conrelid = 'public.screen_data'::regclass;
    
    RAISE NOTICE 'Constraint actual: %', constraint_def;
END $$;

-- 2. Eliminar constraint antiguo si existe
ALTER TABLE public.screen_data 
DROP CONSTRAINT IF EXISTS screen_data_status_check;

-- 3. Crear nuevo constraint con valores correctos
ALTER TABLE public.screen_data 
ADD CONSTRAINT screen_data_status_check 
CHECK (status IN ('pendiente', 'en progreso', 'completado', 'cancelado', 'acabado'));

-- 4. Verificar constraint de state también
ALTER TABLE public.screen_data 
DROP CONSTRAINT IF EXISTS screen_data_state_check;

ALTER TABLE public.screen_data 
ADD CONSTRAINT screen_data_state_check 
CHECK (state IN ('pendiente', 'urgente', 'en fabricacion', 'a la espera', 'terminado', 'incidente', 'arreglo'));

COMMIT;

-- =====================================================================
-- VERIFICACIÓN
-- =====================================================================
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'public.screen_data'::regclass
  AND contype = 'c'
ORDER BY conname;
