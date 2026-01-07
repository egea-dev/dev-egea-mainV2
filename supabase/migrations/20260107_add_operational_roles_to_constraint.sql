-- MIGRATION: 20260107_add_operational_roles_to_constraint.sql
-- Description: Removes the profiles_role_check constraint temporarily
-- We'll add it back manually after verifying what roles exist

BEGIN;

-- Simply drop the constraint to allow any role
ALTER TABLE public.profiles 
  DROP CONSTRAINT IF EXISTS profiles_role_check;

-- Show what roles currently exist
DO $$
DECLARE
  v_roles TEXT;
BEGIN
  SELECT string_agg(DISTINCT role, ', ' ORDER BY role)
  INTO v_roles
  FROM public.profiles
  WHERE role IS NOT NULL;
  
  RAISE NOTICE 'Current roles in database: %', v_roles;
  RAISE NOTICE 'Constraint removed. You can now create/edit users with any role.';
END $$;

COMMIT;
