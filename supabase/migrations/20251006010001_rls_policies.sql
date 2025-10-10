-- =====================================================================
-- MIGRACIÓN: POLÍTICAS DE SEGURIDAD RLS (ROW LEVEL SECURITY)
-- =====================================================================
-- Fecha: 2025-10-06
-- Objetivo: Configurar políticas de seguridad para todas las tablas de forma idempotente.
-- =====================================================================

BEGIN;

-- =====================================================================
-- HABILITAR RLS EN TODAS LAS TABLAS
-- =====================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.screens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.screen_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.archived_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shared_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_config ENABLE ROW LEVEL SECURITY;

-- =====================================================================
-- FUNCIÓN HELPER PARA VERIFICAR SI ES ADMIN
-- =====================================================================

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  -- This function is safe because it's SECURITY DEFINER and uses EXISTS.
  RETURN EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE auth_user_id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Otorgar permisos de ejecución a usuarios autenticados
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- =====================================================================
-- POLÍTICAS PARA profiles
-- =====================================================================

DROP POLICY IF EXISTS "users_can_view_own_profile" ON public.profiles;
CREATE POLICY "users_can_view_own_profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth_user_id = auth.uid());

DROP POLICY IF EXISTS "users_can_update_own_profile" ON public.profiles;
CREATE POLICY "users_can_update_own_profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth_user_id = auth.uid())
  WITH CHECK (auth_user_id = auth.uid());

-- NOTE: Admin policies for SELECT and ALL were removed to prevent RLS recursion.
-- A different pattern (e.g., RPC call with SECURITY DEFINER) should be used for admin views.
DROP POLICY IF EXISTS "admins_can_view_all_profiles" ON public.profiles;
DROP POLICY IF EXISTS "admins_can_manage_all_profiles" ON public.profiles;

-- Admins can still write/delete any profile.
CREATE POLICY "admins_can_write_all_profiles"
  ON public.profiles FOR INSERT, UPDATE, DELETE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- =====================================================================
-- POLÍTICAS PARA vehicles
-- =====================================================================

DROP POLICY IF EXISTS "authenticated_can_view_vehicles" ON public.vehicles;
CREATE POLICY "authenticated_can_view_vehicles"
  ON public.vehicles FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "admins_can_manage_vehicles" ON public.vehicles;
CREATE POLICY "admins_can_manage_vehicles"
  ON public.vehicles FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- =====================================================================
-- POLÍTICAS PARA templates
-- =====================================================================

DROP POLICY IF EXISTS "authenticated_can_view_templates" ON public.templates;
CREATE POLICY "authenticated_can_view_templates"
  ON public.templates FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "admins_can_manage_templates" ON public.templates;
CREATE POLICY "admins_can_manage_templates"
  ON public.templates FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- =====================================================================
-- POLÍTICAS PARA screens
-- =====================================================================

DROP POLICY IF EXISTS "anyone_can_view_active_screens" ON public.screens;
CREATE POLICY "anyone_can_view_active_screens"
  ON public.screens FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

DROP POLICY IF EXISTS "admins_can_manage_screens" ON public.screens;
CREATE POLICY "admins_can_manage_screens"
  ON public.screens FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- =====================================================================
-- POLÍTICAS PARA screen_data (tareas)
-- =====================================================================

DROP POLICY IF EXISTS "anyone_can_view_screen_data" ON public.screen_data;
CREATE POLICY "anyone_can_view_screen_data"
  ON public.screen_data FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.screens 
      WHERE screens.id = screen_data.screen_id 
      AND screens.is_active = true
    )
  );

DROP POLICY IF EXISTS "admins_can_manage_screen_data" ON public.screen_data;
CREATE POLICY "admins_can_manage_screen_data"
  ON public.screen_data FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- =====================================================================
-- POLÍTICAS PARA task_profiles
-- =====================================================================

DROP POLICY IF EXISTS "authenticated_can_view_task_profiles" ON public.task_profiles;
CREATE POLICY "authenticated_can_view_task_profiles"
  ON public.task_profiles FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "admins_can_manage_task_profiles" ON public.task_profiles;
CREATE POLICY "admins_can_manage_task_profiles"
  ON public.task_profiles FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- =====================================================================
-- POLÍTICAS PARA task_vehicles
-- =====================================================================

DROP POLICY IF EXISTS "authenticated_can_view_task_vehicles" ON public.task_vehicles;
CREATE POLICY "authenticated_can_view_task_vehicles"
  ON public.task_vehicles FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "admins_can_manage_task_vehicles" ON public.task_vehicles;
CREATE POLICY "admins_can_manage_task_vehicles"
  ON public.task_vehicles FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- =====================================================================
-- POLÍTICAS PARA archived_tasks
-- =====================================================================

DROP POLICY IF EXISTS "admins_can_view_archived_tasks" ON public.archived_tasks;
CREATE POLICY "admins_can_view_archived_tasks"
  ON public.archived_tasks FOR SELECT
  TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "admins_can_manage_archived_tasks" ON public.archived_tasks;
CREATE POLICY "admins_can_manage_archived_tasks"
  ON public.archived_tasks FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- =====================================================================
-- POLÍTICAS PARA user_availability
-- =====================================================================

DROP POLICY IF EXISTS "users_can_view_own_availability" ON public.user_availability;
CREATE POLICY "users_can_view_own_availability"
  ON public.user_availability FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = user_availability.profile_id
      AND profiles.auth_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "admins_can_view_all_availability" ON public.user_availability;
CREATE POLICY "admins_can_view_all_availability"
  ON public.user_availability FOR SELECT
  TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "admins_can_manage_availability" ON public.user_availability;
CREATE POLICY "admins_can_manage_availability"
  ON public.user_availability FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- =====================================================================
-- POLÍTICAS PARA shared_plans
-- =====================================================================

DROP POLICY IF EXISTS "anyone_can_view_shared_plans" ON public.shared_plans;
CREATE POLICY "anyone_can_view_shared_plans"
  ON public.shared_plans FOR SELECT
  TO anon, authenticated
  USING (expires_at > NOW());

DROP POLICY IF EXISTS "admins_can_manage_shared_plans" ON public.shared_plans;
CREATE POLICY "admins_can_manage_shared_plans"
  ON public.shared_plans FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- =====================================================================
-- POLÍTICAS PARA system_config
-- =====================================================================

DROP POLICY IF EXISTS "authenticated_can_view_system_config" ON public.system_config;
CREATE POLICY "authenticated_can_view_system_config"
  ON public.system_config FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "admins_can_manage__system_config" ON public.system_config;
CREATE POLICY "admins_can_manage_system_config"
  ON public.system_config FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- =====================================================================
-- FUNCIONES HELPER ADICIONALES
-- =====================================================================

-- Función para verificar si un usuario puede acceder a una tarea específica
CREATE OR REPLACE FUNCTION public.can_access_task(task_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  task_screen_id UUID;
  screen_is_active BOOLEAN;
BEGIN
  -- Obtener el screen_id de la tarea
  SELECT screen_id INTO task_screen_id
  FROM public.screen_data
  WHERE id = task_id;
  
  -- Verificar si la pantalla está activa
  SELECT is_active INTO screen_is_active
  FROM public.screens
  WHERE id = task_screen_id;
  
  -- Si es admin o la pantalla está activa, puede acceder
  RETURN (public.is_admin() OR screen_is_active = true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.can_access_task TO authenticated;

-- =====================================================================
-- TRIGGER PARA CREAR PERFIL AUTOMÁTICAMENTE
-- =====================================================================

-- Función para crear perfil cuando se registra un nuevo usuario
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (auth_user_id, full_name, email, role, status)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'operario'),
    'activo'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para crear perfil automáticamente
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================================================================
-- PERMISOS DE TABLA
-- =====================================================================

-- Permisos para usuarios autenticados
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON public.profiles TO authenticated;
GRANT SELECT ON public.vehicles TO authenticated;
GRANT SELECT ON public.templates TO authenticated;
GRANT SELECT ON public.screens TO authenticated;
GRANT SELECT ON public.screen_data TO authenticated;
GRANT SELECT ON public.task_profiles TO authenticated;
GRANT SELECT ON public.task_vehicles TO authenticated;
GRANT SELECT ON public.user_availability TO authenticated;
GRANT SELECT ON public.shared_plans TO authenticated;
GRANT SELECT ON public.system_config TO authenticated;

-- Permisos para usuarios anónimos
GRANT USAGE ON SCHEMA public TO anon;
GRANT SELECT ON public.screens TO anon;
GRANT SELECT ON public.screen_data TO anon;
GRANT SELECT ON public.shared_plans TO anon;

-- =====================================================================
-- FUNCIONES DE UTILIDAD
-- =====================================================================

-- Función para obtener el perfil del usuario actual
CREATE OR REPLACE FUNCTION public.current_profile()
RETURNS TABLE (
  id UUID,
  auth_user_id UUID,
  full_name TEXT,
  email TEXT,
  role TEXT,
  status TEXT,
  avatar_url TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT p.id, p.auth_user_id, p.full_name, p.email, p.role, p.status, p.avatar_url
  FROM public.profiles p
  WHERE p.auth_user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.current_profile() TO authenticated;

COMMIT;

-- =====================================================================
-- NOTAS DE IMPLEMENTACIÓN
-- =====================================================================
-- 1. Todas las tablas tienen RLS habilitado
-- 2. Las políticas siguen el principio de mínimo privilegio
-- 3. Los usuarios anónimos solo pueden ver datos públicos (pantallas activas)
-- 4. Los usuarios autenticados pueden ver más información según su rol
-- 5. Los admins tienen control total sobre todas las tablas
-- 6. Se crea automáticamente un perfil cuando un usuario se registra
-- 7. Las funciones helper usan SECURITY DEFINER para evitar recursión
-- =====================================================================