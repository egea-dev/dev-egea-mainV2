-- =====================================================================
-- FIX URGENTE: ELIMINAR RECURSIÓN EN POLÍTICAS RLS DE PROFILES
-- =====================================================================
-- COPIAR Y PEGAR TODO ESTE CÓDIGO EN EL SQL EDITOR DE SUPABASE
-- =====================================================================

-- PASO 1: Eliminar TODAS las políticas de profiles
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

-- PASO 2: Crear políticas SIN recursión

-- Los usuarios pueden ver su propio perfil
CREATE POLICY "profiles_select_own"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (auth_user_id = auth.uid());

-- Los usuarios pueden actualizar su propio perfil (solo campos permitidos)
CREATE POLICY "profiles_update_own"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (auth_user_id = auth.uid())
  WITH CHECK (auth_user_id = auth.uid());

-- Los admins pueden ver todos los perfiles
-- NOTA: Esta consulta NO causa recursión porque usa una subquery separada
CREATE POLICY "profiles_select_all_if_admin"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    (auth_user_id = auth.uid()) OR
    EXISTS (
      SELECT 1 FROM public.profiles AS p
      WHERE p.auth_user_id = auth.uid() AND p.role = 'admin'
    )
  );

-- Los admins pueden insertar nuevos perfiles
CREATE POLICY "profiles_insert_if_admin"
  ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles AS p
      WHERE p.auth_user_id = auth.uid() AND p.role = 'admin'
    )
  );

-- Los admins pueden actualizar todos los perfiles
CREATE POLICY "profiles_update_all_if_admin"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (
    (auth_user_id = auth.uid()) OR
    EXISTS (
      SELECT 1 FROM public.profiles AS p
      WHERE p.auth_user_id = auth.uid() AND p.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles AS p
      WHERE p.auth_user_id = auth.uid() AND p.role = 'admin'
    )
  );

-- Los admins pueden eliminar perfiles
CREATE POLICY "profiles_delete_if_admin"
  ON public.profiles
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles AS p
      WHERE p.auth_user_id = auth.uid() AND p.role = 'admin'
    )
  );

-- PASO 3: Verificar que RLS esté habilitado
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- VERIFICACIÓN: Ver las políticas creadas
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  LEFT(qual::text, 100) as using_clause,
  LEFT(with_check::text, 100) as with_check_clause
FROM pg_policies
WHERE tablename = 'profiles'
ORDER BY policyname;
