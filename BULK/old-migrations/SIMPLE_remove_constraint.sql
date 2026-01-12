-- SIMPLE FIX: Just drop the constraint, nothing else
-- Run this if the diagnostic shows the constraint still exists

BEGIN;

-- Drop the constraint
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

-- Verify it's gone
DO $$ 
DECLARE
  v_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conrelid = 'public.profiles'::regclass 
    AND conname = 'profiles_role_check'
  ) INTO v_exists;
  
  IF v_exists THEN
    RAISE EXCEPTION 'Constraint still exists!';
  ELSE
    RAISE NOTICE 'SUCCESS: Constraint removed successfully';
  END IF;
END $$;

COMMIT;
