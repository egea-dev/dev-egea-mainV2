-- MIGRATION: 20260107_fix_operational_roles_spanish.sql
-- Description: Fixes operational role names from English to Spanish in role_permissions
-- Changes: production -> produccion, shipping -> envios, warehouse -> almacen

BEGIN;

-- Step 1: Update role_permissions table - change English role names to Spanish
UPDATE public.role_permissions 
SET role = 'produccion' 
WHERE role = 'production';

UPDATE public.role_permissions 
SET role = 'envios' 
WHERE role = 'shipping';

UPDATE public.role_permissions 
SET role = 'almacen' 
WHERE role = 'warehouse';

-- Note: 'comercial' is already in Spanish, no change needed

-- Step 2: Update any existing user profiles with English role names
UPDATE public.profiles 
SET role = 'produccion' 
WHERE role = 'production';

UPDATE public.profiles 
SET role = 'envios' 
WHERE role = 'shipping';

UPDATE public.profiles 
SET role = 'almacen' 
WHERE role = 'warehouse';

-- Step 3: Verify the changes
DO $$ 
DECLARE
  v_roles TEXT;
BEGIN
  SELECT string_agg(role, ', ' ORDER BY role)
  INTO v_roles
  FROM (
    SELECT DISTINCT role FROM public.role_permissions 
    UNION 
    SELECT DISTINCT role FROM public.profiles WHERE role IS NOT NULL
  ) AS all_roles;
  
  RAISE NOTICE 'Current roles after migration: %', v_roles;
  RAISE NOTICE 'Migration completed successfully';
END $$;

COMMIT;
