-- =====================================================================
-- MIGRACIÓN: Agregar rol 'manager' al sistema
-- Fecha: 2 de enero de 2026
-- Autor: Sistema de Mejoras EGEA
-- Descripción: Agrega el rol 'manager' a todas las tablas y constraints
--              relevantes del sistema de permisos
-- =====================================================================

BEGIN;

-- =====================================================================
-- PARTE 1: ACTUALIZAR CONSTRAINTS DE TABLAS
-- =====================================================================

-- 1.1 Actualizar constraint de la tabla profiles
ALTER TABLE public.profiles 
  DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE public.profiles 
  ADD CONSTRAINT profiles_role_check 
  CHECK (role IN ('admin', 'manager', 'responsable', 'operario'));

COMMENT ON CONSTRAINT profiles_role_check ON public.profiles IS 
  'Constraint actualizado el 2026-01-02 para incluir rol manager';

-- 1.2 Actualizar constraint de la tabla role_permissions
ALTER TABLE public.role_permissions 
  DROP CONSTRAINT IF EXISTS role_permissions_role_check;

ALTER TABLE public.role_permissions 
  ADD CONSTRAINT role_permissions_role_check 
  CHECK (role IN ('admin', 'manager', 'responsable', 'operario'));

COMMENT ON CONSTRAINT role_permissions_role_check ON public.role_permissions IS 
  'Constraint actualizado el 2026-01-02 para incluir rol manager';

-- 1.3 Validar y corregir nombre de columna (page -> resource)
DO $$
BEGIN
  -- Si existe la columna 'page', renombrarla a 'resource'
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'role_permissions' 
    AND column_name = 'page'
  ) THEN
    ALTER TABLE public.role_permissions RENAME COLUMN page TO resource;
    RAISE NOTICE 'Columna page renombrada a resource';
  END IF;
END $$;

-- =====================================================================
-- PARTE 2: INSERTAR PERMISOS POR DEFECTO PARA MANAGER
-- =====================================================================

-- 2.1 Permisos para recursos principales
INSERT INTO public.role_permissions (role, resource, can_view, can_edit, can_delete)
VALUES
  -- Dashboard: acceso completo
  ('manager', 'dashboard', true, true, true),
  
  -- Users: puede ver y editar, pero NO eliminar
  ('manager', 'users', true, true, false),
  
  -- Vehicles: acceso completo
  ('manager', 'vehicles', true, true, true),
  
  -- Installations: acceso completo
  ('manager', 'installations', true, true, true),
  
  -- Screens: acceso completo
  ('manager', 'screens', true, true, true),
  
  -- Templates: acceso completo
  ('manager', 'templates', true, true, true),
  
  -- Communications: acceso completo
  ('manager', 'communications', true, true, true),
  
  -- Archive: puede ver, pero NO crear ni eliminar
  ('manager', 'archive', true, false, false),
  
  -- Admin: acceso completo
  ('manager', 'admin', true, true, true),
  
  -- Comercial: acceso completo
  ('manager', 'comercial', true, true, true),
  
  -- Production: acceso completo
  ('manager', 'production', true, true, true),
  
  -- Warehouse: acceso completo
  ('manager', 'warehouse', true, true, true),
  
  -- Shipping/Envios: acceso completo
  ('manager', 'envios', true, true, true),
  
  -- Kiosk: acceso completo
  ('manager', 'kiosk', true, true, true),
  
  -- Global Calendar: acceso completo
  ('manager', 'calendario-global', true, true, true),
  
  -- Management/Gestion: acceso completo
  ('manager', 'gestion', true, true, true),
  
  -- Data Management: acceso completo
  ('manager', 'data', true, true, true),
  
  -- Settings: acceso completo
  ('manager', 'settings', true, true, true),
  
  -- SLA Config: acceso completo
  ('manager', 'sla-config', true, true, true),
  
  -- System Log: solo lectura
  ('manager', 'system-log', true, false, false)
  
ON CONFLICT (role, resource) DO UPDATE SET
  can_view = EXCLUDED.can_view,
  can_edit = EXCLUDED.can_edit,
  can_delete = EXCLUDED.can_delete,
  updated_at = NOW();

-- =====================================================================
-- PARTE 3: ACTUALIZAR FUNCIÓN is_admin PARA INCLUIR MANAGER
-- =====================================================================

-- 3.1 Crear función is_admin_or_manager (nueva función auxiliar)
CREATE OR REPLACE FUNCTION public.is_admin_or_manager()
RETURNS BOOLEAN AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role INTO user_role
  FROM public.profiles
  WHERE auth_user_id = auth.uid();
  
  RETURN (user_role = 'admin' OR user_role = 'manager');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

GRANT EXECUTE ON FUNCTION public.is_admin_or_manager() TO authenticated;

COMMENT ON FUNCTION public.is_admin_or_manager() IS 
  'Verifica si el usuario actual es admin o manager';

-- 3.2 Crear función get_user_role (nueva función auxiliar)
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role INTO user_role
  FROM public.profiles
  WHERE auth_user_id = auth.uid();
  
  RETURN COALESCE(user_role, 'operario');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

GRANT EXECUTE ON FUNCTION public.get_user_role() TO authenticated;

COMMENT ON FUNCTION public.get_user_role() IS 
  'Obtiene el rol del usuario actual, retorna operario por defecto';

-- =====================================================================
-- PARTE 4: ACTUALIZAR POLÍTICAS RLS PARA INCLUIR MANAGER
-- =====================================================================

-- 4.1 Actualizar políticas de vehicles para incluir manager
DROP POLICY IF EXISTS "Admins can manage vehicles" ON public.vehicles;
CREATE POLICY "Admins and managers can manage vehicles" ON public.vehicles 
  FOR ALL USING (public.is_admin_or_manager());

-- 4.2 Actualizar políticas de templates para incluir manager
DROP POLICY IF EXISTS "Admins can manage templates" ON public.templates;
CREATE POLICY "Admins and managers can manage templates" ON public.templates 
  FOR ALL USING (public.is_admin_or_manager());

-- 4.3 Actualizar políticas de screens para incluir manager
DROP POLICY IF EXISTS "Admins can manage screens" ON public.screens;
CREATE POLICY "Admins and managers can manage screens" ON public.screens 
  FOR ALL USING (public.is_admin_or_manager());

-- 4.4 Actualizar políticas de screen_data para incluir manager
DROP POLICY IF EXISTS "Admins can manage screen_data" ON public.screen_data;
CREATE POLICY "Admins and managers can manage screen_data" ON public.screen_data 
  FOR ALL USING (public.is_admin_or_manager());

-- 4.5 Actualizar políticas de task_profiles para incluir manager
DROP POLICY IF EXISTS "Admins can manage task_profiles" ON public.task_profiles;
CREATE POLICY "Admins and managers can manage task_profiles" ON public.task_profiles 
  FOR ALL USING (public.is_admin_or_manager());

-- 4.6 Actualizar políticas de task_vehicles para incluir manager
DROP POLICY IF EXISTS "Admins can manage task_vehicles" ON public.task_vehicles;
CREATE POLICY "Admins and managers can manage task_vehicles" ON public.task_vehicles 
  FOR ALL USING (public.is_admin_or_manager());

-- 4.7 Actualizar políticas de archived_tasks para incluir manager
DROP POLICY IF EXISTS "Admins can view archived_tasks" ON public.archived_tasks;
CREATE POLICY "Admins and managers can view archived_tasks" ON public.archived_tasks 
  FOR SELECT USING (public.is_admin_or_manager());

DROP POLICY IF EXISTS "Admins can manage archived_tasks" ON public.archived_tasks;
CREATE POLICY "Admins and managers can manage archived_tasks" ON public.archived_tasks 
  FOR ALL USING (public.is_admin_or_manager());

-- 4.8 Actualizar políticas de user_availability para incluir manager
DROP POLICY IF EXISTS "Admins can manage availability" ON public.user_availability;
CREATE POLICY "Admins and managers can manage availability" ON public.user_availability 
  FOR ALL USING (public.is_admin_or_manager());

-- 4.9 Actualizar políticas de shared_plans para incluir manager
DROP POLICY IF EXISTS "Admins can manage shared_plans" ON public.shared_plans;
CREATE POLICY "Admins and managers can manage shared_plans" ON public.shared_plans 
  FOR ALL USING (public.is_admin_or_manager());

-- 4.10 Actualizar políticas de system_config para incluir manager
DROP POLICY IF EXISTS "Admins can manage system_config" ON public.system_config;
CREATE POLICY "Admins and managers can manage system_config" ON public.system_config 
  FOR ALL USING (public.is_admin_or_manager());

-- 4.11 Actualizar políticas de groups para incluir manager
DROP POLICY IF EXISTS "Admins can manage groups" ON public.groups;
CREATE POLICY "Admins and managers can manage groups" ON public.groups 
  FOR ALL USING (public.is_admin_or_manager());

-- 4.12 Actualizar políticas de profile_groups para incluir manager
DROP POLICY IF EXISTS "Admins can manage profile_groups" ON public.profile_groups;
CREATE POLICY "Admins and managers can manage profile_groups" ON public.profile_groups 
  FOR ALL USING (public.is_admin_or_manager());

-- 4.13 Actualizar políticas de task_notifications para incluir manager
DROP POLICY IF EXISTS "Admins can manage task_notifications" ON public.task_notifications;
CREATE POLICY "Admins and managers can manage task_notifications" ON public.task_notifications 
  FOR ALL USING (public.is_admin_or_manager());

-- 4.14 Actualizar políticas de user_sessions para incluir manager
DROP POLICY IF EXISTS "Admins can manage user_sessions" ON public.user_sessions;
CREATE POLICY "Admins and managers can manage user_sessions" ON public.user_sessions 
  FOR ALL USING (public.is_admin_or_manager());

-- 4.15 Actualizar políticas de role_permissions para incluir manager
DROP POLICY IF EXISTS "Admins can manage role_permissions" ON public.role_permissions;
CREATE POLICY "Admins and managers can manage role_permissions" ON public.role_permissions 
  FOR ALL USING (public.is_admin_or_manager());

-- 4.16 Actualizar políticas de communication_logs para incluir manager
DROP POLICY IF EXISTS "Admins can manage communication_logs" ON public.communication_logs;
CREATE POLICY "Admins and managers can manage communication_logs" ON public.communication_logs 
  FOR ALL USING (public.is_admin_or_manager());

-- =====================================================================
-- PARTE 5: CREAR ÍNDICES PARA OPTIMIZACIÓN
-- =====================================================================

-- 5.1 Índice para búsquedas por rol en profiles
CREATE INDEX IF NOT EXISTS idx_profiles_role_manager 
  ON public.profiles(role) 
  WHERE role = 'manager';

COMMENT ON INDEX idx_profiles_role_manager IS 
  'Índice parcial para búsquedas rápidas de usuarios manager';

-- 5.2 Índice para búsquedas por rol en role_permissions
CREATE INDEX IF NOT EXISTS idx_role_permissions_manager 
  ON public.role_permissions(role, resource) 
  WHERE role = 'manager';

COMMENT ON INDEX idx_role_permissions_manager IS 
  'Índice parcial para búsquedas rápidas de permisos de manager';

-- =====================================================================
-- PARTE 6: VALIDACIÓN Y LOGGING
-- =====================================================================

-- 6.1 Verificar que los constraints se aplicaron correctamente
DO $$
DECLARE
  profiles_constraint_exists BOOLEAN;
  permissions_constraint_exists BOOLEAN;
BEGIN
  -- Verificar constraint de profiles
  SELECT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'profiles_role_check' 
    AND contype = 'c'
  ) INTO profiles_constraint_exists;
  
  -- Verificar constraint de role_permissions
  SELECT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'role_permissions_role_check' 
    AND contype = 'c'
  ) INTO permissions_constraint_exists;
  
  -- Log de resultados
  IF profiles_constraint_exists AND permissions_constraint_exists THEN
    RAISE NOTICE 'MIGRACIÓN EXITOSA: Constraints actualizados correctamente';
  ELSE
    RAISE WARNING 'MIGRACIÓN PARCIAL: Algunos constraints no se aplicaron';
  END IF;
END $$;

-- 6.2 Contar permisos insertados para manager
DO $$
DECLARE
  manager_permissions_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO manager_permissions_count
  FROM public.role_permissions
  WHERE role = 'manager';
  
  RAISE NOTICE 'Permisos insertados para manager: %', manager_permissions_count;
END $$;

COMMIT;

-- =====================================================================
-- FIN DE LA MIGRACIÓN
-- =====================================================================

-- Log final
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'MIGRACIÓN COMPLETADA: 20260102_add_manager_role';
  RAISE NOTICE 'Fecha: %', NOW();
  RAISE NOTICE '========================================';
END $$;
