-- ==================================================================================
-- SCRIPT DE DIAGNÓSTICO RLS
-- ==================================================================================
-- Ejecuta este script para ver el estado actual de RLS y políticas
-- ==================================================================================

-- Ver todas las políticas actuales en profiles
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'profiles';

-- Ver si RLS está habilitado
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('profiles', 'vehicles', 'screen_data', 'user_availability', 'task_profiles', 'task_vehicles');

-- Ver funciones relacionadas con is_admin
SELECT proname, prosrc
FROM pg_proc
WHERE proname LIKE '%admin%';

-- Ver datos de la tabla profiles (sin RLS para diagnóstico)
-- NOTA: Esto solo funcionará si eres el dueño de la base de datos
SELECT id, auth_user_id, full_name, role, status
FROM public.profiles
LIMIT 5;
