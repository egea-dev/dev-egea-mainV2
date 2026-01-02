-- ==================================================================================
-- CORRECCIÓN FINAL PARA ERROR 406 (Not Acceptable)
-- ==================================================================================
-- Este script elimina correctamente todas las políticas y recrea el sistema RLS
-- ==================================================================================

BEGIN;

-- =============================================
-- PASO 1: ELIMINAR FUNCIÓN is_admin CON CASCADE
-- =============================================

DROP FUNCTION IF EXISTS public.is_admin() CASCADE;

-- =============================================
-- PASO 2: ELIMINAR POLÍTICAS RESTANTES MANUALMENTE
-- =============================================

-- PROFILES
DROP POLICY IF EXISTS "Authenticated users can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can manage all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.profiles;
DROP POLICY IF EXISTS "Enable update for users based on auth_user_id" ON public.profiles;
DROP POLICY IF EXISTS "Allow authenticated read access" ON public.profiles;
DROP POLICY IF EXISTS "Allow authenticated insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Allow authenticated update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Allow admin delete" ON public.profiles;

-- VEHICLES
DROP POLICY IF EXISTS "Authenticated users can view vehicles" ON public.vehicles;
DROP POLICY IF EXISTS "Admins can manage vehicles" ON public.vehicles;
DROP POLICY IF EXISTS "Allow authenticated read vehicles" ON public.vehicles;
DROP POLICY IF EXISTS "Allow admin manage vehicles" ON public.vehicles;

-- SCREEN_DATA
DROP POLICY IF EXISTS "Authenticated users can view screen data" ON public.screen_data;
DROP POLICY IF EXISTS "Admins can manage screen data" ON public.screen_data;
DROP POLICY IF EXISTS "Allow authenticated read screen_data" ON public.screen_data;
DROP POLICY IF EXISTS "Allow admin manage screen_data" ON public.screen_data;

-- USER_AVAILABILITY
DROP POLICY IF EXISTS "Admins can manage user availability" ON public.user_availability;
DROP POLICY IF EXISTS "Los usuarios pueden ver su propia disponibilidad" ON public.user_availability;
DROP POLICY IF EXISTS "Allow authenticated read user_availability" ON public.user_availability;
DROP POLICY IF EXISTS "Allow admin manage user_availability" ON public.user_availability;

-- TASK_PROFILES
DROP POLICY IF EXISTS "Authenticated users can view task_profiles" ON public.task_profiles;
DROP POLICY IF EXISTS "Admins can manage task_profiles" ON public.task_profiles;
DROP POLICY IF EXISTS "Allow authenticated read task_profiles" ON public.task_profiles;
DROP POLICY IF EXISTS "Allow admin manage task_profiles" ON public.task_profiles;

-- TASK_VEHICLES
DROP POLICY IF EXISTS "Authenticated users can view task_vehicles" ON public.task_vehicles;
DROP POLICY IF EXISTS "Admins can manage task_vehicles" ON public.task_vehicles;
DROP POLICY IF EXISTS "Allow authenticated read task_vehicles" ON public.task_vehicles;
DROP POLICY IF EXISTS "Allow admin manage task_vehicles" ON public.task_vehicles;

-- SHARED_PLANS
DROP POLICY IF EXISTS "Permitir lectura pública de planes compartidos" ON public.shared_plans;
DROP POLICY IF EXISTS "Admins can manage shared plans" ON public.shared_plans;
DROP POLICY IF EXISTS "Allow public read shared_plans" ON public.shared_plans;
DROP POLICY IF EXISTS "Allow admin manage shared_plans" ON public.shared_plans;

-- ARCHIVED_TASKS
DROP POLICY IF EXISTS "Admins can view archived tasks" ON public.archived_tasks;
DROP POLICY IF EXISTS "Allow authenticated read archived_tasks" ON public.archived_tasks;

-- =============================================
-- PASO 3: CREAR FUNCIÓN is_admin SIN RECURSIÓN
-- =============================================

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
-- PASO 4: CREAR POLÍTICAS PARA PROFILES
-- =============================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

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
-- PASO 5: ASEGURAR COLUMNA STATUS
-- =============================================

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'activo'
CHECK (status IN ('activo', 'baja', 'vacaciones'));

UPDATE public.profiles SET status = 'activo' WHERE status IS NULL;

-- =============================================
-- PASO 6: POLÍTICAS PARA VEHICLES
-- =============================================

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

ALTER TABLE public.archived_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated read archived_tasks"
  ON public.archived_tasks FOR SELECT
  TO authenticated
  USING (true);

-- =============================================
-- PASO 13: POLÍTICAS PARA SCREENS (si existe)
-- =============================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'screens') THEN
    ALTER TABLE public.screens ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Allow authenticated read screens" ON public.screens;
    DROP POLICY IF EXISTS "Allow admin manage screens" ON public.screens;

    EXECUTE 'CREATE POLICY "Allow authenticated read screens"
      ON public.screens FOR SELECT
      TO authenticated
      USING (true)';

    EXECUTE 'CREATE POLICY "Allow admin manage screens"
      ON public.screens FOR ALL
      TO authenticated
      USING (public.is_admin())
      WITH CHECK (public.is_admin())';
  END IF;
END $$;

-- =============================================
-- PASO 14: POLÍTICAS PARA TEMPLATES (si existe)
-- =============================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'templates') THEN
    ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Allow authenticated read templates" ON public.templates;
    DROP POLICY IF EXISTS "Allow admin manage templates" ON public.templates;

    EXECUTE 'CREATE POLICY "Allow authenticated read templates"
      ON public.templates FOR SELECT
      TO authenticated
      USING (true)';

    EXECUTE 'CREATE POLICY "Allow admin manage templates"
      ON public.templates FOR ALL
      TO authenticated
      USING (public.is_admin())
      WITH CHECK (public.is_admin())';
  END IF;
END $$;

COMMIT;

-- ==================================================================================
-- FIN DEL SCRIPT
-- ==================================================================================
-- ✅ Este script debe ejecutarse SIN ERRORES
-- ✅ Recarga la aplicación después de ejecutarlo (Ctrl+Shift+R)
-- ==================================================================================
