-- ==================================================================================
-- HABILITAR RLS CORRECTAMENTE (después de verificar que funciona sin RLS)
-- ==================================================================================
-- Ejecuta este script después de confirmar que la app funciona sin RLS
-- ==================================================================================

BEGIN;

-- =============================================
-- PASO 1: ELIMINAR TODO CON CASCADE
-- =============================================

DROP FUNCTION IF EXISTS public.is_admin() CASCADE;

-- =============================================
-- PASO 2: CREAR FUNCIÓN is_admin
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
-- PASO 3: ASEGURAR COLUMNA STATUS
-- =============================================

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'activo'
CHECK (status IN ('activo', 'baja', 'vacaciones'));

UPDATE public.profiles SET status = 'activo' WHERE status IS NULL;

-- =============================================
-- PASO 4: HABILITAR RLS Y CREAR POLÍTICAS PERMISIVAS
-- =============================================

-- PROFILES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select_policy"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "profiles_insert_policy"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "profiles_update_policy"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "profiles_delete_policy"
  ON public.profiles FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- VEHICLES
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vehicles_select_policy"
  ON public.vehicles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "vehicles_modify_policy"
  ON public.vehicles FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- SCREEN_DATA
ALTER TABLE public.screen_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "screen_data_select_policy"
  ON public.screen_data FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "screen_data_modify_policy"
  ON public.screen_data FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- USER_AVAILABILITY
ALTER TABLE public.user_availability ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_availability_select_policy"
  ON public.user_availability FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "user_availability_modify_policy"
  ON public.user_availability FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- TASK_PROFILES
ALTER TABLE public.task_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "task_profiles_select_policy"
  ON public.task_profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "task_profiles_modify_policy"
  ON public.task_profiles FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- TASK_VEHICLES
ALTER TABLE public.task_vehicles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "task_vehicles_select_policy"
  ON public.task_vehicles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "task_vehicles_modify_policy"
  ON public.task_vehicles FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- SHARED_PLANS
ALTER TABLE public.shared_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "shared_plans_select_policy"
  ON public.shared_plans FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "shared_plans_modify_policy"
  ON public.shared_plans FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ARCHIVED_TASKS
ALTER TABLE public.archived_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "archived_tasks_select_policy"
  ON public.archived_tasks FOR SELECT
  TO authenticated
  USING (true);

-- SCREENS (si existe)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'screens') THEN
    ALTER TABLE public.screens ENABLE ROW LEVEL SECURITY;

    EXECUTE 'CREATE POLICY "screens_select_policy"
      ON public.screens FOR SELECT
      TO authenticated
      USING (true)';

    EXECUTE 'CREATE POLICY "screens_modify_policy"
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

    EXECUTE 'CREATE POLICY "templates_select_policy"
      ON public.templates FOR SELECT
      TO authenticated
      USING (true)';

    EXECUTE 'CREATE POLICY "templates_modify_policy"
      ON public.templates FOR ALL
      TO authenticated
      USING (public.is_admin())
      WITH CHECK (public.is_admin())';
  END IF;
END $$;

COMMIT;

-- ==================================================================================
-- ✅ RLS HABILITADO CORRECTAMENTE CON POLÍTICAS PERMISIVAS
-- ==================================================================================
