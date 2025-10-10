-- ==================================================================================
-- CORRECCIÓN PARA ERROR 406 (Not Acceptable)
-- ==================================================================================
-- El error 406 indica que RLS está bloqueando todas las peticiones
-- Este script asegura que las políticas permitan lectura básica
-- ==================================================================================

BEGIN;

-- =============================================
-- PASO 1: VERIFICAR Y RECREAR FUNCIÓN is_admin
-- =============================================

DROP FUNCTION IF EXISTS public.is_admin();

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
-- PASO 2: ELIMINAR TODAS LAS POLÍTICAS EXISTENTES DE PROFILES
-- =============================================

DROP POLICY IF EXISTS "Authenticated users can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can manage all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.profiles;
DROP POLICY IF EXISTS "Enable update for users based on auth_user_id" ON public.profiles;

-- =============================================
-- PASO 3: CREAR POLÍTICAS SIMPLES Y PERMISIVAS
-- =============================================

-- LECTURA: Todos los usuarios autenticados pueden leer todos los perfiles
CREATE POLICY "Allow authenticated read access"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

-- INSERCIÓN: Permitir a usuarios autenticados crear su propio perfil
CREATE POLICY "Allow authenticated insert own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = auth_user_id);

-- ACTUALIZACIÓN: Usuarios pueden actualizar su propio perfil O ser admin
CREATE POLICY "Allow authenticated update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = auth_user_id OR public.is_admin())
  WITH CHECK (auth.uid() = auth_user_id OR public.is_admin());

-- ELIMINACIÓN: Solo admins
CREATE POLICY "Allow admin delete"
  ON public.profiles FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- =============================================
-- PASO 4: ASEGURAR RLS HABILITADO PERO NO FORCE
-- =============================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles FORCE ROW LEVEL SECURITY;

-- =============================================
-- PASO 5: VERIFICAR COLUMNA STATUS
-- =============================================

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'activo'
CHECK (status IN ('activo', 'baja', 'vacaciones'));

UPDATE public.profiles SET status = 'activo' WHERE status IS NULL;

-- =============================================
-- PASO 6: POLÍTICAS PARA VEHICLES
-- =============================================

DROP POLICY IF EXISTS "Authenticated users can view vehicles" ON public.vehicles;
DROP POLICY IF EXISTS "Admins can manage vehicles" ON public.vehicles;

ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated read vehicles"
  ON public.vehicles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow admin manage vehicles"
  ON public.vehicles FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- =============================================
-- PASO 7: POLÍTICAS PARA SCREEN_DATA
-- =============================================

DROP POLICY IF EXISTS "Authenticated users can view screen data" ON public.screen_data;
DROP POLICY IF EXISTS "Admins can manage screen data" ON public.screen_data;

ALTER TABLE public.screen_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated read screen_data"
  ON public.screen_data FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow admin manage screen_data"
  ON public.screen_data FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- =============================================
-- PASO 8: POLÍTICAS PARA USER_AVAILABILITY
-- =============================================

DROP POLICY IF EXISTS "Admins can manage user availability" ON public.user_availability;
DROP POLICY IF EXISTS "Los usuarios pueden ver su propia disponibilidad" ON public.user_availability;

ALTER TABLE public.user_availability ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated read user_availability"
  ON public.user_availability FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow admin manage user_availability"
  ON public.user_availability FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- =============================================
-- PASO 9: POLÍTICAS PARA TASK_PROFILES
-- =============================================

DROP POLICY IF EXISTS "Authenticated users can view task_profiles" ON public.task_profiles;
DROP POLICY IF EXISTS "Admins can manage task_profiles" ON public.task_profiles;

ALTER TABLE public.task_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated read task_profiles"
  ON public.task_profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow admin manage task_profiles"
  ON public.task_profiles FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- =============================================
-- PASO 10: POLÍTICAS PARA TASK_VEHICLES
-- =============================================

DROP POLICY IF EXISTS "Authenticated users can view task_vehicles" ON public.task_vehicles;
DROP POLICY IF EXISTS "Admins can manage task_vehicles" ON public.task_vehicles;

ALTER TABLE public.task_vehicles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated read task_vehicles"
  ON public.task_vehicles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow admin manage task_vehicles"
  ON public.task_vehicles FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- =============================================
-- PASO 11: POLÍTICAS PARA SHARED_PLANS
-- =============================================

DROP POLICY IF EXISTS "Permitir lectura pública de planes compartidos" ON public.shared_plans;
DROP POLICY IF EXISTS "Admins can manage shared plans" ON public.shared_plans;

ALTER TABLE public.shared_plans ENABLE ROW LEVEL SECURITY;

-- Permitir lectura pública (anon y authenticated)
CREATE POLICY "Allow public read shared_plans"
  ON public.shared_plans FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow admin manage shared_plans"
  ON public.shared_plans FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- =============================================
-- PASO 12: POLÍTICAS PARA ARCHIVED_TASKS
-- =============================================

DROP POLICY IF EXISTS "Admins can view archived tasks" ON public.archived_tasks;

ALTER TABLE public.archived_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated read archived_tasks"
  ON public.archived_tasks FOR SELECT
  TO authenticated
  USING (true);

COMMIT;

-- ==================================================================================
-- FIN DEL SCRIPT - INSTRUCCIONES
-- ==================================================================================
-- 1. Ejecuta este script en el SQL Editor de Supabase
-- 2. Recarga la aplicación (Ctrl+Shift+R)
-- 3. Si aún tienes problemas, verifica que el usuario esté autenticado correctamente
-- ==================================================================================
