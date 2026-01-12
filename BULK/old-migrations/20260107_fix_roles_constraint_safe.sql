-- ALTERNATIVE MIGRATION: 20260107_fix_roles_constraint_safe.sql
-- Description: Safely updates profiles_role_check by first checking existing roles
-- Use this if the main migration fails

-- Step 1: First, run this query to see what roles exist:
-- SELECT DISTINCT role FROM public.profiles WHERE role IS NOT NULL ORDER BY role;

-- Step 2: Then update the constraint to include ALL those roles
-- For now, we'll include a comprehensive list

BEGIN;

-- Drop the constraint
ALTER TABLE public.profiles 
  DROP CONSTRAINT IF EXISTS profiles_role_check;

-- Don't add the constraint back yet - let's see what roles exist first
-- Run this to check:
DO $$
DECLARE
  v_roles TEXT;
BEGIN
  SELECT string_agg(DISTINCT '''' || role || '''', ', ' ORDER BY role)
  INTO v_roles
  FROM public.profiles
  WHERE role IS NOT NULL;
  
  RAISE NOTICE 'Add these roles to the constraint: %', v_roles;
END $$;

-- After seeing the output, manually add the constraint with all roles
-- Example (uncomment and modify after seeing the roles):
/*
ALTER TABLE public.profiles 
  ADD CONSTRAINT profiles_role_check 
  CHECK (role IN (
    'admin', 
    'almacen',
    'comercial',
    'envios',
    'manager', 
    'operario',
    'produccion',
    'responsable'
    -- Add any other roles you see in the output
  ));
*/

COMMIT;
