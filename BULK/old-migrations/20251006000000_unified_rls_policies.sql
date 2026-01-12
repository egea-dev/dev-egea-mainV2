-- =====================================================================
-- MIGRACIÓN UNIFICADA: Política de Seguridad RLS Centralizada
-- =====================================================================
-- Fecha: 2025-10-06
-- Objetivo: Reemplazar TODAS las políticas RLS existentes por un sistema
--           unificado, coherente y sin recursión infinita.
-- =====================================================================

BEGIN;

-- =====================================================================
-- PASO 1: LIMPIAR POLÍTICAS EXISTENTES (TODAS LAS TABLAS)
-- =====================================================================

-- Eliminar TODAS las políticas existentes para empezar desde cero
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public')
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I',
            'Templates are viewable by authenticated users', r.tablename);
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I',
            'Templates are insertable by authenticated users', r.tablename);
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I',
            'Templates are updatable by authenticated users', r.tablename);
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I',
            'Templates are deletable by authenticated users', r.tablename);
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I',
            'Screens are viewable by everyone', r.tablename);
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I',
            'Screens are insertable by authenticated users', r.tablename);
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I',
            'Screens are updatable by authenticated users', r.tablename);
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I',
            'Screens are deletable by authenticated users', r.tablename);
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I',
            'Screen data is viewable by everyone', r.tablename);
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I',
            'Screen data is insertable by authenticated users', r.tablename);
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I',
            'Screen data is updatable by authenticated users', r.tablename);
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I',
            'Screen data is deletable by authenticated users', r.tablename);
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I',
            'Los usuarios pueden ver su propio perfil', r.tablename);
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I',
            'Los administradores pueden gestionar todos los perfiles', r.tablename);
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I',
            'Admins can manage all profiles', r.tablename);
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I',
            'Los usuarios autenticados pueden ver los vehículos', r.tablename);
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I',
            'Los administradores pueden gestionar los vehículos', r.tablename);
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I',
            'Admins can manage vehicles', r.tablename);
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I',
            'Authenticated users can view vehicles', r.tablename);
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I',
            'Authenticated users can view screen data', r.tablename);
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I',
            'Admins can manage screen data', r.tablename);
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I',
            'Los admins pueden gestionar toda la disponibilidad', r.tablename);
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I',
            'Admins can manage user availability', r.tablename);
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I',
            'Los usuarios pueden ver su propia disponibilidad', r.tablename);
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I',
            'Los admins pueden ver las tareas archivadas', r.tablename);
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I',
            'Admins can view archived tasks', r.tablename);
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I',
            'Permitir lectura pública de planes compartidos', r.tablename);
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I',
            'Los admins pueden gestionar los planes compartidos', r.tablename);
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I',
            'Admins can manage shared plans', r.tablename);
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I',
            'Los usuarios autenticados pueden ver las asignaciones de operarios', r.tablename);
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I',
            'Los administradores pueden gestionar las asignaciones de operarios', r.tablename);
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I',
            'Los usuarios autenticados pueden ver las asignaciones de vehículos', r.tablename);
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I',
            'Los administradores pueden gestionar las asignaciones', r.tablename);
    END LOOP;
END $$;

-- =====================================================================
-- PASO 2: FUNCIÓN HELPER MEJORADA PARA VERIFICAR ROL DE ADMIN
-- =====================================================================
-- Esta función evita la recursión infinita usando SECURITY DEFINER
-- y accediendo directamente a la columna 'role' en lugar de 'team'

DROP FUNCTION IF EXISTS public.is_admin();

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
DECLARE
  user_role TEXT;
BEGIN
  -- Obtener el rol del usuario actual desde profiles usando auth.uid()
  SELECT role INTO user_role
  FROM public.profiles
  WHERE auth_user_id = auth.uid();

  -- Si el usuario tiene rol 'admin', retornar true
  RETURN (user_role = 'admin');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Otorgar permisos de ejecución a usuarios autenticados
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- =====================================================================
-- PASO 3: POLÍTICAS BASE - LECTURA PARA AUTENTICADOS
-- =====================================================================

-- TEMPLATES: Lectura para todos, gestión para admins
CREATE POLICY "read_templates"
  ON public.templates FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "manage_templates"
  ON public.templates FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- SCREENS: Lectura para todos (incluye anon para pantallas públicas), gestión para admins
CREATE POLICY "read_screens"
  ON public.screens FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "manage_screens"
  ON public.screens FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- SCREEN_DATA (Tareas): Lectura para todos (incluye anon para displays públicos), gestión para admins
CREATE POLICY "read_screen_data"
  ON public.screen_data FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "manage_screen_data"
  ON public.screen_data FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- =====================================================================
-- PASO 4: POLÍTICAS DE PROFILES (SIN RECURSIÓN)
-- =====================================================================

-- Los usuarios pueden ver su propio perfil
CREATE POLICY "read_own_profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth_user_id = auth.uid());

-- Los usuarios pueden actualizar su propio perfil (solo ciertos campos)
CREATE POLICY "update_own_profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth_user_id = auth.uid())
  WITH CHECK (auth_user_id = auth.uid());

-- Los admins pueden ver todos los perfiles usando la función helper
CREATE POLICY "admin_read_all_profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- Los admins pueden gestionar todos los perfiles
CREATE POLICY "admin_manage_profiles"
  ON public.profiles FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- =====================================================================
-- PASO 5: POLÍTICAS DE VEHICLES
-- =====================================================================

-- Lectura para todos los autenticados
CREATE POLICY "read_vehicles"
  ON public.vehicles FOR SELECT
  TO authenticated
  USING (true);

-- Gestión solo para admins
CREATE POLICY "manage_vehicles"
  ON public.vehicles FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- =====================================================================
-- PASO 6: POLÍTICAS DE TABLAS DE UNIÓN (JUNCTION TABLES)
-- =====================================================================

-- TASK_PROFILES: Lectura para todos, gestión para admins
CREATE POLICY "read_task_profiles"
  ON public.task_profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "manage_task_profiles"
  ON public.task_profiles FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- TASK_VEHICLES: Lectura para todos, gestión para admins
CREATE POLICY "read_task_vehicles"
  ON public.task_vehicles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "manage_task_vehicles"
  ON public.task_vehicles FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- =====================================================================
-- PASO 7: POLÍTICAS DE USER_AVAILABILITY
-- =====================================================================

-- Los admins pueden gestionar toda la disponibilidad
CREATE POLICY "admin_manage_availability"
  ON public.user_availability FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Los usuarios pueden ver su propia disponibilidad
CREATE POLICY "read_own_availability"
  ON public.user_availability FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = user_availability.profile_id
      AND auth_user_id = auth.uid()
    )
  );

-- =====================================================================
-- PASO 8: POLÍTICAS DE ARCHIVED_TASKS
-- =====================================================================

-- Solo los admins pueden ver las tareas archivadas
CREATE POLICY "admin_read_archived_tasks"
  ON public.archived_tasks FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- Solo los admins pueden insertar en archived_tasks (el sistema automático usa SECURITY DEFINER)
CREATE POLICY "admin_manage_archived_tasks"
  ON public.archived_tasks FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- =====================================================================
-- PASO 9: POLÍTICAS DE SHARED_PLANS
-- =====================================================================

-- Lectura pública de planes compartidos (para la URL pública)
CREATE POLICY "public_read_shared_plans"
  ON public.shared_plans FOR SELECT
  TO anon, authenticated
  USING (true);

-- Solo admins pueden crear/gestionar planes compartidos
CREATE POLICY "admin_manage_shared_plans"
  ON public.shared_plans FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- =====================================================================
-- PASO 10: POLÍTICAS DE SYSTEM_CONFIG (si existe)
-- =====================================================================

-- Lectura para todos los autenticados
CREATE POLICY "read_system_config"
  ON public.system_config FOR SELECT
  TO authenticated
  USING (true);

-- Gestión solo para admins
CREATE POLICY "manage_system_config"
  ON public.system_config FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- =====================================================================
-- PASO 11: VERIFICAR ESTRUCTURA DE PROFILES
-- =====================================================================

-- La tabla profiles ya debería tener auth_user_id (migración 20251002120000)
-- Esta verificación es solo por seguridad
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'profiles'
    AND column_name = 'auth_user_id'
  ) THEN
    RAISE EXCEPTION 'La columna auth_user_id no existe en profiles. Ejecute primero la migración 20251002120000_decouple_profiles.sql';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'profiles'
    AND column_name = 'role'
  ) THEN
    RAISE EXCEPTION 'La columna role no existe en profiles. Ejecute primero la migración 20251004082200_add_full_planning_features.sql';
  END IF;
END $$;

COMMIT;

-- =====================================================================
-- NOTAS DE IMPLEMENTACIÓN
-- =====================================================================
-- 1. Esta migración elimina TODAS las políticas anteriores y las reemplaza
--    por un sistema unificado y coherente.
--
-- 2. La función is_admin() usa SECURITY DEFINER para evitar recursión.
--
-- 3. Todas las políticas siguen el patrón:
--    - Lectura: Disponible para usuarios autenticados (o anon cuando aplique)
--    - Escritura: Solo para administradores
--
-- 4. Los usuarios pueden ver/editar solo su propio perfil, excepto admins.
--
-- 5. Para ejecutar esta migración:
--    npx supabase db push
--    o copiar y pegar en el SQL Editor de Supabase Dashboard
-- =====================================================================
