-- =====================================================================
-- SOLUCIÓN RÁPIDA: DESHABILITAR RLS TEMPORALMENTE EN TODAS LAS TABLAS
-- =====================================================================
-- EJECUTAR EN SQL EDITOR DE SUPABASE
-- ADVERTENCIA: Esto deshabilitará la seguridad en TODAS las tablas
-- Solo para desarrollo/testing. NO usar en producción.
-- =====================================================================

-- Eliminar la función is_admin que causa recursión
DROP FUNCTION IF EXISTS public.is_admin() CASCADE;
DROP FUNCTION IF EXISTS public.current_user_is_admin() CASCADE;

-- Deshabilitar RLS en todas las tablas principales
ALTER TABLE IF EXISTS public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.vehicles DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.templates DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.screens DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.screen_data DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.task_profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.task_vehicles DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.archived_tasks DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.user_availability DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.shared_plans DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.system_config DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.groups DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.profile_groups DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.task_notifications DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.user_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.role_permissions DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.communication_logs DISABLE ROW LEVEL SECURITY;

-- Verificar que RLS esté deshabilitado
SELECT
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'profiles', 'vehicles', 'templates', 'screens', 'screen_data',
    'task_profiles', 'task_vehicles', 'archived_tasks', 'user_availability',
    'shared_plans', 'system_config', 'groups', 'profile_groups',
    'task_notifications', 'user_sessions', 'role_permissions', 'communication_logs'
  )
ORDER BY tablename;

-- =====================================================================
-- RESULTADO ESPERADO:
-- Todas las tablas deberían mostrar rowsecurity = false
-- =====================================================================

-- =====================================================================
-- IMPORTANTE:
-- =====================================================================
-- Después de ejecutar este script:
-- 1. Recarga tu aplicación (Ctrl+Shift+R)
-- 2. El error 500 debería desaparecer
-- 3. La aplicación debería funcionar normalmente
-- 4. TODOS los usuarios autenticados podrán ver TODOS los datos
-- 5. Esto es SOLO para desarrollo. NO usar en producción.
-- =====================================================================
