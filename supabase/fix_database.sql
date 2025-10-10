-- ==================================================================================
-- SCRIPT DE CORRECCIÓN COMPLETO PARA SUPABASE
-- ==================================================================================
-- Este script corrige todos los problemas detectados:
-- 1. Recursión infinita en políticas RLS
-- 2. Columna status faltante en profiles
-- 3. Errores 500 en vehicles y screen_data
--
-- INSTRUCCIONES DE APLICACIÓN:
-- 1. Ir a tu proyecto Supabase: https://supabase.com/dashboard/project/llcjtkksaqzbijwgqwou
-- 2. Ir a SQL Editor
-- 3. Copiar y pegar todo este script
-- 4. Ejecutar
-- ==================================================================================

BEGIN;

-- =============================================
-- PASO 1: ELIMINAR POLÍTICAS RECURSIVAS
-- =============================================

DROP POLICY IF EXISTS "Admins can manage all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Los admins pueden gestionar toda la disponibilidad" ON public.user_availability;
DROP POLICY IF EXISTS "Los admins pueden ver las tareas archivadas" ON public.archived_tasks;
DROP POLICY IF EXISTS "Los admins pueden gestionar los planes compartidos" ON public.shared_plans;
DROP POLICY IF EXISTS "Los admins pueden gestionar vehículos" ON public.vehicles;
DROP POLICY IF EXISTS "Los admins pueden gestionar tareas" ON public.screen_data;
DROP POLICY IF EXISTS "Authenticated users can view vehicles" ON public.vehicles;
DROP POLICY IF EXISTS "Authenticated users can view screen data" ON public.screen_data;

-- =============================================
-- PASO 2: CREAR FUNCIÓN HELPER SIN RECURSIÓN
-- =============================================

-- Esta función evita la recursión al usar SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE auth_user_id = auth.uid()
    AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- =============================================
-- PASO 3: RECREAR POLÍTICAS SIN RECURSIÓN
-- =============================================

-- PROFILES
CREATE POLICY "Admins can manage all profiles"
  ON public.profiles FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- USER_AVAILABILITY
CREATE POLICY "Admins can manage user availability"
  ON public.user_availability FOR ALL
  TO authenticated
  USING (public.is_admin());

-- ARCHIVED_TASKS
CREATE POLICY "Admins can view archived tasks"
  ON public.archived_tasks FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- SHARED_PLANS
CREATE POLICY "Admins can manage shared plans"
  ON public.shared_plans FOR ALL
  TO authenticated
  USING (public.is_admin());

-- VEHICLES
CREATE POLICY "Authenticated users can view vehicles"
  ON public.vehicles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage vehicles"
  ON public.vehicles FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- SCREEN_DATA
CREATE POLICY "Authenticated users can view screen data"
  ON public.screen_data FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage screen data"
  ON public.screen_data FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- =============================================
-- PASO 4: ASEGURAR COLUMNA STATUS EN PROFILES
-- =============================================

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'activo'
CHECK (status IN ('activo', 'baja', 'vacaciones'));

-- Inicializar registros existentes
UPDATE public.profiles SET status = 'activo' WHERE status IS NULL;

-- =============================================
-- PASO 5: VERIFICAR OTRAS TABLAS Y POLÍTICAS
-- =============================================

-- Asegurar que task_profiles tiene políticas correctas
DROP POLICY IF EXISTS "Authenticated users can view task_profiles" ON public.task_profiles;
CREATE POLICY "Authenticated users can view task_profiles"
  ON public.task_profiles FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Admins can manage task_profiles" ON public.task_profiles;
CREATE POLICY "Admins can manage task_profiles"
  ON public.task_profiles FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Asegurar que task_vehicles tiene políticas correctas
DROP POLICY IF EXISTS "Authenticated users can view task_vehicles" ON public.task_vehicles;
CREATE POLICY "Authenticated users can view task_vehicles"
  ON public.task_vehicles FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Admins can manage task_vehicles" ON public.task_vehicles;
CREATE POLICY "Admins can manage task_vehicles"
  ON public.task_vehicles FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

COMMIT;

-- ==================================================================================
-- FIN DEL SCRIPT
-- ==================================================================================
-- Después de ejecutar este script, recarga la aplicación (Ctrl+Shift+R)
-- Todos los errores 500 y de recursión deberían estar resueltos
-- ==================================================================================
