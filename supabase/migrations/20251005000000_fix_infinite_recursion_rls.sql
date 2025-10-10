-- CORRECCIÓN CRÍTICA: Eliminar recursión infinita en políticas RLS
-- El problema es que las políticas de admin hacen SELECT en profiles desde dentro de policies de profiles

BEGIN;

-- =============================================
-- 1. ELIMINAR POLÍTICAS RECURSIVAS DE PROFILES
-- =============================================

DROP POLICY IF EXISTS "Admins can manage all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Los admins pueden gestionar toda la disponibilidad" ON public.user_availability;
DROP POLICY IF EXISTS "Los admins pueden ver las tareas archivadas" ON public.archived_tasks;
DROP POLICY IF EXISTS "Los admins pueden gestionar los planes compartidos" ON public.shared_plans;

-- =============================================
-- 2. CREAR FUNCIÓN HELPER PARA VERIFICAR ADMIN
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
-- 3. RECREAR POLÍTICAS SIN RECURSIÓN
-- =============================================

-- Política de admin para profiles usando la función helper
CREATE POLICY "Admins can manage all profiles"
  ON public.profiles FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Política de admin para user_availability
CREATE POLICY "Admins can manage user availability"
  ON public.user_availability FOR ALL
  TO authenticated
  USING (public.is_admin());

-- Política de admin para archived_tasks
CREATE POLICY "Admins can view archived tasks"
  ON public.archived_tasks FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- Política de admin para shared_plans
CREATE POLICY "Admins can manage shared plans"
  ON public.shared_plans FOR ALL
  TO authenticated
  USING (public.is_admin());

-- =============================================
-- 4. ARREGLAR POLÍTICAS DE VEHICLES Y SCREEN_DATA
-- =============================================

-- Eliminar políticas recursivas si existen
DROP POLICY IF EXISTS "Los admins pueden gestionar vehículos" ON public.vehicles;
DROP POLICY IF EXISTS "Los admins pueden gestionar tareas" ON public.screen_data;
DROP POLICY IF EXISTS "Authenticated users can view vehicles" ON public.vehicles;
DROP POLICY IF EXISTS "Authenticated users can view screen data" ON public.screen_data;

-- Vehicles: Lectura para autenticados, gestión para admins
CREATE POLICY "Authenticated users can view vehicles"
  ON public.vehicles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage vehicles"
  ON public.vehicles FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Screen_data: Lectura para autenticados, gestión para admins
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
-- 5. ASEGURAR QUE LA COLUMNA STATUS EXISTE
-- =============================================

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'activo'
CHECK (status IN ('activo', 'baja', 'vacaciones'));

-- Inicializar registros existentes
UPDATE public.profiles SET status = 'activo' WHERE status IS NULL;

COMMIT;
