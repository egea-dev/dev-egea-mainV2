-- =====================================================================
-- SCRIPT CONSOLIDADO FINAL: SCHEMA COMPLETO MAIN DATABASE
-- =====================================================================
-- Fecha: 12 de enero de 2026
-- Versión: 2.0 Final
-- Objetivo: Crear estructura completa de tablas para MAIN Database
-- Base de datos: Supabase MAIN
-- =====================================================================

BEGIN;

-- =====================================================================
-- EXTENSIONES REQUERIDAS
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================================
-- TABLAS CORE
-- =====================================================================

-- Tabla: profiles (perfiles de usuario)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'operario' CHECK (role IN ('admin', 'responsable', 'operario', 'manager', 'jefe_almacen', 'operario_almacen')),
  status TEXT NOT NULL DEFAULT 'activo' CHECK (status IN ('activo', 'vacaciones', 'baja')),
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla: vehicles (vehículos)
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

-- Tabla: templates (plantillas de datos)
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

-- Tabla: screens (pantallas de visualización)
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
  dashboard_section TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla: screen_groups (grupos de pantallas para displays)
CREATE TABLE IF NOT EXISTS public.screen_groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  screen_ids UUID[] NOT NULL DEFAULT '{}',
  rotation_interval_sec INTEGER DEFAULT 30,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla: screen_data (datos de las pantallas/tareas)
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

-- Tabla: task_profiles (relación muchos a muchos: tareas ↔ perfiles)
CREATE TABLE IF NOT EXISTS public.task_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID NOT NULL REFERENCES public.screen_data(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(task_id, profile_id)
);

-- Tabla: task_vehicles (relación muchos a muchos: tareas ↔ vehículos)
CREATE TABLE IF NOT EXISTS public.task_vehicles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID NOT NULL REFERENCES public.screen_data(id) ON DELETE CASCADE,
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(task_id, vehicle_id)
);

-- Tabla: archived_tasks (tareas archivadas)
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

-- Tabla: user_availability (disponibilidad de usuarios)
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
-- TABLAS DE COMUNICACIÓN Y GRUPOS
-- =====================================================================

-- Tabla: groups (grupos de operarios)
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

-- Tabla: profile_groups (relación muchos a muchos: perfiles ↔ grupos)
CREATE TABLE IF NOT EXISTS public.profile_groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'miembro' CHECK (role IN ('líder', 'miembro')),
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(profile_id, group_id)
);

-- Tabla: shared_plans (planes compartidos)
CREATE TABLE IF NOT EXISTS public.shared_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  token TEXT UNIQUE NOT NULL,
  plan_date DATE NOT NULL,
  tasks JSONB NOT NULL DEFAULT '[]'::jsonb,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla: task_notifications (notificaciones de tareas para operarios)
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

-- Tabla: communication_logs (logs de comunicaciones enviadas)
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

-- Tabla: direct_messages (mensajes directos entre usuarios)
CREATE TABLE IF NOT EXISTS public.direct_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================================
-- TABLAS DE CONFIGURACIÓN Y PERMISOS
-- =====================================================================

-- Tabla: system_config (configuración del sistema)
CREATE TABLE IF NOT EXISTS public.system_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key TEXT UNIQUE NOT NULL,
  value JSONB NOT NULL,
  description TEXT,
  updated_by UUID REFERENCES public.profiles(id),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla: role_permissions (permisos por rol y página)
CREATE TABLE IF NOT EXISTS public.role_permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  role TEXT NOT NULL CHECK (role IN ('admin', 'responsable', 'operario', 'manager', 'jefe_almacen', 'operario_almacen')),
  page TEXT NOT NULL,
  can_view BOOLEAN DEFAULT false,
  can_edit BOOLEAN DEFAULT false,
  can_delete BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(role, page)
);

-- =====================================================================
-- TABLAS DE SESIONES Y TRABAJO
-- =====================================================================

-- Tabla: work_sites (sitios de trabajo)
CREATE TABLE IF NOT EXISTS public.work_sites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  address TEXT,
  coordinates POINT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla: work_sessions (sesiones de trabajo)
CREATE TABLE IF NOT EXISTS public.work_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  task_id UUID REFERENCES public.screen_data(id) ON DELETE SET NULL,
  work_site_id UUID REFERENCES public.work_sites(id) ON DELETE SET NULL,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ended_at TIMESTAMP WITH TIME ZONE,
  location_start POINT,
  location_end POINT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================================
-- ÍNDICES OPTIMIZADOS
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
CREATE INDEX IF NOT EXISTS idx_templates_is_active ON public.templates(is_active) WHERE is_active = true;

-- Índices para screens
CREATE INDEX IF NOT EXISTS idx_screens_screen_type ON public.screens(screen_type);
CREATE INDEX IF NOT EXISTS idx_screens_screen_group ON public.screens(screen_group) WHERE screen_group IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_screens_is_active ON public.screens(is_active) WHERE is_active = true;

-- Índices para screen_data (tareas)
CREATE INDEX IF NOT EXISTS idx_screen_data_screen_id ON public.screen_data(screen_id);
CREATE INDEX IF NOT EXISTS idx_screen_data_state ON public.screen_data(state);
CREATE INDEX IF NOT EXISTS idx_screen_data_status ON public.screen_data(status);
CREATE INDEX IF NOT EXISTS idx_screen_data_dates ON public.screen_data(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_screen_data_responsible ON public.screen_data(responsible_profile_id);
CREATE INDEX IF NOT EXISTS idx_screen_data_pending_dates ON public.screen_data(state, start_date, end_date) WHERE state != 'terminado';

-- Índices para tablas de relación
CREATE INDEX IF NOT EXISTS idx_task_profiles_task_id ON public.task_profiles(task_id);
CREATE INDEX IF NOT EXISTS idx_task_profiles_profile_id ON public.task_profiles(profile_id);
CREATE INDEX IF NOT EXISTS idx_task_vehicles_task_id ON public.task_vehicles(task_id);
CREATE INDEX IF NOT EXISTS idx_task_vehicles_vehicle_id ON public.task_vehicles(vehicle_id);

-- Índices para grupos y comunicaciones
CREATE INDEX IF NOT EXISTS idx_groups_is_active ON public.groups(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_profile_groups_profile_id ON public.profile_groups(profile_id);
CREATE INDEX IF NOT EXISTS idx_profile_groups_group_id ON public.profile_groups(group_id);
CREATE INDEX IF NOT EXISTS idx_shared_plans_token ON public.shared_plans(token);
CREATE INDEX IF NOT EXISTS idx_shared_plans_active ON public.shared_plans(expires_at) WHERE expires_at > NOW();
CREATE INDEX IF NOT EXISTS idx_task_notifications_profile_id ON public.task_notifications(profile_id);
CREATE INDEX IF NOT EXISTS idx_communication_logs_type ON public.communication_logs(type);
CREATE INDEX IF NOT EXISTS idx_communication_logs_status ON public.communication_logs(status);
CREATE INDEX IF NOT EXISTS idx_direct_messages_sender ON public.direct_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_direct_messages_recipient ON public.direct_messages(recipient_id);

-- =====================================================================
-- TRIGGERS PARA updated_at
-- =====================================================================

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER handle_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER handle_vehicles_updated_at BEFORE UPDATE ON public.vehicles FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER handle_templates_updated_at BEFORE UPDATE ON public.templates FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER handle_screens_updated_at BEFORE UPDATE ON public.screens FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER handle_screen_data_updated_at BEFORE UPDATE ON public.screen_data FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER handle_groups_updated_at BEFORE UPDATE ON public.groups FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER handle_system_config_updated_at BEFORE UPDATE ON public.system_config FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

COMMIT;

-- =====================================================================
-- NOTAS DE IMPLEMENTACIÓN
-- =====================================================================
-- 1. Este script consolida todas las migraciones de schema de MAIN DB
-- 2. Incluye todas las tablas core, comunicación, permisos y trabajo
-- 3. Los índices están optimizados para las consultas más frecuentes
-- 4. Los triggers aseguran consistencia en timestamps
-- 5. Ejecutar este script en una base de datos LIMPIA de Supabase MAIN
-- =====================================================================
