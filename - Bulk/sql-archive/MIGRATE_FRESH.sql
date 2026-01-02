-- =====================================================================
-- MIGRATE_FRESH.sql - Script Limpio para MainEgea V2
-- Generado: 2025-12-24
-- =====================================================================

-- =====================================================================
-- PARTE 1: EXTENSIONES
-- =====================================================================
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =====================================================================
-- PARTE 2: TABLAS BASE
-- =====================================================================

-- Tabla de plantillas
CREATE TABLE IF NOT EXISTS public.templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  config JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de pantallas
CREATE TABLE IF NOT EXISTS public.screens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES public.templates(id),
  name TEXT NOT NULL,
  screen_type TEXT DEFAULT 'kanban',
  screen_group TEXT,
  header_color TEXT DEFAULT '#1a1a2e',
  is_active BOOLEAN DEFAULT true,
  config JSONB DEFAULT '{}',
  dashboard_section TEXT,
  dashboard_order INT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de perfiles de usuario
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Añadir columnas que puedan faltar en profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS auth_user_id UUID;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'operario';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'activo';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS public_url TEXT;

-- Tabla de vehículos
CREATE TABLE IF NOT EXISTS public.vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Añadir columnas que puedan faltar en vehicles
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS plate TEXT;
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS vehicle_type TEXT DEFAULT 'furgoneta';
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS capacity INT;
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS current_km INT DEFAULT 0;
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'disponible';
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;


-- Tabla de tareas (screen_data)
CREATE TABLE IF NOT EXISTS public.screen_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  screen_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Añadir columnas que puedan faltar (compatibilidad con BD existente)
ALTER TABLE public.screen_data ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE public.screen_data ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.screen_data ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pendiente';
ALTER TABLE public.screen_data ADD COLUMN IF NOT EXISTS state TEXT DEFAULT 'pending';
ALTER TABLE public.screen_data ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'normal';
ALTER TABLE public.screen_data ADD COLUMN IF NOT EXISTS start_date DATE;
ALTER TABLE public.screen_data ADD COLUMN IF NOT EXISTS end_date DATE;
ALTER TABLE public.screen_data ADD COLUMN IF NOT EXISTS assigned_to UUID;
ALTER TABLE public.screen_data ADD COLUMN IF NOT EXISTS client_name TEXT;
ALTER TABLE public.screen_data ADD COLUMN IF NOT EXISTS client_address TEXT;
ALTER TABLE public.screen_data ADD COLUMN IF NOT EXISTS client_phone TEXT;
ALTER TABLE public.screen_data ADD COLUMN IF NOT EXISTS order_data JSONB DEFAULT '{}';
ALTER TABLE public.screen_data ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Tabla de asignación de operarios a tareas
CREATE TABLE IF NOT EXISTS public.task_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES public.screen_data(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(task_id, profile_id)
);

-- Tabla de asignación de vehículos a tareas
CREATE TABLE IF NOT EXISTS public.task_vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES public.screen_data(id) ON DELETE CASCADE,
  vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(task_id, vehicle_id)
);

-- Tabla de disponibilidad de usuarios
CREATE TABLE IF NOT EXISTS public.user_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de tareas archivadas
CREATE TABLE IF NOT EXISTS public.archived_tasks (
  id UUID PRIMARY KEY,
  original_data JSONB NOT NULL,
  archived_at TIMESTAMPTZ DEFAULT NOW(),
  archived_by UUID REFERENCES public.profiles(id)
);

-- Tabla de planes compartidos
CREATE TABLE IF NOT EXISTS public.shared_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  plan_data JSONB NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de configuración del sistema
CREATE TABLE IF NOT EXISTS public.system_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value JSONB NOT NULL,
  category TEXT DEFAULT 'general',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de grupos
CREATE TABLE IF NOT EXISTS public.groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  group_type TEXT DEFAULT 'departamento',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de asignación de perfiles a grupos
CREATE TABLE IF NOT EXISTS public.profile_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(profile_id, group_id)
);

-- Tabla de permisos por rol
CREATE TABLE IF NOT EXISTS public.role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role TEXT NOT NULL,
  resource TEXT NOT NULL,
  action TEXT NOT NULL,
  allowed BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(role, resource, action)
);

-- Tabla de sesiones de usuario
CREATE TABLE IF NOT EXISTS public.user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  last_activity TIMESTAMPTZ DEFAULT NOW(),
  device_info JSONB DEFAULT '{}'
);

-- Tabla de mensajes directos
CREATE TABLE IF NOT EXISTS public.direct_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  recipient_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de logs de auditoría
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  action TEXT NOT NULL,
  resource TEXT,
  resource_id UUID,
  details JSONB DEFAULT '{}',
  ip_address TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================================
-- PARTE 3: ÍNDICES
-- =====================================================================
CREATE INDEX IF NOT EXISTS idx_screen_data_screen_id ON public.screen_data(screen_id);
CREATE INDEX IF NOT EXISTS idx_screen_data_status ON public.screen_data(status);
CREATE INDEX IF NOT EXISTS idx_screen_data_state ON public.screen_data(state);
CREATE INDEX IF NOT EXISTS idx_screen_data_start_date ON public.screen_data(start_date);
CREATE INDEX IF NOT EXISTS idx_screen_data_end_date ON public.screen_data(end_date);
CREATE INDEX IF NOT EXISTS idx_screens_screen_type ON public.screens(screen_type);
CREATE INDEX IF NOT EXISTS idx_screens_screen_group ON public.screens(screen_group);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_status ON public.profiles(status);
CREATE INDEX IF NOT EXISTS idx_profiles_auth_user_id ON public.profiles(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_task_profiles_task_id ON public.task_profiles(task_id);
CREATE INDEX IF NOT EXISTS idx_task_profiles_profile_id ON public.task_profiles(profile_id);
CREATE INDEX IF NOT EXISTS idx_task_vehicles_task_id ON public.task_vehicles(task_id);
CREATE INDEX IF NOT EXISTS idx_task_vehicles_vehicle_id ON public.task_vehicles(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_direct_messages_sender ON public.direct_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_direct_messages_recipient ON public.direct_messages(recipient_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);

-- =====================================================================
-- PARTE 4: FUNCIONES HELPER
-- =====================================================================

-- Función para verificar si el usuario actual es admin (SECURITY DEFINER evita recursión)
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

-- Función para verificar si es admin o manager
CREATE OR REPLACE FUNCTION public.is_admin_or_manager()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE auth_user_id = auth.uid()
    AND role IN ('admin', 'manager')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Función para obtener el profile_id del usuario actual
CREATE OR REPLACE FUNCTION public.get_current_profile_id()
RETURNS UUID AS $$
BEGIN
  RETURN (SELECT id FROM public.profiles WHERE auth_user_id = auth.uid() LIMIT 1);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger a tablas principales
DROP TRIGGER IF EXISTS update_templates_updated_at ON public.templates;
CREATE TRIGGER update_templates_updated_at BEFORE UPDATE ON public.templates
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS update_screens_updated_at ON public.screens;
CREATE TRIGGER update_screens_updated_at BEFORE UPDATE ON public.screens
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS update_vehicles_updated_at ON public.vehicles;
CREATE TRIGGER update_vehicles_updated_at BEFORE UPDATE ON public.vehicles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS update_screen_data_updated_at ON public.screen_data;
CREATE TRIGGER update_screen_data_updated_at BEFORE UPDATE ON public.screen_data
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- =====================================================================
-- PARTE 5: HABILITAR RLS
-- =====================================================================
ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.screens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.screen_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.archived_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shared_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.direct_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- =====================================================================
-- PARTE 6: POLÍTICAS RLS
-- =====================================================================

-- TEMPLATES
DROP POLICY IF EXISTS "templates_read" ON public.templates;
CREATE POLICY "templates_read" ON public.templates FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "templates_manage" ON public.templates;
CREATE POLICY "templates_manage" ON public.templates FOR ALL TO authenticated 
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- SCREENS
DROP POLICY IF EXISTS "screens_read" ON public.screens;
CREATE POLICY "screens_read" ON public.screens FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "screens_manage" ON public.screens;
CREATE POLICY "screens_manage" ON public.screens FOR ALL TO authenticated 
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- PROFILES
DROP POLICY IF EXISTS "profiles_read_own" ON public.profiles;
CREATE POLICY "profiles_read_own" ON public.profiles FOR SELECT TO authenticated 
  USING (auth_user_id = auth.uid());

DROP POLICY IF EXISTS "profiles_read_all" ON public.profiles;
CREATE POLICY "profiles_read_all" ON public.profiles FOR SELECT TO authenticated 
  USING (public.is_admin_or_manager());

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated 
  USING (auth_user_id = auth.uid()) WITH CHECK (auth_user_id = auth.uid());

DROP POLICY IF EXISTS "profiles_manage" ON public.profiles;
CREATE POLICY "profiles_manage" ON public.profiles FOR ALL TO authenticated 
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- VEHICLES
DROP POLICY IF EXISTS "vehicles_read" ON public.vehicles;
CREATE POLICY "vehicles_read" ON public.vehicles FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "vehicles_manage" ON public.vehicles;
CREATE POLICY "vehicles_manage" ON public.vehicles FOR ALL TO authenticated 
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- SCREEN_DATA (Tareas)
DROP POLICY IF EXISTS "screen_data_read" ON public.screen_data;
CREATE POLICY "screen_data_read" ON public.screen_data FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "screen_data_manage" ON public.screen_data;
CREATE POLICY "screen_data_manage" ON public.screen_data FOR ALL TO authenticated 
  USING (public.is_admin_or_manager()) WITH CHECK (public.is_admin_or_manager());

-- TASK_PROFILES
DROP POLICY IF EXISTS "task_profiles_read" ON public.task_profiles;
CREATE POLICY "task_profiles_read" ON public.task_profiles FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "task_profiles_manage" ON public.task_profiles;
CREATE POLICY "task_profiles_manage" ON public.task_profiles FOR ALL TO authenticated 
  USING (public.is_admin_or_manager()) WITH CHECK (public.is_admin_or_manager());

-- TASK_VEHICLES
DROP POLICY IF EXISTS "task_vehicles_read" ON public.task_vehicles;
CREATE POLICY "task_vehicles_read" ON public.task_vehicles FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "task_vehicles_manage" ON public.task_vehicles;
CREATE POLICY "task_vehicles_manage" ON public.task_vehicles FOR ALL TO authenticated 
  USING (public.is_admin_or_manager()) WITH CHECK (public.is_admin_or_manager());

-- USER_AVAILABILITY
DROP POLICY IF EXISTS "availability_read" ON public.user_availability;
CREATE POLICY "availability_read" ON public.user_availability FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "availability_manage" ON public.user_availability;
CREATE POLICY "availability_manage" ON public.user_availability FOR ALL TO authenticated 
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ARCHIVED_TASKS
DROP POLICY IF EXISTS "archived_tasks_read" ON public.archived_tasks;
CREATE POLICY "archived_tasks_read" ON public.archived_tasks FOR SELECT TO authenticated 
  USING (public.is_admin());

DROP POLICY IF EXISTS "archived_tasks_manage" ON public.archived_tasks;
CREATE POLICY "archived_tasks_manage" ON public.archived_tasks FOR ALL TO authenticated 
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- SHARED_PLANS
DROP POLICY IF EXISTS "shared_plans_read" ON public.shared_plans;
CREATE POLICY "shared_plans_read" ON public.shared_plans FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "shared_plans_manage" ON public.shared_plans;
CREATE POLICY "shared_plans_manage" ON public.shared_plans FOR ALL TO authenticated 
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- SYSTEM_CONFIG
DROP POLICY IF EXISTS "system_config_read" ON public.system_config;
CREATE POLICY "system_config_read" ON public.system_config FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "system_config_manage" ON public.system_config;
CREATE POLICY "system_config_manage" ON public.system_config FOR ALL TO authenticated 
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- GROUPS
DROP POLICY IF EXISTS "groups_read" ON public.groups;
CREATE POLICY "groups_read" ON public.groups FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "groups_manage" ON public.groups;
CREATE POLICY "groups_manage" ON public.groups FOR ALL TO authenticated 
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- PROFILE_GROUPS
DROP POLICY IF EXISTS "profile_groups_read" ON public.profile_groups;
CREATE POLICY "profile_groups_read" ON public.profile_groups FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "profile_groups_manage" ON public.profile_groups;
CREATE POLICY "profile_groups_manage" ON public.profile_groups FOR ALL TO authenticated 
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ROLE_PERMISSIONS
DROP POLICY IF EXISTS "role_permissions_read" ON public.role_permissions;
CREATE POLICY "role_permissions_read" ON public.role_permissions FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "role_permissions_manage" ON public.role_permissions;
CREATE POLICY "role_permissions_manage" ON public.role_permissions FOR ALL TO authenticated 
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- USER_SESSIONS
DROP POLICY IF EXISTS "user_sessions_read_own" ON public.user_sessions;
CREATE POLICY "user_sessions_read_own" ON public.user_sessions FOR SELECT TO authenticated 
  USING (profile_id = public.get_current_profile_id());

DROP POLICY IF EXISTS "user_sessions_manage" ON public.user_sessions;
CREATE POLICY "user_sessions_manage" ON public.user_sessions FOR ALL TO authenticated 
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- DIRECT_MESSAGES
DROP POLICY IF EXISTS "messages_read_own" ON public.direct_messages;
CREATE POLICY "messages_read_own" ON public.direct_messages FOR SELECT TO authenticated 
  USING (sender_id = public.get_current_profile_id() OR recipient_id = public.get_current_profile_id());

DROP POLICY IF EXISTS "messages_send" ON public.direct_messages;
CREATE POLICY "messages_send" ON public.direct_messages FOR INSERT TO authenticated 
  WITH CHECK (sender_id = public.get_current_profile_id());

DROP POLICY IF EXISTS "messages_update_own" ON public.direct_messages;
CREATE POLICY "messages_update_own" ON public.direct_messages FOR UPDATE TO authenticated 
  USING (recipient_id = public.get_current_profile_id());

-- AUDIT_LOGS
DROP POLICY IF EXISTS "audit_logs_read" ON public.audit_logs;
CREATE POLICY "audit_logs_read" ON public.audit_logs FOR SELECT TO authenticated 
  USING (public.is_admin());

DROP POLICY IF EXISTS "audit_logs_insert" ON public.audit_logs;
CREATE POLICY "audit_logs_insert" ON public.audit_logs FOR INSERT TO authenticated 
  WITH CHECK (true);

-- =====================================================================
-- PARTE 7: VISTA DETALLADA DE TAREAS
-- =====================================================================
DROP VIEW IF EXISTS public.detailed_tasks;
CREATE OR REPLACE VIEW public.detailed_tasks AS
SELECT 
  sd.id,
  sd.screen_id,
  sd.title,
  sd.description,
  sd.status,
  sd.state,
  sd.priority,
  sd.start_date,
  sd.end_date,
  sd.client_name,
  sd.client_address,
  sd.client_phone,
  sd.order_data,
  sd.metadata,
  sd.created_at,
  sd.updated_at,
  s.name AS screen_name,
  s.screen_type,
  s.screen_group,
  COALESCE(
    (SELECT jsonb_agg(jsonb_build_object(
      'id', p.id,
      'name', p.name,
      'role', p.role,
      'avatar_url', p.avatar_url
    ))
    FROM public.task_profiles tp
    JOIN public.profiles p ON tp.profile_id = p.id
    WHERE tp.task_id = sd.id),
    '[]'::jsonb
  ) AS assigned_profiles,
  COALESCE(
    (SELECT jsonb_agg(jsonb_build_object(
      'id', v.id,
      'name', v.name,
      'plate', v.plate
    ))
    FROM public.task_vehicles tv
    JOIN public.vehicles v ON tv.vehicle_id = v.id
    WHERE tv.task_id = sd.id),
    '[]'::jsonb
  ) AS assigned_vehicles
FROM public.screen_data sd
LEFT JOIN public.screens s ON sd.screen_id = s.id;

-- =====================================================================
-- PARTE 8: FUNCIÓN UPSERT_TASK
-- =====================================================================
CREATE OR REPLACE FUNCTION public.upsert_task(
  p_id UUID DEFAULT NULL,
  p_screen_id UUID DEFAULT NULL,
  p_title TEXT DEFAULT NULL,
  p_description TEXT DEFAULT NULL,
  p_status TEXT DEFAULT 'pendiente',
  p_state TEXT DEFAULT 'pending',
  p_priority TEXT DEFAULT 'normal',
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL,
  p_client_name TEXT DEFAULT NULL,
  p_client_address TEXT DEFAULT NULL,
  p_client_phone TEXT DEFAULT NULL,
  p_order_data JSONB DEFAULT '{}',
  p_metadata JSONB DEFAULT '{}',
  p_profile_ids UUID[] DEFAULT NULL,
  p_vehicle_ids UUID[] DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_task_id UUID;
  v_profile_id UUID;
  v_vehicle_id UUID;
BEGIN
  -- Verificar permisos
  IF NOT public.is_admin_or_manager() THEN
    RAISE EXCEPTION 'No tienes permisos para gestionar tareas';
  END IF;

  -- Insert o update
  IF p_id IS NULL THEN
    INSERT INTO public.screen_data (
      screen_id, title, description, status, state, priority,
      start_date, end_date, client_name, client_address, client_phone,
      order_data, metadata
    ) VALUES (
      p_screen_id, p_title, p_description, p_status, p_state, p_priority,
      p_start_date, p_end_date, p_client_name, p_client_address, p_client_phone,
      p_order_data, p_metadata
    ) RETURNING id INTO v_task_id;
  ELSE
    UPDATE public.screen_data SET
      screen_id = COALESCE(p_screen_id, screen_id),
      title = COALESCE(p_title, title),
      description = COALESCE(p_description, description),
      status = COALESCE(p_status, status),
      state = COALESCE(p_state, state),
      priority = COALESCE(p_priority, priority),
      start_date = COALESCE(p_start_date, start_date),
      end_date = COALESCE(p_end_date, end_date),
      client_name = COALESCE(p_client_name, client_name),
      client_address = COALESCE(p_client_address, client_address),
      client_phone = COALESCE(p_client_phone, client_phone),
      order_data = COALESCE(p_order_data, order_data),
      metadata = COALESCE(p_metadata, metadata)
    WHERE id = p_id
    RETURNING id INTO v_task_id;
  END IF;

  -- Actualizar asignaciones de operarios
  IF p_profile_ids IS NOT NULL THEN
    DELETE FROM public.task_profiles WHERE task_id = v_task_id;
    FOREACH v_profile_id IN ARRAY p_profile_ids LOOP
      INSERT INTO public.task_profiles (task_id, profile_id) VALUES (v_task_id, v_profile_id);
    END LOOP;
  END IF;

  -- Actualizar asignaciones de vehículos
  IF p_vehicle_ids IS NOT NULL THEN
    DELETE FROM public.task_vehicles WHERE task_id = v_task_id;
    FOREACH v_vehicle_id IN ARRAY p_vehicle_ids LOOP
      INSERT INTO public.task_vehicles (task_id, vehicle_id) VALUES (v_task_id, v_vehicle_id);
    END LOOP;
  END IF;

  RETURN v_task_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.upsert_task TO authenticated;

-- =====================================================================
-- PARTE 9: FUNCIÓN PARA CREAR USUARIO EN REGISTRO
-- =====================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_existing_profile_id UUID;
BEGIN
  -- Buscar si ya existe un perfil con este email
  SELECT id INTO v_existing_profile_id 
  FROM public.profiles 
  WHERE email = NEW.email;
  
  IF v_existing_profile_id IS NOT NULL THEN
    -- Vincular el perfil existente con el nuevo usuario
    UPDATE public.profiles 
    SET auth_user_id = NEW.id 
    WHERE id = v_existing_profile_id;
  ELSE
    -- Crear nuevo perfil
    INSERT INTO public.profiles (auth_user_id, email, name, role)
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
      'operario'
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para crear perfil automáticamente
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================================================================
-- PARTE 10: DATOS INICIALES
-- =====================================================================

-- Insertar configuración del sistema por defecto
INSERT INTO public.system_config (key, value, category) VALUES
  ('app_name', '"MainEgea V2"', 'general'),
  ('default_screen_type', '"kanban"', 'screens'),
  ('enable_notifications', 'true', 'features')
ON CONFLICT (key) DO NOTHING;

-- Insertar permisos por rol
INSERT INTO public.role_permissions (role, resource, action, allowed) VALUES
  ('admin', '*', '*', true),
  ('manager', 'tasks', '*', true),
  ('manager', 'profiles', 'read', true),
  ('manager', 'vehicles', 'read', true),
  ('responsable', 'tasks', 'read', true),
  ('responsable', 'tasks', 'update', true),
  ('operario', 'tasks', 'read', true)
ON CONFLICT (role, resource, action) DO NOTHING;

-- =====================================================================
-- FIN DEL SCRIPT
-- =====================================================================
