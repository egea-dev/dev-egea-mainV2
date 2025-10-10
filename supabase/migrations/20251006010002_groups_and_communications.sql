-- =====================================================================
-- MIGRACIÓN: TABLAS DE GRUPOS Y COMUNICACIONES
-- =====================================================================
-- Fecha: 2025-10-06
-- Objetivo: Crear tablas para gestión de grupos y comunicaciones
-- =====================================================================

BEGIN;

-- =====================================================================
-- TABLA: groups (grupos de operarios)
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  color TEXT DEFAULT '#3B82F6',
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================================
-- TABLA: profile_groups (relación muchos a muchos: perfiles ↔ grupos)
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.profile_groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'miembro' CHECK (role IN ('líder', 'miembro')),
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(profile_id, group_id)
);

-- =====================================================================
-- TABLA: task_notifications (notificaciones de tareas para operarios)
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.task_notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  task_ids UUID[] NOT NULL,
  plan_date DATE NOT NULL,
  access_token TEXT UNIQUE NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  viewed_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days'),
  created_by UUID REFERENCES public.profiles(id)
);

-- =====================================================================
-- TABLA: user_sessions (sesiones de usuarios para comunicaciones)
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.user_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  session_token TEXT UNIQUE NOT NULL,
  last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_online BOOLEAN DEFAULT true,
  user_agent TEXT,
  ip_address INET,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================================
-- TABLA: role_permissions (permisos por rol y página)
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.role_permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  role TEXT NOT NULL CHECK (role IN ('admin', 'responsable', 'operario')),
  page TEXT NOT NULL,
  can_view BOOLEAN DEFAULT false,
  can_edit BOOLEAN DEFAULT false,
  can_delete BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(role, page)
);

-- =====================================================================
-- TABLA: communication_logs (logs de comunicaciones enviadas)
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.communication_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type TEXT NOT NULL CHECK (type IN ('whatsapp', 'email', 'push')),
  recipient TEXT NOT NULL,
  subject TEXT,
  message TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'failed', 'bounced')),
  sent_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================================
-- ÍNDICES PARA GRUPOS
-- =====================================================================

CREATE INDEX IF NOT EXISTS idx_groups_name ON public.groups(name);
CREATE INDEX IF NOT EXISTS idx_groups_is_active ON public.groups(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_groups_created_by ON public.groups(created_by) WHERE created_by IS NOT NULL;

-- Índices para profile_groups
CREATE INDEX IF NOT EXISTS idx_profile_groups_profile_id ON public.profile_groups(profile_id);
CREATE INDEX IF NOT EXISTS idx_profile_groups_group_id ON public.profile_groups(group_id);
CREATE INDEX IF NOT EXISTS idx_profile_groups_role ON public.profile_groups(role);

-- Índices para task_notifications
CREATE INDEX IF NOT EXISTS idx_task_notifications_profile_id ON public.task_notifications(profile_id);
CREATE INDEX IF NOT EXISTS idx_task_notifications_plan_date ON public.task_notifications(plan_date);
CREATE INDEX IF NOT EXISTS idx_task_notifications_token ON public.task_notifications(access_token);
CREATE INDEX IF NOT EXISTS idx_task_notifications_expires_at ON public.task_notifications(expires_at);
CREATE INDEX IF NOT EXISTS idx_task_notifications_active ON public.task_notifications(expires_at) WHERE expires_at > NOW();

-- Índices para user_sessions
CREATE INDEX IF NOT EXISTS idx_user_sessions_profile_id ON public.user_sessions(profile_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON public.user_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_user_sessions_last_seen ON public.user_sessions(last_seen DESC);
CREATE INDEX IF NOT EXISTS idx_user_sessions_online ON public.user_sessions(is_online) WHERE is_online = true;

-- Índices para role_permissions
CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON public.role_permissions(role);
CREATE INDEX IF NOT EXISTS idx_role_permissions_page ON public.role_permissions(page);
CREATE INDEX IF NOT EXISTS idx_role_permissions_role_page ON public.role_permissions(role, page);

-- Índices para communication_logs
CREATE INDEX IF NOT EXISTS idx_communication_logs_type ON public.communication_logs(type);
CREATE INDEX IF NOT EXISTS idx_communication_logs_status ON public.communication_logs(status);
CREATE INDEX IF NOT EXISTS idx_communication_logs_recipient ON public.communication_logs(recipient);
CREATE INDEX IF NOT EXISTS idx_communication_logs_created_at ON public.communication_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_communication_logs_created_by ON public.communication_logs(created_by) WHERE created_by IS NOT NULL;

-- =====================================================================
-- HABILITAR RLS EN NUEVAS TABLAS
-- =====================================================================

ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.communication_logs ENABLE ROW LEVEL SECURITY;

-- =====================================================================
-- POLÍTICAS RLS PARA groups
-- =====================================================================

-- Todos los autenticados pueden ver grupos activos
CREATE POLICY "authenticated_can_view_groups"
  ON public.groups FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Solo admins pueden gestionar grupos
CREATE POLICY "admins_can_manage_groups"
  ON public.groups FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- =====================================================================
-- POLÍTICAS RLS PARA profile_groups
-- =====================================================================

-- Los usuarios pueden ver sus propias asignaciones de grupo
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

-- Solo admins pueden gestionar asignaciones de grupos
CREATE POLICY "admins_can_manage_profile_groups"
  ON public.profile_groups FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- =====================================================================
-- POLÍTICAS RLS PARA task_notifications
-- =====================================================================

-- Los usuarios pueden ver sus propias notificaciones
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

-- Los usuarios pueden actualizar sus propias notificaciones (marcar como vista)
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

-- Solo admins pueden gestionar notificaciones
CREATE POLICY "admins_can_manage_notifications"
  ON public.task_notifications FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- =====================================================================
-- POLÍTICAS RLS PARA user_sessions
-- =====================================================================

-- Los usuarios pueden ver sus propias sesiones
CREATE POLICY "users_can_view_own_sessions"
  ON public.user_sessions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = user_sessions.profile_id
      AND profiles.auth_user_id = auth.uid()
    )
  );

-- Los usuarios pueden actualizar sus propias sesiones
CREATE POLICY "users_can_update_own_sessions"
  ON public.user_sessions FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = user_sessions.profile_id
      AND profiles.auth_user_id = auth.uid()
    )
  );

-- Solo admins pueden ver todas las sesiones
CREATE POLICY "admins_can_view_all_sessions"
  ON public.user_sessions FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- =====================================================================
-- POLÍTICAS RLS PARA role_permissions
-- =====================================================================

-- Todos los autenticados pueden ver permisos
CREATE POLICY "authenticated_can_view_role_permissions"
  ON public.role_permissions FOR SELECT
  TO authenticated
  USING (true);

-- Solo admins pueden gestionar permisos
CREATE POLICY "admins_can_manage_role_permissions"
  ON public.role_permissions FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- =====================================================================
-- POLÍTICAS RLS PARA communication_logs
-- =====================================================================

-- Los usuarios pueden ver logs de comunicaciones que enviaron
CREATE POLICY "users_can_view_own_communication_logs"
  ON public.communication_logs FOR SELECT
  TO authenticated
  USING (created_by = (
    SELECT id FROM public.profiles WHERE auth_user_id = auth.uid()
  ));

-- Solo admins pueden ver todos los logs
CREATE POLICY "admins_can_view_all_communication_logs"
  ON public.communication_logs FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- Solo admins pueden gestionar logs
CREATE POLICY "admins_can_manage_communication_logs"
  ON public.communication_logs FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- =====================================================================
-- TRIGGERS PARA updated_at
-- =====================================================================

CREATE TRIGGER handle_groups_updated_at
    BEFORE UPDATE ON public.groups
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_user_sessions_updated_at
    BEFORE UPDATE ON public.user_sessions
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_role_permissions_updated_at
    BEFORE UPDATE ON public.role_permissions
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- =====================================================================
-- FUNCIONES DE UTILIDAD
-- =====================================================================

-- Función para obtener grupos de un usuario
CREATE OR REPLACE FUNCTION public.get_user_groups(user_profile_id UUID)
RETURNS TABLE (
  group_id UUID,
  group_name TEXT,
  group_color TEXT,
  role TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    g.id,
    g.name,
    g.color,
    pg.role
  FROM public.profile_groups pg
  JOIN public.groups g ON g.id = pg.group_id
  WHERE pg.profile_id = user_profile_id
    AND g.is_active = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.get_user_groups TO authenticated;

-- Función para verificar permisos de usuario
CREATE OR REPLACE FUNCTION public.has_permission(user_role TEXT, page TEXT, permission TEXT)
RETURNS BOOLEAN AS $
DECLARE
  has_perm BOOLEAN := false;
BEGIN
  SELECT (CASE 
    WHEN permission = 'view' THEN can_view
    WHEN permission = 'edit' THEN can_edit
    WHEN permission = 'delete' THEN can_delete
    ELSE false
  END) INTO has_perm
  FROM public.role_permissions
  WHERE role = user_role AND public.role_permissions.page = page;
  
  RETURN COALESCE(has_perm, false);
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.has_permission TO authenticated;

-- =====================================================================
-- PERMISOS ADICIONALES
-- =====================================================================

GRANT SELECT ON public.groups TO authenticated;
GRANT SELECT ON public.profile_groups TO authenticated;
GRANT SELECT ON public.task_notifications TO authenticated;
GRANT SELECT ON public.user_sessions TO authenticated;
GRANT SELECT ON public.role_permissions TO authenticated;
GRANT SELECT ON public.communication_logs TO authenticated;

COMMIT;

-- =====================================================================
-- NOTAS DE IMPLEMENTACIÓN
-- =====================================================================
-- 1. Estas tablas extienden la funcionalidad base con gestión de grupos
-- 2. Las comunicaciones incluyen logs completos de todos los envíos
-- 3. Los permisos por rol permiten control granular de acceso
-- 4. Las sesiones de usuario permiten presencia en tiempo real
-- 5. Todas las políticas siguen el principio de mínimo privilegio
-- =====================================================================