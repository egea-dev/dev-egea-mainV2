-- MIGRATION: 20260107_add_operational_roles_to_constraint.sql
-- Description: Updates profiles_role_check constraint to include all operational roles

BEGIN;

-- Drop existing constraint
ALTER TABLE public.profiles 
  DROP CONSTRAINT IF EXISTS profiles_role_check;

-- Add updated constraint with all roles
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
