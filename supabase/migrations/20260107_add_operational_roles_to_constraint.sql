-- MIGRATION: 20260107_add_operational_roles_to_constraint.sql
-- Description: Updates profiles_role_check constraint to include all operational roles
-- Note: First checks for any invalid roles before applying constraint

BEGIN;

-- Step 1: Check what roles currently exist in the database
DO $$
DECLARE
  v_roles TEXT;
BEGIN
  SELECT string_agg(DISTINCT role, ', ' ORDER BY role)
  INTO v_roles
  FROM public.profiles
  WHERE role IS NOT NULL;
  
  RAISE NOTICE 'Current roles in database: %', v_roles;
END $$;

-- Step 2: Drop existing constraint
ALTER TABLE public.profiles 
  DROP CONSTRAINT IF EXISTS profiles_role_check;

-- Step 3: Add updated constraint with all roles
-- Including all roles that might exist in the system
ALTER TABLE public.profiles 
  ADD CONSTRAINT profiles_role_check 
  CHECK (role IN (
    'admin', 
    'manager', 
    'responsable', 
    'operario',
    'produccion',
    'envios',
    'almacen',
    'comercial'
  ));

COMMENT ON CONSTRAINT profiles_role_check ON public.profiles IS 
  'Constraint actualizado el 2026-01-07 para incluir roles operacionales: produccion, envios, almacen, comercial';

COMMIT;
