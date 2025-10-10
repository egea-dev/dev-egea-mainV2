-- =====================================================================
-- MIGRACIÓN: AÑADIR ROL MANAGER Y ACTUALIZAR JERARQUÍA DE PERMISOS
-- =====================================================================
-- Fecha: 2025-10-09
-- Objetivo: Añadir rol manager y establecer jerarquía de 4 niveles
-- =====================================================================

BEGIN;

-- Añadir nuevo rol manager al tipo enum
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'manager';

-- Crear tabla de permisos por rol
CREATE TABLE IF NOT EXISTS public.role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role TEXT NOT NULL CHECK (role IN ('admin', 'manager', 'responsable', 'operario')),
  resource TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('view', 'create', 'edit', 'delete')),
  granted BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(role, resource, action)
);

-- Insertar permisos por defecto según jerarquía
-- Admin tiene acceso completo a todo
INSERT INTO public.role_permissions (role, resource, action, granted) VALUES
  ('admin', 'dashboard', 'view', true),
  ('admin', 'dashboard', 'create', true),
  ('admin', 'dashboard', 'edit', true),
  ('admin', 'dashboard', 'delete', true),
  ('admin', 'users', 'view', true),
  ('admin', 'users', 'create', true),
  ('admin', 'users', 'edit', true),
  ('admin', 'users', 'delete', true),
  ('admin', 'vehicles', 'view', true),
  ('admin', 'vehicles', 'create', true),
  ('admin', 'vehicles', 'edit', true),
  ('admin', 'vehicles', 'delete', true),
  ('admin', 'installations', 'view', true),
  ('admin', 'installations', 'create', true),
  ('admin', 'installations', 'edit', true),
  ('admin', 'installations', 'delete', true),
  ('admin', 'templates', 'view', true),
  ('admin', 'templates', 'create', true),
  ('admin', 'templates', 'edit', true),
  ('admin', 'templates', 'delete', true),
  ('admin', 'screens', 'view', true),
  ('admin', 'screens', 'create', true),
  ('admin', 'screens', 'edit', true),
  ('admin', 'screens', 'delete', true),
  ('admin', 'communications', 'view', true),
  ('admin', 'communications', 'create', true),
  ('admin', 'communications', 'edit', true),
  ('admin', 'communications', 'delete', true),
  ('admin', 'archive', 'view', true),
  ('admin', 'archive', 'create', true),
  ('admin', 'archive', 'edit', true),
  ('admin', 'archive', 'delete', true)

ON CONFLICT (role, resource, action) DO NOTHING;

-- Manager tiene acceso casi completo pero no puede adminsitrar usuarios admin
INSERT INTO public.role_permissions (role, resource, action, granted) VALUES
  ('manager', 'dashboard', 'view', true),
  ('manager', 'dashboard', 'create', true),
  ('manager', 'dashboard', 'edit', true),
  ('manager', 'dashboard', 'delete', true),
  ('manager', 'users', 'view', true),
  ('manager', 'users', 'create', true),
  ('manager', 'users', 'edit', true),
  ('manager', 'users', 'delete', false),
  ('manager', 'vehicles', 'view', true),
  ('manager', 'vehicles', 'create', true),
  ('manager', 'vehicles', 'edit', true),
  ('manager', 'vehicles', 'delete', true),
  ('manager', 'installations', 'view', true),
  ('manager', 'installations', 'create', true),
  ('manager', 'installations', 'edit', true),
  ('manager', 'installations', 'delete', true),
  ('manager', 'templates', 'view', true),
  ('manager', 'templates', 'create', true),
  ('manager', 'templates', 'edit', true),
  ('manager', 'templates', 'delete', true),
  ('manager', 'screens', 'view', true),
  ('manager', 'screens', 'create', true),
  ('manager', 'screens', 'edit', true),
  ('manager', 'screens', 'delete', true),
  ('manager', 'communications', 'view', true),
  ('manager', 'communications', 'create', true),
  ('manager', 'communications', 'edit', true),
  ('manager', 'communications', 'delete', true),
  ('manager', 'archive', 'view', true),
  ('manager', 'archive', 'create', false),
  ('manager', 'archive', 'edit', true),
  ('manager', 'archive', 'delete', false)

ON CONFLICT (role, resource, action) DO NOTHING;

-- Responsable puede gestión de operaciones básicas
INSERT INTO public.role_permissions (role, resource, action, granted) VALUES
  ('responsable', 'dashboard', 'view', true),
  ('responsable', 'dashboard', 'create', true),
  ('responsable', 'dashboard', 'edit', true),
  ('responsable', 'dashboard', 'delete', false),
  ('responsable', 'users', 'view', true),
  ('responsable', 'users', 'create', false),
  ('responsable', 'users', 'edit', false),
  ('responsable', 'users', 'delete', false),
  ('responsable', 'vehicles', 'view', true),
  ('responsable', 'vehicles', 'create', true),
  ('responsable', 'vehicles', 'edit', true),
  ('responsable', 'vehicles', 'delete', false),
  ('responsable', 'installations', 'view', true),
  ('responsable', 'installations', 'create', true),
  ('responsable', 'installations', 'edit', true),
  ('responsable', 'installations', 'delete', false),
  ('responsable', 'templates', 'view', true),
  ('responsable', 'templates', 'create', false),
  ('responsable', 'templates', 'edit', false),
  ('responsable', 'templates', 'delete', false),
  ('responsable', 'screens', 'view', true),
  ('responsable', 'screens', 'create', false),
  ('responsable', 'screens', 'edit', false),
  ('responsable', 'screens', 'delete', false),
  ('responsable', 'communications', 'view', true),
  ('responsable', 'communications', 'create', true),
  ('responsable', 'communications', 'edit', true),
  ('responsable', 'communications', 'delete', false),
  ('responsable', 'archive', 'view', true),
  ('responsable', 'archive', 'create', false),
  ('responsable', 'archive', 'edit', false),
  ('responsable', 'archive', 'delete', false)

ON CONFLICT (role, resource, action) DO NOTHING;

-- Operario solo puede ver y editar sus tareas asignadas
INSERT INTO public.role_permissions (role, resource, action, granted) VALUES
  ('operario', 'dashboard', 'view', true),
  ('operario', 'dashboard', 'create', false),
  ('operario', 'dashboard', 'edit', false),
  ('operario', 'dashboard', 'delete', false),
  ('operario', 'users', 'view', false),
  ('operario', 'users', 'create', false),
  ('operario', 'users', 'edit', false),
  ('operario', 'users', 'delete', false),
  ('operario', 'vehicles', 'view', true),
  ('operario', 'vehicles', 'create', false),
  ('operario', 'vehicles', 'edit', false),
  ('operario', 'vehicles', 'delete', false),
  ('operario', 'installaciones', 'view', true),
  ('operario', 'installaciones', 'create', false),
  ('operario', 'installaciones', 'edit', false),
  ('operario', 'installaciones', 'delete', false),
  ('operario', 'templates', 'view', false),
  ('operario', 'templates', 'create', false),
  ('operario', 'templates', 'edit', false),
  ('operario', 'templates', 'delete', false),
  ('operario', 'screens', 'view', true),
  ('operario', 'screens', 'create', false),
  ('operario', 'screens', 'edit', false),
  ('operario', 'screens', 'delete', false),
  ('operario', 'communications', 'view', true),
  ('operario', 'communications', 'create', true),
  ('operario', 'communications', 'edit', true),
  ('operario', 'communications', 'delete', false),
  ('operario', 'archive', 'view', false),
  ('operario', 'archive', 'create', false),
  ('operario', 'archive', 'edit', false),
  ('operario', 'archive', 'delete', false)

ON CONFLICT (role, resource, action) DO NOTHING;

-- Función para verificar permisos
CREATE OR REPLACE FUNCTION public.has_permission(p_user_role TEXT, p_resource TEXT, p_action TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  v_granted BOOLEAN;
  v_user_id UUID;
BEGIN
  SELECT granted INTO v_granted
  FROM public.role_permissions
  WHERE role = p_user_role
  AND resource = p_resource
  AND action = p_action;

  v_granted := COALESCE(v_granted, false);

  -- Get user_id for logging
  SELECT id INTO v_user_id
  FROM public.profiles
  WHERE auth_user_id = auth.uid();

  -- Insert audit log for permission check
  INSERT INTO public.audit_logs (user_id, action, resource, action_performed, result, details)
  VALUES (
    v_user_id,
    'permission_check',
    p_resource,
    p_action,
    CASE WHEN v_granted THEN 'granted' ELSE 'denied' END,
    jsonb_build_object('user_role', p_user_role)
  );

  RETURN v_granted;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para verificar si el rol puede gestionar otro rol
CREATE OR REPLACE FUNCTION public.can_manage_role(p_manager_role TEXT, p_target_role TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  -- Admin puede gestionar todos
  IF p_manager_role = 'admin' THEN
    RETURN true;
  END IF;
  
  -- Manager puede gestionar responsables y operarios
  IF p_manager_role = 'manager' AND p_target_role IN ('responsable', 'operario') THEN
    RETURN true;
  END IF;
  
  -- Responsable puede gestionar operarios
  IF p_manager_role = 'responsable' AND p_target_role = 'operario' THEN
    RETURN true;
  END IF;
  
  -- Operario no puede gestionar a nadie
  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Actualizar políticas RLS para incluir el rol manager
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

-- Política para que usuarios con rol manager o admin puedan ver todos los perfiles
CREATE POLICY "admin_manager_can_view_all_profiles" ON public.profiles
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.auth_user_id = auth.uid() 
      AND p.role IN ('admin', 'manager')
    )
  );

-- Política para que admin y manager puedan gestionar perfiles con restricciones
CREATE POLICY "admin_manager_can_manage_profiles" ON public.profiles
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.auth_user_id = auth.uid() 
      AND p.role IN ('admin', 'manager')
      AND (
        p.role = 'admin' OR -- Admin puede gestionar todos
        (
          p.role = 'manager' AND -- Manager con restricciones
          NOT EXISTS (
            SELECT 1 FROM public.profiles target 
            WHERE target.id = public.profiles.id 
            AND target.role = 'admin'
          )
        )
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.auth_user_id = auth.uid() 
      AND p.role IN ('admin', 'manager')
      AND (
        p.role = 'admin' OR -- Admin puede crear todos
        (
          p.role = 'manager' AND -- Manager con restricciones
          public.profiles.role != 'admin'
        )
      )
    )
  );

-- Actualizar función is_admin para incluir managers
CREATE OR REPLACE FUNCTION public.is_admin_or_manager()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE auth_user_id = auth.uid() AND role IN ('admin', 'manager')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Permisos para las nuevas funciones
GRANT EXECUTE ON FUNCTION public.has_permission TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_manage_role TO authenticated;

-- Índices
CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON public.role_permissions(role);
CREATE INDEX IF NOT EXISTS idx_role_permissions_resource ON public.role_permissions(resource);
CREATE INDEX IF NOT EXISTS idx_role_permissions_role_resource ON public.role_permissions(role, resource);

-- Comentarios
COMMENT ON TABLE public.role_permissions IS 'Permisos configurables por rol y recurso';
COMMENT ON COLUMN public.role_permissions.role IS 'Rol del usuario: admin, manager, responsable, operario';
COMMENT ON COLUMN public.role_permissions.resource IS 'Recurso al que se aplica el permiso';
COMMENT ON COLUMN public.role_permissions.action IS 'Acción permitida: view, create, edit, delete';

COMMIT;

-- =====================================================================
-- NOTAS DE IMPLEMENTACIÓN
-- =====================================================================
-- 1. Se añade el rol 'manager' a la jerarquía existente
-- 2. Se establece jerarquía: admin > manager > responsable > operario
-- 3. Se crea tabla de permisos granulares por rol
-- 4. Se actualizan políticas RLS para reflejar nueva jerarquía
-- 5. Managers no pueden administrar usuarios admin
-- 6. Responsables solo pueden gestionar operarios
-- 7. Operarios solo pueden ver sus tareas asignadas
-- =====================================================================