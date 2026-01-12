-- =====================================================================
-- MIGRACIÓN INICIAL: TABLAS CORE DE LA APLICACIÓN
-- =====================================================================
-- Fecha: 2025-10-06
-- Objetivo: Crear estructura base de tablas para Egea Productivity App
-- =====================================================================

BEGIN;

-- =====================================================================
-- EXTENSIONES REQUERIDAS
-- =====================================================================

-- Habilitar UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Habilitar crypt para passwords (si es necesario)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================================
-- TABLA: profiles (perfiles de usuario)
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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

-- =====================================================================
-- TABLA: vehicles (vehículos)
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.vehicles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'otro' CHECK (type IN ('jumper', 'camion', 'furgoneta', 'otro')),
  license_plate TEXT,
  capacity INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================================
-- TABLA: templates (plantillas de datos)
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  template_type TEXT NOT NULL,
  category TEXT,
  fields JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================================
-- TABLA: screens (pantallas de visualización)
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.screens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  screen_type TEXT NOT NULL DEFAULT 'data' CHECK (screen_type IN ('data', 'display')),
  screen_group TEXT,
  template_id UUID REFERENCES public.templates(id) ON DELETE SET NULL,
  next_screen_id UUID REFERENCES public.screens(id) ON DELETE SET NULL,
  refresh_interval_sec INTEGER DEFAULT 30,
  header_color TEXT DEFAULT '#000000',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================================
-- TABLA: screen_data (datos de las pantallas/tareas)
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.screen_data (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  screen_id UUID NOT NULL REFERENCES public.screens(id) ON DELETE CASCADE,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  state TEXT NOT NULL DEFAULT 'pendiente' CHECK (state IN ('pendiente', 'urgente', 'en fabricacion', 'a la espera', 'terminado', 'incidente', 'arreglo')),
  status TEXT NOT NULL DEFAULT 'pendiente' CHECK (status IN ('pendiente', 'acabado', 'en progreso')),
  start_date DATE,
  end_date DATE,
  location TEXT,
  responsible_profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  checkin_token TEXT UNIQUE,
  "order" INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================================
-- TABLA: task_profiles (relación muchos a muchos: tareas ↔ perfiles)
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.task_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID NOT NULL REFERENCES public.screen_data(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(task_id, profile_id)
);

-- =====================================================================
-- TABLA: task_vehicles (relación muchos a muchos: tareas ↔ vehículos)
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.task_vehicles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID NOT NULL REFERENCES public.screen_data(id) ON DELETE CASCADE,
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(task_id, vehicle_id)
);

-- =====================================================================
-- TABLA: archived_tasks (tareas archivadas)
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.archived_tasks (
  id UUID PRIMARY KEY,
  archived_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL,
  state TEXT NOT NULL,
  start_date DATE,
  end_date DATE,
  location TEXT,
  responsible_profile_id UUID,
  responsible_name TEXT,
  assigned_users JSONB DEFAULT '[]'::jsonb,
  assigned_vehicles JSONB DEFAULT '[]'::jsonb,
  archived_by UUID REFERENCES public.profiles(id)
);

-- =====================================================================
-- TABLA: user_availability (disponibilidad de usuarios)
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.user_availability (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'disponible' CHECK (status IN ('disponible', 'no disponible', 'vacaciones')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================================
-- TABLA: shared_plans (planes compartidos)
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.shared_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  token TEXT UNIQUE NOT NULL,
  plan_date DATE NOT NULL,
  tasks JSONB NOT NULL DEFAULT '[]'::jsonb,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================================
-- TABLA: system_config (configuración del sistema)
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.system_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key TEXT UNIQUE NOT NULL,
  value JSONB NOT NULL,
  description TEXT,
  updated_by UUID REFERENCES public.profiles(id),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================================
-- ÍNDICES BÁSICOS
-- =====================================================================

-- Índices para profiles
CREATE INDEX IF NOT EXISTS idx_profiles_auth_user_id ON public.profiles(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_status ON public.profiles(status);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email) WHERE email IS NOT NULL;

-- Índices para vehicles
CREATE INDEX IF NOT EXISTS idx_vehicles_type ON public.vehicles(type);
CREATE INDEX IF NOT EXISTS idx_vehicles_is_active ON public.vehicles(is_active) WHERE is_active = true;

-- Índices para templates
CREATE INDEX IF NOT EXISTS idx_templates_template_type ON public.templates(template_type);
CREATE INDEX IF NOT EXISTS idx_templates_category ON public.templates(category) WHERE category IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_templates_is_active ON public.templates(is_active) WHERE is_active = true;

-- Índices para screens
CREATE INDEX IF NOT EXISTS idx_screens_screen_type ON public.screens(screen_type);
CREATE INDEX IF NOT EXISTS idx_screens_screen_group ON public.screens(screen_group) WHERE screen_group IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_screens_is_active ON public.screens(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_screens_template_id ON public.screens(template_id) WHERE template_id IS NOT NULL;

-- Índices para screen_data (tareas)
CREATE INDEX IF NOT EXISTS idx_screen_data_screen_id ON public.screen_data(screen_id);
CREATE INDEX IF NOT EXISTS idx_screen_data_state ON public.screen_data(state);
CREATE INDEX IF NOT EXISTS idx_screen_data_status ON public.screen_data(status);
CREATE INDEX IF NOT EXISTS idx_screen_data_dates ON public.screen_data(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_screen_data_responsible ON public.screen_data(responsible_profile_id);
CREATE INDEX IF NOT EXISTS idx_screen_data_assigned_to ON public.screen_data(assigned_to);
CREATE INDEX IF NOT EXISTS idx_screen_data_location ON public.screen_data(location) WHERE location IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_screen_data_checkin_token ON public.screen_data(checkin_token) WHERE checkin_token IS NOT NULL;

-- Índices compuestos para tareas
CREATE INDEX IF NOT EXISTS idx_screen_data_pending_dates ON public.screen_data(state, start_date, end_date) WHERE state != 'terminado';

-- Índices para tablas de relación
CREATE INDEX IF NOT EXISTS idx_task_profiles_task_id ON public.task_profiles(task_id);
CREATE INDEX IF NOT EXISTS idx_task_profiles_profile_id ON public.task_profiles(profile_id);
CREATE INDEX IF NOT EXISTS idx_task_vehicles_task_id ON public.task_vehicles(task_id);
CREATE INDEX IF NOT EXISTS idx_task_vehicles_vehicle_id ON public.task_vehicles(vehicle_id);

-- Índices para archived_tasks
CREATE INDEX IF NOT EXISTS idx_archived_tasks_archived_at ON public.archived_tasks(archived_at DESC);
CREATE INDEX IF NOT EXISTS idx_archived_tasks_state ON public.archived_tasks(state);
CREATE INDEX IF NOT EXISTS idx_archived_tasks_dates ON public.archived_tasks(start_date, end_date);

-- Índices para user_availability
CREATE INDEX IF NOT EXISTS idx_user_availability_profile_dates ON public.user_availability(profile_id, start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_user_availability_status ON public.user_availability(status);

-- Índices para shared_plans
CREATE INDEX IF NOT EXISTS idx_shared_plans_token ON public.shared_plans(token);
CREATE INDEX IF NOT EXISTS idx_shared_plans_expires_at ON public.shared_plans(expires_at);
CREATE INDEX IF NOT EXISTS idx_shared_plans_active ON public.shared_plans(expires_at) WHERE expires_at > NOW();

-- =====================================================================
-- TRIGGERS PARA updated_at
-- =====================================================================

-- Función para actualizar updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger a tablas que lo necesitan
CREATE TRIGGER handle_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_vehicles_updated_at
    BEFORE UPDATE ON public.vehicles
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_templates_updated_at
    BEFORE UPDATE ON public.templates
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_screens_updated_at
    BEFORE UPDATE ON public.screens
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_screen_data_updated_at
    BEFORE UPDATE ON public.screen_data
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_user_availability_updated_at
    BEFORE UPDATE ON public.user_availability
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_system_config_updated_at
    BEFORE UPDATE ON public.system_config
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- =====================================================================
-- COMENTARIOS DE DOCUMENTACIÓN
-- =====================================================================

COMMENT ON TABLE public.profiles IS 'Perfiles de usuario del sistema';
COMMENT ON TABLE public.vehicles IS 'Vehículos disponibles para asignar a tareas';
COMMENT ON TABLE public.templates IS 'Plantillas de estructura de datos para pantallas';
COMMENT ON TABLE public.screens IS 'Pantallas de visualización y gestión de datos';
COMMENT ON TABLE public.screen_data IS 'Datos/tareas gestionados en las pantallas';
COMMENT ON TABLE public.task_profiles IS 'Relación entre tareas y perfiles asignados';
COMMENT ON TABLE public.task_vehicles IS 'Relación entre tareas y vehículos asignados';
COMMENT ON TABLE public.archived_tasks IS 'Tareas archivadas automáticamente o manualmente';
COMMENT ON TABLE public.user_availability IS 'Disponibilidad de usuarios por fechas';
COMMENT ON TABLE public.shared_plans IS 'Planes compartidos con acceso público vía token';
COMMENT ON TABLE public.system_config IS 'Configuración general del sistema';

COMMIT;

-- =====================================================================
-- NOTAS DE IMPLEMENTACIÓN
-- =====================================================================
-- 1. Esta migración crea la estructura base de la aplicación
-- 2. Las políticas RLS se crearán en la siguiente migración
-- 3. Los datos de ejemplo se insertarán en migraciones posteriores
-- 4. Las vistas optimizadas se crearán después de las políticas RLS
-- 5. Los triggers para updated_at aseguran consistencia en timestamps
-- =====================================================================