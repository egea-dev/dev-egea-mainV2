-- =====================================================================
-- SOLUCIÓN ALTERNATIVA: RLS SIN RECURSIÓN USANDO BÚSQUEDA DIRECTA
-- =====================================================================
-- EJECUTAR EN SQL EDITOR DE SUPABASE
-- =====================================================================

-- PASO 1: Eliminar todas las funciones y políticas problemáticas
DROP FUNCTION IF EXISTS public.is_admin() CASCADE;
DROP FUNCTION IF EXISTS public.current_user_is_admin() CASCADE;

-- Eliminar todas las políticas
DROP POLICY IF EXISTS "users_can_view_own_profile" ON public.profiles;
DROP POLICY IF EXISTS "users_can_update_own_profile" ON public.profiles;
DROP POLICY IF EXISTS "users_can_insert_own_profile" ON public.profiles;
DROP POLICY IF EXISTS "admins_can_view_all_profiles" ON public.profiles;
DROP POLICY IF EXISTS "admins_can_insert_profiles" ON public.profiles;
DROP POLICY IF EXISTS "admins_can_update_all_profiles" ON public.profiles;
DROP POLICY IF EXISTS "admins_can_delete_all_profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can manage all profiles" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_admin" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_admin" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_admin" ON public.profiles;
DROP POLICY IF EXISTS "profiles_delete_admin" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_all_if_admin" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_all_if_admin" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_if_admin" ON public.profiles;
DROP POLICY IF EXISTS "profiles_delete_if_admin" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert" ON public.profiles;
DROP POLICY IF EXISTS "profiles_delete" ON public.profiles;

-- PASO 2: Crear una política ÚNICA para SELECT sin subqueries
-- Esta política permite a los usuarios ver SOLO su propio perfil
CREATE POLICY "profiles_select_own_only"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (auth_user_id = auth.uid());

-- PASO 3: Crear una política ÚNICA para UPDATE sin subqueries
CREATE POLICY "profiles_update_own_only"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (auth_user_id = auth.uid())
  WITH CHECK (auth_user_id = auth.uid());

-- PASO 4: NO crear políticas para INSERT y DELETE por ahora
-- Los admins deberán usar el dashboard de Supabase o service role key

-- PASO 5: Habilitar RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- PASO 6: Verificar políticas
SELECT
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual::text as using_clause
FROM pg_policies
WHERE tablename = 'profiles'
ORDER BY policyname;

-- =====================================================================
-- EXPLICACIÓN:
-- =====================================================================
-- 1. Esta solución SOLO permite a los usuarios ver su propio perfil
-- 2. NO hay recursión porque no hay subqueries a profiles
-- 3. NO hay función is_admin() que pueda causar problemas
-- 4. Los admins NO podrán ver todos los perfiles desde la aplicación
-- 5. Los admins pueden usar el Dashboard de Supabase para gestionar perfiles
-- 6. Esto es SEGURO y FUNCIONAL para el caso de uso básico
-- =====================================================================

-- =====================================================================
-- NOTAS IMPORTANTES:
-- =====================================================================
-- Si necesitas que los admins vean todos los perfiles desde la app,
-- necesitarás:
-- 1. Usar service_role key en el backend (NO en el frontend)
-- 2. Crear un endpoint API que use service_role para bypass RLS
-- 3. O deshabilitar RLS completamente (NO recomendado para producción)
-- =====================================================================
