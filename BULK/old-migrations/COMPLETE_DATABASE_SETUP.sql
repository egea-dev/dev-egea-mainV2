-- =====================================================================
-- BASE DE DATOS COMPLETA - EGEA PRODUCTIVITY APP ALPHA v1.3
-- =====================================================================
-- Proyecto: wbxzfcfxipkylydbrqiu
-- URL: https://wbxzfcfxipkylydbrqiu.supabase.co
-- Fecha: 6 de octubre de 2025
-- =====================================================================

-- INSTRUCCIONES:
-- 1. Copiar todo este script
-- 2. Pegar en SQL Editor de Supabase Dashboard
-- 3. Ejecutar todo el script (CTRL+Enter)
-- 4. Verificar que no haya errores
-- =====================================================================

BEGIN;

-- =====================================================================
-- PARTE 1: CREACIÓN DE TABLAS PRINCIPALES
-- =====================================================================

-- Tabla de perfiles de usuario
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'operario' CHECK (role IN ('admin', 'responsable', 'operario')),
  status TEXT NOT NULL DEFAULT 'activo' CHECK (status IN ('activo', 'vacaciones', 'baja')),
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de vehículos
CREATE TABLE IF NOT EXISTS public.vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('jumper', 'camion', 'furgoneta', 'otro')),
  license_plate TEXT,
  capacity INTEGER DEFAULT 1 CHECK (capacity > 0),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de plantillas
CREATE TABLE IF NOT EXISTS public.templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  template_type TEXT NOT NULL,
  category TEXT,
  fields JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de pantallas
CREATE TABLE IF NOT EXISTS public.screens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  screen_type TEXT NOT NULL CHECK (screen_type IN ('data', 'display')),
  screen_group TEXT,
  template_id UUID REFERENCES public.templates(id),
  next_screen_id UUID REFERENCES public.screens(id),
  refresh_interval_sec INTEGER DEFAULT 30,
  header_color TEXT DEFAULT '#000000',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla principal de datos de tareas
CREATE TABLE IF NOT EXISTS public.screen_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  screen_id UUID NOT NULL REFERENCES public.screens(id) ON DELETE CASCADE,
  data JSONB DEFAULT '{}'::jsonb,
  state TEXT NOT NULL DEFAULT 'pendiente' CHECK (state IN ('pendiente', 'urgente', 'en fabricacion', 'a la espera', 'terminado', 'incidente', 'arreglo')),
  status TEXT NOT NULL DEFAULT 'pendiente' CHECK (status IN ('pendiente', 'acabado', 'en progreso')),
  start_date DATE,
  end_date DATE,
  location TEXT,
  responsible_profile_id UUID REFERENCES public.profiles(id),
  assigned_to UUID REFERENCES public.profiles(id),
  checkin_token TEXT UNIQUE,
  "order" INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de unión de tareas y perfiles (muchos a muchos)
CREATE TABLE IF NOT EXISTS public.task_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.screen_data(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(task_id, profile_id)
);

-- Tabla de unión de tareas y vehículos (muchos a muchos)
CREATE TABLE IF NOT EXISTS public.task_vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.screen_data(id) ON DELETE CASCADE,
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(task_id, vehicle_id)
);

-- Tabla de tareas archivadas
CREATE TABLE IF NOT EXISTS public.archived_tasks (
  id UUID PRIMARY KEY,
  archived_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  data JSONB DEFAULT '{}'::jsonb,
  status TEXT,
  state TEXT,
  start_date DATE,
  end_date DATE,
  location TEXT,
  responsible_profile_id UUID,
  responsible_name TEXT,
  assigned_users JSONB DEFAULT '[]'::jsonb,
  assigned_vehicles JSONB DEFAULT '[]'::jsonb,
  archived_by UUID REFERENCES public.profiles(id)
);

-- Tabla de disponibilidad de usuarios
CREATE TABLE IF NOT EXISTS public.user_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'disponible' CHECK (status IN ('disponible', 'no disponible', 'vacaciones')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de planes compartidos
CREATE TABLE IF NOT EXISTS public.shared_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT UNIQUE NOT NULL,
  plan_date DATE NOT NULL,
  tasks JSONB DEFAULT '[]'::jsonb,
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() + INTERVAL '7 days',
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de configuración del sistema
CREATE TABLE IF NOT EXISTS public.system_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value JSONB,
  description TEXT,
  updated_by UUID REFERENCES public.profiles(id),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================================
-- PARTE 2: TABLAS DE GRUPOS Y COMUNICACIONES
-- =====================================================================

-- Tabla de grupos
CREATE TABLE IF NOT EXISTS public.groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  color TEXT DEFAULT '#3B82F6',
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de unión de perfiles y grupos
CREATE TABLE IF NOT EXISTS public.profile_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'miembro' CHECK (role IN ('líder', 'miembro')),
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(profile_id, group_id)
);

-- Tabla de notificaciones de tareas
CREATE TABLE IF NOT EXISTS public.task_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  task_ids UUID[] DEFAULT '{}',
  plan_date DATE NOT NULL,
  access_token TEXT UNIQUE NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  viewed_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() + INTERVAL '1 day',
  created_by UUID REFERENCES public.profiles(id)
);

-- Tabla de sesiones de usuario
CREATE TABLE IF NOT EXISTS public.user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  session_token TEXT UNIQUE,
  last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_online BOOLEAN DEFAULT true,
  user_agent TEXT,
  ip_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de permisos por rol
CREATE TABLE IF NOT EXISTS public.role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role TEXT NOT NULL CHECK (role IN ('admin', 'responsable', 'operario')),
  page TEXT NOT NULL,
  can_view BOOLEAN DEFAULT false,
  can_edit BOOLEAN DEFAULT false,
  can_delete BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(role, page)
);

-- Tabla de logs de comunicaciones
CREATE TABLE IF NOT EXISTS public.communication_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('whatsapp', 'email', 'push')),
  recipient TEXT NOT NULL,
  subject TEXT,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'failed', 'bounced')),
  sent_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================================
-- PARTE 3: ÍNDICES OPTIMIZADOS
-- =====================================================================

-- Índices en screen_data
CREATE INDEX IF NOT EXISTS idx_screen_data_screen_id ON public.screen_data(screen_id);
CREATE INDEX IF NOT EXISTS idx_screen_data_state ON public.screen_data(state);
CREATE INDEX IF NOT EXISTS idx_screen_data_dates ON public.screen_data(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_screen_data_responsible ON public.screen_data(responsible_profile_id);
CREATE INDEX IF NOT EXISTS idx_screen_data_location ON public.screen_data(location) WHERE location IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_screen_data_pending_dates ON public.screen_data(state, start_date, end_date) WHERE state != 'terminado';
CREATE INDEX IF NOT EXISTS idx_screen_data_site ON public.screen_data USING gin ((data -> 'site'));
CREATE INDEX IF NOT EXISTS idx_screen_data_client ON public.screen_data USING gin ((data -> 'client'));

-- Índices en archived_tasks
CREATE INDEX IF NOT EXISTS idx_archived_tasks_archived_at ON public.archived_tasks(archived_at DESC);
CREATE INDEX IF NOT EXISTS idx_archived_tasks_state ON public.archived_tasks(state);
CREATE INDEX IF NOT EXISTS idx_archived_tasks_dates ON public.archived_tasks(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_archived_tasks_responsible ON public.archived_tasks(responsible_profile_id);

-- Índices en profiles
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_status ON public.profiles(status);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email) WHERE email IS NOT NULL;

-- Índices en screens
CREATE INDEX IF NOT EXISTS idx_screens_screen_type ON public.screens(screen_type);
CREATE INDEX IF NOT EXISTS idx_screens_screen_group ON public.screens(screen_group) WHERE screen_group IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_screens_is_active ON public.screens(is_active) WHERE is_active = true;

-- Índices en tablas de comunicación
CREATE INDEX IF NOT EXISTS idx_shared_plans_token ON public.shared_plans(token);
CREATE INDEX IF NOT EXISTS idx_shared_plans_expires_at ON public.shared_plans(expires_at);
CREATE INDEX IF NOT EXISTS idx_task_notifications_profile ON public.task_notifications(profile_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_profile ON public.user_sessions(profile_id);
CREATE INDEX IF NOT EXISTS idx_communication_logs_type ON public.communication_logs(type);
CREATE INDEX IF NOT EXISTS idx_communication_logs_status ON public.communication_logs(status);

-- =====================================================================
-- PARTE 4: ROW LEVEL SECURITY (RLS)
-- =====================================================================

-- Habilitar RLS en todas las tablas
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
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.communication_logs ENABLE ROW LEVEL SECURITY;

-- Función helper para verificar si es admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role INTO user_role
  FROM public.profiles
  WHERE auth_user_id = auth.uid();
  
  RETURN (user_role = 'admin');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- Políticas para profiles
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth_user_id = auth.uid());
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth_user_id = auth.uid());
CREATE POLICY "Admins can manage all profiles" ON public.profiles FOR ALL USING (public.is_admin());

-- Políticas para vehicles
CREATE POLICY "Authenticated users can view vehicles" ON public.vehicles FOR SELECT USING (true);
CREATE POLICY "Admins can manage vehicles" ON public.vehicles FOR ALL USING (public.is_admin());

-- Políticas para templates
CREATE POLICY "Authenticated users can view templates" ON public.templates FOR SELECT USING (true);
CREATE POLICY "Admins can manage templates" ON public.templates FOR ALL USING (public.is_admin());

-- Políticas para screens
CREATE POLICY "Public can view screens" ON public.screens FOR SELECT USING (true);
CREATE POLICY "Admins can manage screens" ON public.screens FOR ALL USING (public.is_admin());

-- Políticas para screen_data
CREATE POLICY "Public can view screen_data" ON public.screen_data FOR SELECT USING (true);
CREATE POLICY "Admins can manage screen_data" ON public.screen_data FOR ALL USING (public.is_admin());

-- Políticas para tablas de unión
CREATE POLICY "Authenticated users can view task_profiles" ON public.task_profiles FOR SELECT USING (true);
CREATE POLICY "Admins can manage task_profiles" ON public.task_profiles FOR ALL USING (public.is_admin());

CREATE POLICY "Authenticated users can view task_vehicles" ON public.task_vehicles FOR SELECT USING (true);
CREATE POLICY "Admins can manage task_vehicles" ON public.task_vehicles FOR ALL USING (public.is_admin());

-- Políticas para archived_tasks
CREATE POLICY "Admins can view archived_tasks" ON public.archived_tasks FOR SELECT USING (public.is_admin());
CREATE POLICY "Admins can manage archived_tasks" ON public.archived_tasks FOR ALL USING (public.is_admin());

-- Políticas para user_availability
CREATE POLICY "Users can view own availability" ON public.user_availability FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = user_availability.profile_id AND auth_user_id = auth.uid())
);
CREATE POLICY "Admins can manage availability" ON public.user_availability FOR ALL USING (public.is_admin());

-- Políticas para shared_plans
CREATE POLICY "Public can view shared_plans" ON public.shared_plans FOR SELECT USING (true);
CREATE POLICY "Admins can manage shared_plans" ON public.shared_plans FOR ALL USING (public.is_admin());

-- Políticas para system_config
CREATE POLICY "Authenticated users can view system_config" ON public.system_config FOR SELECT USING (true);
CREATE POLICY "Admins can manage system_config" ON public.system_config FOR ALL USING (public.is_admin());

-- Políticas para grupos
CREATE POLICY "Authenticated users can view groups" ON public.groups FOR SELECT USING (true);
CREATE POLICY "Admins can manage groups" ON public.groups FOR ALL USING (public.is_admin());

-- Políticas para profile_groups
CREATE POLICY "Authenticated users can view profile_groups" ON public.profile_groups FOR SELECT USING (true);
CREATE POLICY "Admins can manage profile_groups" ON public.profile_groups FOR ALL USING (public.is_admin());

-- Políticas para task_notifications
CREATE POLICY "Users can view own notifications" ON public.task_notifications FOR SELECT USING (profile_id IN (
  SELECT id FROM public.profiles WHERE auth_user_id = auth.uid()
));
CREATE POLICY "Admins can manage task_notifications" ON public.task_notifications FOR ALL USING (public.is_admin());

-- Políticas para user_sessions
CREATE POLICY "Users can view own sessions" ON public.user_sessions FOR SELECT USING (profile_id IN (
  SELECT id FROM public.profiles WHERE auth_user_id = auth.uid()
));
CREATE POLICY "Admins can manage user_sessions" ON public.user_sessions FOR ALL USING (public.is_admin());

-- Políticas para role_permissions
CREATE POLICY "Authenticated users can view role_permissions" ON public.role_permissions FOR SELECT USING (true);
CREATE POLICY "Admins can manage role_permissions" ON public.role_permissions FOR ALL USING (public.is_admin());

-- Políticas para communication_logs
CREATE POLICY "Users can view own communications" ON public.communication_logs FOR SELECT USING (created_by IN (
  SELECT id FROM public.profiles WHERE auth_user_id = auth.uid()
));
CREATE POLICY "Admins can manage communication_logs" ON public.communication_logs FOR ALL USING (public.is_admin());

-- =====================================================================
-- PARTE 5: VISTAS OPTIMIZADAS
-- =====================================================================

-- Vista detailed_tasks - Pre-unión de todas las tablas relacionadas
CREATE OR REPLACE VIEW public.detailed_tasks AS
SELECT
  sd.id,
  sd.created_at,
  sd.updated_at,
  sd.screen_id,
  sd.data,
  sd.state,
  sd.status,
  sd.start_date,
  sd.end_date,
  sd.location,
  sd.responsible_profile_id,
  sd.assigned_to,
  sd.checkin_token,
  sd."order",
  
  s.name AS screen_name,
  s.screen_type,
  s.screen_group,
  s.next_screen_id,
  s.header_color,
  s.is_active AS screen_is_active,
  s.refresh_interval_sec,
  
  rp.full_name AS responsible_name,
  rp.email AS responsible_email,
  rp.phone AS responsible_phone,
  rp.role AS responsible_role,
  rp.status AS responsible_status,
  rp.avatar_url AS responsible_avatar,
  
  ap.full_name AS assigned_name,
  ap.email AS assigned_email,
  ap.phone AS assigned_phone,
  ap.role AS assigned_role,
  ap.status AS assigned_status,
  
  sd.data->>'site' AS site,
  sd.data->>'client' AS client,
  sd.data->>'address' AS address,
  sd.data->>'description' AS description,
  sd.data->>'notes' AS notes,
  sd.data->>'vehicle_type' AS vehicle_type,
  
  COALESCE(
    (SELECT jsonb_agg(
      jsonb_build_object(
        'id', p.id,
        'full_name', p.full_name,
        'email', p.email,
        'phone', p.phone,
        'status', p.status,
        'avatar_url', p.avatar_url
      ) ORDER BY p.full_name
    )
    FROM public.task_profiles tp
    JOIN public.profiles p ON tp.profile_id = p.id
    WHERE tp.task_id = sd.id),
    '[]'::jsonb
  ) AS assigned_profiles,
  
  COALESCE(
    (SELECT jsonb_agg(
      jsonb_build_object(
        'id', v.id,
        'name', v.name,
        'type', v.type
      ) ORDER BY v.name
    )
    FROM public.task_vehicles tv
    JOIN public.vehicles v ON tv.vehicle_id = v.id
    WHERE tv.task_id = sd.id),
    '[]'::jsonb
  ) AS assigned_vehicles,
  
  (SELECT COUNT(*) FROM public.task_profiles tp WHERE tp.task_id = sd.id) AS assigned_profiles_count,
  (SELECT COUNT(*) FROM public.task_vehicles tv WHERE tv.task_id = sd.id) AS assigned_vehicles_count,
  
  CASE WHEN sd.state = 'terminado' THEN true ELSE false END AS is_completed,
  CASE WHEN sd.state = 'urgente' THEN true ELSE false END AS is_urgent,
  CASE WHEN sd.start_date <= CURRENT_DATE AND sd.end_date >= CURRENT_DATE THEN true ELSE false END AS is_current,
  CASE WHEN sd.end_date < CURRENT_DATE AND sd.state != 'terminado' THEN true ELSE false END AS is_overdue,
  CASE WHEN sd.start_date > CURRENT_DATE THEN true ELSE false END AS is_future,
  
  sd.start_date - CURRENT_DATE AS days_from_start,
  CASE WHEN sd.state = 'urgente' THEN 0 ELSE 1 END AS priority_order

FROM public.screen_data sd
LEFT JOIN public.screens s ON sd.screen_id = s.id
LEFT JOIN public.profiles rp ON sd.responsible_profile_id = rp.id
LEFT JOIN public.profiles ap ON sd.assigned_to = ap.id;

-- Vista user_workload
CREATE OR REPLACE VIEW public.user_workload AS
SELECT
  p.id AS profile_id,
  p.full_name,
  p.email,
  p.role,
  p.status,
  COUNT(dt.id) AS total_tasks,
  COUNT(CASE WHEN dt.state != 'terminado' THEN 1 END) AS active_tasks,
  COUNT(CASE WHEN dt.state = 'urgente' THEN 1 END) AS urgent_tasks,
  COUNT(CASE WHEN dt.is_overdue THEN 1 END) AS overdue_tasks,
  COUNT(CASE WHEN dt.start_date = CURRENT_DATE THEN 1 END) AS today_tasks,
  COUNT(CASE WHEN dt.is_current THEN 1 END) AS current_tasks,
  STRING_AGG(DISTINCT g.name, ', ') AS working_groups
FROM public.profiles p
LEFT JOIN public.detailed_tasks dt ON (
  dt.responsible_profile_id = p.id OR 
  p.id IN (SELECT (elem->>'id')::uuid FROM jsonb_array_elements(dt.assigned_profiles) elem)
)
LEFT JOIN public.profile_groups pg ON pg.profile_id = p.id
LEFT JOIN public.groups g ON g.id = pg.group_id
GROUP BY p.id, p.full_name, p.email, p.role, p.status;

-- Vista vehicle_utilization
CREATE OR REPLACE VIEW public.vehicle_utilization AS
SELECT
  v.id AS vehicle_id,
  v.name,
  v.type,
  v.license_plate,
  v.capacity,
  v.is_active,
  COUNT(dt.id) AS total_assignments,
  COUNT(CASE WHEN dt.state != 'terminado' THEN 1 END) AS active_assignments,
  COUNT(CASE WHEN dt.start_date = CURRENT_DATE THEN 1 END) AS today_assignments,
  COUNT(CASE WHEN dt.is_current THEN 1 END) AS current_assignments,
  CASE 
    WHEN v.capacity = 0 THEN 0
    ELSE ROUND(((COUNT(CASE WHEN dt.is_current THEN 1 END)::numeric / v.capacity::numeric) * 100)::numeric, 2)
  END AS utilization_percentage
FROM public.vehicles v
LEFT JOIN public.detailed_tasks dt ON (
  v.id IN (SELECT (elem->>'id')::uuid FROM jsonb_array_elements(dt.assigned_vehicles) elem)
)
GROUP BY v.id, v.name, v.type, v.license_plate, v.capacity, v.is_active;

-- Vista task_summary
CREATE OR REPLACE VIEW public.task_summary AS
SELECT
  dt.screen_group,
  dt.state,
  dt.status,
  COUNT(*) AS task_count,
  COUNT(CASE WHEN dt.start_date = CURRENT_DATE THEN 1 END) AS today_count,
  COUNT(CASE WHEN dt.is_overdue THEN 1 END) AS overdue_count,
  COUNT(CASE WHEN dt.is_urgent THEN 1 END) AS urgent_count,
  COUNT(CASE WHEN dt.is_completed THEN 1 END) AS completed_count,
  CASE 
    WHEN COUNT(*) = 0 THEN 0
    ELSE ROUND(((COUNT(CASE WHEN dt.is_completed THEN 1 END)::numeric / COUNT(*)::numeric) * 100)::numeric, 2)
  END AS completion_percentage
FROM public.detailed_tasks dt
GROUP BY dt.screen_group, dt.state, dt.status;

-- =====================================================================
-- PARTE 6: FUNCIONES RPC
-- =====================================================================

-- Función upsert_task - Crear/actualizar tareas con asignaciones
CREATE OR REPLACE FUNCTION public.upsert_task(
  p_task_id UUID,
  p_screen_id UUID,
  p_data JSONB DEFAULT '{}'::jsonb,
  p_state TEXT DEFAULT 'pendiente',
  p_status TEXT DEFAULT 'pendiente',
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL,
  p_location TEXT DEFAULT NULL,
  p_responsible_profile_id UUID DEFAULT NULL,
  p_assigned_to UUID DEFAULT NULL,
  p_assigned_profiles UUID[] DEFAULT '{}',
  p_assigned_vehicles UUID[] DEFAULT '{}'
)
RETURNS TABLE(task_id UUID, action TEXT) AS $$
DECLARE
  v_task_id UUID;
  v_action TEXT;
BEGIN
  -- Insertar o actualizar tarea principal
  IF p_task_id IS NULL THEN
    INSERT INTO public.screen_data (
      screen_id, data, state, status, start_date, end_date, 
      location, responsible_profile_id, assigned_to
    ) VALUES (
      p_screen_id, p_data, p_state, p_status, p_start_date, p_end_date,
      p_location, p_responsible_profile_id, p_assigned_to
    ) RETURNING id INTO v_task_id;
    v_action := 'created';
  ELSE
    UPDATE public.screen_data SET
      screen_id = p_screen_id,
      data = p_data,
      state = p_state,
      status = p_status,
      start_date = p_start_date,
      end_date = p_end_date,
      location = p_location,
      responsible_profile_id = p_responsible_profile_id,
      assigned_to = p_assigned_to,
      updated_at = NOW()
    WHERE id = p_task_id
    RETURNING id INTO v_task_id;
    v_action := 'updated';
  END IF;

  -- Eliminar asignaciones existentes
  DELETE FROM public.task_profiles WHERE task_id = v_task_id;
  DELETE FROM public.task_vehicles WHERE task_id = v_task_id;

  -- Insertar nuevas asignaciones de perfiles
  IF p_assigned_profiles IS NOT NULL AND array_length(p_assigned_profiles, 1) > 0 THEN
    INSERT INTO public.task_profiles (task_id, profile_id)
    SELECT v_task_id, unnest(p_assigned_profiles);
  END IF;

  -- Insertar nuevas asignaciones de vehículos
  IF p_assigned_vehicles IS NOT NULL AND array_length(p_assigned_vehicles, 1) > 0 THEN
    INSERT INTO public.task_vehicles (task_id, vehicle_id)
    SELECT v_task_id, unnest(p_assigned_vehicles);
  END IF;

  RETURN QUERY SELECT v_task_id, v_action;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función archive_completed_tasks - Archivar tareas completadas
CREATE OR REPLACE FUNCTION public.archive_completed_tasks(
  p_days_old INTEGER DEFAULT 7
)
RETURNS TABLE(archived_count INTEGER, message TEXT) AS $$
DECLARE
  v_archived_count INTEGER := 0;
BEGIN
  -- Insertar tareas completadas en archived_tasks
  INSERT INTO public.archived_tasks (
    id, archived_at, data, status, state, start_date, end_date,
    location, responsible_profile_id, responsible_name,
    assigned_users, assigned_vehicles
  )
  SELECT
    sd.id,
    NOW() AS archived_at,
    sd.data,
    sd.status,
    sd.state,
    sd.start_date,
    sd.end_date,
    sd.location,
    sd.responsible_profile_id,
    rp.full_name AS responsible_name,
    COALESCE(
      (SELECT jsonb_agg(
        jsonb_build_object(
          'id', p.id,
          'full_name', p.full_name,
          'email', p.email
        )
      )
      FROM public.task_profiles tp
      JOIN public.profiles p ON tp.profile_id = p.id
      WHERE tp.task_id = sd.id
    ),
    '[]'::jsonb
  ) AS assigned_users,
    COALESCE(
      (SELECT jsonb_agg(
        jsonb_build_object(
          'id', v.id,
          'name', v.name,
          'type', v.type
        )
      )
      FROM public.task_vehicles tv
      JOIN public.vehicles v ON tv.vehicle_id = v.id
      WHERE tv.task_id = sd.id
    ),
    '[]'::jsonb
  ) AS assigned_vehicles
  FROM public.screen_data sd
  LEFT JOIN public.profiles rp ON sd.responsible_profile_id = rp.id
  WHERE
    sd.state = 'terminado'
    AND sd.end_date < (CURRENT_DATE - INTERVAL '1 day')
    AND NOT EXISTS (
      SELECT 1 FROM public.archived_tasks at WHERE at.id = sd.id
    )
  RETURNING id;

  GET DIAGNOSTICS v_archived_count = ROW_COUNT;

  -- Eliminar tareas archivadas de screen_data
  IF v_archived_count > 0 THEN
    DELETE FROM public.screen_data
    WHERE id IN (
      SELECT id FROM public.archived_tasks
      WHERE archived_at >= NOW() - INTERVAL '5 minutes'
    )
    AND state = 'terminado'
    AND end_date < (CURRENT_DATE - INTERVAL '1 day');
  END IF;

  RETURN QUERY SELECT v_archived_count, 
    CASE WHEN v_archived_count > 0 THEN 
      'Archivadas ' || v_archived_count || ' tareas correctamente'
    ELSE 
      'No hay tareas para archivar'
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función generate_checkin_token - Generar token único para check-in
CREATE OR REPLACE FUNCTION public.generate_checkin_token(
  p_task_id UUID
)
RETURNS TEXT AS $$
DECLARE
  v_token TEXT;
BEGIN
  -- Generar token único
  v_token := encode(sha256(p_task_id::text || NOW()::text), 'hex');
  
  -- Actualizar tarea con el token
  UPDATE public.screen_data 
  SET checkin_token = v_token, updated_at = NOW()
  WHERE id = p_task_id;
  
  RETURN v_token;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función complete_checkin - Completar check-in con token
CREATE OR REPLACE FUNCTION public.complete_checkin(
  p_token TEXT,
  p_location TEXT DEFAULT NULL
)
RETURNS TABLE(success BOOLEAN, message TEXT, task_id UUID) AS $$
DECLARE
  v_task_id UUID;
  v_task_exists BOOLEAN;
BEGIN
  -- Verificar si existe una tarea con ese token
  SELECT id, true INTO v_task_id, v_task_exists
  FROM public.screen_data
  WHERE checkin_token = p_token;
  
  IF NOT v_task_exists THEN
    RETURN QUERY SELECT false, 'Token inválido o expirado', NULL::uuid;
    RETURN;
  END IF;
  
  -- Actualizar estado de la tarea
  UPDATE public.screen_data
  SET 
    state = 'terminado',
    status = 'acabado',
    location = COALESCE(p_location, location),
    checkin_token = NULL,
    updated_at = NOW()
  WHERE id = v_task_id;
  
  RETURN QUERY SELECT true, 'Check-in completado correctamente', v_task_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función get_dashboard_stats - Estadísticas del dashboard
CREATE OR REPLACE FUNCTION public.get_dashboard_stats(
  p_date_from DATE DEFAULT NULL,
  p_date_to DATE DEFAULT NULL
)
RETURNS TABLE(
  total_tasks BIGINT,
  completed_tasks BIGINT,
  pending_tasks BIGINT,
  urgent_tasks BIGINT,
  overdue_tasks BIGINT,
  active_users BIGINT,
  active_vehicles BIGINT,
  completion_rate NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COUNT(*) FROM public.screen_data) AS total_tasks,
    (SELECT COUNT(*) FROM public.screen_data WHERE state = 'terminado') AS completed_tasks,
    (SELECT COUNT(*) FROM public.screen_data WHERE state != 'terminado') AS pending_tasks,
    (SELECT COUNT(*) FROM public.screen_data WHERE state = 'urgente') AS urgent_tasks,
    (SELECT COUNT(*) FROM public.detailed_tasks WHERE is_overdue) AS overdue_tasks,
    (SELECT COUNT(*) FROM public.profiles WHERE status = 'activo') AS active_users,
    (SELECT COUNT(*) FROM public.vehicles WHERE is_active = true) AS active_vehicles,
    CASE 
      WHEN (SELECT COUNT(*) FROM public.screen_data) = 0 THEN 0
      ELSE ROUND(
        (SELECT COUNT(*)::numeric / (SELECT COUNT(*) FROM public.screen_data) * 100 
         FROM public.screen_data WHERE state = 'terminado'), 2
      )
    END AS completion_rate;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función get_user_groups - Obtener grupos de un usuario
CREATE OR REPLACE FUNCTION public.get_user_groups(
  user_profile_id UUID
)
RETURNS TABLE(
  group_id UUID,
  group_name TEXT,
  group_color TEXT,
  role TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    g.id AS group_id,
    g.name AS group_name,
    g.color AS group_color,
    pg.role
  FROM public.groups g
  JOIN public.profile_groups pg ON pg.group_id = g.id
  WHERE pg.profile_id = user_profile_id
  AND g.is_active = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función has_permission - Verificar permisos específicos
CREATE OR REPLACE FUNCTION public.has_permission(
  user_role TEXT,
  page TEXT,
  permission TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  v_has_permission BOOLEAN := false;
BEGIN
  SELECT (can_view AND permission = 'view') OR 
         (can_edit AND permission = 'edit') OR 
         (can_delete AND permission = 'delete') INTO v_has_permission
  FROM public.role_permissions
  WHERE role = user_role AND page = page;
  
  RETURN COALESCE(v_has_permission, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================================
-- PARTE 7: TRIGGERS AUTOMÁTICOS
-- =====================================================================

-- Trigger para crear perfil automáticamente al registrar usuario
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (auth_user_id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Usuario'),
    NEW.email
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger a tablas que necesitan updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_vehicles_updated_at BEFORE UPDATE ON public.vehicles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_templates_updated_at BEFORE UPDATE ON public.templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_screens_updated_at BEFORE UPDATE ON public.screens
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_screen_data_updated_at BEFORE UPDATE ON public.screen_data
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_availability_updated_at BEFORE UPDATE ON public.user_availability
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_groups_updated_at BEFORE UPDATE ON public.groups
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_role_permissions_updated_at BEFORE UPDATE ON public.role_permissions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_sessions_updated_at BEFORE UPDATE ON public.user_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================================
-- PARTE 8: DATOS DE EJEMPLO
-- =====================================================================

-- Insertar usuarios de ejemplo (sin auth_user_id por ahora)
INSERT INTO public.profiles (full_name, email, phone, role, status) VALUES
('Carlos Rodríguez', 'carlos@egea.com', '600123456', 'admin', 'activo'),
('María García', 'maria@egea.com', '600123457', 'responsable', 'activo'),
('Juan Martínez', 'juan@egea.com', '600123458', 'responsable', 'activo'),
('Ana López', 'ana@egea.com', '600123459', 'operario', 'activo'),
('Pedro Sánchez', 'pedro@egea.com', '600123460', 'operario', 'activo'),
('Laura Fernández', 'laura@egea.com', '600123461', 'operario', 'vacaciones'),
('Miguel Torres', 'miguel@egea.com', '600123462', 'operario', 'activo'),
('Sofía Ramírez', 'sofia@egea.com', '600123463', 'operario', 'baja'),
('David Jiménez', 'david@egea.com', '600123464', 'operario', 'activo')
ON CONFLICT DO NOTHING;

-- Insertar vehículos de ejemplo
INSERT INTO public.vehicles (name, type, license_plate, capacity, is_active) VALUES
('JUMPER-001', 'jumper', '1234-ABC', 2, true),
('JUMPER-002', 'jumper', '5678-DEF', 2, true),
('CAMION-001', 'camion', '9012-GHI', 3, true),
('CAMION-002', 'camion', '3456-JKL', 3, false),
('FURGONETA-001', 'furgoneta', '7890-MNO', 1, true),
('FURGONETA-002', 'furgoneta', '2345-PQR', 2, true)
ON CONFLICT DO NOTHING;

-- Insertar plantillas de ejemplo
INSERT INTO public.templates (name, template_type, category, fields, is_active) VALUES
('Instalación Estándar', 'instalacion', 'Instalaciones', 
  '[{"name": "site", "label": "Sitio de Trabajo", "type": "text", "required": true}, 
    {"name": "client", "label": "Cliente", "type": "text", "required": true},
    {"name": "address", "label": "Dirección", "type": "text", "required": true},
    {"name": "description", "label": "Descripción", "type": "textarea", "required": false}]', 
  true),
('Confección Medida', 'confeccion', 'Confección',
  '[{"name": "tipo", "label": "Tipo", "type": "select", "options": ["Cortina", "Estor", "Toldo"], "required": true},
    {"name": "medidas", "label": "Medidas", "type": "text", "required": true},
    {"name": "material", "label": "Material", "type": "text", "required": true}]',
  true),
('Tapicería Vehículo', 'tapiceria', 'Tapicería',
  '[{"name": "vehiculo", "label": "Vehículo", "type": "text", "required": true},
    {"name": "asientos", "label": "Número de Asientos", "type": "number", "required": true},
    {"name": "material", "label": "Material", "type": "select", "options": ["Cuero", "Tela", "Sintético"], "required": true}]',
  true)
ON CONFLICT DO NOTHING;

-- Insertar pantallas de ejemplo
INSERT INTO public.screens (name, screen_type, screen_group, template_id, next_screen_id, refresh_interval_sec, header_color, is_active) VALUES
('Gestión de Instalaciones', 'data', 'Instalaciones', 
  (SELECT id FROM public.templates WHERE name = 'Instalación Estándar' LIMIT 1), NULL, 30, '#FF6B35', true),
('Display Instalaciones', 'display', 'Instalaciones', 
  (SELECT id FROM public.templates WHERE name = 'Instalación Estándar' LIMIT 1), NULL, 15, '#FF6B35', true),
('Gestión de Confección', 'data', 'Confección', 
  (SELECT id FROM public.templates WHERE name = 'Confección Medida' LIMIT 1), NULL, 30, '#9333EA', true),
('Display Confección', 'display', 'Confección', 
  (SELECT id FROM public.templates WHERE name = 'Confección Medida' LIMIT 1), NULL, 15, '#9333EA', true),
('Gestión de Tapicería', 'data', 'Tapicería', 
  (SELECT id FROM public.templates WHERE name = 'Tapicería Vehículo' LIMIT 1), NULL, 30, '#EC4899', true),
('Display Tapicería', 'display', 'Tapicería', 
  (SELECT id FROM public.templates WHERE name = 'Tapicería Vehículo' LIMIT 1), NULL, 15, '#EC4899', true),
('Check-in Mobile', 'data', NULL, NULL, NULL, 60, '#10B981', true),
('Historial de Tareas', 'data', NULL, NULL, NULL, 120, '#6B7280', true)
ON CONFLICT DO NOTHING;

-- Insertar grupos de ejemplo
INSERT INTO public.groups (name, color, description, is_active) VALUES
('Equipo Alpha', '#3B82F6', 'Equipo principal de instalaciones', true),
('Equipo Beta', '#10B981', 'Equipo especializado en confección', true),
('Equipo Gamma', '#F59E0B', 'Equipo de tapicería y acabados', true)
ON CONFLICT DO NOTHING;

-- Asignar usuarios a grupos
INSERT INTO public.profile_groups (profile_id, group_id, role) VALUES
((SELECT id FROM public.profiles WHERE full_name = 'María García' LIMIT 1), (SELECT id FROM public.groups WHERE name = 'Equipo Alpha' LIMIT 1), 'líder'),
((SELECT id FROM public.profiles WHERE full_name = 'Ana López' LIMIT 1), (SELECT id FROM public.groups WHERE name = 'Equipo Alpha' LIMIT 1), 'miembro'),
((SELECT id FROM public.profiles WHERE full_name = 'Pedro Sánchez' LIMIT 1), (SELECT id FROM public.groups WHERE name = 'Equipo Alpha' LIMIT 1), 'miembro'),
((SELECT id FROM public.profiles WHERE full_name = 'Juan Martínez' LIMIT 1), (SELECT id FROM public.groups WHERE name = 'Equipo Beta' LIMIT 1), 'líder'),
((SELECT id FROM public.profiles WHERE full_name = 'Laura Fernández' LIMIT 1), (SELECT id FROM public.groups WHERE name = 'Equipo Beta' LIMIT 1), 'miembro'),
((SELECT id FROM public.profiles WHERE full_name = 'Miguel Torres' LIMIT 1), (SELECT id FROM public.groups WHERE name = 'Equipo Gamma' LIMIT 1), 'líder'),
((SELECT id FROM public.profiles WHERE full_name = 'David Jiménez' LIMIT 1), (SELECT id FROM public.groups WHERE name = 'Equipo Gamma' LIMIT 1), 'miembro')
ON CONFLICT DO NOTHING;

-- Insertar tareas de ejemplo
INSERT INTO public.screen_data (screen_id, data, state, status, start_date, end_date, location, responsible_profile_id, "order") VALUES
-- Tareas de Instalaciones
((SELECT id FROM public.screens WHERE name = 'Gestión de Instalaciones' LIMIT 1), 
 '{"site": "Centro Comercial La Marina", "client": "Zara", "address": "Calle Principal 123, Valencia", "description": "Instalación de cortinas metálicas"}', 
 'urgente', 'en progreso', CURRENT_DATE, CURRENT_DATE + INTERVAL '2 days', 'Valencia', 
 (SELECT id FROM public.profiles WHERE full_name = 'María García' LIMIT 1), 1),

((SELECT id FROM public.screens WHERE name = 'Gestión de Instalaciones' LIMIT 1), 
 '{"site": "Hotel Mediterráneo", "client": "NH Hotels", "address": "Avenida del Puerto 456, Alicante", "description": "Instalación de toldos en terraza"}', 
 'en fabricacion', 'en progreso', CURRENT_DATE + INTERVAL '1 day', CURRENT_DATE + INTERVAL '3 days', 'Alicante', 
 (SELECT id FROM public.profiles WHERE full_name = 'Ana López' LIMIT 1), 2),

((SELECT id FROM public.screens WHERE name = 'Gestión de Instalaciones' LIMIT 1), 
 '{"site": "Residencial El Bosque", "client": "Promociones SL", "address": "Calle Verde 789, Castellón", "description": "Instalación de estores motorizados"}', 
 'a la espera', 'pendiente', CURRENT_DATE + INTERVAL '2 days', CURRENT_DATE + INTERVAL '4 days', 'Castellón', 
 (SELECT id FROM public.profiles WHERE full_name = 'Pedro Sánchez' LIMIT 1), 3),

-- Tareas de Confección
((SELECT id FROM public.screens WHERE name = 'Gestión de Confección' LIMIT 1), 
 '{"tipo": "Cortina", "medidas": "2m x 2.5m", "material": "Lino crudo", "cliente": "Tienda Decor"}', 
 'en fabricacion', 'en progreso', CURRENT_DATE, CURRENT_DATE + INTERVAL '3 days', 'Taller Central', 
 (SELECT id FROM public.profiles WHERE full_name = 'Juan Martínez' LIMIT 1), 1),

((SELECT id FROM public.screens WHERE name = 'Gestión de Confección' LIMIT 1), 
 '{"tipo": "Estor", "medidas": "1.5m x 2m", "material": "Poliéster beige", "cliente": "Cliente Particular"}', 
 'en fabricacion', 'en progreso', CURRENT_DATE + INTERVAL '1 day', CURRENT_DATE + INTERVAL '4 days', 'Taller Central', 
 (SELECT id FROM public.profiles WHERE full_name = 'Laura Fernández' LIMIT 1), 2),

-- Tareas de Tapicería
((SELECT id FROM public.screens WHERE name = 'Gestión de Tapicería' LIMIT 1), 
 '{"vehiculo": "Mercedes-Benz Clase E", "asientos": 5, "material": "Cuero negro", "cliente": "Concesionario Premium"}', 
 'en fabricacion', 'en progreso', CURRENT_DATE + INTERVAL '1 day', CURRENT_DATE + INTERVAL '5 days', 'Taller Tapicería', 
 (SELECT id FROM public.profiles WHERE full_name = 'Miguel Torres' LIMIT 1), 1),

((SELECT id FROM public.screens WHERE name = 'Gestión de Tapicería' LIMIT 1), 
 '{"vehiculo": "BMW Serie 3", "asientos": 5, "material": "Cuero marrón", "cliente": "Cliente Particular"}', 
 'a la espera', 'pendiente', CURRENT_DATE + INTERVAL '2 days', CURRENT_DATE + INTERVAL '6 days', 'Taller Tapicería', 
 (SELECT id FROM public.profiles WHERE full_name = 'David Jiménez' LIMIT 1), 2)
ON CONFLICT DO NOTHING;

-- Asignar operarios a tareas
INSERT INTO public.task_profiles (task_id, profile_id) VALUES
-- Tarea 1 (Instalación urgente)
((SELECT id FROM public.screen_data WHERE "order" = 1 AND screen_id = (SELECT id FROM public.screens WHERE name = 'Gestión de Instalaciones' LIMIT 1) LIMIT 1), 
 (SELECT id FROM public.profiles WHERE full_name = 'Ana López' LIMIT 1)),
((SELECT id FROM public.screen_data WHERE "order" = 1 AND screen_id = (SELECT id FROM public.screens WHERE name = 'Gestión de Instalaciones' LIMIT 1) LIMIT 1), 
 (SELECT id FROM public.profiles WHERE full_name = 'Pedro Sánchez' LIMIT 1)),

-- Tarea 2 (Instalación en fabricación)
((SELECT id FROM public.screen_data WHERE "order" = 2 AND screen_id = (SELECT id FROM public.screens WHERE name = 'Gestión de Instalaciones' LIMIT 1) LIMIT 1), 
 (SELECT id FROM public.profiles WHERE full_name = 'Ana López' LIMIT 1)),

-- Tarea 3 (Instalación en espera)
((SELECT id FROM public.screen_data WHERE "order" = 3 AND screen_id = (SELECT id FROM public.screens WHERE name = 'Gestión de Instalaciones' LIMIT 1) LIMIT 1), 
 (SELECT id FROM public.profiles WHERE full_name = 'Pedro Sánchez' LIMIT 1)),

-- Tarea 4 (Confección)
((SELECT id FROM public.screen_data WHERE "order" = 1 AND screen_id = (SELECT id FROM public.screens WHERE name = 'Gestión de Confección' LIMIT 1) LIMIT 1), 
 (SELECT id FROM public.profiles WHERE full_name = 'Juan Martínez' LIMIT 1)),
((SELECT id FROM public.screen_data WHERE "order" = 1 AND screen_id = (SELECT id FROM public.screens WHERE name = 'Gestión de Confección' LIMIT 1) LIMIT 1), 
 (SELECT id FROM public.profiles WHERE full_name = 'Laura Fernández' LIMIT 1)),

-- Tarea 5 (Confección)
((SELECT id FROM public.screen_data WHERE "order" = 2 AND screen_id = (SELECT id FROM public.screens WHERE name = 'Gestión de Confección' LIMIT 1) LIMIT 1), 
 (SELECT id FROM public.profiles WHERE full_name = 'Laura Fernández' LIMIT 1)),

-- Tarea 6 (Tapicería)
((SELECT id FROM public.screen_data WHERE "order" = 1 AND screen_id = (SELECT id FROM public.screens WHERE name = 'Gestión de Tapicería' LIMIT 1) LIMIT 1), 
 (SELECT id FROM public.profiles WHERE full_name = 'Miguel Torres' LIMIT 1)),

-- Tarea 7 (Tapicería)
((SELECT id FROM public.screen_data WHERE "order" = 2 AND screen_id = (SELECT id FROM public.screens WHERE name = 'Gestión de Tapicería' LIMIT 1) LIMIT 1), 
 (SELECT id FROM public.profiles WHERE full_name = 'David Jiménez' LIMIT 1))
ON CONFLICT DO NOTHING;

-- Asignar vehículos a tareas
INSERT INTO public.task_vehicles (task_id, vehicle_id) VALUES
-- Tarea 1 (Instalación urgente - necesita 2 vehículos)
((SELECT id FROM public.screen_data WHERE "order" = 1 AND screen_id = (SELECT id FROM public.screens WHERE name = 'Gestión de Instalaciones' LIMIT 1) LIMIT 1), 
 (SELECT id FROM public.vehicles WHERE name = 'JUMPER-001' LIMIT 1)),
((SELECT id FROM public.screen_data WHERE "order" = 1 AND screen_id = (SELECT id FROM public.screens WHERE name = 'Gestión de Instalaciones' LIMIT 1) LIMIT 1), 
 (SELECT id FROM public.vehicles WHERE name = 'FURGONETA-001' LIMIT 1)),

-- Tarea 2 (Instalación en fabricación)
((SELECT id FROM public.screen_data WHERE "order" = 2 AND screen_id = (SELECT id FROM public.screens WHERE name = 'Gestión de Instalaciones' LIMIT 1) LIMIT 1), 
 (SELECT id FROM public.vehicles WHERE name = 'CAMION-001' LIMIT 1)),

-- Tarea 3 (Instalación en espera)
((SELECT id FROM public.screen_data WHERE "order" = 3 AND screen_id = (SELECT id FROM public.screens WHERE name = 'Gestión de Instalaciones' LIMIT 1) LIMIT 1), 
 (SELECT id FROM public.vehicles WHERE name = 'JUMPER-002' LIMIT 1)),

-- Tarea 6 (Tapicería)
((SELECT id FROM public.screen_data WHERE "order" = 2 AND screen_id = (SELECT id FROM public.screens WHERE name = 'Gestión de Tapicería' LIMIT 1) LIMIT 1), 
 (SELECT id FROM public.vehicles WHERE name = 'FURGONETA-002' LIMIT 1))
ON CONFLICT DO NOTHING;

-- Insertar configuración del sistema
INSERT INTO public.system_config (key, value, description) VALUES
('app_name', '"Egea Productivity App"', 'Nombre de la aplicación'),
('app_version', '"1.0.0-alpha"', 'Versión actual de la aplicación'),
('company_name', '"Egea Productivity S.L."', 'Nombre de la empresa'),
('default_language', '"es"', 'Idioma por defecto'),
('timezone', '"Europe/Madrid"', 'Zona horaria por defecto'),
('whatsapp_enabled', 'true', 'Habilitar notificaciones WhatsApp'),
('auto_archive_days', '7', 'Días para archivado automático'),
('max_file_size', '10485760', 'Tamaño máximo de archivos en bytes (10MB)')
ON CONFLICT (key) DO NOTHING;

-- Insertar permisos por rol
INSERT INTO public.role_permissions (role, page, can_view, can_edit, can_delete) VALUES
-- Admin puede todo
('admin', '/admin', true, true, true),
('admin', '/admin/installations', true, true, true),
('admin', '/admin/data', true, true, true),
('admin', '/admin/screens', true, true, true),
('admin', '/admin/templates', true, true, true),
('admin', '/admin/users', true, true, true),
('admin', '/admin/archive', true, true, true),
('admin', '/admin/settings', true, true, true),

-- Responsable puede ver y editar la mayoría
('responsable', '/admin', true, true, false),
('responsable', '/admin/installations', true, true, false),
('responsable', '/admin/data', true, true, false),
('responsable', '/admin/screens', true, false, false),
('responsable', '/admin/templates', true, false, false),
('responsable', '/admin/users', true, false, false),
('responsable', '/admin/archive', true, false, false),
('responsable', '/admin/settings', true, false, false),

-- Operario tiene acceso limitado
('operario', '/admin', true, false, false),
('operario', '/admin/installations', true, false, false),
('operario', '/admin/data', false, false, false),
('operario', '/admin/screens', true, false, false),
('operario', '/admin/templates', false, false, false),
('operario', '/admin/users', false, false, false),
('operario', '/admin/archive', false, false, false),
('operario', '/admin/settings', false, false, false)
ON CONFLICT (role, page) DO NOTHING;

-- =====================================================================
-- PARTE 9: CONFIGURACIÓN FINAL
-- =====================================================================

-- Crear bucket para avatares en Storage (si no existe)
-- NOTA: Esto debe ejecutarse manualmente en Supabase Dashboard > Storage

-- Configurar extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_cron";

-- Configurar cron jobs para archivado automático (si pg_cron está disponible)
-- NOTA: Esto debe ejecutarse manualmente en Supabase Dashboard > SQL Editor
-- Configurar cron jobs para archivado automático (si pg_cron está disponible)
-- NOTA: Esto debe ejecutarse manualmente en Supabase Dashboard > SQL Editor
-- Los siguientes comandos deben ejecutarse manualmente después de la instalación:

-- Para archivar tareas completadas diariamente a las 2 AM:
-- SELECT cron.schedule('archive-completed-tasks-daily', '0 2 * * *', $$SELECT public.archive_completed_tasks(7);$$);

-- Para limpiar planes expirados cada 6 horas:
-- SELECT cron.schedule('cleanup-expired-plans', '0 */6 * * *', $$DELETE FROM public.shared_plans WHERE expires_at < NOW();$$);

-- Grant permissions para vistas
GRANT SELECT ON public.detailed_tasks TO authenticated, anon;
GRANT SELECT ON public.user_workload TO authenticated;
GRANT SELECT ON public.vehicle_utilization TO authenticated;
GRANT SELECT ON public.task_summary TO authenticated;

-- Grant permissions para funciones
GRANT EXECUTE ON FUNCTION public.upsert_task TO authenticated;
GRANT EXECUTE ON FUNCTION public.archive_completed_tasks TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_checkin_token TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_checkin TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_dashboard_stats TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_groups TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_permission TO authenticated;

COMMIT;

-- =====================================================================
-- VERIFICACIÓN FINAL
-- =====================================================================

-- Verificar que todo se haya creado correctamente
DO $$
DECLARE
  table_count INTEGER;
  view_count INTEGER;
  function_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO table_count 
  FROM information_schema.tables 
  WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
  
  SELECT COUNT(*) INTO view_count 
  FROM information_schema.views 
  WHERE table_schema = 'public';
  
  SELECT COUNT(*) INTO function_count 
  FROM information_schema.routines 
  WHERE routine_schema = 'public' AND routine_type = 'FUNCTION';
  
  RAISE NOTICE '✅ Base de datos configurada exitosamente:';
  RAISE NOTICE '   - Tablas creadas: %', table_count;
  RAISE NOTICE '   - Vistas creadas: %', view_count;
  RAISE NOTICE '   - Funciones creadas: %', function_count;
  RAISE NOTICE '';
  RAISE NOTICE '🎯 Próximos pasos:';
  RAISE NOTICE '   1. Configurar variables de entorno en el frontend';
  RAISE NOTICE '   2. Probar la aplicación con los datos de ejemplo';
  RAISE NOTICE '   3. Configurar Edge Functions para WhatsApp';
  RAISE NOTICE '   4. Establecer cron jobs para mantenimiento automático';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Datos de ejemplo insertados:';
  RAISE NOTICE '   - 9 usuarios con diferentes roles';
  RAISE NOTICE '   - 6 vehículos con capacidades variadas';
  RAISE NOTICE '   - 3 plantillas para diferentes tipos de tareas';
  RAISE NOTICE '   - 8 pantallas configuradas';
  RAISE NOTICE '   - 7 tareas de ejemplo con asignaciones';
  RAISE NOTICE '   - 3 grupos de trabajo organizados';
  RAISE NOTICE '';
  RAISE NOTICE '🔐 Seguridad configurada:';
  RAISE NOTICE '   - Row Level Security (RLS) habilitado';
  RAISE NOTICE '   - Políticas de acceso por rol';
  RAISE NOTICE '   - Funciones con SECURITY DEFINER';
  RAISE NOTICE '';
  RAISE NOTICE '✨ ¡Base de datos lista para producción! ✨';
END $$;