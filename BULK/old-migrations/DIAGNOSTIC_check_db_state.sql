-- DIAGNOSTIC SCRIPT: Check current database state
-- Run this FIRST to see what's happening

-- 1. Check if constraint exists
SELECT 
  conname AS constraint_name,
  pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'public.profiles'::regclass
  AND conname = 'profiles_role_check';

-- 2. Check what roles currently exist
SELECT DISTINCT role, COUNT(*) as count
FROM public.profiles
WHERE role IS NOT NULL
GROUP BY role
ORDER BY role;

-- 3. Check if admin_upsert_profile function exists
SELECT 
  proname AS function_name,
  pg_get_function_arguments(oid) AS arguments
FROM pg_proc
WHERE proname = 'admin_upsert_profile'
  AND pronamespace = 'public'::regnamespace;

-- 4. Check if invite_user_by_email function exists
SELECT 
  proname AS function_name,
  pg_get_function_arguments(oid) AS arguments
FROM pg_proc
WHERE proname = 'invite_user_by_email'
  AND pronamespace = 'public'::regnamespace;
