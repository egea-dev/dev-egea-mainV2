-- =====================================================================
-- SOLUCIÓN DEFINITIVA: ELIMINAR RECURSIÓN EN RLS DE PROFILES
-- =====================================================================
-- EJECUTAR EN SQL EDITOR DE SUPABASE
-- =====================================================================

-- PASO 1: Eliminar función is_admin si existe
DROP FUNCTION IF EXISTS public.is_admin() CASCADE;

-- PASO 2: Crear función que verifica si es admin SIN USAR RLS
-- La clave está en SECURITY DEFINER que ejecuta con privilegios del owner (postgres)
-- y por lo tanto bypasea las políticas RLS

CREATE OR REPLACE FUNCTION public.current_user_is_admin()
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  user_role TEXT;
BEGIN
  -- Esta consulta se ejecuta como el dueño de la función (postgres)
  -- Por lo tanto NO está sujeta a RLS y no causa recursión
  SELECT role INTO user_role
  FROM public.profiles
  WHERE auth_user_id = auth.uid()
  LIMIT 1;

  RETURN COALESCE(user_role = 'admin', FALSE);
EXCEPTION
  WHEN OTHERS THEN
    RETURN FALSE;
END;
$$;

-- Otorgar permisos
GRANT EXECUTE ON FUNCTION public.current_user_is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_user_is_admin() TO anon;

-- PASO 3: Eliminar TODAS las políticas existentes de profiles
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

-- PASO 4: Crear políticas SIMPLES usando la función SECURITY DEFINER

-- SELECT: Ver propio perfil O ser admin
CREATE POLICY "profiles_select"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    auth_user_id = auth.uid() OR current_user_is_admin()
  );

-- UPDATE: Actualizar propio perfil O ser admin
CREATE POLICY "profiles_update"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (
    auth_user_id = auth.uid() OR current_user_is_admin()
  )
  WITH CHECK (
    auth_user_id = auth.uid() OR current_user_is_admin()
  );

-- INSERT: Solo admins pueden crear perfiles
CREATE POLICY "profiles_insert"
  ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (current_user_is_admin());

-- DELETE: Solo admins pueden eliminar perfiles
CREATE POLICY "profiles_delete"
  ON public.profiles
  FOR DELETE
  TO authenticated
  USING (current_user_is_admin());

-- PASO 5: Habilitar RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- PASO 6: Verificar políticas creadas
SELECT
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename = 'profiles'
ORDER BY policyname;

-- =====================================================================
-- EXPLICACIÓN DE POR QUÉ ESTO FUNCIONA:
-- =====================================================================
-- 1. current_user_is_admin() tiene SECURITY DEFINER
-- 2. Esto significa que se ejecuta con los privilegios del dueño de la función (postgres)
-- 3. El rol postgres NO está sujeto a RLS
-- 4. Por lo tanto, la consulta SELECT dentro de current_user_is_admin() NO activa las políticas
-- 5. Esto rompe el ciclo de recursión
-- 6. Las políticas ahora usan current_user_is_admin() de forma segura
-- =====================================================================
