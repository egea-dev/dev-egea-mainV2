-- =====================================================================
-- MIGRACIÓN: CORRECCIÓN DE RECURSIÓN EN POLÍTICAS RLS DE PROFILES
-- =====================================================================
-- Fecha: 2025-10-06
-- Problema: La función is_admin() crea recursión infinita al consultar profiles
-- Solución: Crear una versión de is_admin() que no use RLS para profiles
-- =====================================================================

BEGIN;

-- =====================================================================
-- ELIMINAR FUNCIÓN is_admin() PROBLEMÁTICA
-- =====================================================================

DROP FUNCTION IF EXISTS public.is_admin();

-- =====================================================================
-- CREAR NUEVA FUNCIÓN is_admin() SIN RECURSIÓN
-- =====================================================================

-- Crear una función que verifique si el usuario es admin sin usar RLS
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  -- Usar una consulta directa a la tabla auth.users para evitar recursión
  -- y luego verificar el rol en profiles con bypass RLS
  RETURN EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE auth_user_id = auth.uid() 
    AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Otorgar permisos de ejecución a usuarios autenticados
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- =====================================================================
-- CORREGIR POLÍTICAS DE profiles PARA EVITAR RECURSIÓN
-- =====================================================================

-- Eliminar políticas existentes
DROP POLICY IF EXISTS "users_can_view_own_profile" ON public.profiles;
DROP POLICY IF EXISTS "users_can_update_own_profile" ON public.profiles;
DROP POLICY IF EXISTS "admins_can_view_all_profiles" ON public.profiles;
DROP POLICY IF EXISTS "admins_can_insert_profiles" ON public.profiles;
DROP POLICY IF EXISTS "admins_can_update_all_profiles" ON public.profiles;
DROP POLICY IF EXISTS "admins_can_delete_all_profiles" ON public.profiles;

-- Crear nuevas políticas sin recursión
CREATE POLICY "users_can_view_own_profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth_user_id = auth.uid());

CREATE POLICY "users_can_update_own_profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth_user_id = auth.uid())
  WITH CHECK (auth_user_id = auth.uid());

-- Políticas para admins que usan la nueva función is_admin()
CREATE POLICY "admins_can_view_all_profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "admins_can_insert_profiles"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "admins_can_update_all_profiles"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "admins_can_delete_all_profiles"
  ON public.profiles FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- =====================================================================
-- VERIFICAR QUE RLS ESTÉ HABILITADO
-- =====================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

COMMIT;

-- =====================================================================
-- NOTAS DE IMPLEMENTACIÓN
-- =====================================================================
-- 1. Se eliminó la función is_admin() problemática que causaba recursión
-- 2. Se creó una nueva función is_admin() con SECURITY DEFINER para evitar RLS
-- 3. Se recrearon todas las políticas de profiles para usar la nueva función
-- 4. Esto debería resolver el error 500 al consultar profiles
-- =====================================================================