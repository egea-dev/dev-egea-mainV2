-- =====================================================================
-- SCRIPT CONSOLIDADO FINAL: POLÍTICAS RLS MAIN DATABASE
-- =====================================================================
-- Fecha: 12 de enero de 2026
-- Versión: 2.0 Final
-- Objetivo: Configurar políticas de seguridad RLS para todas las tablas
-- Base de datos: Supabase MAIN
-- IMPORTANTE: Ejecutar DESPUÉS de 01_schema.sql
-- =====================================================================

BEGIN;

-- =====================================================================
-- HABILITAR RLS EN TODAS LAS TABLAS
-- =====================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.screens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.screen_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.screen_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.archived_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shared_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.communication_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.direct_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_sessions ENABLE ROW LEVEL SECURITY;

-- =====================================================================
-- FUNCIONES HELPER PARA VERIFICACIÓN DE PERMISOS
-- =====================================================================

-- Función para verificar si el usuario es admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE auth_user_id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- Función para verificar si el usuario es responsable o admin
CREATE OR REPLACE FUNCTION public.is_manager_or_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE auth_user_id = auth.uid() AND role IN ('admin', 'responsable', 'manager')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

GRANT EXECUTE ON FUNCTION public.is_manager_or_admin() TO authenticated;

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

DROP POLICY IF EXISTS "admins_can_manage_profiles" ON public.profiles;
CREATE POLICY "admins_can_manage_profiles"
  ON public.profiles FOR ALL
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

DROP POLICY IF EXISTS "managers_can_manage_vehicles" ON public.vehicles;
CREATE POLICY "managers_can_manage_vehicles"
  ON public.vehicles FOR ALL
  TO authenticated
  USING (public.is_manager_or_admin())
  WITH CHECK (public.is_manager_or_admin());

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
-- POLÍTICAS PARA screen_groups
-- =====================================================================

DROP POLICY IF EXISTS "anyone_can_view_active_screen_groups" ON public.screen_groups;
CREATE POLICY "anyone_can_view_active_screen_groups"
  ON public.screen_groups FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

DROP POLICY IF EXISTS "admins_can_manage_screen_groups" ON public.screen_groups;
CREATE POLICY "admins_can_manage_screen_groups"
  ON public.screen_groups FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- =====================================================================
-- POLÍTICAS PARA screen_data (tareas)
-- =====================================================================

DROP POLICY IF EXISTS "anyone_can_view_active_screen_data" ON public.screen_data;
CREATE POLICY "anyone_can_view_active_screen_data"
  ON public.screen_data FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.screens 
      WHERE screens.id = screen_data.screen_id 
      AND screens.is_active = true
    )
  );

DROP POLICY IF EXISTS "managers_can_manage_screen_data" ON public.screen_data;
CREATE POLICY "managers_can_manage_screen_data"
  ON public.screen_data FOR ALL
  TO authenticated
  USING (public.is_manager_or_admin())
  WITH CHECK (public.is_manager_or_admin());

-- =====================================================================
-- POLÍTICAS PARA task_profiles
-- =====================================================================

DROP POLICY IF EXISTS "authenticated_can_view_task_profiles" ON public.task_profiles;
CREATE POLICY "authenticated_can_view_task_profiles"
  ON public.task_profiles FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "managers_can_manage_task_profiles" ON public.task_profiles;
CREATE POLICY "managers_can_manage_task_profiles"
  ON public.task_profiles FOR ALL
  TO authenticated
  USING (public.is_manager_or_admin())
  WITH CHECK (public.is_manager_or_admin());

-- =====================================================================
-- POLÍTICAS PARA task_vehicles
-- =====================================================================

DROP POLICY IF EXISTS "authenticated_can_view_task_vehicles" ON public.task_vehicles;
CREATE POLICY "authenticated_can_view_task_vehicles"
  ON public.task_vehicles FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "managers_can_manage_task_vehicles" ON public.task_vehicles;
CREATE POLICY "managers_can_manage_task_vehicles"
  ON public.task_vehicles FOR ALL
  TO authenticated
  USING (public.is_manager_or_admin())
  WITH CHECK (public.is_manager_or_admin());

-- =====================================================================
-- POLÍTICAS PARA archived_tasks
-- =====================================================================

DROP POLICY IF EXISTS "managers_can_view_archived_tasks" ON public.archived_tasks;
CREATE POLICY "managers_can_view_archived_tasks"
  ON public.archived_tasks FOR SELECT
  TO authenticated
  USING (public.is_manager_or_admin());

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

DROP POLICY IF EXISTS "managers_can_view_all_availability" ON public.user_availability;
CREATE POLICY "managers_can_view_all_availability"
  ON public.user_availability FOR SELECT
  TO authenticated
  USING (public.is_manager_or_admin());

DROP POLICY IF EXISTS "managers_can_manage_availability" ON public.user_availability;
CREATE POLICY "managers_can_manage_availability"
  ON public.user_availability FOR ALL
  TO authenticated
  USING (public.is_manager_or_admin())
  WITH CHECK (public.is_manager_or_admin());

-- =====================================================================
-- POLÍTICAS PARA groups
-- =====================================================================

DROP POLICY IF EXISTS "authenticated_can_view_groups" ON public.groups;
CREATE POLICY "authenticated_can_view_groups"
  ON public.groups FOR SELECT
  TO authenticated
  USING (is_active = true);

DROP POLICY IF EXISTS "managers_can_manage_groups" ON public.groups;
CREATE POLICY "managers_can_manage_groups"
  ON public.groups FOR ALL
  TO authenticated
  USING (public.is_manager_or_admin())
  WITH CHECK (public.is_manager_or_admin());

-- =====================================================================
-- POLÍTICAS PARA profile_groups
-- =====================================================================

DROP POLICY IF EXISTS "users_can_view_own_profile_groups" ON public.profile_groups;
CREATE POLICY "users_can_view_own_profile_groups"
  ON public.profile_groups FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = profile_groups.profile_id
      AND profiles.auth_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "managers_can_manage_profile_groups" ON public.profile_groups;
CREATE POLICY "managers_can_manage_profile_groups"
  ON public.profile_groups FOR ALL
  TO authenticated
  USING (public.is_manager_or_admin())
  WITH CHECK (public.is_manager_or_admin());

-- =====================================================================
-- POLÍTICAS PARA shared_plans
-- =====================================================================

DROP POLICY IF EXISTS "anyone_can_view_valid_shared_plans" ON public.shared_plans;
CREATE POLICY "anyone_can_view_valid_shared_plans"
  ON public.shared_plans FOR SELECT
  TO anon, authenticated
  USING (expires_at > NOW());

DROP POLICY IF EXISTS "managers_can_manage_shared_plans" ON public.shared_plans;
CREATE POLICY "managers_can_manage_shared_plans"
  ON public.shared_plans FOR ALL
  TO authenticated
  USING (public.is_manager_or_admin())
  WITH CHECK (public.is_manager_or_admin());

-- =====================================================================
-- POLÍTICAS PARA task_notifications
-- =====================================================================

DROP POLICY IF EXISTS "users_can_view_own_notifications" ON public.task_notifications;
CREATE POLICY "users_can_view_own_notifications"
  ON public.task_notifications FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = task_notifications.profile_id
      AND profiles.auth_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "users_can_update_own_notifications" ON public.task_notifications;
CREATE POLICY "users_can_update_own_notifications"
  ON public.task_notifications FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = task_notifications.profile_id
      AND profiles.auth_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "managers_can_manage_notifications" ON public.task_notifications;
CREATE POLICY "managers_can_manage_notifications"
  ON public.task_notifications FOR ALL
  TO authenticated
  USING (public.is_manager_or_admin())
  WITH CHECK (public.is_manager_or_admin());

-- =====================================================================
-- POLÍTICAS PARA communication_logs
-- =====================================================================

DROP POLICY IF EXISTS "managers_can_view_communication_logs" ON public.communication_logs;
CREATE POLICY "managers_can_view_communication_logs"
  ON public.communication_logs FOR SELECT
  TO authenticated
  USING (public.is_manager_or_admin());

DROP POLICY IF EXISTS "admins_can_manage_communication_logs" ON public.communication_logs;
CREATE POLICY "admins_can_manage_communication_logs"
  ON public.communication_logs FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- =====================================================================
-- POLÍTICAS PARA direct_messages
-- =====================================================================

DROP POLICY IF EXISTS "users_can_view_own_messages" ON public.direct_messages;
CREATE POLICY "users_can_view_own_messages"
  ON public.direct_messages FOR SELECT
  TO authenticated
  USING (
    sender_id IN (SELECT id FROM public.profiles WHERE auth_user_id = auth.uid())
    OR recipient_id IN (SELECT id FROM public.profiles WHERE auth_user_id = auth.uid())
  );

DROP POLICY IF EXISTS "users_can_send_messages" ON public.direct_messages;
CREATE POLICY "users_can_send_messages"
  ON public.direct_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_id IN (SELECT id FROM public.profiles WHERE auth_user_id = auth.uid())
  );

DROP POLICY IF EXISTS "users_can_update_own_messages" ON public.direct_messages;
CREATE POLICY "users_can_update_own_messages"
  ON public.direct_messages FOR UPDATE
  TO authenticated
  USING (
    recipient_id IN (SELECT id FROM public.profiles WHERE auth_user_id = auth.uid())
  );

-- =====================================================================
-- POLÍTICAS PARA system_config
-- =====================================================================

DROP POLICY IF EXISTS "authenticated_can_view_system_config" ON public.system_config;
CREATE POLICY "authenticated_can_view_system_config"
  ON public.system_config FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "admins_can_manage_system_config" ON public.system_config;
CREATE POLICY "admins_can_manage_system_config"
  ON public.system_config FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- =====================================================================
-- POLÍTICAS PARA role_permissions
-- =====================================================================

DROP POLICY IF EXISTS "authenticated_can_view_role_permissions" ON public.role_permissions;
CREATE POLICY "authenticated_can_view_role_permissions"
  ON public.role_permissions FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "admins_can_manage_role_permissions" ON public.role_permissions;
CREATE POLICY "admins_can_manage_role_permissions"
  ON public.role_permissions FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- =====================================================================
-- POLÍTICAS PARA work_sites
-- =====================================================================

DROP POLICY IF EXISTS "authenticated_can_view_work_sites" ON public.work_sites;
CREATE POLICY "authenticated_can_view_work_sites"
  ON public.work_sites FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "managers_can_manage_work_sites" ON public.work_sites;
CREATE POLICY "managers_can_manage_work_sites"
  ON public.work_sites FOR ALL
  TO authenticated
  USING (public.is_manager_or_admin())
  WITH CHECK (public.is_manager_or_admin());

-- =====================================================================
-- POLÍTICAS PARA work_sessions
-- =====================================================================

DROP POLICY IF EXISTS "users_can_view_own_work_sessions" ON public.work_sessions;
CREATE POLICY "users_can_view_own_work_sessions"
  ON public.work_sessions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = work_sessions.profile_id
      AND profiles.auth_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "managers_can_view_all_work_sessions" ON public.work_sessions;
CREATE POLICY "managers_can_view_all_work_sessions"
  ON public.work_sessions FOR SELECT
  TO authenticated
  USING (public.is_manager_or_admin());

DROP POLICY IF EXISTS "users_can_manage_own_work_sessions" ON public.work_sessions;
CREATE POLICY "users_can_manage_own_work_sessions"
  ON public.work_sessions FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = work_sessions.profile_id
      AND profiles.auth_user_id = auth.uid()
    )
  );

-- =====================================================================
-- TRIGGER PARA CREAR PERFIL AUTOMÁTICAMENTE
-- =====================================================================

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

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================================================================
-- PERMISOS DE TABLA
-- =====================================================================

GRANT USAGE ON SCHEMA public TO authenticated, anon;
GRANT ALL ON public.profiles TO authenticated;
GRANT SELECT ON public.vehicles TO authenticated;
GRANT SELECT ON public.templates TO authenticated;
GRANT SELECT ON public.screens TO authenticated;
GRANT SELECT ON public.screen_groups TO authenticated;
GRANT SELECT ON public.screen_data TO authenticated, anon;
GRANT SELECT ON public.task_profiles TO authenticated;
GRANT SELECT ON public.task_vehicles TO authenticated;
GRANT SELECT ON public.groups TO authenticated;
GRANT SELECT ON public.shared_plans TO authenticated, anon;
GRANT SELECT ON public.role_permissions TO authenticated;
GRANT SELECT ON public.system_config TO authenticated;

COMMIT;

-- =====================================================================
-- NOTAS DE IMPLEMENTACIÓN
-- =====================================================================
-- 1. Todas las tablas tienen RLS habilitado
-- 2. Las políticas siguen el principio de mínimo privilegio
-- 3. Los usuarios anónimos solo pueden ver datos públicos
-- 4. Los managers y admins tienen permisos extendidos
-- 5. Se crea automáticamente un perfil cuando un usuario se registra
-- 6. Las funciones helper usan SECURITY DEFINER para evitar recursión
-- =====================================================================
