-- ==================================================================================
-- HABILITAR RLS CORRECTAMENTE + CREAR DATOS DE PRUEBA
-- ==================================================================================
-- Este script habilita RLS de forma permisiva y crea datos de prueba
-- ==================================================================================

BEGIN;

-- =============================================
-- PASO 1: VERIFICAR DATOS EXISTENTES
-- =============================================

-- Ver cuántos registros hay
DO $$
DECLARE
  profile_count INTEGER;
  vehicle_count INTEGER;
  task_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO profile_count FROM public.profiles;
  SELECT COUNT(*) INTO vehicle_count FROM public.vehicles;
  SELECT COUNT(*) INTO task_count FROM public.screen_data;

  RAISE NOTICE '=== DATOS ACTUALES ===';
  RAISE NOTICE 'Perfiles: %', profile_count;
  RAISE NOTICE 'Vehículos: %', vehicle_count;
  RAISE NOTICE 'Tareas: %', task_count;
END $$;

-- =============================================
-- PASO 2: CREAR VEHÍCULOS DE PRUEBA SI NO EXISTEN
-- =============================================

INSERT INTO public.vehicles (name, license_plate)
VALUES
  ('Furgoneta 1', 'ABC-1234'),
  ('Furgoneta 2', 'DEF-5678'),
  ('Camión 1', 'GHI-9012')
ON CONFLICT (license_plate) DO NOTHING;

-- =============================================
-- PASO 3: CREAR FUNCIÓN is_admin SI NO EXISTE
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
-- PASO 4: HABILITAR RLS CON POLÍTICAS PERMISIVAS
-- =============================================

-- PROFILES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_all" ON public.profiles;
CREATE POLICY "profiles_select_all"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
CREATE POLICY "profiles_insert_own"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "profiles_update_all" ON public.profiles;
CREATE POLICY "profiles_update_all"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "profiles_delete_admin" ON public.profiles;
CREATE POLICY "profiles_delete_admin"
  ON public.profiles FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- VEHICLES
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "vehicles_select_all" ON public.vehicles;
CREATE POLICY "vehicles_select_all"
  ON public.vehicles FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "vehicles_insert_admin" ON public.vehicles;
CREATE POLICY "vehicles_insert_admin"
  ON public.vehicles FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "vehicles_update_admin" ON public.vehicles;
CREATE POLICY "vehicles_update_admin"
  ON public.vehicles FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "vehicles_delete_admin" ON public.vehicles;
CREATE POLICY "vehicles_delete_admin"
  ON public.vehicles FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- SCREEN_DATA
ALTER TABLE public.screen_data ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "screen_data_select_all" ON public.screen_data;
CREATE POLICY "screen_data_select_all"
  ON public.screen_data FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "screen_data_insert_admin" ON public.screen_data;
CREATE POLICY "screen_data_insert_admin"
  ON public.screen_data FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "screen_data_update_admin" ON public.screen_data;
CREATE POLICY "screen_data_update_admin"
  ON public.screen_data FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "screen_data_delete_admin" ON public.screen_data;
CREATE POLICY "screen_data_delete_admin"
  ON public.screen_data FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- USER_AVAILABILITY
ALTER TABLE public.user_availability ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_availability_select_all" ON public.user_availability;
CREATE POLICY "user_availability_select_all"
  ON public.user_availability FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "user_availability_modify_admin" ON public.user_availability;
CREATE POLICY "user_availability_modify_admin"
  ON public.user_availability FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- TASK_PROFILES
ALTER TABLE public.task_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "task_profiles_select_all" ON public.task_profiles;
CREATE POLICY "task_profiles_select_all"
  ON public.task_profiles FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "task_profiles_modify_admin" ON public.task_profiles;
CREATE POLICY "task_profiles_modify_admin"
  ON public.task_profiles FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- TASK_VEHICLES
ALTER TABLE public.task_vehicles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "task_vehicles_select_all" ON public.task_vehicles;
CREATE POLICY "task_vehicles_select_all"
  ON public.task_vehicles FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "task_vehicles_modify_admin" ON public.task_vehicles;
CREATE POLICY "task_vehicles_modify_admin"
  ON public.task_vehicles FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- SHARED_PLANS
ALTER TABLE public.shared_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "shared_plans_select_public" ON public.shared_plans;
CREATE POLICY "shared_plans_select_public"
  ON public.shared_plans FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "shared_plans_modify_admin" ON public.shared_plans;
CREATE POLICY "shared_plans_modify_admin"
  ON public.shared_plans FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ARCHIVED_TASKS
ALTER TABLE public.archived_tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "archived_tasks_select_all" ON public.archived_tasks;
CREATE POLICY "archived_tasks_select_all"
  ON public.archived_tasks FOR SELECT
  TO authenticated
  USING (true);

-- SCREENS (si existe)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'screens') THEN
    ALTER TABLE public.screens ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "screens_select_all" ON public.screens;
    EXECUTE 'CREATE POLICY "screens_select_all"
      ON public.screens FOR SELECT
      TO authenticated
      USING (true)';

    DROP POLICY IF EXISTS "screens_modify_admin" ON public.screens;
    EXECUTE 'CREATE POLICY "screens_modify_admin"
      ON public.screens FOR ALL
      TO authenticated
      USING (public.is_admin())
      WITH CHECK (public.is_admin())';
  END IF;
END $$;

-- TEMPLATES (si existe)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'templates') THEN
    ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "templates_select_all" ON public.templates;
    EXECUTE 'CREATE POLICY "templates_select_all"
      ON public.templates FOR SELECT
      TO authenticated
      USING (true)';

    DROP POLICY IF EXISTS "templates_modify_admin" ON public.templates;
    EXECUTE 'CREATE POLICY "templates_modify_admin"
      ON public.templates FOR ALL
      TO authenticated
      USING (public.is_admin())
      WITH CHECK (public.is_admin())';
  END IF;
END $$;

COMMIT;

-- ==================================================================================
-- ✅ RLS HABILITADO CON POLÍTICAS PERMISIVAS
-- ==================================================================================
-- Ahora recarga la aplicación (Ctrl+Shift+R)
-- Deberías poder ver los datos correctamente
-- ==================================================================================

-- Ver resumen final
SELECT 'Perfiles' as tabla, COUNT(*) as total FROM public.profiles
UNION ALL
SELECT 'Vehículos', COUNT(*) FROM public.vehicles
UNION ALL
SELECT 'Tareas', COUNT(*) FROM public.screen_data;
