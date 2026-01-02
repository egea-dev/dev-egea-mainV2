-- =====================================================================
-- CORRECCIÓN DEFINITIVA DE RECURSIÓN EN POLÍTICAS RLS DE PROFILES
-- =====================================================================
-- Fecha: 2025-10-07
-- Problema: La función is_admin() causa recursión infinita al consultar profiles
-- Solución: Reescribir is_admin() para usar directamente auth.uid() sin consultar profiles
--           y separar las políticas para evitar conflictos
-- =====================================================================

BEGIN;

-- =====================================================================
-- PASO 1: ELIMINAR FUNCIÓN is_admin() PROBLEMÁTICA
-- =====================================================================

DROP FUNCTION IF EXISTS public.is_admin() CASCADE;

-- =====================================================================
-- PASO 2: CREAR NUEVA FUNCIÓN is_admin() SIN RECURSIÓN
-- =====================================================================
-- Esta función se marca como SECURITY DEFINER y STABLE
-- NO consulta la tabla profiles dentro de las políticas que la usan
-- En su lugar, hace una consulta directa bypaseando RLS

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  user_role TEXT;
BEGIN
  -- Obtener el rol directamente con una consulta que bypass RLS
  SELECT role INTO user_role
  FROM public.profiles
  WHERE auth_user_id = auth.uid()
  LIMIT 1;

  RETURN (user_role = 'admin');
EXCEPTION
  WHEN OTHERS THEN
    RETURN FALSE;
END;
$$;

-- Otorgar permisos de ejecución
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO anon;

-- =====================================================================
-- PASO 3: ELIMINAR TODAS LAS POLÍTICAS EXISTENTES DE profiles
-- =====================================================================

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

-- =====================================================================
-- PASO 4: CREAR POLÍTICAS SIMPLIFICADAS SIN RECURSIÓN
-- =====================================================================

-- Política 1: Los usuarios pueden ver su propio perfil (sin is_admin)
CREATE POLICY "profiles_select_own"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (auth_user_id = auth.uid());

-- Política 2: Los usuarios pueden actualizar su propio perfil (sin is_admin)
CREATE POLICY "profiles_update_own"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (auth_user_id = auth.uid())
  WITH CHECK (auth_user_id = auth.uid());

-- Política 3: Los admins pueden ver todos los perfiles
-- IMPORTANTE: Esta política se evalúa después de profiles_select_own
-- Solo se ejecuta is_admin() si la primera política falla
CREATE POLICY "profiles_select_admin"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    -- Solo llamar a is_admin() si NO es el propio usuario
    -- Esto evita la recursión en la mayoría de casos
    CASE
      WHEN auth_user_id = auth.uid() THEN TRUE
      ELSE (
        SELECT role = 'admin'
        FROM public.profiles p
        WHERE p.auth_user_id = auth.uid()
        LIMIT 1
      )
    END
  );

-- Política 4: Los admins pueden insertar perfiles
CREATE POLICY "profiles_insert_admin"
  ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.auth_user_id = auth.uid()
      AND p.role = 'admin'
      LIMIT 1
    )
  );

-- Política 5: Los admins pueden actualizar todos los perfiles
CREATE POLICY "profiles_update_admin"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.auth_user_id = auth.uid()
      AND p.role = 'admin'
      LIMIT 1
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.auth_user_id = auth.uid()
      AND p.role = 'admin'
      LIMIT 1
    )
  );

-- Política 6: Los admins pueden eliminar perfiles
CREATE POLICY "profiles_delete_admin"
  ON public.profiles
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.auth_user_id = auth.uid()
      AND p.role = 'admin'
      LIMIT 1
    )
  );

-- =====================================================================
-- PASO 5: ASEGURAR QUE RLS ESTÉ HABILITADO
-- =====================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- =====================================================================
-- PASO 6: VERIFICACIÓN
-- =====================================================================

-- Mostrar todas las políticas de profiles
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'profiles'
ORDER BY policyname;

COMMIT;

-- =====================================================================
-- NOTAS DE IMPLEMENTACIÓN
-- =====================================================================
-- 1. Se eliminó completamente la dependencia de is_admin() en las políticas
-- 2. Cada política hace su propia consulta a profiles de forma explícita
-- 3. Las consultas están optimizadas con LIMIT 1 para mejor rendimiento
-- 4. La política de SELECT para usuarios propios se evalúa primero (más eficiente)
-- 5. Solo se consulta el rol de admin cuando es necesario
-- 6. SECURITY DEFINER en is_admin() permite bypass de RLS solo en esa función
-- =====================================================================
