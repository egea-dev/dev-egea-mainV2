-- MIGRACIONES CONSOLIDADAS


-- MIGRACIÓN: 20251001131129_d0adff28-e5a5-4d96-8625-bbceceb3952d.sql

-- Enable pgcrypto extension for UUID generation
create extension if not exists pgcrypto;

-- Create templates table
create table if not exists public.templates (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  name text not null,
  template_type text not null,
  fields jsonb not null
);

-- Create screens table
create table if not exists public.screens (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  name text not null,
  is_active boolean default true,
  refresh_interval_sec integer default 30,
  template_id uuid references public.templates(id) on delete set null
);

-- Create screen_data table
create table if not exists public.screen_data (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  screen_id uuid references public.screens(id) on delete cascade,
  data jsonb not null
);

-- Enable Row Level Security
alter table public.templates enable row level security;
alter table public.screens enable row level security;
alter table public.screen_data enable row level security;

-- RLS Policies for templates
DROP POLICY IF EXISTS "Templates are viewable by authenticated users" ON public.templates;
CREATE POLICY "Templates are viewable by authenticated users" ON public.templates for select
  to authenticated
  using (true);

DROP POLICY IF EXISTS "Templates are insertable by authenticated users" ON public.templates;
CREATE POLICY "Templates are insertable by authenticated users" ON public.templates for insert
  to authenticated
  with check (true);

DROP POLICY IF EXISTS "Templates are updatable by authenticated users" ON public.templates;
CREATE POLICY "Templates are updatable by authenticated users" ON public.templates for update
  to authenticated
  using (true);

DROP POLICY IF EXISTS "Templates are deletable by authenticated users" ON public.templates;
CREATE POLICY "Templates are deletable by authenticated users" ON public.templates for delete
  to authenticated
  using (true);

-- RLS Policies for screens
DROP POLICY IF EXISTS "Screens are viewable by everyone" ON public.screens;
CREATE POLICY "Screens are viewable by everyone" ON public.screens for select
  to anon, authenticated
  using (true);

DROP POLICY IF EXISTS "Screens are insertable by authenticated users" ON public.screens;
CREATE POLICY "Screens are insertable by authenticated users" ON public.screens for insert
  to authenticated
  with check (true);

DROP POLICY IF EXISTS "Screens are updatable by authenticated users" ON public.screens;
CREATE POLICY "Screens are updatable by authenticated users" ON public.screens for update
  to authenticated
  using (true);

DROP POLICY IF EXISTS "Screens are deletable by authenticated users" ON public.screens;
CREATE POLICY "Screens are deletable by authenticated users" ON public.screens for delete
  to authenticated
  using (true);

-- RLS Policies for screen_data
DROP POLICY IF EXISTS "Screen data is viewable by everyone" ON public.screen_data;
CREATE POLICY "Screen data is viewable by everyone" ON public.screen_data for select
  to anon, authenticated
  using (true);

DROP POLICY IF EXISTS "Screen data is insertable by authenticated users" ON public.screen_data;
CREATE POLICY "Screen data is insertable by authenticated users" ON public.screen_data for insert
  to authenticated
  with check (true);

DROP POLICY IF EXISTS "Screen data is updatable by authenticated users" ON public.screen_data;
CREATE POLICY "Screen data is updatable by authenticated users" ON public.screen_data for update
  to authenticated
  using (true);

DROP POLICY IF EXISTS "Screen data is deletable by authenticated users" ON public.screen_data;
CREATE POLICY "Screen data is deletable by authenticated users" ON public.screen_data for delete
  to authenticated
  using (true);

-- MIGRACIÓN: 20251001133856_4d8865cd-0e9d-4982-ab56-5d81742096ce.sql

-- Add status and state columns to screen_data table
ALTER TABLE public.screen_data 
ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pendiente' CHECK (status IN ('pendiente', 'acabado')),
ADD COLUMN IF NOT EXISTS state text NOT NULL DEFAULT 'normal' CHECK (state IN ('normal', 'incidente', 'arreglo'));

-- Add screen_type to screens table to differentiate between pending and completed screens
ALTER TABLE public.screens 
ADD COLUMN IF NOT EXISTS screen_type text NOT NULL DEFAULT 'pendiente' CHECK (screen_type IN ('pendiente', 'acabado'));

-- CREATE INDEX IF NOT EXISTS for faster filtering
CREATE INDEX IF NOT EXISTS idx_screen_data_status ON public.screen_data(status);
CREATE INDEX IF NOT EXISTS idx_screen_data_state ON public.screen_data(state);
CREATE INDEX IF NOT EXISTS idx_screens_screen_type ON public.screens(screen_type);

-- MIGRACIÓN: 20251002100000_add_planning_features.sql

-- ========= GESTIÃ“N DE USUARIOS Y EQUIPOS =========

-- Tabla para perfiles de usuario extendidos
-- Se vincula 1 a 1 con la tabla de autenticaciÃ³n de Supabase (auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  role TEXT NOT NULL DEFAULT 'operario',
  status TEXT DEFAULT 'activo' NOT NULL -- Ej: 'activo', 'baja', 'vacaciones'
);

-- Habilitar RLS y definir polÃ­ticas para perfiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Los usuarios pueden ver su propio perfil" ON public.profiles;
CREATE POLICY "Los usuarios pueden ver su propio perfil" ON public.profiles FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Los administradores pueden gestionar todos los perfiles" ON public.profiles;
CREATE POLICY "Los administradores pueden gestionar todos los perfiles" ON public.profiles FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')); -- Asumimos un rol/equipo 'admin'


-- ========= GESTIÃ“N DE VEHÃCULOS =========

-- Tabla para almacenar los vehÃ­culos
CREATE TABLE IF NOT EXISTS public.vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT -- Ej: 'CAMION', 'JUMPER', 'FURGONETA'
);

-- Habilitar RLS y polÃ­ticas para vehÃ­culos
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Los usuarios autenticados pueden ver los vehÃ­culos" ON public.vehicles;
CREATE POLICY "Los usuarios autenticados pueden ver los vehÃ­culos" ON public.vehicles FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Los administradores pueden gestionar los vehÃ­culos" ON public.vehicles;
CREATE POLICY "Los administradores pueden gestionar los vehÃ­culos" ON public.vehicles FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));


-- ========= MEJORAS EN TAREAS (SCREEN_DATA) =========

-- AÃ±adir columnas a la tabla de datos de pantalla (tareas)
ALTER TABLE public.screen_data
  ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL, -- Usuario asignado
  ADD COLUMN IF NOT EXISTS due_date DATE, -- Fecha de vencimiento para ordenar
  ADD COLUMN IF NOT EXISTS checkin_token TEXT UNIQUE, -- Token Ãºnico para el checking de la tarea
  ADD COLUMN IF NOT EXISTS "order" INTEGER; -- Para el orden manual (drag-and-drop)

-- Tabla de uniÃ³n para asignar mÃºltiples vehÃ­culos a una tarea
CREATE TABLE IF NOT EXISTS public.task_vehicles (
  task_id UUID REFERENCES public.screen_data(id) ON DELETE CASCADE,
  vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE CASCADE,
  PRIMARY KEY (task_id, vehicle_id)
);

-- Habilitar RLS y polÃ­ticas para la tabla de uniÃ³n
ALTER TABLE public.task_vehicles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Los usuarios autenticados pueden ver las asignaciones de vehÃ­culos" ON public.task_vehicles;
CREATE POLICY "Los usuarios autenticados pueden ver las asignaciones de vehÃ­culos" ON public.task_vehicles FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Los administradores pueden gestionar las asignaciones" ON public.task_vehicles;
CREATE POLICY "Los administradores pueden gestionar las asignaciones" ON public.task_vehicles FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));


-- ========= MEJORAS EN PANTALLAS (SCREENS) =========

-- AÃ±adir columna para vincular pantallas (ej: pendiente -> acabado)
ALTER TABLE public.screens
  ADD COLUMN IF NOT EXISTS next_screen_id UUID REFERENCES public.screens(id) ON DELETE SET NULL;

-- AÃ±adir columna para grupos de pantallas (ej: 'Corte', 'Planchado')
ALTER TABLE public.screens
  ADD COLUMN IF NOT EXISTS screen_group TEXT;

-- MIGRACIÓN: 20251002110000_fix_rls_policies.sql

-- ========= CORRECCIÃ“N DE POLÃTICAS RLS PARA PERFILES (USUARIOS) =========

-- Eliminamos todas las polÃ­ticas posibles para esta tabla para evitar conflictos.










-- SELECT: Permitir a cualquier usuario autenticado VER la lista de todos los perfiles.
DROP POLICY IF EXISTS "Usuarios autenticados pueden ver todos los perfiles" ON public.profiles;
CREATE POLICY "Usuarios autenticados pueden ver todos los perfiles" ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

-- UPDATE (Usuario individual): Los usuarios pueden actualizar su PROPIO perfil.
DROP POLICY IF EXISTS "Usuarios pueden actualizar su propio perfil" ON public.profiles;
CREATE POLICY "Usuarios pueden actualizar su propio perfil" ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- INSERT (Solo Admin): Solo los administradores pueden crear perfiles.
DROP POLICY IF EXISTS "Administradores pueden crear perfiles" ON public.profiles;
CREATE POLICY "Administradores pueden crear perfiles" ON public.profiles FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- DELETE (Solo Admin): Solo los administradores pueden eliminar perfiles.
DROP POLICY IF EXISTS "Administradores pueden eliminar perfiles" ON public.profiles;
CREATE POLICY "Administradores pueden eliminar perfiles" ON public.profiles FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- UPDATE (Admin): Los administradores tambiÃ©n pueden actualizar cualquier perfil.
DROP POLICY IF EXISTS "Administradores pueden actualizar cualquier perfil" ON public.profiles;
CREATE POLICY "Administradores pueden actualizar cualquier perfil" ON public.profiles FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));


-- ========= CORRECCIÃ“N DE POLÃTICAS RLS PARA VEHÃCULOS =========

-- Eliminamos todas las polÃ­ticas posibles para esta tabla.









-- SELECT: Permitir a cualquier usuario autenticado VER la lista de vehÃ­culos.
DROP POLICY IF EXISTS "Usuarios autenticados pueden ver los vehÃ­culos" ON public.vehicles;
CREATE POLICY "Usuarios autenticados pueden ver los vehÃ­culos" ON public.vehicles FOR SELECT
  TO authenticated
  USING (true);

-- INSERT (Solo Admin): Solo los administradores pueden crear vehÃ­culos.
DROP POLICY IF EXISTS "Administradores pueden crear vehÃ­culos" ON public.vehicles;
CREATE POLICY "Administradores pueden crear vehÃ­culos" ON public.vehicles FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- UPDATE (Solo Admin): Solo los administradores pueden actualizar vehÃ­culos.
DROP POLICY IF EXISTS "Administradores pueden actualizar vehÃ­culos" ON public.vehicles;
CREATE POLICY "Administradores pueden actualizar vehÃ­culos" ON public.vehicles FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- DELETE (Solo Admin): Solo los administradores pueden eliminar vehÃ­culos.
DROP POLICY IF EXISTS "Administradores pueden eliminar vehÃ­culos" ON public.vehicles;
CREATE POLICY "Administradores pueden eliminar vehÃ­culos" ON public.vehicles FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- MIGRACIÓN: 20251002120000_decouple_profiles.sql

-- ========= DESACOPLAR LA TABLA PROFILES DE AUTH.USERS =========

-- 1. Eliminar la restricciÃ³n de clave forÃ¡nea en la columna "assigned_to" de las tareas
-- para poder modificar la tabla "profiles" sin problemas.
ALTER TABLE public.screen_data
  DROP CONSTRAINT IF EXISTS screen_data_assigned_to_fkey;

-- 2. Eliminar la polÃ­tica de RLS de actualizaciÃ³n que depende de la estructura antigua.


-- 3. Eliminar la restricciÃ³n de clave forÃ¡nea que une "profiles.id" con "auth.users.id".
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_id_fkey;

-- 4. AÃ±adir una nueva columna "auth_user_id" que SÃ estarÃ¡ vinculada a auth.users.
-- Esta columna puede ser nula, permitiendo que existan perfiles sin una cuenta de login.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS auth_user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL;
  
-- 5. AÃ±adir una columna de email para poder vincular la cuenta mÃ¡s tarde.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email TEXT UNIQUE;

-- 6. Cambiar la clave primaria "id" para que se autogenere.
-- Esto requiere eliminarla y volver a crearla.
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_pkey CASCADE;
ALTER TABLE public.profiles ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE public.profiles ADD PRIMARY KEY (id);

-- 7. Volver a crear la restricciÃ³n de clave forÃ¡nea en "screen_data.assigned_to"
-- apuntando a la nueva clave primaria autogenerada de "profiles".
ALTER TABLE public.screen_data
  ADD CONSTRAINT screen_data_assigned_to_fkey
  FOREIGN KEY (assigned_to) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 8. Volver a crear la polÃ­tica de RLS de actualizaciÃ³n con la nueva estructura.
-- Ahora, los usuarios actualizan su perfil si su ID de autenticaciÃ³n coincide con "auth_user_id".
DROP POLICY IF EXISTS "Usuarios pueden actualizar su propio perfil" ON public.profiles;
CREATE POLICY "Usuarios pueden actualizar su propio perfil" ON public.profiles FOR UPDATE
  USING (auth.uid() = auth_user_id)
  WITH CHECK (auth.uid() = auth_user_id);

-- MIGRACIÓN: 20251002130000_add_task_profiles_junction.sql

-- Tabla de uniÃ³n para asignar mÃºltiples operarios a una tarea
CREATE TABLE IF NOT EXISTS public.task_profiles (
  task_id UUID REFERENCES public.screen_data(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  PRIMARY KEY (task_id, profile_id)
);

-- Habilitar RLS y polÃ­ticas para la nueva tabla
ALTER TABLE public.task_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Los usuarios autenticados pueden ver las asignaciones de operarios" ON public.task_profiles;
CREATE POLICY "Los usuarios autenticados pueden ver las asignaciones de operarios" ON public.task_profiles FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Los administradores pueden gestionar las asignaciones de operarios" ON public.task_profiles;
CREATE POLICY "Los administradores pueden gestionar las asignaciones de operarios" ON public.task_profiles FOR ALL 
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- MIGRACIÓN: 20251004082200_add_full_planning_features.sql

-- FASE 1: EvoluciÃ³n del Esquema de BD para funcionalidades de planificaciÃ³n avanzadas (VersiÃ³n Corregida)
BEGIN;

-- TAREA 1.1.1: Modificar 'screen_data' para rangos de fecha.
-- Este bloque es idempotente: se ejecuta de forma segura tanto si 'due_date' existe como si no.
DO $$
BEGIN
    -- Comprueba si la columna 'due_date' existe.
    IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name='screen_data' AND column_name='due_date') 
       AND NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name='screen_data' AND column_name='start_date') THEN
        -- Si existe, la renombramos a 'start_date', que es mÃ¡s seguro que aÃ±adir/borrar.
        ALTER TABLE public.screen_data RENAME COLUMN due_date TO start_date;
        -- AÃ±adimos la nueva columna 'end_date'.
        ALTER TABLE public.screen_data ADD COLUMN IF NOT EXISTS end_date DATE;
        -- Poblamos 'end_date' con el valor de 'start_date' para los registros existentes.
        UPDATE public.screen_data SET end_date = start_date;
    ELSE
        -- Si 'due_date' no existe, nos aseguramos de que 'start_date' y 'end_date' existan.
        ALTER TABLE public.screen_data ADD COLUMN IF NOT EXISTS start_date DATE;
        ALTER TABLE public.screen_data ADD COLUMN IF NOT EXISTS end_date DATE;
    END IF;
END $$;

-- TAREA 1.1.1 (ContinuaciÃ³n): AÃ±adir ubicaciÃ³n y responsable.
ALTER TABLE public.screen_data ADD COLUMN IF NOT EXISTS location TEXT CHECK (location IN ('en la isla', 'fuera'));
ALTER TABLE public.screen_data ADD COLUMN IF NOT EXISTS responsible_profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- TAREA 1.1.2: AÃ±adir nuevo estado 'urgente' y otros al campo 'state'.
ALTER TABLE public.screen_data DROP CONSTRAINT IF EXISTS screen_data_state_check;
ALTER TABLE public.screen_data ADD CONSTRAINT screen_data_state_check CHECK (state IN ('normal', 'incidente', 'arreglo', 'urgente', 'pendiente', 'a la espera', 'en fabricacion', 'terminado'));
UPDATE public.screen_data SET state = 'pendiente' WHERE state = 'normal';
ALTER TABLE public.screen_data ALTER COLUMN state SET DEFAULT 'pendiente';

-- TAREA 1.1.3: Evolucionar 'profiles' con nuevos campos.
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'operario' NOT NULL CHECK (role IN ('admin', 'responsable', 'operario'));
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- TAREA 1.1.4: Crear tabla para disponibilidad de usuarios.
CREATE TABLE IF NOT EXISTS public.user_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('vacaciones', 'baja')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.user_availability ENABLE ROW LEVEL SECURITY;

-- TAREA 1.1.5: Crear tabla para tareas archivadas.
CREATE TABLE IF NOT EXISTS public.archived_tasks (
  id UUID PRIMARY KEY,
  archived_at TIMESTAMPTZ DEFAULT NOW(),
  data JSONB,
  status TEXT,
  state TEXT,
  start_date DATE,
  end_date DATE,
  location TEXT,
  responsible_profile_id UUID,
  responsible_name TEXT,
  assigned_users JSONB,
  assigned_vehicles JSONB
);
ALTER TABLE public.archived_tasks ENABLE ROW LEVEL SECURITY;

-- TAREA 1.1.6: Crear tabla para planes compartidos.
CREATE TABLE IF NOT EXISTS public.shared_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT UNIQUE NOT NULL,
  task_ids UUID[] NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.shared_plans ENABLE ROW LEVEL SECURITY;

-- TAREA 1.1.7: AÃ±adir color de cabecera a 'screens'.
ALTER TABLE public.screens ADD COLUMN IF NOT EXISTS header_color TEXT;

-- TAREA 1.1.8: Crear Ã­ndices para optimizar rendimiento.
CREATE INDEX IF NOT EXISTS idx_screen_data_dates ON public.screen_data(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_screen_data_responsible ON public.screen_data(responsible_profile_id);
CREATE INDEX IF NOT EXISTS idx_user_availability_profile_id ON public.user_availability(profile_id);

COMMIT;

-- ========= PLAN DE ROLLBACK (En caso de fallo) =========
-- BEGIN;
-- ALTER TABLE public.screen_data ADD COLUMN IF NOT EXISTS due_date DATE;
-- UPDATE public.screen_data SET due_date = start_date;
-- ALTER TABLE public.screen_data DROP COLUMN start_date, DROP COLUMN end_date, DROP COLUMN location, DROP COLUMN responsible_profile_id;
-- ALTER TABLE public.profiles DROP COLUMN phone, DROP COLUMN role, DROP COLUMN avatar_url;
-- DROP TABLE IF EXISTS public.user_availability;
-- DROP TABLE IF EXISTS public.archived_tasks;
-- DROP TABLE IF EXISTS public.shared_plans;
-- ALTER TABLE public.screens DROP COLUMN header_color;
-- COMMIT;

-- MIGRACIÓN: 20251004093000_add_rpc_and_rls_policies.sql

-- FASE 1, TAREA 1.2: CreaciÃ³n de Funciones RPC, PolÃ­ticas de Seguridad y configuraciÃ³n de Cron Job

BEGIN;

-- 1. POLÃTICAS DE SEGURIDAD PARA LAS NUEVAS TABLAS

-- Tabla: user_availability (Disponibilidad de usuarios)
-- Objetivo: Permitir que los administradores gestionen todas las ausencias y que los usuarios vean las suyas.
DROP POLICY IF EXISTS "Los admins pueden gestionar toda la disponibilidad" ON public.user_availability;
CREATE POLICY "Los admins pueden gestionar toda la disponibilidad" ON public.user_availability
  FOR ALL USING ((SELECT role FROM public.profiles WHERE auth_user_id = auth.uid()) = 'admin');
DROP POLICY IF EXISTS "Los usuarios pueden ver su propia disponibilidad" ON public.user_availability;
CREATE POLICY "Los usuarios pueden ver su propia disponibilidad" ON public.user_availability
  FOR SELECT USING ((SELECT auth_user_id FROM public.profiles WHERE id = profile_id) = auth.uid());

-- Tabla: archived_tasks (Tareas archivadas)
-- Objetivo: Permitir que solo los administradores consulten el historial de tareas.
DROP POLICY IF EXISTS "Los admins pueden ver las tareas archivadas" ON public.archived_tasks;
CREATE POLICY "Los admins pueden ver las tareas archivadas" ON public.archived_tasks
  FOR SELECT USING ((SELECT role FROM public.profiles WHERE auth_user_id = auth.uid()) = 'admin');

-- Tabla: shared_plans (Planes compartidos)
-- Objetivo: Permitir la lectura pÃºblica de planes a travÃ©s de un token y que solo los admins puedan crearlos/eliminarlos.
DROP POLICY IF EXISTS "Permitir lectura pÃºblica de planes compartidos" ON public.shared_plans;
CREATE POLICY "Permitir lectura pÃºblica de planes compartidos" ON public.shared_plans
  FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "Los admins pueden gestionar los planes compartidos" ON public.shared_plans;
CREATE POLICY "Los admins pueden gestionar los planes compartidos" ON public.shared_plans
  FOR ALL USING ((SELECT role FROM public.profiles WHERE auth_user_id = auth.uid()) = 'admin');


-- 2. FUNCIÃ“N RPC PARA CALCULAR LA SOBRECARGA DE TRABAJO DE UN USUARIO

-- Objetivo: Contar cuÃ¡ntas tareas activas tiene asignado un operario como responsable en una fecha especÃ­fica.
CREATE OR REPLACE FUNCTION get_user_workload(user_id uuid, target_date date)
RETURNS int AS $$
DECLARE
  task_count int;
BEGIN
  SELECT COUNT(*) INTO task_count
  FROM public.screen_data
  WHERE responsible_profile_id = user_id
  AND target_date >= start_date AND target_date <= end_date
  AND state <> 'terminado'; -- Excluimos las tareas ya terminadas.
  
  RETURN task_count;
END;
$$ LANGUAGE plpgsql STABLE;


-- 3. FUNCIÃ“N RPC PARA OBTENER EL ESTADO DE UN USUARIO EN UNA FECHA DADA

-- Objetivo: Determinar si un usuario estÃ¡ 'activo', 'de vacaciones' o 'de baja' en una fecha especÃ­fica.
CREATE OR REPLACE FUNCTION get_user_status(user_id uuid, target_date date)
RETURNS text AS $$
DECLARE
  current_status text;
BEGIN
  -- Primero, revisamos si hay una entrada de disponibilidad (vacaciones/baja) para esa fecha.
  SELECT status INTO current_status
  FROM public.user_availability
  WHERE profile_id = user_id
  AND target_date >= start_date AND target_date <= end_date
  LIMIT 1;

  -- Si encontramos un estado en la tabla de disponibilidad, lo devolvemos.
  IF FOUND THEN
    RETURN current_status;
  END IF;

  -- Si no, obtenemos el estado general del perfil.
  SELECT status INTO current_status
  FROM public.profiles
  WHERE id = user_id;
  
  RETURN current_status;
END;
$$ LANGUAGE plpgsql STABLE;


-- 4. FUNCIÃ“N PARA EL ARCHIVADO AUTOMÃTICO DE TAREAS

-- Objetivo: Mover tareas terminadas de la tabla principal a la de archivados para mantener el rendimiento.
-- Esta funciÃ³n serÃ¡ llamada por un Cron Job.
CREATE OR REPLACE FUNCTION archive_completed_tasks()
RETURNS void AS $$
BEGIN
  -- Insertar en la tabla de archivados las tareas terminadas cuya fecha de finalizaciÃ³n ya pasÃ³.
  INSERT INTO public.archived_tasks (id, data, status, state, start_date, end_date, location, responsible_profile_id, responsible_name, assigned_users, assigned_vehicles)
  SELECT 
    sd.id,
    sd.data,
    sd.status,
    sd.state,
    sd.start_date,
    sd.end_date,
    sd.location,
    sd.responsible_profile_id,
    p.full_name,
    (SELECT jsonb_agg(jsonb_build_object('id', pr.id, 'full_name', pr.full_name)) FROM public.task_profiles tp JOIN public.profiles pr ON tp.profile_id = pr.id WHERE tp.task_id = sd.id),
    (SELECT jsonb_agg(jsonb_build_object('id', v.id, 'name', v.name)) FROM public.task_vehicles tv JOIN public.vehicles v ON tv.vehicle_id = v.id WHERE tv.task_id = sd.id)
  FROM public.screen_data sd
  LEFT JOIN public.profiles p ON sd.responsible_profile_id = p.id
  WHERE sd.state = 'terminado' AND sd.end_date < (NOW() - INTERVAL '1 day');
  
  -- Eliminar las tareas que acabamos de archivar de la tabla principal.
  DELETE FROM public.screen_data
  WHERE id IN (SELECT id FROM public.archived_tasks WHERE archived_at >= NOW() - INTERVAL '1 minute');

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;

-- MIGRACIÓN: 20251004150000_add_status_to_profiles.sql

-- FASE DE CORRECCIÃ“N ARQUITECTÃ“NICA: AÃ±adir la columna 'status' que falta a la tabla 'profiles'.

BEGIN;

-- 1. AÃ‘ADIR LA COLUMNA 'status' A LA TABLA 'profiles'
-- Se define como TEXT y se permite que sea nulo, con un valor por defecto de 'activo'.
-- El CHECK constraint asegura la integridad de los datos.
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'activo' CHECK (status IN ('activo', 'baja', 'vacaciones'));

-- 2. INICIALIZAR LA COLUMNA PARA LOS REGISTROS EXISTENTES
-- Nos aseguramos de que todos los perfiles existentes tengan el estado 'activo' por defecto.
UPDATE public.profiles SET status = 'activo' WHERE status IS NULL;

COMMIT;

-- MIGRACIÓN: 20251005000000_fix_infinite_recursion_rls.sql

-- CORRECCIÃ“N CRÃTICA: Eliminar recursiÃ³n infinita en polÃ­ticas RLS
-- El problema es que las polÃ­ticas de admin hacen SELECT en profiles desde dentro de policies de profiles

BEGIN;

-- =============================================
-- 1. ELIMINAR POLÃTICAS RECURSIVAS DE PROFILES
-- =============================================






-- =============================================
-- 2. CREAR FUNCIÃ“N HELPER PARA VERIFICAR ADMIN
-- =============================================

-- Esta funciÃ³n evita la recursiÃ³n al usar SECURITY DEFINER
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

-- =============================================
-- 3. RECREAR POLÃTICAS SIN RECURSIÃ“N
-- =============================================

-- PolÃ­tica de admin para profiles usando la funciÃ³n helper
DROP POLICY IF EXISTS "Admins can manage all profiles" ON public.profiles;
CREATE POLICY "Admins can manage all profiles" ON public.profiles FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- PolÃ­tica de admin para user_availability
DROP POLICY IF EXISTS "Admins can manage user availability" ON public.user_availability;
CREATE POLICY "Admins can manage user availability" ON public.user_availability FOR ALL
  TO authenticated
  USING (public.is_admin());

-- PolÃ­tica de admin para archived_tasks
DROP POLICY IF EXISTS "Admins can view archived tasks" ON public.archived_tasks;
CREATE POLICY "Admins can view archived tasks" ON public.archived_tasks FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- PolÃ­tica de admin para shared_plans
DROP POLICY IF EXISTS "Admins can manage shared plans" ON public.shared_plans;
CREATE POLICY "Admins can manage shared plans" ON public.shared_plans FOR ALL
  TO authenticated
  USING (public.is_admin());

-- =============================================
-- 4. ARREGLAR POLÃTICAS DE VEHICLES Y SCREEN_DATA
-- =============================================

-- Eliminar polÃ­ticas recursivas si existen





-- Vehicles: Lectura para autenticados, gestiÃ³n para admins
DROP POLICY IF EXISTS "Authenticated users can view vehicles" ON public.vehicles;
CREATE POLICY "Authenticated users can view vehicles" ON public.vehicles FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Admins can manage vehicles" ON public.vehicles;
CREATE POLICY "Admins can manage vehicles" ON public.vehicles FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Screen_data: Lectura para autenticados, gestiÃ³n para admins
DROP POLICY IF EXISTS "Authenticated users can view screen data" ON public.screen_data;
CREATE POLICY "Authenticated users can view screen data" ON public.screen_data FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Admins can manage screen data" ON public.screen_data;
CREATE POLICY "Admins can manage screen data" ON public.screen_data FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- =============================================
-- 5. ASEGURAR QUE LA COLUMNA STATUS EXISTE
-- =============================================

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'activo'
CHECK (status IN ('activo', 'baja', 'vacaciones'));

-- Inicializar registros existentes
UPDATE public.profiles SET status = 'activo' WHERE status IS NULL;

COMMIT;

-- MIGRACIÓN: 20251005000001_update_upsert_task.sql

-- Actualizar funciÃ³n upsert_task para usar start_date/end_date en lugar de due_date
CREATE OR REPLACE FUNCTION public.upsert_task(
    task_id_in uuid,
    start_date_in date,
    end_date_in date,
    site_in text,
    description_in text,
    location_in text,
    responsible_profile_id_in uuid,
    state_in text,
    user_ids uuid[],
    vehicle_ids uuid[]
)
RETURNS uuid AS $$
DECLARE
    new_task_id uuid;
BEGIN
    -- Insertar o actualizar la tarea en la tabla screen_data
    IF task_id_in IS NULL THEN
        -- Insertar nueva tarea si no se proporciona ID
        INSERT INTO public.screen_data (
            start_date,
            end_date,
            data,
            status,
            state,
            location,
            responsible_profile_id
        )
        VALUES (
            start_date_in,
            end_date_in,
            jsonb_build_object('site', site_in, 'description', description_in),
            'pendiente',
            COALESCE(state_in, 'pendiente'),
            location_in,
            responsible_profile_id_in
        )
        RETURNING id INTO new_task_id;
    ELSE
        -- Actualizar tarea existente
        UPDATE public.screen_data
        SET
            start_date = start_date_in,
            end_date = end_date_in,
            data = jsonb_build_object('site', site_in, 'description', description_in),
            location = location_in,
            responsible_profile_id = responsible_profile_id_in,
            state = COALESCE(state_in, state)
        WHERE id = task_id_in
        RETURNING id INTO new_task_id;
    END IF;

    -- Gestionar relaciones con operarios (profiles)
    -- Primero, eliminar relaciones existentes para esta tarea
    DELETE FROM public.task_profiles WHERE task_id = new_task_id;
    -- Luego, insertar las nuevas relaciones si se proporcionaron IDs de usuario
    IF array_length(user_ids, 1) > 0 THEN
        INSERT INTO public.task_profiles (task_id, profile_id)
        SELECT new_task_id, unnest(user_ids);
    END IF;

    -- Gestionar relaciones con vehÃ­culos
    DELETE FROM public.task_vehicles WHERE task_id = new_task_id;
    IF array_length(vehicle_ids, 1) > 0 THEN
        INSERT INTO public.task_vehicles (task_id, vehicle_id)
        SELECT new_task_id, unnest(vehicle_ids);
    END IF;

    RETURN new_task_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Dar permisos
GRANT EXECUTE ON FUNCTION public.upsert_task(uuid, date, date, text, text, text, uuid, text, uuid[], uuid[]) TO authenticated;

-- MIGRACIÓN: 20251005200000_add_system_config.sql

-- =====================================================
-- Crear tabla de configuraciÃ³n del sistema
-- =====================================================

-- Tabla para almacenar configuraciones generales del sistema
CREATE TABLE IF NOT EXISTS public.system_config (id uuid PRIMARY KEY DEFAULT gen_random_uuid());
ALTER TABLE public.system_config ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'general';
ALTER TABLE public.system_config ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.system_config ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.system_config ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES public.profiles(id);
-- Original definition follows:
CREATE TABLE IF NOT EXISTS public.system_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  key TEXT UNIQUE NOT NULL,
  value JSONB NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'general'
);

-- Habilitar RLS
ALTER TABLE public.system_config ENABLE ROW LEVEL SECURITY;

-- Solo admins pueden ver y modificar configuraciones
DROP POLICY IF EXISTS "Admins can view system config" ON public.system_config;
CREATE POLICY "Admins can view system config" ON public.system_config
FOR SELECT
TO authenticated
USING (
  (SELECT role FROM public.profiles WHERE auth_user_id = auth.uid()) = 'admin'
);

DROP POLICY IF EXISTS "Admins can insert system config" ON public.system_config;
CREATE POLICY "Admins can insert system config" ON public.system_config
FOR INSERT
TO authenticated
WITH CHECK (
  (SELECT role FROM public.profiles WHERE auth_user_id = auth.uid()) = 'admin'
);

DROP POLICY IF EXISTS "Admins can update system config" ON public.system_config;
CREATE POLICY "Admins can update system config" ON public.system_config
FOR UPDATE
TO authenticated
USING (
  (SELECT role FROM public.profiles WHERE auth_user_id = auth.uid()) = 'admin'
);

DROP POLICY IF EXISTS "Admins can delete system config" ON public.system_config;
CREATE POLICY "Admins can delete system config" ON public.system_config
FOR DELETE
TO authenticated
USING (
  (SELECT role FROM public.profiles WHERE auth_user_id = auth.uid()) = 'admin'
);

-- Insertar configuraciones por defecto
INSERT INTO public.system_config (key, value, description, category)
VALUES
  ('company_name', '"EGEA Productivity"'::jsonb, 'Nombre de la empresa', 'general'),
  ('company_logo', '""'::jsonb, 'URL del logo de la empresa', 'general'),
  ('company_email', '"info@egea.com"'::jsonb, 'Email de contacto', 'general'),
  ('company_phone', '"+34 XXX XXX XXX"'::jsonb, 'TelÃ©fono de contacto', 'general'),
  ('app_version', '"1.0.0-alpha"'::jsonb, 'VersiÃ³n de la aplicaciÃ³n', 'system'),
  ('theme_primary_color', '"#0ea5e9"'::jsonb, 'Color primario del tema', 'appearance'),
  ('enable_notifications', 'true'::jsonb, 'Habilitar notificaciones', 'features'),
  ('default_task_duration', '8'::jsonb, 'DuraciÃ³n por defecto de tareas (horas)', 'tasks')
ON CONFLICT (key) DO NOTHING;

-- FunciÃ³n para actualizar updated_at automÃ¡ticamente
CREATE OR REPLACE FUNCTION update_system_config_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER system_config_updated_at
BEFORE UPDATE ON public.system_config
FOR EACH ROW
EXECUTE FUNCTION update_system_config_timestamp();

-- MIGRACIÓN: 20251006000000_unified_rls_policies.sql

-- =====================================================================
-- MIGRACIÃ“N UNIFICADA: PolÃ­tica de Seguridad RLS Centralizada
-- =====================================================================
-- Fecha: 2025-10-06
-- Objetivo: Reemplazar TODAS las polÃ­ticas RLS existentes por un sistema
--           unificado, coherente y sin recursiÃ³n infinita.
-- =====================================================================

BEGIN;

-- =====================================================================
-- PASO 1: LIMPIAR POLÃTICAS EXISTENTES (TODAS LAS TABLAS)
-- =====================================================================

-- Eliminar TODAS las polÃ­ticas existentes para empezar desde cero
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
            'Los usuarios autenticados pueden ver los vehÃ­culos', r.tablename);
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I',
            'Los administradores pueden gestionar los vehÃ­culos', r.tablename);
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
            'Permitir lectura pÃºblica de planes compartidos', r.tablename);
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I',
            'Los admins pueden gestionar los planes compartidos', r.tablename);
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I',
            'Admins can manage shared plans', r.tablename);
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I',
            'Los usuarios autenticados pueden ver las asignaciones de operarios', r.tablename);
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I',
            'Los administradores pueden gestionar las asignaciones de operarios', r.tablename);
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I',
            'Los usuarios autenticados pueden ver las asignaciones de vehÃ­culos', r.tablename);
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I',
            'Los administradores pueden gestionar las asignaciones', r.tablename);
    END LOOP;
END $$;

-- =====================================================================
-- PASO 2: FUNCIÃ“N HELPER MEJORADA PARA VERIFICAR ROL DE ADMIN
-- =====================================================================
-- Esta funciÃ³n evita la recursiÃ³n infinita usando SECURITY DEFINER
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

-- Otorgar permisos de ejecuciÃ³n a usuarios autenticados
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- =====================================================================
-- PASO 3: POLÃTICAS BASE - LECTURA PARA AUTENTICADOS
-- =====================================================================

-- TEMPLATES: Lectura para todos, gestiÃ³n para admins
DROP POLICY IF EXISTS "read_templates" ON public.templates;
CREATE POLICY "read_templates" ON public.templates FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "manage_templates" ON public.templates;
CREATE POLICY "manage_templates" ON public.templates FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- SCREENS: Lectura para todos (incluye anon para pantallas pÃºblicas), gestiÃ³n para admins
DROP POLICY IF EXISTS "read_screens" ON public.screens;
CREATE POLICY "read_screens" ON public.screens FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "manage_screens" ON public.screens;
CREATE POLICY "manage_screens" ON public.screens FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- SCREEN_DATA (Tareas): Lectura para todos (incluye anon para displays pÃºblicos), gestiÃ³n para admins
DROP POLICY IF EXISTS "read_screen_data" ON public.screen_data;
CREATE POLICY "read_screen_data" ON public.screen_data FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "manage_screen_data" ON public.screen_data;
CREATE POLICY "manage_screen_data" ON public.screen_data FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- =====================================================================
-- PASO 4: POLÃTICAS DE PROFILES (SIN RECURSIÃ“N)
-- =====================================================================

-- Los usuarios pueden ver su propio perfil
DROP POLICY IF EXISTS "read_own_profile" ON public.profiles;
CREATE POLICY "read_own_profile" ON public.profiles FOR SELECT
  TO authenticated
  USING (auth_user_id = auth.uid());

-- Los usuarios pueden actualizar su propio perfil (solo ciertos campos)
DROP POLICY IF EXISTS "update_own_profile" ON public.profiles;
CREATE POLICY "update_own_profile" ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth_user_id = auth.uid())
  WITH CHECK (auth_user_id = auth.uid());

-- Los admins pueden ver todos los perfiles usando la funciÃ³n helper
DROP POLICY IF EXISTS "admin_read_all_profiles" ON public.profiles;
CREATE POLICY "admin_read_all_profiles" ON public.profiles FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- Los admins pueden gestionar todos los perfiles
DROP POLICY IF EXISTS "admin_manage_profiles" ON public.profiles;
CREATE POLICY "admin_manage_profiles" ON public.profiles FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- =====================================================================
-- PASO 5: POLÃTICAS DE VEHICLES
-- =====================================================================

-- Lectura para todos los autenticados
DROP POLICY IF EXISTS "read_vehicles" ON public.vehicles;
CREATE POLICY "read_vehicles" ON public.vehicles FOR SELECT
  TO authenticated
  USING (true);

-- GestiÃ³n solo para admins
DROP POLICY IF EXISTS "manage_vehicles" ON public.vehicles;
CREATE POLICY "manage_vehicles" ON public.vehicles FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- =====================================================================
-- PASO 6: POLÃTICAS DE TABLAS DE UNIÃ“N (JUNCTION TABLES)
-- =====================================================================

-- TASK_PROFILES: Lectura para todos, gestiÃ³n para admins
DROP POLICY IF EXISTS "read_task_profiles" ON public.task_profiles;
CREATE POLICY "read_task_profiles" ON public.task_profiles FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "manage_task_profiles" ON public.task_profiles;
CREATE POLICY "manage_task_profiles" ON public.task_profiles FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- TASK_VEHICLES: Lectura para todos, gestiÃ³n para admins
DROP POLICY IF EXISTS "read_task_vehicles" ON public.task_vehicles;
CREATE POLICY "read_task_vehicles" ON public.task_vehicles FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "manage_task_vehicles" ON public.task_vehicles;
CREATE POLICY "manage_task_vehicles" ON public.task_vehicles FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- =====================================================================
-- PASO 7: POLÃTICAS DE USER_AVAILABILITY
-- =====================================================================

-- Los admins pueden gestionar toda la disponibilidad
DROP POLICY IF EXISTS "admin_manage_availability" ON public.user_availability;
CREATE POLICY "admin_manage_availability" ON public.user_availability FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Los usuarios pueden ver su propia disponibilidad
DROP POLICY IF EXISTS "read_own_availability" ON public.user_availability;
CREATE POLICY "read_own_availability" ON public.user_availability FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = user_availability.profile_id
      AND auth_user_id = auth.uid()
    )
  );

-- =====================================================================
-- PASO 8: POLÃTICAS DE ARCHIVED_TASKS
-- =====================================================================

-- Solo los admins pueden ver las tareas archivadas
DROP POLICY IF EXISTS "admin_read_archived_tasks" ON public.archived_tasks;
CREATE POLICY "admin_read_archived_tasks" ON public.archived_tasks FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- Solo los admins pueden insertar en archived_tasks (el sistema automÃ¡tico usa SECURITY DEFINER)
DROP POLICY IF EXISTS "admin_manage_archived_tasks" ON public.archived_tasks;
CREATE POLICY "admin_manage_archived_tasks" ON public.archived_tasks FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- =====================================================================
-- PASO 9: POLÃTICAS DE SHARED_PLANS
-- =====================================================================

-- Lectura pÃºblica de planes compartidos (para la URL pÃºblica)
DROP POLICY IF EXISTS "public_read_shared_plans" ON public.shared_plans;
CREATE POLICY "public_read_shared_plans" ON public.shared_plans FOR SELECT
  TO anon, authenticated
  USING (true);

-- Solo admins pueden crear/gestionar planes compartidos
DROP POLICY IF EXISTS "admin_manage_shared_plans" ON public.shared_plans;
CREATE POLICY "admin_manage_shared_plans" ON public.shared_plans FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- =====================================================================
-- PASO 10: POLÃTICAS DE SYSTEM_CONFIG (si existe)
-- =====================================================================

-- Lectura para todos los autenticados
DROP POLICY IF EXISTS "read_system_config" ON public.system_config;
CREATE POLICY "read_system_config" ON public.system_config FOR SELECT
  TO authenticated
  USING (true);

-- GestiÃ³n solo para admins
DROP POLICY IF EXISTS "manage_system_config" ON public.system_config;
CREATE POLICY "manage_system_config" ON public.system_config FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- =====================================================================
-- PASO 11: VERIFICAR ESTRUCTURA DE PROFILES
-- =====================================================================

-- La tabla profiles ya deberÃ­a tener auth_user_id (migraciÃ³n 20251002120000)
-- Esta verificaciÃ³n es solo por seguridad
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'profiles'
    AND column_name = 'auth_user_id'
  ) THEN
    RAISE EXCEPTION 'La columna auth_user_id no existe en profiles. Ejecute primero la migraciÃ³n 20251002120000_decouple_profiles.sql';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'profiles'
    AND column_name = 'role'
  ) THEN
    RAISE EXCEPTION 'La columna role no existe en profiles. Ejecute primero la migraciÃ³n 20251004082200_add_full_planning_features.sql';
  END IF;
END $$;

COMMIT;

-- =====================================================================
-- NOTAS DE IMPLEMENTACIÃ“N
-- =====================================================================
-- 1. Esta migraciÃ³n elimina TODAS las polÃ­ticas anteriores y las reemplaza
--    por un sistema unificado y coherente.
--
-- 2. La funciÃ³n is_admin() usa SECURITY DEFINER para evitar recursiÃ³n.
--
-- 3. Todas las polÃ­ticas siguen el patrÃ³n:
--    - Lectura: Disponible para usuarios autenticados (o anon cuando aplique)
--    - Escritura: Solo para administradores
--
-- 4. Los usuarios pueden ver/editar solo su propio perfil, excepto admins.
--
-- 5. Para ejecutar esta migraciÃ³n:
--    npx supabase db push
--    o copiar y pegar en el SQL Editor de Supabase Dashboard
-- =====================================================================

-- MIGRACIÓN: 20251006000001_create_detailed_tasks_view.sql

-- =====================================================================
-- VISTA OPTIMIZADA: detailed_tasks
-- =====================================================================
-- Fecha: 2025-10-06
-- Objetivo: Crear una vista que simplifica las consultas de tareas
--           al pre-unir datos de screen_data con profiles, vehicles
--           y aplanar campos JSON para facilitar el uso en el frontend.
-- =====================================================================

BEGIN;

-- =====================================================================
-- PASO 1: ELIMINAR VISTA SI EXISTE (para permitir re-ejecuciÃ³n)
-- =====================================================================

DROP VIEW IF EXISTS public.detailed_tasks;

-- =====================================================================
-- PASO 2: CREAR LA VISTA detailed_tasks
-- =====================================================================

CREATE OR REPLACE VIEW public.detailed_tasks AS
SELECT
  -- Datos bÃ¡sicos de la tarea
  sd.id,
  sd.created_at,
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

  -- InformaciÃ³n del screen asociado
  s.name AS screen_name,
  s.screen_type,
  s.screen_group,
  s.next_screen_id,
  s.header_color,
  s.is_active AS screen_is_active,

  -- InformaciÃ³n del responsable (responsible_profile_id)
  rp.full_name AS responsible_name,
  rp.email AS responsible_email,
  rp.phone AS responsible_phone,
  rp.role AS responsible_role,
  rp.status AS responsible_status,
  rp.avatar_url AS responsible_avatar,

  -- InformaciÃ³n del assigned_to (puede ser diferente del responsible)
  ap.full_name AS assigned_name,
  ap.email AS assigned_email,
  ap.phone AS assigned_phone,
  ap.role AS assigned_role,
  ap.status AS assigned_status,

  -- Campos JSON aplanados para facilitar el acceso
  sd.data->>'site' AS site,
  sd.data->>'client' AS client,
  sd.data->>'address' AS address,
  sd.data->>'description' AS description,
  sd.data->>'notes' AS notes,
  sd.data->>'vehicle_type' AS vehicle_type,

  -- Operarios asignados (array agregado desde task_profiles)
  COALESCE(
    (
      SELECT jsonb_agg(
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
      WHERE tp.task_id = sd.id
    ),
    '[]'::jsonb
  ) AS assigned_profiles,

  -- VehÃ­culos asignados (array agregado desde task_vehicles)
  COALESCE(
    (
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', v.id,
          'name', v.name,
          'type', v.type
        ) ORDER BY v.name
      )
      FROM public.task_vehicles tv
      JOIN public.vehicles v ON tv.vehicle_id = v.id
      WHERE tv.task_id = sd.id
    ),
    '[]'::jsonb
  ) AS assigned_vehicles,

  -- Contadores Ãºtiles
  (
    SELECT COUNT(*)
    FROM public.task_profiles tp
    WHERE tp.task_id = sd.id
  ) AS assigned_profiles_count,

  (
    SELECT COUNT(*)
    FROM public.task_vehicles tv
    WHERE tv.task_id = sd.id
  ) AS assigned_vehicles_count,

  -- Indicadores de estado Ãºtiles
  CASE
    WHEN sd.state = 'terminado' THEN true
    ELSE false
  END AS is_completed,

  CASE
    WHEN sd.state = 'urgente' THEN true
    ELSE false
  END AS is_urgent,

  CASE
    WHEN sd.start_date <= CURRENT_DATE AND sd.end_date >= CURRENT_DATE THEN true
    ELSE false
  END AS is_current,

  CASE
    WHEN sd.end_date < CURRENT_DATE AND sd.state != 'terminado' THEN true
    ELSE false
  END AS is_overdue

FROM public.screen_data sd
LEFT JOIN public.screens s ON sd.screen_id = s.id
LEFT JOIN public.profiles rp ON sd.responsible_profile_id = rp.id
LEFT JOIN public.profiles ap ON sd.assigned_to = ap.id;

-- =====================================================================
-- PASO 3: OTORGAR PERMISOS DE LECTURA
-- =====================================================================

-- Permitir lectura de la vista a usuarios autenticados y anÃ³nimos
-- (las polÃ­ticas RLS de las tablas subyacentes siguen aplicando)
GRANT SELECT ON public.detailed_tasks TO authenticated, anon;

-- =====================================================================
-- PASO 4: COMENTARIOS PARA DOCUMENTACIÃ“N
-- =====================================================================

COMMENT ON VIEW public.detailed_tasks IS
'Vista optimizada que une screen_data con profiles, vehicles y screens.
Incluye campos JSON aplanados y arrays agregados de operarios/vehÃ­culos.
Ãšsala en lugar de hacer mÃºltiples JOINs manuales en el frontend.

Ejemplo de uso:
SELECT * FROM detailed_tasks
WHERE screen_group = ''Instalaciones''
AND is_current = true
ORDER BY is_urgent DESC, start_date ASC;';

COMMIT;

-- =====================================================================
-- NOTAS DE IMPLEMENTACIÃ“N
-- =====================================================================
-- 1. Esta vista NO reemplaza las tablas originales, solo facilita consultas.
--
-- 2. Las operaciones de INSERT/UPDATE/DELETE deben seguir haciÃ©ndose
--    en las tablas base (screen_data, task_profiles, task_vehicles).
--
-- 3. Campos Ãºtiles aÃ±adidos:
--    - assigned_profiles: Array JSON con todos los operarios
--    - assigned_vehicles: Array JSON con todos los vehÃ­culos
--    - is_completed, is_urgent, is_current, is_overdue: Booleanos
--    - site, client, address: Campos del JSON 'data' aplanados
--
-- 4. Para usar en el frontend (ejemplo con React Query):
--    const { data } = useQuery({
--      queryKey: ['detailed-tasks'],
--      queryFn: async () => {
--        const { data } = await supabase
--          .from('detailed_tasks')
--          .select('*')
--          .eq('screen_group', 'Instalaciones');
--        return data;
--      }
--    });
-- =====================================================================

-- MIGRACIÓN: 20251006000002_indexes_and_cron_jobs.sql

-- =====================================================================
-- OPTIMIZACIÃ“N: Ãndices y AutomatizaciÃ³n con Cron Jobs
-- =====================================================================
-- Fecha: 2025-10-06
-- Objetivo: Crear Ã­ndices para optimizar consultas frecuentes y
--           configurar Cron Jobs para mantenimiento automatizado.
-- =====================================================================

BEGIN;

-- =====================================================================
-- PASO 1: CREAR ÃNDICES OPTIMIZADOS
-- =====================================================================

-- Ãndices en screen_data (tareas)
CREATE INDEX IF NOT EXISTS idx_screen_data_screen_id
  ON public.screen_data(screen_id);

CREATE INDEX IF NOT EXISTS idx_screen_data_state
  ON public.screen_data(state);

CREATE INDEX IF NOT EXISTS idx_screen_data_dates
  ON public.screen_data(start_date, end_date);

CREATE INDEX IF NOT EXISTS idx_screen_data_responsible
  ON public.screen_data(responsible_profile_id);

CREATE INDEX IF NOT EXISTS idx_screen_data_assigned_to
  ON public.screen_data(assigned_to);

CREATE INDEX IF NOT EXISTS idx_screen_data_location
  ON public.screen_data(location)
  WHERE location IS NOT NULL;

-- Ãndice compuesto para tareas pendientes por fecha
CREATE INDEX IF NOT EXISTS idx_screen_data_pending_dates
  ON public.screen_data(state, start_date, end_date)
  WHERE state != 'terminado';

-- Ãndice para bÃºsquedas en el campo JSON 'data'
CREATE INDEX IF NOT EXISTS idx_screen_data_site
  ON public.screen_data USING gin ((data -> 'site'));

CREATE INDEX IF NOT EXISTS idx_screen_data_client
  ON public.screen_data USING gin ((data -> 'client'));

-- Ãndices en archived_tasks
CREATE INDEX IF NOT EXISTS idx_archived_tasks_archived_at
  ON public.archived_tasks(archived_at DESC);

CREATE INDEX IF NOT EXISTS idx_archived_tasks_state
  ON public.archived_tasks(state);

CREATE INDEX IF NOT EXISTS idx_archived_tasks_dates
  ON public.archived_tasks(start_date, end_date);

CREATE INDEX IF NOT EXISTS idx_archived_tasks_responsible
  ON public.archived_tasks(responsible_profile_id);

-- Ãndices en profiles
CREATE INDEX IF NOT EXISTS idx_profiles_role
  ON public.profiles(role);

CREATE INDEX IF NOT EXISTS idx_profiles_status
  ON public.profiles(status);

CREATE INDEX IF NOT EXISTS idx_profiles_email
  ON public.profiles(email)
  WHERE email IS NOT NULL;

-- Ãndices en screens
CREATE INDEX IF NOT EXISTS idx_screens_screen_type
  ON public.screens(screen_type);

CREATE INDEX IF NOT EXISTS idx_screens_screen_group
  ON public.screens(screen_group)
  WHERE screen_group IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_screens_is_active
  ON public.screens(is_active)
  WHERE is_active = true;

-- Ãndices en user_availability
CREATE INDEX IF NOT EXISTS idx_user_availability_profile_dates
  ON public.user_availability(profile_id, start_date, end_date);

CREATE INDEX IF NOT EXISTS idx_user_availability_status
  ON public.user_availability(status);

-- Ãndices en shared_plans
CREATE INDEX IF NOT EXISTS idx_shared_plans_token
  ON public.shared_plans(token);

CREATE INDEX IF NOT EXISTS idx_shared_plans_expires_at
  ON public.shared_plans(expires_at);

-- Ãndice para planes no expirados
CREATE INDEX IF NOT EXISTS idx_shared_plans_active
  ON public.shared_plans(expires_at)
  WHERE expires_at > NOW();

-- =====================================================================
-- PASO 2: MEJORAR LA FUNCIÃ“N DE ARCHIVADO AUTOMÃTICO
-- =====================================================================

-- Reemplazar la funciÃ³n existente con una versiÃ³n mejorada
CREATE OR REPLACE FUNCTION public.archive_completed_tasks()
RETURNS TABLE(archived_count INTEGER) AS $$
DECLARE
  tasks_archived INTEGER := 0;
  v_user_role TEXT;
BEGIN
  -- Obtener el rol del usuario actual
  SELECT role INTO v_user_role
  FROM public.profiles
  WHERE auth_user_id = auth.uid();

  -- Validar permisos para archivar
  IF NOT public.has_permission(v_user_role, 'archive', 'create') THEN
    RAISE EXCEPTION 'No tienes permisos para archivar tareas';
  END IF;
  -- Insertar en la tabla de archivados las tareas terminadas cuya fecha de finalizaciÃ³n ya pasÃ³
  WITH archived AS (
    INSERT INTO public.archived_tasks (
      id, archived_at, data, status, state,
      start_date, end_date, location,
      responsible_profile_id, responsible_name,
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
      -- Operarios asignados
      COALESCE(
        (
          SELECT jsonb_agg(
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
      -- VehÃ­culos asignados
      COALESCE(
        (
          SELECT jsonb_agg(
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
      -- Evitar duplicados verificando que no exista ya en archived_tasks
      AND NOT EXISTS (
        SELECT 1 FROM public.archived_tasks at
        WHERE at.id = sd.id
      )
    RETURNING id
  )
  SELECT COUNT(*)::INTEGER INTO tasks_archived FROM archived;

  -- Eliminar las tareas que acabamos de archivar de la tabla principal
  -- Solo si el archivado fue exitoso
  IF tasks_archived > 0 THEN
    DELETE FROM public.screen_data
    WHERE id IN (
      SELECT id FROM public.archived_tasks
      WHERE archived_at >= NOW() - INTERVAL '5 minutes'
    )
    AND state = 'terminado'
    AND end_date < (CURRENT_DATE - INTERVAL '1 day');
  END IF;

  -- Retornar el nÃºmero de tareas archivadas
  RETURN QUERY SELECT tasks_archived;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Otorgar permisos solo a usuarios autenticados con rol admin
GRANT EXECUTE ON FUNCTION public.archive_completed_tasks() TO authenticated;

-- =====================================================================
-- PASO 3: FUNCIÃ“N AUXILIAR PARA LIMPIAR PLANES COMPARTIDOS EXPIRADOS
-- =====================================================================

CREATE OR REPLACE FUNCTION public.cleanup_expired_shared_plans()
RETURNS TABLE(deleted_count INTEGER) AS $$
DECLARE
  plans_deleted INTEGER := 0;
BEGIN
  -- Eliminar planes compartidos que ya expiraron
  WITH deleted AS (
    DELETE FROM public.shared_plans
    WHERE expires_at < NOW()
    RETURNING id
  )
  SELECT COUNT(*)::INTEGER INTO plans_deleted FROM deleted;

  RETURN QUERY SELECT plans_deleted;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.cleanup_expired_shared_plans() TO authenticated;

-- =====================================================================
-- PASO 4: CONFIGURAR CRON JOBS (requiere extensiÃ³n pg_cron)
-- =====================================================================

-- NOTA: Los Cron Jobs solo pueden configurarse directamente en Supabase Dashboard
-- o mediante comandos SQL en el SQL Editor. Esta secciÃ³n es un TEMPLATE.
--
-- Para activar los Cron Jobs:
-- 1. Habilitar la extensiÃ³n pg_cron en Supabase Dashboard > Database > Extensions
-- 2. Ejecutar manualmente los siguientes comandos en el SQL Editor:

-- NOTA: Los Cron Jobs deben configurarse manualmente en Supabase Dashboard

COMMIT;

-- =====================================================================
-- PASO 5: COMENTARIOS Y DOCUMENTACIÃ“N
-- =====================================================================

COMMENT ON FUNCTION public.archive_completed_tasks() IS
'Archiva tareas terminadas cuya fecha de finalizaciÃ³n fue hace mÃ¡s de 1 dÃ­a.
Retorna el nÃºmero de tareas archivadas.
Se ejecuta automÃ¡ticamente cada noche a las 02:00 AM mediante Cron Job.';

COMMENT ON FUNCTION public.cleanup_expired_shared_plans() IS
'Elimina planes compartidos que ya expiraron.
Retorna el nÃºmero de planes eliminados.
Se ejecuta automÃ¡ticamente cada 6 horas mediante Cron Job.';

-- =====================================================================
-- NOTAS DE IMPLEMENTACIÃ“N
-- =====================================================================
-- 1. Los Ã­ndices mejoran el rendimiento de consultas frecuentes:
--    - BÃºsquedas por fecha (start_date, end_date)
--    - Filtros por estado (state, status)
--    - BÃºsquedas en campos JSON (site, client)
--
-- 2. Los Ã­ndices GIN permiten bÃºsquedas eficientes en campos JSON.
--
-- 3. Los Ã­ndices parciales (WHERE) solo indexan filas relevantes,
--    ahorrando espacio y mejorando el rendimiento.
--
-- 4. Para activar los Cron Jobs, ejecuta manualmente el bloque comentado
--    en el SQL Editor de Supabase Dashboard.
--
-- 5. Puedes probar las funciones manualmente:
--    SELECT * FROM archive_completed_tasks();
--    SELECT * FROM cleanup_expired_shared_plans();
-- =====================================================================

-- MIGRACIÓN: 20251006000003_create_groups_tables.sql

-- =====================================================================
-- MIGRACIÃ“N: TABLAS DE GESTIÃ“N DE GRUPOS
-- =====================================================================
-- Fecha: 2025-10-06
-- Objetivo: Crear tablas para gestiÃ³n de grupos de usuarios
-- =====================================================================

BEGIN;

-- =====================================================================
-- PASO 1: CREAR TABLA groups
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  color TEXT DEFAULT '#3B82F6',
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================================
-- PASO 2: CREAR TABLA profile_groups (tabla de uniÃ³n)
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.profile_groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  role_in_group TEXT DEFAULT 'member', -- member, leader
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Un usuario solo puede estar una vez en cada grupo
  UNIQUE(profile_id, group_id)
);

-- =====================================================================
-- PASO 3: CREAR ÃNDICES
-- =====================================================================

-- Ãndices para groups
CREATE INDEX IF NOT EXISTS idx_groups_name ON public.groups(name);
CREATE INDEX IF NOT EXISTS idx_groups_created_at ON public.groups(created_at);

-- Ãndices para profile_groups
CREATE INDEX IF NOT EXISTS idx_profile_groups_profile_id ON public.profile_groups(profile_id);
CREATE INDEX IF NOT EXISTS idx_profile_groups_group_id ON public.profile_groups(group_id);
CREATE INDEX IF NOT EXISTS idx_profile_groups_role ON public.profile_groups(role_in_group);

-- =====================================================================
-- PASO 4: HABILITAR RLS
-- =====================================================================

ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_groups ENABLE ROW LEVEL SECURITY;

-- =====================================================================
-- PASO 5: POLÃTICAS RLS PARA groups
-- =====================================================================

-- Lectura para todos los autenticados
DROP POLICY IF EXISTS "read_groups" ON public.groups;
CREATE POLICY "read_groups" ON public.groups FOR SELECT
  TO authenticated
  USING (true);

-- GestiÃ³n solo para admins
DROP POLICY IF EXISTS "manage_groups" ON public.groups;
CREATE POLICY "manage_groups" ON public.groups FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- =====================================================================
-- PASO 6: POLÃTICAS RLS PARA profile_groups
-- =====================================================================

-- Lectura para todos los autenticados
DROP POLICY IF EXISTS "read_profile_groups" ON public.profile_groups;
CREATE POLICY "read_profile_groups" ON public.profile_groups FOR SELECT
  TO authenticated
  USING (true);

-- Los usuarios pueden ver sus propias asignaciones a grupos
DROP POLICY IF EXISTS "read_own_profile_groups" ON public.profile_groups;
CREATE POLICY "read_own_profile_groups" ON public.profile_groups FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = profile_groups.profile_id
      AND auth_user_id = auth.uid()
    )
  );

-- GestiÃ³n solo para admins
DROP POLICY IF EXISTS "manage_profile_groups" ON public.profile_groups;
CREATE POLICY "manage_profile_groups" ON public.profile_groups FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- =====================================================================
-- PASO 7: TRIGGER PARA updated_at
-- =====================================================================

-- Trigger para groups
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER handle_groups_updated_at
  BEFORE UPDATE ON public.groups
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- =====================================================================
-- PASO 8: DATOS DE EJEMPLO (opcional)
-- =====================================================================

-- Insertar algunos grupos de ejemplo
INSERT INTO public.groups (name, color, description) VALUES
  ('Equipo Alpha', '#EF4444', 'Equipo especializado en instalaciones complejas'),
  ('Equipo Beta', '#10B981', 'Equipo de mantenimiento y soporte'),
  ('Equipo Gamma', '#F59E0B', 'Equipo de proyectos especiales')
ON CONFLICT DO NOTHING;

-- =====================================================================
-- PASO 9: FUNCIONES ÃšTILES
-- =====================================================================

-- FunciÃ³n para obtener grupos de un usuario
CREATE OR REPLACE FUNCTION public.get_user_groups(user_profile_id UUID)
RETURNS TABLE (
  group_id UUID,
  group_name TEXT,
  group_color TEXT,
  role_in_group TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    g.id,
    g.name,
    g.color,
    pg.role_in_group
  FROM public.groups g
  JOIN public.profile_groups pg ON g.id = pg.group_id
  WHERE pg.profile_id = user_profile_id
  ORDER BY g.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- FunciÃ³n para obtener miembros de un grupo
CREATE OR REPLACE FUNCTION public.get_group_members(group_id UUID)
RETURNS TABLE (
  profile_id UUID,
  full_name TEXT,
  email TEXT,
  status TEXT,
  role_in_group TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.full_name,
    p.email,
    p.status,
    pg.role_in_group
  FROM public.profiles p
  JOIN public.profile_groups pg ON p.id = pg.profile_id
  WHERE pg.group_id = group_id
  ORDER BY p.full_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================================
-- COMENTARIOS
-- =====================================================================

COMMENT ON TABLE public.groups IS 'Tabla para definir grupos de usuarios con colores y descripciones';
COMMENT ON TABLE public.profile_groups IS 'Tabla de uniÃ³n entre perfiles y grupos (muchos a muchos)';
COMMENT ON COLUMN public.groups.color IS 'Color hexadecimal para identificar visualmente el grupo';
COMMENT ON COLUMN public.profile_groups.role_in_group IS 'Rol del usuario dentro del grupo: member, leader';

COMMIT;

-- =====================================================================
-- NOTAS DE IMPLEMENTACIÃ“N
-- =====================================================================
-- 1. Esta migraciÃ³n crea las tablas necesarias para la gestiÃ³n de grupos
-- 2. Los grupos pueden tener un color para identificaciÃ³n visual
-- 3. Los usuarios pueden pertenecer a mÃºltiples grupos
-- 4. Cada usuario tiene un rol dentro de cada grupo (member, leader)
-- 5. Se incluyen funciones Ãºtiles para consultas comunes
-- 6. Las polÃ­ticas RLS permiten que todos vean los grupos pero solo los admins los gestionen
-- =====================================================================

-- MIGRACIÓN: 20251006000004_create_communications_tables.sql

-- =====================================================================
-- MIGRACIÃ“N: TABLAS DE COMUNICACIONES EN TIEMPO REAL
-- =====================================================================
-- Fecha: 2025-10-06
-- Objetivo: Crear tablas para gestiÃ³n de comunicaciones y presencia en tiempo real
-- =====================================================================

BEGIN;

-- =====================================================================
-- PASO 1: CREAR TABLA user_sessions
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.user_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_online BOOLEAN DEFAULT TRUE,
  user_agent TEXT,
  ip_address INET,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Un usuario solo puede tener una sesiÃ³n activa
  UNIQUE(profile_id)
);

-- =====================================================================
-- PASO 2: CREAR TABLA user_messages
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.user_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  from_profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  to_profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  message_type TEXT DEFAULT 'text', -- text, system, notification
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ãndices para consultas eficientes
  INDEX idx_user_messages_from_to (from_profile_id, to_profile_id)
);

-- =====================================================================
-- PASO 3: CREAR TABLA communication_logs
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.communication_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  action TEXT NOT NULL, -- whatsapp_sent, email_sent, notification_sent, etc.
  target TEXT, -- email, phone, etc.
  content TEXT, -- message content
  status TEXT DEFAULT 'pending', -- pending, sent, failed
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================================
-- PASO 4: HABILITAR RLS
-- =====================================================================

ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.communication_logs ENABLE ROW LEVEL SECURITY;

-- =====================================================================
-- PASO 5: POLÃTICAS RLS PARA user_sessions
-- =====================================================================

-- Lectura para todos los autenticados
DROP POLICY IF EXISTS "read_user_sessions" ON public.user_sessions;
CREATE POLICY "read_user_sessions" ON public.user_sessions FOR SELECT
  TO authenticated
  USING (true);

-- Los usuarios pueden ver sus propias sesiones
DROP POLICY IF EXISTS "read_own_user_sessions" ON public.user_sessions;
CREATE POLICY "read_own_user_sessions" ON public.user_sessions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = user_sessions.profile_id
      AND auth_user_id = auth.uid()
    )
  );

-- GestiÃ³n solo para admins
DROP POLICY IF EXISTS "manage_user_sessions" ON public.user_sessions;
CREATE POLICY "manage_user_sessions" ON public.user_sessions FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- =====================================================================
-- PASO 6: POLÃTICAS RLS PARA user_messages
-- =====================================================================

-- Lectura para todos los autenticados
DROP POLICY IF EXISTS "read_user_messages" ON public.user_messages;
CREATE POLICY "read_user_messages" ON public.user_messages FOR SELECT
  TO authenticated
  USING (
    -- Puede ver mensajes que enviÃ³ o que recibiÃ³
    from_profile_id IN (
      SELECT id FROM public.profiles WHERE auth_user_id = auth.uid()
    ) OR 
    to_profile_id IN (
      SELECT id FROM public.profiles WHERE auth_user_id = auth.uid()
    )
  );

-- Los usuarios pueden enviar mensajes
DROP POLICY IF EXISTS "send_user_messages" ON public.user_messages;
CREATE POLICY "send_user_messages" ON public.user_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    from_profile_id IN (
      SELECT id FROM public.profiles WHERE auth_user_id = auth.uid()
    )
  );

-- Los usuarios pueden marcar mensajes como leÃ­dos
DROP POLICY IF EXISTS "mark_messages_read" ON public.user_messages;
CREATE POLICY "mark_messages_read" ON public.user_messages FOR UPDATE
  TO authenticated
  USING (
    to_profile_id IN (
      SELECT id FROM public.profiles WHERE auth_user_id = auth.uid()
    )
  )
  WITH CHECK (
    to_profile_id IN (
      SELECT id FROM public.profiles WHERE auth_user_id = auth.uid()
    )
  );

-- =====================================================================
-- PASO 7: POLÃTICAS RLS PARA communication_logs
-- =====================================================================

-- Lectura para todos los autenticados
DROP POLICY IF EXISTS "read_communication_logs" ON public.communication_logs;
CREATE POLICY "read_communication_logs" ON public.communication_logs FOR SELECT
  TO authenticated
  USING (true);

-- GestiÃ³n solo para admins
DROP POLICY IF EXISTS "manage_communication_logs" ON public.communication_logs;
CREATE POLICY "manage_communication_logs" ON public.communication_logs FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- =====================================================================
-- PASO 8: TRIGGERS PARA updated_at
-- =====================================================================

-- Trigger para user_sessions
CREATE OR REPLACE FUNCTION public.handle_user_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER handle_user_sessions_updated_at
  BEFORE UPDATE ON public.user_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_user_sessions_updated_at();

-- =====================================================================
-- PASO 9: FUNCIONES ÃšTILES
-- =====================================================================

-- FunciÃ³n para actualizar o crear sesiÃ³n de usuario
CREATE OR REPLACE FUNCTION public.update_user_session(
  user_profile_id UUID,
  user_agent_param TEXT DEFAULT NULL,
  ip_address_param INET DEFAULT NULL
)
RETURNS TABLE (
  session_id UUID,
  is_online BOOLEAN,
  last_seen TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  INSERT INTO public.user_sessions (
    profile_id, 
    user_agent, 
    ip_address, 
    is_online, 
    last_seen
  ) VALUES (
    user_profile_id, 
    user_agent_param, 
    ip_address_param, 
    TRUE, 
    NOW()
  )
  ON CONFLICT (profile_id) 
  DO UPDATE SET
    is_online = TRUE,
    last_seen = NOW(),
    user_agent = COALESCE(user_agent_param, user_sessions.user_agent),
    ip_address = COALESCE(ip_address_param, user_sessions.ip_address)
  RETURNING id, is_online, last_seen;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- FunciÃ³n para marcar usuario como offline
CREATE OR REPLACE FUNCTION public.mark_user_offline(user_profile_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE public.user_sessions 
  SET is_online = FALSE, last_seen = NOW()
  WHERE profile_id = user_profile_id;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- FunciÃ³n para obtener usuarios online
CREATE OR REPLACE FUNCTION public.get_online_users()
RETURNS TABLE (
  profile_id UUID,
  full_name TEXT,
  email TEXT,
  status TEXT,
  last_seen TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.full_name,
    p.email,
    p.status,
    us.last_seen
  FROM public.profiles p
  JOIN public.user_sessions us ON p.id = us.profile_id
  WHERE us.is_online = TRUE
    AND us.last_seen > NOW() - INTERVAL '5 minutes'
  ORDER BY us.last_seen DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- FunciÃ³n para contar mensajes no leÃ­dos
CREATE OR REPLACE FUNCTION public.get_unread_message_count(user_profile_id UUID)
RETURNS INTEGER AS $$
DECLARE
  unread_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO unread_count
  FROM public.user_messages
  WHERE to_profile_id = user_profile_id
    AND is_read = FALSE;
  
  RETURN COALESCE(unread_count, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================================
-- PASO 10: TRIGGER AUTOMÃTICO PARA LIMPIAR SESIONES INACTIVAS
-- =====================================================================

-- FunciÃ³n para limpiar sesiones inactivas
CREATE OR REPLACE FUNCTION public.cleanup_inactive_sessions()
RETURNS TABLE (
  cleaned_count INTEGER
) AS $$
DECLARE
  sessions_cleaned INTEGER := 0;
BEGIN
  UPDATE public.user_sessions
  SET is_online = FALSE
  WHERE is_online = TRUE
    AND last_seen < NOW() - INTERVAL '5 minutes';
  
  GET DIAGNOSTICS sessions_cleaned = ROW_COUNT;
  
  RETURN QUERY SELECT sessions_cleaned;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================================
-- COMENTARIOS
-- =====================================================================

COMMENT ON TABLE public.user_sessions IS 'Tabla para rastrear sesiones y presencia de usuarios en tiempo real';
COMMENT ON TABLE public.user_messages IS 'Tabla para mensajes directos entre usuarios';
COMMENT ON TABLE public.communication_logs IS 'Tabla para registrar todas las comunicaciones enviadas (WhatsApp, email, etc.)';
COMMENT ON COLUMN public.user_sessions.is_online IS 'Indica si el usuario estÃ¡ actualmente activo';
COMMENT ON COLUMN public.user_messages.message_type IS 'Tipo de mensaje: text, system, notification';
COMMENT ON COLUMN public.communication_logs.metadata IS 'Datos adicionales en formato JSON';

COMMIT;

-- =====================================================================
-- NOTAS DE IMPLEMENTACIÃ“N
-- =====================================================================
-- 1. Esta migraciÃ³n crea las tablas necesarias para comunicaciones en tiempo real
-- 2. user_sessions rastrea la presencia de usuarios con timeout de 5 minutos
-- 3. user_messages permite mensajerÃ­a directa entre usuarios
-- 4. communication_logs registra todas las comunicaciones enviadas
-- 5. Se incluyen funciones Ãºtiles para gestionar presencia y mensajes
-- 6. Las polÃ­ticas RLS permiten que los usuarios vean sus propios mensajes y las sesiones
-- 7. El trigger de cleanup puede ser ejecutado periÃ³dicamente para limpiar sesiones inactivas
-- =====================================================================

-- MIGRACIÓN: 20251006010000_create_core_tables.sql

-- =====================================================================
-- MIGRACIÃ“N INICIAL: TABLAS CORE DE LA APLICACIÃ“N
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
-- TABLA: vehicles (vehÃ­culos)
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
-- TABLA: screens (pantallas de visualizaciÃ³n)
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
-- TABLA: task_profiles (relaciÃ³n muchos a muchos: tareas â†” perfiles)
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.task_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID NOT NULL REFERENCES public.screen_data(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(task_id, profile_id)
);

-- =====================================================================
-- TABLA: task_vehicles (relaciÃ³n muchos a muchos: tareas â†” vehÃ­culos)
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
-- TABLA: system_config (configuraciÃ³n del sistema)
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.system_config (id uuid PRIMARY KEY DEFAULT gen_random_uuid());
ALTER TABLE public.system_config ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'general';
ALTER TABLE public.system_config ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.system_config ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.system_config ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES public.profiles(id);
-- Original definition follows:
CREATE TABLE IF NOT EXISTS public.system_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key TEXT UNIQUE NOT NULL,
  value JSONB NOT NULL,
  description TEXT,
  updated_by UUID REFERENCES public.profiles(id),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================================
-- ÃNDICES BÃSICOS
-- =====================================================================

-- Ãndices para profiles
CREATE INDEX IF NOT EXISTS idx_profiles_auth_user_id ON public.profiles(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_status ON public.profiles(status);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email) WHERE email IS NOT NULL;

-- Ãndices para vehicles
CREATE INDEX IF NOT EXISTS idx_vehicles_type ON public.vehicles(type);
CREATE INDEX IF NOT EXISTS idx_vehicles_is_active ON public.vehicles(is_active) WHERE is_active = true;

-- Ãndices para templates
CREATE INDEX IF NOT EXISTS idx_templates_template_type ON public.templates(template_type);
CREATE INDEX IF NOT EXISTS idx_templates_category ON public.templates(category) WHERE category IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_templates_is_active ON public.templates(is_active) WHERE is_active = true;

-- Ãndices para screens
CREATE INDEX IF NOT EXISTS idx_screens_screen_type ON public.screens(screen_type);
CREATE INDEX IF NOT EXISTS idx_screens_screen_group ON public.screens(screen_group) WHERE screen_group IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_screens_is_active ON public.screens(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_screens_template_id ON public.screens(template_id) WHERE template_id IS NOT NULL;

-- Ãndices para screen_data (tareas)
CREATE INDEX IF NOT EXISTS idx_screen_data_screen_id ON public.screen_data(screen_id);
CREATE INDEX IF NOT EXISTS idx_screen_data_state ON public.screen_data(state);
CREATE INDEX IF NOT EXISTS idx_screen_data_status ON public.screen_data(status);
CREATE INDEX IF NOT EXISTS idx_screen_data_dates ON public.screen_data(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_screen_data_responsible ON public.screen_data(responsible_profile_id);
CREATE INDEX IF NOT EXISTS idx_screen_data_assigned_to ON public.screen_data(assigned_to);
CREATE INDEX IF NOT EXISTS idx_screen_data_location ON public.screen_data(location) WHERE location IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_screen_data_checkin_token ON public.screen_data(checkin_token) WHERE checkin_token IS NOT NULL;

-- Ãndices compuestos para tareas
CREATE INDEX IF NOT EXISTS idx_screen_data_pending_dates ON public.screen_data(state, start_date, end_date) WHERE state != 'terminado';

-- Ãndices para tablas de relaciÃ³n
CREATE INDEX IF NOT EXISTS idx_task_profiles_task_id ON public.task_profiles(task_id);
CREATE INDEX IF NOT EXISTS idx_task_profiles_profile_id ON public.task_profiles(profile_id);
CREATE INDEX IF NOT EXISTS idx_task_vehicles_task_id ON public.task_vehicles(task_id);
CREATE INDEX IF NOT EXISTS idx_task_vehicles_vehicle_id ON public.task_vehicles(vehicle_id);

-- Ãndices para archived_tasks
CREATE INDEX IF NOT EXISTS idx_archived_tasks_archived_at ON public.archived_tasks(archived_at DESC);
CREATE INDEX IF NOT EXISTS idx_archived_tasks_state ON public.archived_tasks(state);
CREATE INDEX IF NOT EXISTS idx_archived_tasks_dates ON public.archived_tasks(start_date, end_date);

-- Ãndices para user_availability
CREATE INDEX IF NOT EXISTS idx_user_availability_profile_dates ON public.user_availability(profile_id, start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_user_availability_status ON public.user_availability(status);

-- Ãndices para shared_plans
CREATE INDEX IF NOT EXISTS idx_shared_plans_token ON public.shared_plans(token);
CREATE INDEX IF NOT EXISTS idx_shared_plans_expires_at ON public.shared_plans(expires_at);
CREATE INDEX IF NOT EXISTS idx_shared_plans_active ON public.shared_plans(expires_at) WHERE expires_at > NOW();

-- =====================================================================
-- TRIGGERS PARA updated_at
-- =====================================================================

-- FunciÃ³n para actualizar updated_at
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
-- COMENTARIOS DE DOCUMENTACIÃ“N
-- =====================================================================

COMMENT ON TABLE public.profiles IS 'Perfiles de usuario del sistema';
COMMENT ON TABLE public.vehicles IS 'VehÃ­culos disponibles para asignar a tareas';
COMMENT ON TABLE public.templates IS 'Plantillas de estructura de datos para pantallas';
COMMENT ON TABLE public.screens IS 'Pantallas de visualizaciÃ³n y gestiÃ³n de datos';
COMMENT ON TABLE public.screen_data IS 'Datos/tareas gestionados en las pantallas';
COMMENT ON TABLE public.task_profiles IS 'RelaciÃ³n entre tareas y perfiles asignados';
COMMENT ON TABLE public.task_vehicles IS 'RelaciÃ³n entre tareas y vehÃ­culos asignados';
COMMENT ON TABLE public.archived_tasks IS 'Tareas archivadas automÃ¡ticamente o manualmente';
COMMENT ON TABLE public.user_availability IS 'Disponibilidad de usuarios por fechas';
COMMENT ON TABLE public.shared_plans IS 'Planes compartidos con acceso pÃºblico vÃ­a token';
COMMENT ON TABLE public.system_config IS 'ConfiguraciÃ³n general del sistema';

COMMIT;

-- =====================================================================
-- NOTAS DE IMPLEMENTACIÃ“N
-- =====================================================================
-- 1. Esta migraciÃ³n crea la estructura base de la aplicaciÃ³n
-- 2. Las polÃ­ticas RLS se crearÃ¡n en la siguiente migraciÃ³n
-- 3. Los datos de ejemplo se insertarÃ¡n en migraciones posteriores
-- 4. Las vistas optimizadas se crearÃ¡n despuÃ©s de las polÃ­ticas RLS
-- 5. Los triggers para updated_at aseguran consistencia en timestamps
-- =====================================================================

-- MIGRACIÓN: 20251006010001_rls_policies.sql

-- =====================================================================
-- MIGRACIÃ“N: POLÃTICAS DE SEGURIDAD RLS (ROW LEVEL SECURITY)
-- =====================================================================
-- Fecha: 2025-10-06
-- Objetivo: Configurar polÃ­ticas de seguridad para todas las tablas de forma idempotente.
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
-- FUNCIÃ“N HELPER PARA VERIFICAR SI ES ADMIN
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

-- Otorgar permisos de ejecuciÃ³n a usuarios autenticados
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- =====================================================================
-- POLÃTICAS PARA profiles
-- =====================================================================


DROP POLICY IF EXISTS "users_can_view_own_profile" ON public.profiles;
CREATE POLICY "users_can_view_own_profile" ON public.profiles FOR SELECT
  TO authenticated
  USING (auth_user_id = auth.uid());


DROP POLICY IF EXISTS "users_can_update_own_profile" ON public.profiles;
CREATE POLICY "users_can_update_own_profile" ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth_user_id = auth.uid())
  WITH CHECK (auth_user_id = auth.uid());

-- NOTE: Admin policies for SELECT and ALL were removed to prevent RLS recursion.
-- A different pattern (e.g., RPC call with SECURITY DEFINER) should be used for admin views.



-- Admins can still write/delete any profile.
DROP POLICY IF EXISTS "admins_can_write_all_profiles" ON public.profiles;
CREATE POLICY "admins_can_write_all_profiles" ON public.profiles FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- =====================================================================
-- POLÃTICAS PARA vehicles
-- =====================================================================


DROP POLICY IF EXISTS "authenticated_can_view_vehicles" ON public.vehicles;
CREATE POLICY "authenticated_can_view_vehicles" ON public.vehicles FOR SELECT
  TO authenticated
  USING (true);


DROP POLICY IF EXISTS "admins_can_manage_vehicles" ON public.vehicles;
CREATE POLICY "admins_can_manage_vehicles" ON public.vehicles FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- =====================================================================
-- POLÃTICAS PARA templates
-- =====================================================================


DROP POLICY IF EXISTS "authenticated_can_view_templates" ON public.templates;
CREATE POLICY "authenticated_can_view_templates" ON public.templates FOR SELECT
  TO authenticated
  USING (true);


DROP POLICY IF EXISTS "admins_can_manage_templates" ON public.templates;
CREATE POLICY "admins_can_manage_templates" ON public.templates FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- =====================================================================
-- POLÃTICAS PARA screens
-- =====================================================================


DROP POLICY IF EXISTS "anyone_can_view_active_screens" ON public.screens;
CREATE POLICY "anyone_can_view_active_screens" ON public.screens FOR SELECT
  TO anon, authenticated
  USING (is_active = true);


DROP POLICY IF EXISTS "admins_can_manage_screens" ON public.screens;
CREATE POLICY "admins_can_manage_screens" ON public.screens FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- =====================================================================
-- POLÃTICAS PARA screen_data (tareas)
-- =====================================================================


DROP POLICY IF EXISTS "anyone_can_view_screen_data" ON public.screen_data;
CREATE POLICY "anyone_can_view_screen_data" ON public.screen_data FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.screens 
      WHERE screens.id = screen_data.screen_id 
      AND screens.is_active = true
    )
  );


DROP POLICY IF EXISTS "admins_can_manage_screen_data" ON public.screen_data;
CREATE POLICY "admins_can_manage_screen_data" ON public.screen_data FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- =====================================================================
-- POLÃTICAS PARA task_profiles
-- =====================================================================


DROP POLICY IF EXISTS "authenticated_can_view_task_profiles" ON public.task_profiles;
CREATE POLICY "authenticated_can_view_task_profiles" ON public.task_profiles FOR SELECT
  TO authenticated
  USING (true);


DROP POLICY IF EXISTS "admins_can_manage_task_profiles" ON public.task_profiles;
CREATE POLICY "admins_can_manage_task_profiles" ON public.task_profiles FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- =====================================================================
-- POLÃTICAS PARA task_vehicles
-- =====================================================================


DROP POLICY IF EXISTS "authenticated_can_view_task_vehicles" ON public.task_vehicles;
CREATE POLICY "authenticated_can_view_task_vehicles" ON public.task_vehicles FOR SELECT
  TO authenticated
  USING (true);


DROP POLICY IF EXISTS "admins_can_manage_task_vehicles" ON public.task_vehicles;
CREATE POLICY "admins_can_manage_task_vehicles" ON public.task_vehicles FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- =====================================================================
-- POLÃTICAS PARA archived_tasks
-- =====================================================================


DROP POLICY IF EXISTS "admins_can_view_archived_tasks" ON public.archived_tasks;
CREATE POLICY "admins_can_view_archived_tasks" ON public.archived_tasks FOR SELECT
  TO authenticated
  USING (public.is_admin());


DROP POLICY IF EXISTS "admins_can_manage_archived_tasks" ON public.archived_tasks;
CREATE POLICY "admins_can_manage_archived_tasks" ON public.archived_tasks FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- =====================================================================
-- POLÃTICAS PARA user_availability
-- =====================================================================


DROP POLICY IF EXISTS "users_can_view_own_availability" ON public.user_availability;
CREATE POLICY "users_can_view_own_availability" ON public.user_availability FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = user_availability.profile_id
      AND profiles.auth_user_id = auth.uid()
    )
  );


DROP POLICY IF EXISTS "admins_can_view_all_availability" ON public.user_availability;
CREATE POLICY "admins_can_view_all_availability" ON public.user_availability FOR SELECT
  TO authenticated
  USING (public.is_admin());


DROP POLICY IF EXISTS "admins_can_manage_availability" ON public.user_availability;
CREATE POLICY "admins_can_manage_availability" ON public.user_availability FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- =====================================================================
-- POLÃTICAS PARA shared_plans
-- =====================================================================


DROP POLICY IF EXISTS "anyone_can_view_shared_plans" ON public.shared_plans;
CREATE POLICY "anyone_can_view_shared_plans" ON public.shared_plans FOR SELECT
  TO anon, authenticated
  USING (expires_at > NOW());


DROP POLICY IF EXISTS "admins_can_manage_shared_plans" ON public.shared_plans;
CREATE POLICY "admins_can_manage_shared_plans" ON public.shared_plans FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- =====================================================================
-- POLÃTICAS PARA system_config
-- =====================================================================


DROP POLICY IF EXISTS "authenticated_can_view_system_config" ON public.system_config;
CREATE POLICY "authenticated_can_view_system_config" ON public.system_config FOR SELECT
  TO authenticated
  USING (true);


DROP POLICY IF EXISTS "admins_can_manage_system_config" ON public.system_config;
CREATE POLICY "admins_can_manage_system_config" ON public.system_config FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- =====================================================================
-- FUNCIONES HELPER ADICIONALES
-- =====================================================================

-- FunciÃ³n para verificar si un usuario puede acceder a una tarea especÃ­fica
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
  
  -- Verificar si la pantalla estÃ¡ activa
  SELECT is_active INTO screen_is_active
  FROM public.screens
  WHERE id = task_screen_id;
  
  -- Si es admin o la pantalla estÃ¡ activa, puede acceder
  RETURN (public.is_admin() OR screen_is_active = true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.can_access_task TO authenticated;

-- =====================================================================
-- TRIGGER PARA CREAR PERFIL AUTOMÃTICAMENTE
-- =====================================================================

-- FunciÃ³n para crear perfil cuando se registra un nuevo usuario
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

-- Trigger para crear perfil automÃ¡ticamente
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

-- Permisos para usuarios anÃ³nimos
GRANT USAGE ON SCHEMA public TO anon;
GRANT SELECT ON public.screens TO anon;
GRANT SELECT ON public.screen_data TO anon;
GRANT SELECT ON public.shared_plans TO anon;

-- =====================================================================
-- FUNCIONES DE UTILIDAD
-- =====================================================================

-- FunciÃ³n para obtener el perfil del usuario actual
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
-- NOTAS DE IMPLEMENTACIÃ“N
-- =====================================================================
-- 1. Todas las tablas tienen RLS habilitado
-- 2. Las polÃ­ticas siguen el principio de mÃ­nimo privilegio
-- 3. Los usuarios anÃ³nimos solo pueden ver datos pÃºblicos (pantallas activas)
-- 4. Los usuarios autenticados pueden ver mÃ¡s informaciÃ³n segÃºn su rol
-- 5. Los admins tienen control total sobre todas las tablas
-- 6. Se crea automÃ¡ticamente un perfil cuando un usuario se registra
-- 7. Las funciones helper usan SECURITY DEFINER para evitar recursiÃ³n
-- =====================================================================

-- MIGRACIÓN: 20251006010002_groups_and_communications.sql

-- =====================================================================
-- MIGRACIÃ“N: TABLAS DE GRUPOS Y COMUNICACIONES
-- =====================================================================
-- Fecha: 2025-10-06
-- Objetivo: Crear tablas para gestiÃ³n de grupos y comunicaciones
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
-- TABLA: profile_groups (relaciÃ³n muchos a muchos: perfiles â†” grupos)
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.profile_groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'miembro' CHECK (role IN ('lÃ­der', 'miembro')),
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
-- TABLA: role_permissions (permisos por rol y pÃ¡gina)
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
-- ÃNDICES PARA GRUPOS
-- =====================================================================

CREATE INDEX IF NOT EXISTS idx_groups_name ON public.groups(name);
CREATE INDEX IF NOT EXISTS idx_groups_is_active ON public.groups(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_groups_created_by ON public.groups(created_by) WHERE created_by IS NOT NULL;

-- Ãndices para profile_groups
CREATE INDEX IF NOT EXISTS idx_profile_groups_profile_id ON public.profile_groups(profile_id);
CREATE INDEX IF NOT EXISTS idx_profile_groups_group_id ON public.profile_groups(group_id);
CREATE INDEX IF NOT EXISTS idx_profile_groups_role ON public.profile_groups(role);

-- Ãndices para task_notifications
CREATE INDEX IF NOT EXISTS idx_task_notifications_profile_id ON public.task_notifications(profile_id);
CREATE INDEX IF NOT EXISTS idx_task_notifications_plan_date ON public.task_notifications(plan_date);
CREATE INDEX IF NOT EXISTS idx_task_notifications_token ON public.task_notifications(access_token);
CREATE INDEX IF NOT EXISTS idx_task_notifications_expires_at ON public.task_notifications(expires_at);
CREATE INDEX IF NOT EXISTS idx_task_notifications_active ON public.task_notifications(expires_at) WHERE expires_at > NOW();

-- Ãndices para user_sessions
CREATE INDEX IF NOT EXISTS idx_user_sessions_profile_id ON public.user_sessions(profile_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON public.user_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_user_sessions_last_seen ON public.user_sessions(last_seen DESC);
CREATE INDEX IF NOT EXISTS idx_user_sessions_online ON public.user_sessions(is_online) WHERE is_online = true;

-- Ãndices para role_permissions
CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON public.role_permissions(role);
CREATE INDEX IF NOT EXISTS idx_role_permissions_page ON public.role_permissions(page);
CREATE INDEX IF NOT EXISTS idx_role_permissions_role_page ON public.role_permissions(role, page);

-- Ãndices para communication_logs
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
-- POLÃTICAS RLS PARA groups
-- =====================================================================

-- Todos los autenticados pueden ver grupos activos
DROP POLICY IF EXISTS "authenticated_can_view_groups" ON public.groups;
CREATE POLICY "authenticated_can_view_groups" ON public.groups FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Solo admins pueden gestionar grupos
DROP POLICY IF EXISTS "admins_can_manage_groups" ON public.groups;
CREATE POLICY "admins_can_manage_groups" ON public.groups FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- =====================================================================
-- POLÃTICAS RLS PARA profile_groups
-- =====================================================================

-- Los usuarios pueden ver sus propias asignaciones de grupo
DROP POLICY IF EXISTS "users_can_view_own_profile_groups" ON public.profile_groups;
CREATE POLICY "users_can_view_own_profile_groups" ON public.profile_groups FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = profile_groups.profile_id
      AND profiles.auth_user_id = auth.uid()
    )
  );

-- Solo admins pueden gestionar asignaciones de grupos
DROP POLICY IF EXISTS "admins_can_manage_profile_groups" ON public.profile_groups;
CREATE POLICY "admins_can_manage_profile_groups" ON public.profile_groups FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- =====================================================================
-- POLÃTICAS RLS PARA task_notifications
-- =====================================================================

-- Los usuarios pueden ver sus propias notificaciones
DROP POLICY IF EXISTS "users_can_view_own_notifications" ON public.task_notifications;
CREATE POLICY "users_can_view_own_notifications" ON public.task_notifications FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = task_notifications.profile_id
      AND profiles.auth_user_id = auth.uid()
    )
  );

-- Los usuarios pueden actualizar sus propias notificaciones (marcar como vista)
DROP POLICY IF EXISTS "users_can_update_own_notifications" ON public.task_notifications;
CREATE POLICY "users_can_update_own_notifications" ON public.task_notifications FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = task_notifications.profile_id
      AND profiles.auth_user_id = auth.uid()
    )
  );

-- Solo admins pueden gestionar notificaciones
DROP POLICY IF EXISTS "admins_can_manage_notifications" ON public.task_notifications;
CREATE POLICY "admins_can_manage_notifications" ON public.task_notifications FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- =====================================================================
-- POLÃTICAS RLS PARA user_sessions
-- =====================================================================

-- Los usuarios pueden ver sus propias sesiones
DROP POLICY IF EXISTS "users_can_view_own_sessions" ON public.user_sessions;
CREATE POLICY "users_can_view_own_sessions" ON public.user_sessions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = user_sessions.profile_id
      AND profiles.auth_user_id = auth.uid()
    )
  );

-- Los usuarios pueden actualizar sus propias sesiones
DROP POLICY IF EXISTS "users_can_update_own_sessions" ON public.user_sessions;
CREATE POLICY "users_can_update_own_sessions" ON public.user_sessions FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = user_sessions.profile_id
      AND profiles.auth_user_id = auth.uid()
    )
  );

-- Solo admins pueden ver todas las sesiones
DROP POLICY IF EXISTS "admins_can_view_all_sessions" ON public.user_sessions;
CREATE POLICY "admins_can_view_all_sessions" ON public.user_sessions FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- =====================================================================
-- POLÃTICAS RLS PARA role_permissions
-- =====================================================================

-- Todos los autenticados pueden ver permisos
DROP POLICY IF EXISTS "authenticated_can_view_role_permissions" ON public.role_permissions;
CREATE POLICY "authenticated_can_view_role_permissions" ON public.role_permissions FOR SELECT
  TO authenticated
  USING (true);

-- Solo admins pueden gestionar permisos
DROP POLICY IF EXISTS "admins_can_manage_role_permissions" ON public.role_permissions;
CREATE POLICY "admins_can_manage_role_permissions" ON public.role_permissions FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- =====================================================================
-- POLÃTICAS RLS PARA communication_logs
-- =====================================================================

-- Los usuarios pueden ver logs de comunicaciones que enviaron
DROP POLICY IF EXISTS "users_can_view_own_communication_logs" ON public.communication_logs;
CREATE POLICY "users_can_view_own_communication_logs" ON public.communication_logs FOR SELECT
  TO authenticated
  USING (created_by = (
    SELECT id FROM public.profiles WHERE auth_user_id = auth.uid()
  ));

-- Solo admins pueden ver todos los logs
DROP POLICY IF EXISTS "admins_can_view_all_communication_logs" ON public.communication_logs;
CREATE POLICY "admins_can_view_all_communication_logs" ON public.communication_logs FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- Solo admins pueden gestionar logs
DROP POLICY IF EXISTS "admins_can_manage_communication_logs" ON public.communication_logs;
CREATE POLICY "admins_can_manage_communication_logs" ON public.communication_logs FOR ALL
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

-- FunciÃ³n para obtener grupos de un usuario
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

-- FunciÃ³n para verificar permisos de usuario
CREATE OR REPLACE FUNCTION public.has_permission(user_role TEXT, page TEXT, permission TEXT)
RETURNS BOOLEAN AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

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
-- NOTAS DE IMPLEMENTACIÃ“N
-- =====================================================================
-- 1. Estas tablas extienden la funcionalidad base con gestiÃ³n de grupos
-- 2. Las comunicaciones incluyen logs completos de todos los envÃ­os
-- 3. Los permisos por rol permiten control granular de acceso
-- 4. Las sesiones de usuario permiten presencia en tiempo real
-- 5. Todas las polÃ­ticas siguen el principio de mÃ­nimo privilegio
-- =====================================================================

-- MIGRACIÓN: 20251006010003_views_and_functions.sql


-- =====================================================================
-- MIGRACIÃ“N: VISTAS OPTIMIZADAS Y FUNCIONES
-- =====================================================================
-- Fecha: 2025-10-06
-- Objetivo: Crear vistas optimizadas y funciones de utilidad
-- =====================================================================

BEGIN;

-- =====================================================================
-- VISTA: detailed_tasks (vista optimizada para consultas de tareas)
-- =====================================================================

DROP VIEW IF EXISTS public.detailed_tasks;

CREATE OR REPLACE VIEW public.detailed_tasks AS
SELECT
  -- Datos bÃ¡sicos de la tarea
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

  -- InformaciÃ³n del screen asociado
  s.name AS screen_name,
  s.screen_type,
  s.screen_group,
  s.next_screen_id,
  s.header_color,
  s.is_active AS screen_is_active,
  s.refresh_interval_sec,

  -- InformaciÃ³n del responsable (responsible_profile_id)
  rp.full_name AS responsible_name,
  rp.email AS responsible_email,
  rp.phone AS responsible_phone,
  rp.role AS responsible_role,
  rp.status AS responsible_status,
  rp.avatar_url AS responsible_avatar,

  -- InformaciÃ³n del assigned_to (puede ser diferente del responsible)
  ap.full_name AS assigned_name,
  ap.email AS assigned_email,
  ap.phone AS assigned_phone,
  ap.role AS assigned_role,
  ap.status AS assigned_status,

  -- Campos JSON aplanados para facilitar el acceso
  sd.data->>'site' AS site,
  sd.data->>'client' AS client,
  sd.data->>'address' AS address,
  sd.data->>'description' AS description,
  sd.data->>'notes' AS notes,
  sd.data->>'vehicle_type' AS vehicle_type,

  -- Operarios asignados (array agregado desde task_profiles)
  COALESCE(
    (
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', p.id,
          'full_name', p.full_name,
          'email', p.email,
          'phone', p.phone,
          'status', p.status,
          'avatar_url', p.avatar_url,
          'role', p.role
        ) ORDER BY p.full_name
      )
      FROM public.task_profiles tp
      JOIN public.profiles p ON tp.profile_id = p.id
      WHERE tp.task_id = sd.id
    ),
    '[]'::jsonb
  ) AS assigned_profiles,

  -- VehÃ­culos asignados (array agregado desde task_vehicles)
  COALESCE(
    (
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', v.id,
          'name', v.name,
          'type', v.type,
          'license_plate', v.license_plate,
          'capacity', v.capacity
        ) ORDER BY v.name
      )
      FROM public.task_vehicles tv
      JOIN public.vehicles v ON tv.vehicle_id = v.id
      WHERE tv.task_id = sd.id
    ),
    '[]'::jsonb
  ) AS assigned_vehicles,

  -- Contadores Ãºtiles
  (
    SELECT COUNT(*)
    FROM public.task_profiles tp
    WHERE tp.task_id = sd.id
  ) AS assigned_profiles_count,

  (
    SELECT COUNT(*)
    FROM public.task_vehicles tv
    WHERE tv.task_id = sd.id
  ) AS assigned_vehicles_count,

  -- Indicadores de estado Ãºtiles
  CASE
    WHEN sd.state = 'terminado' THEN true
    ELSE false
  END AS is_completed,

  CASE
    WHEN sd.state = 'urgente' THEN true
    ELSE false
  END AS is_urgent,

  CASE
    WHEN sd.start_date <= CURRENT_DATE AND sd.end_date >= CURRENT_DATE THEN true
    ELSE false
  END AS is_current,

  CASE
    WHEN sd.end_date < CURRENT_DATE AND sd.state != 'terminado' THEN true
    ELSE false
  END AS is_overdue,

  CASE
    WHEN sd.start_date > CURRENT_DATE THEN true
    ELSE false
  END AS is_future,

  -- DÃ­as hasta/desde la tarea
  CASE
    WHEN sd.start_date IS NULL THEN NULL
    WHEN sd.start_date = CURRENT_DATE THEN 0
    WHEN sd.start_date > CURRENT_DATE THEN sd.start_date - CURRENT_DATE
    ELSE CURRENT_DATE - sd.start_date
  END AS days_from_start,

  -- Prioridad calculada
  CASE
    WHEN sd.state = 'urgente' THEN 1
    WHEN sd.state = 'incidente' THEN 2
    WHEN sd.state = 'arreglo' THEN 3
    WHEN sd.is_overdue THEN 4
    WHEN sd.state = 'en fabricacion' THEN 5
    WHEN sd.state = 'a la espera' THEN 6
    ELSE 7
  END AS priority_order

FROM public.screen_data sd
LEFT JOIN public.screens s ON sd.screen_id = s.id
LEFT JOIN public.profiles rp ON sd.responsible_profile_id = rp.id
LEFT JOIN public.profiles ap ON sd.assigned_to = ap.id;

-- =====================================================================
-- VISTA: user_workload (carga de trabajo por usuario)
-- =====================================================================

DROP VIEW IF EXISTS public.user_workload;

CREATE OR REPLACE VIEW public.user_workload AS
SELECT
  p.id AS profile_id,
  p.full_name,
  p.email,
  p.role,
  p.status,
  COUNT(DISTINCT tp.task_id) AS total_tasks,
  COUNT(DISTINCT CASE WHEN sd.state != 'terminado' THEN tp.task_id END) AS active_tasks,
  COUNT(DISTINCT CASE WHEN sd.state = 'urgente' THEN tp.task_id END) AS urgent_tasks,
  COUNT(DISTINCT CASE WHEN sd.is_overdue THEN tp.task_id END) AS overdue_tasks,
  COUNT(DISTINCT CASE WHEN sd.start_date = CURRENT_DATE THEN tp.task_id END) AS today_tasks,
  COUNT(DISTINCT CASE WHEN sd.start_date <= CURRENT_DATE AND sd.end_date >= CURRENT_DATE THEN tp.task_id END) AS current_tasks,
  STRING_AGG(DISTINCT s.screen_group, ', ') AS working_groups
FROM public.profiles p
LEFT JOIN public.task_profiles tp ON p.id = tp.profile_id
LEFT JOIN public.screen_data sd ON tp.task_id = sd.id
LEFT JOIN public.screens s ON sd.screen_id = s.id
WHERE p.status = 'activo'
GROUP BY p.id, p.full_name, p.email, p.role, p.status;

-- =====================================================================
-- VISTA: vehicle_utilization (utilizaciÃ³n de vehÃ­culos)
-- =====================================================================

DROP VIEW IF EXISTS public.vehicle_utilization;

CREATE OR REPLACE VIEW public.vehicle_utilization AS
SELECT
  v.id AS vehicle_id,
  v.name,
  v.type,
  v.license_plate,
  v.capacity,
  v.is_active,
  COUNT(DISTINCT tv.task_id) AS total_assignments,
  COUNT(DISTINCT CASE WHEN sd.state != 'terminado' THEN tv.task_id END) AS active_assignments,
  COUNT(DISTINCT CASE WHEN sd.start_date = CURRENT_DATE THEN tv.task_id END) AS today_assignments,
  COUNT(DISTINCT CASE WHEN sd.start_date <= CURRENT_DATE AND sd.end_date >= CURRENT_DATE THEN tv.task_id END) AS current_assignments,
  ROUND(
    (COUNT(DISTINCT CASE WHEN sd.state != 'terminado' THEN tv.task_id END)::float / NULLIF(v.capacity, 0)) * 100, 
    2
  ) AS utilization_percentage
FROM public.vehicles v
LEFT JOIN public.task_vehicles tv ON v.id = tv.vehicle_id
LEFT JOIN public.screen_data sd ON tv.task_id = sd.id
WHERE v.is_active = true
GROUP BY v.id, v.name, v.type, v.license_plate, v.capacity, v.is_active;

-- =====================================================================
-- VISTA: task_summary (resumen de tareas por grupo y estado)
-- =====================================================================

DROP VIEW IF EXISTS public.task_summary;

CREATE OR REPLACE VIEW public.task_summary AS
SELECT
  s.screen_group,
  sd.state,
  sd.status,
  COUNT(*) AS task_count,
  COUNT(CASE WHEN sd.start_date = CURRENT_DATE THEN 1 END) AS today_count,
  COUNT(CASE WHEN sd.is_overdue THEN 1 END) AS overdue_count,
  COUNT(CASE WHEN sd.state = 'urgente' THEN 1 END) AS urgent_count,
  COUNT(CASE WHEN sd.state = 'terminado' THEN 1 END) AS completed_count,
  ROUND(
    (COUNT(CASE WHEN sd.state = 'terminado' THEN 1 END)::float / NULLIF(COUNT(*), 0)) * 100, 
    2
  ) AS completion_percentage
FROM public.screen_data sd
JOIN public.screens s ON sd.screen_id = s.id
WHERE s.is_active = true
GROUP BY s.screen_group, sd.state, sd.status
ORDER BY s.screen_group, sd.state;

-- =====================================================================
-- FUNCIONES RPC (Remote Procedure Calls)
-- =====================================================================

-- FunciÃ³n para upsert de tarea (crear o actualizar)
CREATE OR REPLACE FUNCTION public.upsert_task(
  p_task_id UUID DEFAULT NULL,
  p_screen_id UUID,
  p_data JSONB DEFAULT '{}'::jsonb,
  p_state TEXT DEFAULT 'pendiente',
  p_status TEXT DEFAULT 'pendiente',
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL,
  p_location TEXT DEFAULT NULL,
  p_responsible_profile_id UUID DEFAULT NULL,
  p_assigned_to UUID DEFAULT NULL,
  p_assigned_profiles UUID[] DEFAULT NULL,
  p_assigned_vehicles UUID[] DEFAULT NULL
)
RETURNS TABLE (
  task_id UUID,
  action TEXT
) AS $$
DECLARE
  v_task_id UUID;
  v_action TEXT;
BEGIN
  -- Validar que el estado sea vÃ¡lido
  IF p_state NOT IN ('pendiente', 'urgente', 'en fabricacion', 'a la espera', 'terminado', 'incidente', 'arreglo') THEN
    RAISE EXCEPTION 'Estado invÃ¡lido: %', p_state;
  END IF;

  -- Validar que el status sea vÃ¡lido
  IF p_status NOT IN ('pendiente', 'acabado', 'en progreso') THEN
    RAISE EXCEPTION 'Status invÃ¡lido: %', p_status;
  END IF;

  -- Upsert de la tarea
  INSERT INTO public.screen_data (
    id, screen_id, data, state, status, start_date, end_date, 
    location, responsible_profile_id, assigned_to
  ) VALUES (
    p_task_id, p_screen_id, p_data, p_state, p_status, p_start_date, 
    p_end_date, p_location, p_responsible_profile_id, p_assigned_to
  )
  ON CONFLICT (id) DO UPDATE SET
    data = EXCLUDED.data,
    state = EXCLUDED.state,
    status = EXCLUDED.status,
    start_date = EXCLUDED.start_date,
    end_date = EXCLUDED.end_date,
    location = EXCLUDED.location,
    responsible_profile_id = EXCLUDED.responsible_profile_id,
    assigned_to = EXCLUDED.assigned_to,
    updated_at = NOW()
  RETURNING id INTO v_task_id;

  -- Determinar acciÃ³n realizada
  IF p_task_id IS NULL THEN
    v_action := 'created';
  ELSE
    v_action := 'updated';
  END IF;

  -- Eliminar asignaciones existentes si hay nuevas
  IF p_assigned_profiles IS NOT NULL OR p_assigned_vehicles IS NOT NULL THEN
    DELETE FROM public.task_profiles WHERE task_id = v_task_id;
    DELETE FROM public.task_vehicles WHERE task_id = v_task_id;
  END IF;

  -- Insertar nuevas asignaciones de perfiles
  IF p_assigned_profiles IS NOT NULL THEN
    INSERT INTO public.task_profiles (task_id, profile_id)
    SELECT v_task_id, unnest(p_assigned_profiles);
  END IF;

  -- Insertar nuevas asignaciones de vehÃ­culos
  IF p_assigned_vehicles IS NOT NULL THEN
    INSERT INTO public.task_vehicles (task_id, vehicle_id)
    SELECT v_task_id, unnest(p_assigned_vehicles);
  END IF;

  RETURN QUERY SELECT v_task_id, v_action;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.upsert_task TO authenticated;

-- FunciÃ³n para archivar tareas completadas
CREATE OR REPLACE FUNCTION public.archive_completed_tasks(
  p_days_old INTEGER DEFAULT 1
)
RETURNS TABLE (
  archived_count INTEGER,
  message TEXT
) AS $$
DECLARE
  v_archived_count INTEGER := 0;
  v_cutoff_date DATE;
BEGIN
  v_cutoff_date := CURRENT_DATE - p_days_old;

  -- Insertar tareas completadas en archived_tasks
  WITH archived AS (
    INSERT INTO public.archived_tasks (
      id, archived_at, data, status, state,
      start_date, end_date, location,
      responsible_profile_id, responsible_name,
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
      -- Operarios asignados
      COALESCE(
        (
          SELECT jsonb_agg(
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
      -- VehÃ­culos asignados
      COALESCE(
        (
          SELECT jsonb_agg(
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
      AND sd.end_date < v_cutoff_date
      -- Evitar duplicados verificando que no exista ya en archived_tasks
      AND NOT EXISTS (
        SELECT 1 FROM public.archived_tasks at
        WHERE at.id = sd.id
      )
    RETURNING id
  )
  SELECT COUNT(*)::INTEGER INTO v_archived_count FROM archived;

  -- Eliminar las tareas que acabamos de archivar
  IF v_archived_count > 0 THEN
    DELETE FROM public.screen_data
    WHERE id IN (
      SELECT id FROM public.archived_tasks
      WHERE archived_at >= NOW() - INTERVAL '5 minutes'
    )
    AND state = 'terminado'
    AND end_date < v_cutoff_date;
  END IF;

  RETURN QUERY SELECT v_archived_count,
    format('Archivadas %d tareas completadas con mÃ¡s de %d dÃ­as', v_archived_count, p_days_old);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.archive_completed_tasks TO authenticated;

-- FunciÃ³n para generar token de check-in
CREATE OR REPLACE FUNCTION public.generate_checkin_token(p_task_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_token TEXT;
BEGIN
  -- Generar token Ãºnico
  v_token := encode(sha256(p_task_id::text || NOW()::text || random()::text), 'hex');
  
  -- Actualizar tarea con el token
  UPDATE public.screen_data
  SET checkin_token = v_token
  WHERE id = p_task_id;
  
  RETURN v_token;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.generate_checkin_token TO authenticated;

-- FunciÃ³n para verificar y completar check-in
CREATE OR REPLACE FUNCTION public.complete_checkin(p_token TEXT, p_location TEXT DEFAULT NULL)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT,
  task_id UUID
) AS $$
DECLARE
  v_task_id UUID;
  v_current_state TEXT;
BEGIN
  -- Buscar tarea por token
  SELECT id, state INTO v_task_id, v_current_state
  FROM public.screen_data
  WHERE checkin_token = p_token;
  
  -- Si no se encuentra la tarea
  IF v_task_id IS NULL THEN
    RETURN QUERY SELECT false, 'Token invÃ¡lido o expirado', NULL::UUID;
    RETURN;
  END IF;
  
  -- Si ya estÃ¡ completada
  IF v_current_state = 'terminado' THEN
    RETURN QUERY SELECT false, 'Esta tarea ya estÃ¡ completada', v_task_id;
    RETURN;
  END IF;
  
  -- Actualizar tarea
  UPDATE public.screen_data
  SET
    state = 'terminado',
    status = 'acabado',
    location = COALESCE(p_location, location),
    checkin_token = NULL,
    updated_at = NOW()
  WHERE id = v_task_id;
  
  RETURN QUERY SELECT true, 'Check-in completado exitosamente', v_task_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.complete_checkin TO authenticated, anon;

-- FunciÃ³n para obtener estadÃ­sticas del dashboard
CREATE OR REPLACE FUNCTION public.get_dashboard_stats(p_date_from DATE DEFAULT NULL, p_date_to DATE DEFAULT NULL)
RETURNS TABLE (
  total_tasks BIGINT,
  completed_tasks BIGINT,
  pending_tasks BIGINT,
  urgent_tasks BIGINT,
  overdue_tasks BIGINT,
  active_users BIGINT,
  active_vehicles BIGINT,
  completion_rate NUMERIC
) AS $$
DECLARE
  v_date_condition TEXT := '';
  v_total BIGINT;
  v_completed BIGINT;
BEGIN
  -- Si no se especifican fechas, contar todas las tareas activas
  IF p_date_from IS NULL AND p_date_to IS NULL THEN
    v_date_condition := '';
  ELSE
    v_date_condition := format(' AND sd.start_date BETWEEN %L AND %L',
      COALESCE(p_date_from, CURRENT_DATE - INTERVAL '30 days'),
      COALESCE(p_date_to, CURRENT_DATE));
  END IF;

  -- Contar tareas activas (no completadas)
  EXECUTE format('
    SELECT COUNT(*)
    FROM public.screen_data sd
    JOIN public.screens s ON sd.screen_id = s.id
    WHERE s.is_active = true
    AND sd.state != ''terminado''%s', v_date_condition) INTO v_total;

  -- Contar tareas completadas
  EXECUTE format('
    SELECT COUNT(*)
    FROM public.screen_data sd
    JOIN public.screens s ON sd.screen_id = s.id
    WHERE s.is_active = true
    AND sd.state = ''terminado''%s', v_date_condition) INTO v_completed;

  RETURN QUERY SELECT
    (v_total + v_completed) AS total_tasks,
    v_completed AS completed_tasks,
    v_total AS pending_tasks,
    (
      SELECT COUNT(*)
      FROM public.screen_data sd
      JOIN public.screens s ON sd.screen_id = s.id
      WHERE s.is_active = true
        AND sd.state = 'urgente'
        AND (p_date_from IS NULL AND p_date_to IS NULL OR sd.start_date BETWEEN COALESCE(p_date_from, CURRENT_DATE - INTERVAL '30 days') AND COALESCE(p_date_to, CURRENT_DATE))
    ) AS urgent_tasks,
    (
      SELECT COUNT(*)
      FROM public.screen_data sd
      JOIN public.screens s ON sd.screen_id = s.id
      WHERE s.is_active = true
        AND sd.end_date < CURRENT_DATE
        AND sd.state != 'terminado'
        AND (p_date_from IS NULL AND p_date_to IS NULL OR sd.start_date BETWEEN COALESCE(p_date_from, CURRENT_DATE - INTERVAL '30 days') AND COALESCE(p_date_to, CURRENT_DATE))
    ) AS overdue_tasks,
    (
      SELECT COUNT(DISTINCT p.id)
      FROM public.profiles p
      WHERE p.status = 'activo'
    ) AS active_users,
    (
      SELECT COUNT(*)
      FROM public.vehicles
      WHERE is_active = true
    ) AS active_vehicles,
    CASE
      WHEN (v_total + v_completed) > 0 THEN ROUND((v_completed::NUMERIC / (v_total + v_completed)::NUMERIC) * 100, 2)
      ELSE 0
    END AS completion_rate;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.get_dashboard_stats TO authenticated;

-- =====================================================================
-- PERMISOS PARA VISTAS
-- =====================================================================

GRANT SELECT ON public.detailed_tasks TO authenticated, anon;
GRANT SELECT ON public.user_workload TO authenticated;
GRANT SELECT ON public.vehicle_utilization TO authenticated;
GRANT SELECT ON public.task_summary TO authenticated;

-- =====================================================================
-- COMENTARIOS DE DOCUMENTACIÃ“N
-- =====================================================================

COMMENT ON VIEW public.detailed_tasks IS 'Vista optimizada que une screen_data con profiles, vehicles y screens. Incluye campos JSON aplanados y arrays agregados.';
COMMENT ON VIEW public.user_workload IS 'Vista que muestra la carga de trabajo de cada usuario con contadores de tareas.';
COMMENT ON VIEW public.vehicle_utilization IS 'Vista que muestra la utilizaciÃ³n de vehÃ­culos y su capacidad actual.';
COMMENT ON VIEW public.task_summary IS 'Vista que resume las tareas por grupo y estado con estadÃ­sticas.';

COMMENT ON FUNCTION public.upsert_task IS 'FunciÃ³n para crear o actualizar tareas con sus asignaciones.';
COMMENT ON FUNCTION public.archive_completed_tasks IS 'FunciÃ³n para archivar automÃ¡ticamente tareas completadas.';
COMMENT ON FUNCTION public.generate_checkin_token IS 'FunciÃ³n para generar token Ãºnico de check-in para tareas.';
COMMENT ON FUNCTION public.complete_checkin IS 'FunciÃ³n para completar check-in usando token.';
COMMENT ON FUNCTION public.get_dashboard_stats IS 'FunciÃ³n para obtener estadÃ­sticas del dashboard.';

COMMIT;

-- =====================================================================
-- NOTAS DE IMPLEMENTACIÃ“N
-- =====================================================================
-- 1. Las vistas optimizadas reducen la complejidad de queries en el frontend
-- 2. Las funciones RPC encapsulan lÃ³gica de negocio compleja
-- 3. Todas las funciones usan SECURITY DEFINER para evitar problemas de RLS
-- 4. Los tokens de check-in permiten acceso pÃºblico a funciones especÃ­ficas
-- 5. Las estadÃ­sticas del dashboard facilitan la creaciÃ³n de dashboards
-- =====================================================================

-- MIGRACIÓN: 20251006010004_seed_data.sql

-- =====================================================================
-- MIGRACIÃ“N: DATOS DE EJEMPLO (SEED DATA)
-- =====================================================================
-- Fecha: 2025-10-06
-- Objetivo: Insertar datos de ejemplo para probar la aplicaciÃ³n
-- =====================================================================

BEGIN;

-- =====================================================================
-- INSERTAR USUARIOS DE EJEMPLO
-- =====================================================================

-- Administrador
INSERT INTO public.profiles (id, auth_user_id, full_name, email, phone, role, status) VALUES
('550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440001', 'Administrador Sistema', 'admin@egea.com', '+34600111222', 'admin', 'activo');

-- Responsables
INSERT INTO public.profiles (id, auth_user_id, full_name, email, phone, role, status) VALUES
('550e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440002', 'MarÃ­a GarcÃ­a', 'maria.garcia@egea.com', '+34600223344', 'responsable', 'activo'),
('550e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440003', 'Juan MartÃ­nez', 'juan.martinez@egea.com', '+34600334455', 'responsable', 'activo');

-- Operarios
INSERT INTO public.profiles (id, auth_user_id, full_name, email, phone, role, status) VALUES
('550e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440004', 'Carlos LÃ³pez', 'carlos.lopez@egea.com', '+34600445566', 'operario', 'activo'),
('550e8400-e29b-41d4-a716-446655440005', '550e8400-e29b-41d4-a716-446655440005', 'Ana RodrÃ­guez', 'ana.rodriguez@egea.com', '+34600556677', 'operario', 'activo'),
('550e8400-e29b-41d4-a716-446655440006', '550e8400-e29b-41d4-a716-446655440006', 'Pedro SÃ¡nchez', 'pedro.sanchez@egea.com', '+34600667788', 'operario', 'activo'),
('550e8400-e29b-41d4-a716-446655440007', '550e8400-e29b-41d4-a716-446655440007', 'Laura FernÃ¡ndez', 'laura.fernandez@egea.com', '+34600778899', 'operario', 'activo'),
('550e8400-e29b-41d4-a716-446655440008', '550e8400-e29b-41d4-a716-446655440008', 'Miguel Torres', 'miguel.torres@egea.com', '+34600889900', 'operario', 'vacaciones'),
('550e8400-e29b-41d4-a716-446655440009', '550e8400-e29b-41d4-a716-446655440009', 'SofÃ­a JimÃ©nez', 'sofia.jimenez@egea.com', '+34600990011', 'operario', 'baja');

-- =====================================================================
-- INSERTAR VEHÃCULOS DE EJEMPLO
-- =====================================================================

INSERT INTO public.vehicles (id, name, type, license_plate, capacity, is_active) VALUES
('660e8400-e29b-41d4-a716-446655440001', 'Jumper 1', 'jumper', '1234-ABC', 2, true),
('660e8400-e29b-41d4-a716-446655440002', 'Jumper 2', 'jumper', '5678-DEF', 2, true),
('660e8400-e29b-41d4-a716-446655440003', 'CamiÃ³n Grande', 'camion', '9012-GHI', 3, true),
('660e8400-e29b-41d4-a716-446655440004', 'Furgoneta PequeÃ±a', 'furgoneta', '3456-JKL', 1, true),
('660e8400-e29b-41d4-a716-446655440005', 'Furgoneta Mediana', 'furgoneta', '7890-MNO', 2, false),
('660e8400-e29b-41d4-a716-446655440006', 'VehÃ­culo Auxiliar', 'otro', '2468-PQR', 1, true);

-- =====================================================================
-- INSERTAR PLANTILLAS DE EJEMPLO
-- =====================================================================

-- Plantilla para Instalaciones
INSERT INTO public.templates (id, name, template_type, category, fields) VALUES
('770e8400-e29b-41d4-a716-446655440001', 'InstalaciÃ³n EstÃ¡ndar', 'instalacion', 'Instalaciones', 
'[{"name": "cliente", "label": "Cliente", "type": "text"}, {"name": "direccion", "label": "DirecciÃ³n", "type": "text"}, {"name": "telefono", "label": "TelÃ©fono", "type": "text"}, {"name": "producto", "label": "Producto", "type": "text"}, {"name": "cantidad", "label": "Cantidad", "type": "number"}, {"name": "notas", "label": "Notas", "type": "text"}]');

-- Plantilla para ConfecciÃ³n
INSERT INTO public.templates (id, name, template_type, category, fields) VALUES
('770e8400-e29b-41d4-a716-446655440002', 'Parte de ConfecciÃ³n', 'confeccion', 'ConfecciÃ³n',
'[{"name": "pedido", "label": "NÃºmero de Pedido", "type": "text"}, {"name": "cliente", "label": "Cliente", "type": "text"}, {"name": "prenda", "label": "Prenda", "type": "text"}, {"name": "talla", "label": "Talla", "type": "text"}, {"name": "cantidad", "label": "Cantidad", "type": "number"}, {"name": "fecha_entrega", "label": "Fecha Entrega", "type": "date"}, {"name": "observaciones", "label": "Observaciones", "type": "text"}]');

-- Plantilla para TapicerÃ­a
INSERT INTO public.templates (id, name, template_type, category, fields) VALUES
('770e8400-e29b-41d4-a716-446655440003', 'Trabajo de TapicerÃ­a', 'tapiceria', 'TapicerÃ­a',
'[{"name": "cliente", "label": "Cliente", "type": "text"}, {"name": "mueble", "label": "Tipo de Mueble", "type": "text"}, {"name": "tela", "label": "Tela", "type": "text"}, {"name": "color", "label": "Color", "type": "text"}, {"name": "medidas", "label": "Medidas", "type": "text"}, {"name": "presupuesto", "label": "Presupuesto", "type": "number"}, {"name": "notas", "label": "Notas", "type": "text"}]');

-- =====================================================================
-- INSERTAR PANTALLAS DE EJEMPLO
-- =====================================================================

-- Pantallas de Instalaciones
INSERT INTO public.screens (id, name, screen_type, screen_group, template_id, refresh_interval_sec, is_active) VALUES
('880e8400-e29b-41d4-a716-446655440001', 'Instalaciones Pendientes', 'data', 'Instalaciones', '770e8400-e29b-41d4-a716-446655440001', 30, true),
('880e8400-e29b-41d4-a716-446655440002', 'Instalaciones Completadas', 'data', 'Instalaciones', '770e8400-e29b-41d4-a716-446655440001', 60, true),
('880e8400-e29b-41d4-a716-446655440003', 'Display Instalaciones', 'display', 'Instalaciones', NULL, 15, true);

-- Pantallas de ConfecciÃ³n
INSERT INTO public.screens (id, name, screen_type, screen_group, template_id, next_screen_id, refresh_interval_sec, is_active) VALUES
('880e8400-e29b-41d4-a716-446655440004', 'ConfecciÃ³n en Progreso', 'data', 'ConfecciÃ³n', '770e8400-e29b-41d4-a716-446655440002', '880e8400-e29b-41d4-a716-446655440005', 30, true),
('880e8400-e29b-41d4-a716-446655440005', 'ConfecciÃ³n Completada', 'data', 'ConfecciÃ³n', '770e8400-e29b-41d4-a716-446655440002', NULL, 60, true),
('880e8400-e29b-41d4-a716-446655440006', 'Display ConfecciÃ³n', 'display', 'ConfecciÃ³n', NULL, NULL, 20, true);

-- Pantallas de TapicerÃ­a
INSERT INTO public.screens (id, name, screen_type, screen_group, template_id, refresh_interval_sec, is_active) VALUES
('880e8400-e29b-41d4-a716-446655440007', 'TapicerÃ­a Activa', 'data', 'TapicerÃ­a', '770e8400-e29b-41d4-a716-446655440003', 45, true),
('880e8400-e29b-41d4-a716-446655440008', 'Display TapicerÃ­a', 'display', 'TapicerÃ­a', NULL, 25, true);

-- =====================================================================
-- INSERTAR GRUPOS DE EJEMPLO
-- =====================================================================

INSERT INTO public.groups (id, name, color, description, created_by) VALUES
('990e8400-e29b-41d4-a716-446655440001', 'Equipo Instalaciones', '#3B82F6', 'Equipo especializado en instalaciones', '550e8400-e29b-41d4-a716-446655440002'),
('990e8400-e29b-41d4-a716-446655440002', 'Equipo ConfecciÃ³n', '#10B981', 'Equipo especializado en confecciÃ³n', '550e8400-e29b-41d4-a716-446655440002'),
('990e8400-e29b-41d4-a716-446655440003', 'Equipo TapicerÃ­a', '#F59E0B', 'Equipo especializado en tapicerÃ­a', '550e8400-e29b-41d4-a716-446655440003');

-- =====================================================================
-- ASIGNAR USUARIOS A GRUPOS
-- =====================================================================

-- Equipo Instalaciones
INSERT INTO public.profile_groups (profile_id, group_id, role) VALUES
('550e8400-e29b-41d4-a716-446655440002', '990e8400-e29b-41d4-a716-446655440001', 'lÃ­der'),
('550e8400-e29b-41d4-a716-446655440004', '990e8400-e29b-41d4-a716-446655440001', 'miembro'),
('550e8400-e29b-41d4-a716-446655440005', '990e8400-e29b-41d4-a716-446655440001', 'miembro');

-- Equipo ConfecciÃ³n
INSERT INTO public.profile_groups (profile_id, group_id, role) VALUES
('550e8400-e29b-41d4-a716-446655440003', '990e8400-e29b-41d4-a716-446655440002', 'lÃ­der'),
('550e8400-e29b-41d4-a716-446655440006', '990e8400-e29b-41d4-a716-446655440002', 'miembro'),
('550e8400-e29b-41d4-a716-446655440007', '990e8400-e29b-41d4-a716-446655440002', 'miembro');

-- Equipo TapicerÃ­a
INSERT INTO public.profile_groups (profile_id, group_id, role) VALUES
('550e8400-e29b-41d4-a716-446655440003', '990e8400-e29b-41d4-a716-446655440003', 'lÃ­der'),
('550e8400-e29b-41d4-a716-446655440004', '990e8400-e29b-41d4-a716-446655440003', 'miembro');

-- =====================================================================
-- INSERTAR TAREAS DE EJEMPLO
-- =====================================================================

-- Tareas de Instalaciones (hoy y prÃ³ximos dÃ­as)
INSERT INTO public.screen_data (id, screen_id, data, state, status, start_date, end_date, location, responsible_profile_id, assigned_to, "order") VALUES
('110e8400-e29b-41d4-a716-446655440001', '880e8400-e29b-41d4-a716-446655440001', 
'{"cliente": "Empresa ABC", "direccion": "Calle Principal 123, Madrid", "telefono": "912345678", "producto": "Sistema de aire acondicionado", "cantidad": 3, "notas": "InstalaciÃ³n en planta baja"}', 
'pendiente', 'pendiente', CURRENT_DATE, CURRENT_DATE + INTERVAL '1 day', 'Madrid', '550e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440004', 1),

('110e8400-e29b-41d4-a716-446655440002', '880e8400-e29b-41d4-a716-446655440001', 
'{"cliente": "Tienda XYZ", "direccion": "Avenida Comercial 456, Barcelona", "telefono": "933456789", "producto": "CÃ¡maras de seguridad", "cantidad": 8, "notas": "Requiere instalaciÃ³n en altura"}', 
'urgente', 'pendiente', CURRENT_DATE, CURRENT_DATE, 'Barcelona', '550e8400-e29b-41d4-a716-446655440005', '550e8400-e29b-41d4-a716-446655440005', 2),

('110e8400-e29b-41d4-a716-446655440003', '880e8400-e29b-41d4-a716-446655440001', 
'{"cliente": "Restaurante Buen Sabor", "direccion": "Calle de la comida 789, Valencia", "telefono": "964567890", "producto": "Sistema de extracciÃ³n", "cantidad": 1, "notas": "InstalaciÃ³n industrial"}', 
'en fabricacion', 'en progreso', CURRENT_DATE - INTERVAL '1 day', CURRENT_DATE + INTERVAL '2 days', 'Valencia', '550e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440006', 3),

('110e8400-e29b-41d4-a716-446655440004', '880e8400-e29b-41d4-a716-446655440001', 
'{"cliente": "Oficina Central", "direccion": "Plaza Mayor 1, Madrid", "telefono": "915678901", "producto": "Red de datos", "cantidad": 15, "notas": "InstalaciÃ³n en horario nocturno"}', 
'a la espera', 'pendiente', CURRENT_DATE + INTERVAL '1 day', CURRENT_DATE + INTERVAL '3 days', 'Madrid', '550e8400-e29b-41d4-a716-446655440005', '550e8400-e29b-41d4-a716-446655440005', 4),

('110e8400-e29b-41d4-a716-446655440005', '880e8400-e29b-41d4-a716-446655440001', 
'{"cliente": "Hotel Sol y Playa", "direccion": "Avenida del Mar 234, Alicante", "telefono": "965678912", "producto": "Televisores Smart TV", "cantidad": 20, "notas": "InstalaciÃ³n en 50 habitaciones"}', 
'pendiente', 'pendiente', CURRENT_DATE + INTERVAL '2 days', CURRENT_DATE + INTERVAL '4 days', 'Alicante', '550e8400-e29b-41d4-a716-446655440006', '550e8400-e29b-41d4-a716-446655440006', 5);

-- Tareas de ConfecciÃ³n
INSERT INTO public.screen_data (id, screen_id, data, state, status, start_date, end_date, location, responsible_profile_id, assigned_to, "order") VALUES
('110e8400-e29b-41d4-a716-446655440006', '880e8400-e29b-41d4-a716-446655440004', 
'{"pedido": "PED-2024-001", "cliente": "Moda Fashion SL", "prenda": "Vestido elegante", "talla": "M", "cantidad": 50, "fecha_entrega": "2024-10-15", "observaciones": "Talla especial, requiere cuidado extra"}', 
'en fabricacion', 'en progreso', CURRENT_DATE - INTERVAL '2 days', CURRENT_DATE + INTERVAL '3 days', 'Taller ConfecciÃ³n', '550e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440006', 1),

('110e8400-e29b-41d4-a716-446655440007', '880e8400-e29b-41d4-a716-446655440004', 
'{"pedido": "PED-2024-002", "cliente": "Ropa Deportiva SA", "prenda": "Camiseta tÃ©cnica", "talla": "L", "cantidad": 100, "fecha_entrega": "2024-10-12", "observaciones": "Material transpirable"}', 
'urgente', 'en progreso', CURRENT_DATE - INTERVAL '1 day', CURRENT_DATE + INTERVAL '1 day', 'Taller ConfecciÃ³n', '550e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440007', 2),

('110e8400-e29b-41d4-a716-446655440008', '880e8400-e29b-41d4-a716-446655440004', 
'{"pedido": "PED-2024-003", "cliente": "Uniformes Escolares", "prenda": "Blusa escolar", "talla": "S", "cantidad": 200, "fecha_entrega": "2024-10-20", "observaciones": "Colores institucionales"}', 
'pendiente', 'pendiente', CURRENT_DATE, CURRENT_DATE + INTERVAL '5 days', 'Taller ConfecciÃ³n', '550e8400-e29b-41d4-a716-446655440006', '550e8400-e29b-41d4-a716-446655440006', 3);

-- Tareas de TapicerÃ­a
INSERT INTO public.screen_data (id, screen_id, data, state, status, start_date, end_date, location, responsible_profile_id, assigned_to, "order") VALUES
('110e8400-e29b-41d4-a716-446655440009', '880e8400-e29b-41d4-a716-446655440007', 
'{"cliente": "Restaurante Lujo", "mueble": "Sillas de comedor", "tela": "Cuero premium", "color": "MarrÃ³n oscuro", "medidas": "45x45x80 cm", "presupuesto": 2500, "notas": "12 sillas, restauraciÃ³n completa"}', 
'en fabricacion', 'en progreso', CURRENT_DATE - INTERVAL '3 days', CURRENT_DATE + INTERVAL '2 days', 'Taller TapicerÃ­a', '550e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440004', 1),

('110e8400-e29b-41d4-a716-446655440010', '880e8400-e29b-41d4-a716-446655440007', 
'{"cliente": "Hotel Boutique", "mueble": "SofÃ¡ suite", "tela": "Tela antimanchas", "color": "Gris perla", "medidas": "200x90x85 cm", "presupuesto": 1800, "notas": "5 sofÃ¡s, diseÃ±o moderno"}', 
'a la espera', 'pendiente', CURRENT_DATE + INTERVAL '1 day', CURRENT_DATE + INTERVAL '4 days', 'Taller TapicerÃ­a', '550e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440004', 2);

-- =====================================================================
-- ASIGNAR PERFILES A TAREAS
-- =====================================================================

-- Asignaciones para tareas de instalaciÃ³n
INSERT INTO public.task_profiles (task_id, profile_id) VALUES
('110e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440004'),
('110e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440005'),
('110e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440004'),
('110e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440006'),
('110e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440005'),
('110e8400-e29b-41d4-a716-446655440005', '550e8400-e29b-41d4-a716-446655440006');

-- Asignaciones para tareas de confecciÃ³n
INSERT INTO public.task_profiles (task_id, profile_id) VALUES
('110e8400-e29b-41d4-a716-446655440006', '550e8400-e29b-41d4-a716-446655440006'),
('110e8400-e29b-41d4-a716-446655440007', '550e8400-e29b-41d4-a716-446655440007'),
('110e8400-e29b-41d4-a716-446655440008', '550e8400-e29b-41d4-a716-446655440006');

-- Asignaciones para tareas de tapicerÃ­a
INSERT INTO public.task_profiles (task_id, profile_id) VALUES
('110e8400-e29b-41d4-a716-446655440009', '550e8400-e29b-41d4-a716-446655440004'),
('110e8400-e29b-41d4-a716-446655440010', '550e8400-e29b-41d4-a716-446655440004');

-- =====================================================================
-- ASIGNAR VEHÃCULOS A TAREAS
-- =====================================================================

INSERT INTO public.task_vehicles (task_id, vehicle_id) VALUES
('110e8400-e29b-41d4-a716-446655440001', '660e8400-e29b-41d4-a716-446655440001'),
('110e8400-e29b-41d4-a716-446655440002', '660e8400-e29b-41d4-a716-446655440002'),
('110e8400-e29b-41d4-a716-446655440003', '660e8400-e29b-41d4-a716-446655440003'),
('110e8400-e29b-41d4-a716-446655440004', '660e8400-e29b-41d4-a716-446655440001'),
('110e8400-e29b-41d4-a716-446655440005', '660e8400-e29b-41d4-a716-446655440004');

-- =====================================================================
-- INSERTAR DISPONIBILIDAD DE USUARIOS
-- =====================================================================

INSERT INTO public.user_availability (profile_id, start_date, end_date, status, notes) VALUES
('550e8400-e29b-41d4-a716-446655440008', CURRENT_DATE, CURRENT_DATE + INTERVAL '14 days', 'vacaciones', 'Vacaciones programadas'),
('550e8400-e29b-41d4-a716-446655440009', CURRENT_DATE - INTERVAL '30 days', CURRENT_DATE - INTERVAL '1 day', 'no disponible', 'Baja mÃ©dica');

-- =====================================================================
-- INSERTAR CONFIGURACIÃ“N DEL SISTEMA
-- =====================================================================

INSERT INTO public.system_config (key, value, description) VALUES
('company_name', '"Egea Productivity Solutions"', 'Nombre de la empresa'),
('default_timezone', '"Europe/Madrid"', 'Zona horaria por defecto'),
('auto_archive_days', '7', 'DÃ­as para archivar tareas completadas automÃ¡ticamente'),
('notification_email', '"notifications@egea.com"', 'Email para notificaciones del sistema'),
('max_tasks_per_day', '10', 'NÃºmero mÃ¡ximo de tareas por dÃ­a por operario'),
('working_hours_start', '"08:00"', 'Hora de inicio del trabajo'),
('working_hours_end', '"18:00"', 'Hora de fin del trabajo');

-- =====================================================================
-- INSERTAR PERMISOS POR ROL
-- =====================================================================

-- Permisos para admin
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
('admin', 'archive', 'delete', true);

-- Permisos para manager
INSERT INTO public.role_permissions (role, resource, action, granted) VALUES
('manager', 'dashboard', 'view', true),
('manager', 'dashboard', 'create', true),
('manager', 'dashboard', 'edit', true),
('manager', 'dashboard', 'delete', true),
('manager', 'users', 'view', true),
('manager', 'users', 'create', true),
('manager', 'users', 'edit', true),
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
('manager', 'archive', 'edit', true);

-- Permisos para responsable
INSERT INTO public.role_permissions (role, resource, action, granted) VALUES
('responsable', 'dashboard', 'view', true),
('responsable', 'users', 'view', true),
('responsable', 'vehicles', 'view', true),
('responsable', 'vehicles', 'create', true),
('responsable', 'vehicles', 'edit', true),
('responsable', 'installations', 'view', true),
('responsable', 'installations', 'create', true),
('responsable', 'installations', 'edit', true),
('responsable', 'templates', 'view', true),
('responsable', 'screens', 'view', true),
('responsable', 'communications', 'view', true),
('responsable', 'communications', 'create', true),
('responsable', 'communications', 'edit', true),
('responsable', 'archive', 'view', true);

-- Permisos para operario
INSERT INTO public.role_permissions (role, resource, action, granted) VALUES
('operario', 'dashboard', 'view', true),
('operario', 'vehicles', 'view', true),
('operario', 'installations', 'view', true),
('operario', 'screens', 'view', true),
('operario', 'communications', 'view', true),
('operario', 'communications', 'create', true),
('operario', 'communications', 'edit', true);

-- =====================================================================
-- INSERTAR ALGUNAS TAREAS ARCHIVADAS DE EJEMPLO
-- =====================================================================

INSERT INTO public.archived_tasks (id, archived_at, data, status, state, start_date, end_date, location, responsible_profile_id, responsible_name, assigned_users, assigned_vehicles) VALUES
('990e8400-e29b-41d4-a716-446655440001', CURRENT_DATE - INTERVAL '5 days', 
'{"cliente": "Cliente Antiguo", "direccion": "Calle Vieja 123", "telefono": "911111111", "producto": "Producto antiguo", "cantidad": 1, "notas": "Tarea completada"}', 
'acabado', 'terminado', CURRENT_DATE - INTERVAL '10 days', CURRENT_DATE - INTERVAL '5 days', 'Madrid', '550e8400-e29b-41d4-a716-446655440004', 'Carlos LÃ³pez', 
'[{"id": "550e8400-e29b-41d4-a716-446655440004", "full_name": "Carlos LÃ³pez", "email": "carlos.lopez@egea.com"}]', 
'[{"id": "660e8400-e29b-41d4-a716-446655440001", "name": "Jumper 1", "type": "jumper"}]');

COMMIT;

-- =====================================================================
-- NOTAS DE IMPLEMENTACIÃ“N
-- =====================================================================
-- 1. Esta migraciÃ³n inserta datos realistas para probar la aplicaciÃ³n
-- 2. Incluye usuarios con diferentes roles y estados
-- 3. Crea tareas en diferentes estados y fechas
-- 4. Establece relaciones realistas entre perfiles, grupos y tareas
-- 5. Configura permisos bÃ¡sicos por rol
-- 6. Los datos son suficientes para probar todas las funcionalidades
-- =====================================================================

-- MIGRACIÓN: 20251006120000_fix_insert_profile_rls.sql

-- Fixes the RLS policy for inserting new profiles.

BEGIN;

-- Drop the old catch-all policy


-- Create a specific insert policy for admins
DROP POLICY IF EXISTS "admins_can_insert_profiles" ON public.profiles;
CREATE POLICY "admins_can_insert_profiles" ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

-- Recreate the other policies for admins
DROP POLICY IF EXISTS "admins_can_view_all_profiles" ON public.profiles;
CREATE POLICY "admins_can_view_all_profiles" ON public.profiles FOR SELECT
  TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "admins_can_update_all_profiles" ON public.profiles;
CREATE POLICY "admins_can_update_all_profiles" ON public.profiles FOR UPDATE
  TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "admins_can_delete_all_profiles" ON public.profiles;
CREATE POLICY "admins_can_delete_all_profiles" ON public.profiles FOR DELETE
  TO authenticated
  USING (public.is_admin());

COMMIT;

-- MIGRACIÓN: 20251006200000_fix_rls_recursion_profiles.sql

-- =====================================================================
-- MIGRACIÃ“N: CORRECCIÃ“N DE RECURSIÃ“N EN POLÃTICAS RLS DE PROFILES
-- =====================================================================
-- Fecha: 2025-10-06
-- Problema: La funciÃ³n is_admin() crea recursiÃ³n infinita al consultar profiles
-- SoluciÃ³n: Crear una versiÃ³n de is_admin() que no use RLS para profiles
-- =====================================================================

BEGIN;

-- =====================================================================
-- ELIMINAR FUNCIÃ“N is_admin() PROBLEMÃTICA
-- =====================================================================

DROP FUNCTION IF EXISTS public.is_admin();

-- =====================================================================
-- CREAR NUEVA FUNCIÃ“N is_admin() SIN RECURSIÃ“N
-- =====================================================================

-- Crear una funciÃ³n que verifique si el usuario es admin sin usar RLS
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  -- Usar una consulta directa a la tabla auth.users para evitar recursiÃ³n
  -- y luego verificar el rol en profiles con bypass RLS
  RETURN EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE auth_user_id = auth.uid() 
    AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Otorgar permisos de ejecuciÃ³n a usuarios autenticados
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- =====================================================================
-- CORREGIR POLÃTICAS DE profiles PARA EVITAR RECURSIÃ“N
-- =====================================================================

-- Eliminar polÃ­ticas existentes







-- Crear nuevas polÃ­ticas sin recursiÃ³n
DROP POLICY IF EXISTS "users_can_view_own_profile" ON public.profiles;
CREATE POLICY "users_can_view_own_profile" ON public.profiles FOR SELECT
  TO authenticated
  USING (auth_user_id = auth.uid());

DROP POLICY IF EXISTS "users_can_update_own_profile" ON public.profiles;
CREATE POLICY "users_can_update_own_profile" ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth_user_id = auth.uid())
  WITH CHECK (auth_user_id = auth.uid());

-- PolÃ­ticas para admins que usan la nueva funciÃ³n is_admin()
DROP POLICY IF EXISTS "admins_can_view_all_profiles" ON public.profiles;
CREATE POLICY "admins_can_view_all_profiles" ON public.profiles FOR SELECT
  TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "admins_can_insert_profiles" ON public.profiles;
CREATE POLICY "admins_can_insert_profiles" ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "admins_can_update_all_profiles" ON public.profiles;
CREATE POLICY "admins_can_update_all_profiles" ON public.profiles FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "admins_can_delete_all_profiles" ON public.profiles;
CREATE POLICY "admins_can_delete_all_profiles" ON public.profiles FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- =====================================================================
-- VERIFICAR QUE RLS ESTÃ‰ HABILITADO
-- =====================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

COMMIT;

-- =====================================================================
-- NOTAS DE IMPLEMENTACIÃ“N
-- =====================================================================
-- 1. Se eliminÃ³ la funciÃ³n is_admin() problemÃ¡tica que causaba recursiÃ³n
-- 2. Se creÃ³ una nueva funciÃ³n is_admin() con SECURITY DEFINER para evitar RLS
-- 3. Se recrearon todas las polÃ­ticas de profiles para usar la nueva funciÃ³n
-- 4. Esto deberÃ­a resolver el error 500 al consultar profiles
-- =====================================================================

-- MIGRACIÓN: 20251009000001_add_vehicle_fields.sql

-- =====================================================================
-- MIGRACIÃ“N: AÃ‘ADIR CAMPOS KM Y ESTADO A VEHÃCULOS
-- =====================================================================
-- Fecha: 2025-10-09
-- Objetivo: AÃ±adir campos de kilometraje y estado a la tabla vehicles
-- =====================================================================

BEGIN;

-- AÃ±adir campos a la tabla vehicles
ALTER TABLE IF EXISTS public.vehicles
  ADD COLUMN IF NOT EXISTS km INTEGER CHECK (km >= 0),
  ADD COLUMN IF NOT EXISTS status TEXT CHECK (status IN ('normal', 'accidentado', 'revision')) DEFAULT 'normal';

-- Actualizar vehÃ­culos existentes con valores por defecto
UPDATE public.vehicles 
SET km = 0 
WHERE km IS NULL;

-- Crear Ã­ndices para los nuevos campos
CREATE INDEX IF NOT EXISTS idx_vehicles_status ON public.vehicles(status);
CREATE INDEX IF NOT EXISTS idx_vehicles_km ON public.vehicles(km);

-- AÃ±adir comentario a los nuevos campos
COMMENT ON COLUMN public.vehicles.km IS 'Kilometraje actual del vehÃ­culo';
COMMENT ON COLUMN public.vehicles.status IS 'Estado actual del vehÃ­culo: normal, accidentado, en revisiÃ³n';

COMMIT;

-- =====================================================================
-- NOTAS DE IMPLEMENTACIÃ“N
-- =====================================================================
-- 1. Se aÃ±aden los campos km y status con validaciones
-- 2. km debe ser un nÃºmero entero no negativo
-- 3. status tiene valores predefinidos con 'normal' como valor por defecto
-- 4. Se crean Ã­ndices para optimizar consultas por estos campos
-- =====================================================================

-- MIGRACIÓN: 20251009000002_add_user_fields.sql

-- =====================================================================
-- MIGRACIÃ“N: AÃ‘ADIR CAMPOS DE CONTACTO Y URL PÃšBLICA A USUARIOS
-- =====================================================================
-- Fecha: 2025-10-09
-- Objetivo: AÃ±adir campos telÃ©fono, WhatsApp y URL pÃºblica a la tabla profiles
-- =====================================================================

BEGIN;

-- AÃ±adir campos a la tabla profiles
ALTER TABLE IF EXISTS public.profiles
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS whatsapp TEXT,
  ADD COLUMN IF NOT EXISTS public_url TEXT UNIQUE;

-- Crear funciÃ³n para generar URL pÃºblica Ãºnica
CREATE OR REPLACE FUNCTION public.ensure_public_url(p_user_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_url TEXT;
  v_exists BOOLEAN;
BEGIN
  -- Verificar si ya tiene URL pÃºblica
  SELECT public_url INTO v_url FROM public.profiles WHERE id = p_user_id;
  
  IF v_url IS NOT NULL THEN
    RETURN v_url;
  END IF;
  
  -- Generar URL Ãºnica hasta que no exista
  LOOP
    v_url := '/u/' || encode(gen_random_bytes(5), 'hex');
    
    -- Verificar si ya existe
    SELECT EXISTS(SELECT 1 FROM public.profiles WHERE public_url = v_url) INTO v_exists;
    
    IF NOT v_exists THEN
      EXIT;
    END IF;
  END LOOP;
  
  -- Actualizar el perfil con la nueva URL
  UPDATE public.profiles 
  SET public_url = v_url 
  WHERE id = p_user_id;
  
  RETURN v_url;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Crear trigger para generar URL pÃºblica automÃ¡ticamente
CREATE OR REPLACE FUNCTION public.generate_public_url_trigger()
RETURNS TRIGGER AS $$
BEGIN
  -- Solo generar URL para nuevos usuarios que no tengan una
  IF TG_OP = 'INSERT' AND NEW.public_url IS NULL THEN
    NEW.public_url := public.ensure_public_url(NEW.id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger
DROP TRIGGER IF EXISTS on_profile_generate_public_url ON public.profiles;
CREATE TRIGGER on_profile_generate_public_url
  BEFORE INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.generate_public_url_trigger();

-- Generar URLs pÃºblicas para usuarios existentes que no tengan
UPDATE public.profiles 
SET public_url = public.ensure_public_url(id)
WHERE public_url IS NULL;

-- Crear Ã­ndices para los nuevos campos
CREATE INDEX IF NOT EXISTS idx_profiles_phone ON public.profiles(phone) WHERE phone IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_whatsapp ON public.profiles(whatsapp) WHERE whatsapp IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_public_url ON public.profiles(public_url) WHERE public_url IS NOT NULL;

-- AÃ±adir comentarios a los nuevos campos
COMMENT ON COLUMN public.profiles.phone IS 'NÃºmero de telÃ©fono del usuario';
COMMENT ON COLUMN public.profiles.whatsapp IS 'NÃºmero de WhatsApp para notificaciones';
COMMENT ON COLUMN public.profiles.public_url IS 'URL pÃºblica Ãºnica para el perfil del usuario';

COMMIT;

-- =====================================================================
-- NOTAS DE IMPLEMENTACIÃ“N
-- =====================================================================
-- 1. Se aÃ±aden campos phone, whatsapp y public_url
-- 2. public_url debe ser Ãºnico y se genera automÃ¡ticamente
-- 3. Se crea una funciÃ³n para generar URLs Ãºnicas de forma segura
-- 4. Se crea un trigger para generar URLs automÃ¡ticamente en nuevos usuarios
-- 5. Se generan URLs para usuarios existentes que no tengan
-- 6. Se crean Ã­ndices para optimizar consultas por estos campos
-- =====================================================================

-- MIGRACIÓN: 20251009000003_direct_messages.sql

-- =====================================================================
-- MIGRACIÃ“N: TABLA DE MENSAJES DIRECTOS
-- =====================================================================
-- Fecha: 2025-10-09
-- Objetivo: Crear tabla para mensajes directos entre usuarios con Realtime
-- =====================================================================

BEGIN;

-- Crear tabla de mensajes directos
CREATE TABLE IF NOT EXISTS public.direct_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file', 'system')),
  metadata JSONB DEFAULT '{}'::jsonb,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE public.direct_messages ENABLE ROW LEVEL SECURITY;

-- PolÃ­ticas de seguridad
DROP POLICY IF EXISTS "users_can_view_own_messages" ON public.direct_messages;
CREATE POLICY "users_can_view_own_messages" ON public.direct_messages
  FOR SELECT TO authenticated
  USING (auth.uid() IN (
    SELECT auth_user_id FROM public.profiles WHERE id = sender_id
    UNION
    SELECT auth_user_id FROM public.profiles WHERE id = recipient_id
  ));

DROP POLICY IF EXISTS "users_can_send_messages" ON public.direct_messages;
CREATE POLICY "users_can_send_messages" ON public.direct_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() IN (
      SELECT auth_user_id FROM public.profiles WHERE id = sender_id
    )
  );

DROP POLICY IF EXISTS "users_can_mark_own_messages_read" ON public.direct_messages;
CREATE POLICY "users_can_mark_own_messages_read" ON public.direct_messages
  FOR UPDATE TO authenticated
  USING (
    auth.uid() IN (
      SELECT auth_user_id FROM public.profiles WHERE id = recipient_id
    )
  )
  WITH CHECK (
    auth.uid() IN (
      SELECT auth_user_id FROM public.profiles WHERE id = recipient_id
    )
  );

-- PolÃ­ticas para admin/manager
DROP POLICY IF EXISTS "admin_manager_can_view_all_messages" ON public.direct_messages;
CREATE POLICY "admin_manager_can_view_all_messages" ON public.direct_messages
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE auth_user_id = auth.uid() 
      AND role IN ('admin', 'manager')
    )
  );

-- Ãndices
CREATE INDEX IF NOT EXISTS idx_direct_messages_sender_id ON public.direct_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_direct_messages_recipient_id ON public.direct_messages(recipient_id);
CREATE INDEX IF NOT EXISTS idx_direct_messages_created_at ON public.direct_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_direct_messages_read_at ON public.direct_messages(read_at) WHERE read_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_direct_messages_conversation ON public.direct_messages(sender_id, recipient_id);

-- Trigger para updated_at
CREATE TRIGGER handle_direct_messages_updated_at
    BEFORE UPDATE ON public.direct_messages
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- FunciÃ³n para obtener conversaciÃ³n entre dos usuarios
CREATE OR REPLACE FUNCTION public.get_conversation(user1_id UUID, user2_id UUID, limit_count INTEGER DEFAULT 50, offset_count INTEGER DEFAULT 0)
RETURNS TABLE (
  id UUID,
  sender_id UUID,
  recipient_id UUID,
  content TEXT,
  message_type TEXT,
  metadata JSONB,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE,
  sender_name TEXT,
  sender_avatar TEXT,
  is_sent BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    dm.id,
    dm.sender_id,
    dm.recipient_id,
    dm.content,
    dm.message_type,
    dm.metadata,
    dm.read_at,
    dm.created_at,
    p.full_name as sender_name,
    p.avatar_url as sender_avatar,
    CASE WHEN dm.sender_id = user1_id THEN true ELSE false END as is_sent
  FROM public.direct_messages dm
  JOIN public.profiles p ON p.id = dm.sender_id
  WHERE (
    (dm.sender_id = user1_id AND dm.recipient_id = user2_id) OR
    (dm.sender_id = user2_id AND dm.recipient_id = user1_id)
  )
  ORDER BY dm.created_at DESC
  LIMIT limit_count OFFSET offset_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- FunciÃ³n para enviar mensaje directo
CREATE OR REPLACE FUNCTION public.send_direct_message(
  p_recipient_id UUID,
  p_content TEXT,
  p_message_type TEXT DEFAULT 'text',
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS TABLE (
  success BOOLEAN,
  message_id UUID,
  error_message TEXT
) AS $$
DECLARE
  v_sender_id UUID;
  v_message_id UUID;
  v_error TEXT;
BEGIN
  -- Obtener ID del remitente actual
  SELECT id INTO v_sender_id 
  FROM public.profiles 
  WHERE auth_user_id = auth.uid();
  
  IF v_sender_id IS NULL THEN
    RETURN QUERY SELECT false, NULL::UUID, 'Usuario no encontrado'::TEXT;
    RETURN;
  END IF;
  
  -- Verificar que el destinatario existe
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_recipient_id) THEN
    RETURN QUERY SELECT false, NULL::UUID, 'Destinatario no encontrado'::TEXT;
    RETURN;
  END IF;
  
  -- Insertar mensaje
  INSERT INTO public.direct_messages (
    sender_id, 
    recipient_id, 
    content, 
    message_type, 
    metadata
  ) VALUES (
    v_sender_id, 
    p_recipient_id, 
    p_content, 
    p_message_type, 
    p_metadata
  ) RETURNING id INTO v_message_id;
  
  RETURN QUERY SELECT true, v_message_id, NULL::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- FunciÃ³n para marcar mensajes como leÃ­dos
CREATE OR REPLACE FUNCTION public.mark_messages_read(p_sender_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_current_user_id UUID;
  v_count INTEGER;
BEGIN
  -- Obtener ID del usuario actual
  SELECT id INTO v_current_user_id 
  FROM public.profiles 
  WHERE auth_user_id = auth.uid();
  
  IF v_current_user_id IS NULL THEN
    RETURN 0;
  END IF;
  
  -- Actualizar mensajes no leÃ­dos
  UPDATE public.direct_messages 
  SET read_at = NOW() 
  WHERE sender_id = p_sender_id 
  AND recipient_id = v_current_user_id 
  AND read_at IS NULL;
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- FunciÃ³n para contar mensajes no leÃ­dos
CREATE OR REPLACE FUNCTION public.get_unread_count()
RETURNS INTEGER AS $$
DECLARE
  v_current_user_id UUID;
  v_count INTEGER;
BEGIN
  -- Obtener ID del usuario actual
  SELECT id INTO v_current_user_id 
  FROM public.profiles 
  WHERE auth_user_id = auth.uid();
  
  IF v_current_user_id IS NULL THEN
    RETURN 0;
  END IF;
  
  -- Contar mensajes no leÃ­dos
  SELECT COUNT(*) INTO v_count
  FROM public.direct_messages 
  WHERE recipient_id = v_current_user_id 
  AND read_at IS NULL;
  
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Permisos para las funciones
GRANT EXECUTE ON FUNCTION public.get_conversation TO authenticated;
GRANT EXECUTE ON FUNCTION public.send_direct_message TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_messages_read TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_unread_count TO authenticated;

-- Comentarios
COMMENT ON TABLE public.direct_messages IS 'Mensajes directos entre usuarios del sistema';
COMMENT ON COLUMN public.direct_messages.message_type IS 'Tipo de mensaje: text, image, file, system';
COMMENT ON COLUMN public.direct_messages.metadata IS 'Metadatos adicionales del mensaje (JSON)';

COMMIT;

-- =====================================================================
-- NOTAS DE IMPLEMENTACIÃ“N
-- =====================================================================
-- 1. Se crea tabla de mensajes directos con RLS habilitado
-- 2. Los usuarios solo pueden ver sus propios mensajes (enviados o recibidos)
-- 3. Admins y managers pueden ver todos los mensajes
-- 4. Se incluyen funciones para gestionar conversaciones
-- 5. Se prepara para integraciÃ³n con Realtime de Supabase
-- 6. Se incluyen Ã­ndices para optimizar el rendimiento
-- =====================================================================

-- MIGRACIÓN: 20251009000004_add_manager_role.sql

-- =====================================================================
-- MIGRACIÃ“N: AÃ‘ADIR ROL MANAGER Y ACTUALIZAR JERARQUÃA DE PERMISOS
-- =====================================================================
-- Fecha: 2025-10-09
-- Objetivo: AÃ±adir rol manager y establecer jerarquÃ­a de 4 niveles
-- =====================================================================

BEGIN;

-- AÃ±adir nuevo rol manager al tipo enum
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

-- Insertar permisos por defecto segÃºn jerarquÃ­a
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

-- Responsable puede gestiÃ³n de operaciones bÃ¡sicas
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

-- FunciÃ³n para verificar permisos
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

-- FunciÃ³n para verificar si el rol puede gestionar otro rol
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

-- Actualizar polÃ­ticas RLS para incluir el rol manager

DROP POLICY IF EXISTS "users_can_view_own_profile" ON public.profiles;
CREATE POLICY "users_can_view_own_profile" ON public.profiles FOR SELECT
  TO authenticated
  USING (auth_user_id = auth.uid());


DROP POLICY IF EXISTS "users_can_update_own_profile" ON public.profiles;
CREATE POLICY "users_can_update_own_profile" ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth_user_id = auth.uid())
  WITH CHECK (auth_user_id = auth.uid());

-- PolÃ­tica para que usuarios con rol manager o admin puedan ver todos los perfiles
DROP POLICY IF EXISTS "admin_manager_can_view_all_profiles" ON public.profiles;
CREATE POLICY "admin_manager_can_view_all_profiles" ON public.profiles
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.auth_user_id = auth.uid() 
      AND p.role IN ('admin', 'manager')
    )
  );

-- PolÃ­tica para que admin y manager puedan gestionar perfiles con restricciones
DROP POLICY IF EXISTS "admin_manager_can_manage_profiles" ON public.profiles;
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

-- Actualizar funciÃ³n is_admin para incluir managers
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

-- Ãndices
CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON public.role_permissions(role);
CREATE INDEX IF NOT EXISTS idx_role_permissions_resource ON public.role_permissions(resource);
CREATE INDEX IF NOT EXISTS idx_role_permissions_role_resource ON public.role_permissions(role, resource);

-- Comentarios
COMMENT ON TABLE public.role_permissions IS 'Permisos configurables por rol y recurso';
COMMENT ON COLUMN public.role_permissions.role IS 'Rol del usuario: admin, manager, responsable, operario';
COMMENT ON COLUMN public.role_permissions.resource IS 'Recurso al que se aplica el permiso';
COMMENT ON COLUMN public.role_permissions.action IS 'AcciÃ³n permitida: view, create, edit, delete';

COMMIT;

-- =====================================================================
-- NOTAS DE IMPLEMENTACIÃ“N
-- =====================================================================
-- 1. Se aÃ±ade el rol 'manager' a la jerarquÃ­a existente
-- 2. Se establece jerarquÃ­a: admin > manager > responsable > operario
-- 3. Se crea tabla de permisos granulares por rol
-- 4. Se actualizan polÃ­ticas RLS para reflejar nueva jerarquÃ­a
-- 5. Managers no pueden administrar usuarios admin
-- 6. Responsables solo pueden gestionar operarios
-- 7. Operarios solo pueden ver sus tareas asignadas
-- =====================================================================

-- MIGRACIÓN: 20251009000005_fix_upsert_task_function.sql

-- Corregir la funciÃ³n upsert_task para que coincida con los parÃ¡metros esperados por el frontend
-- Esta migraciÃ³n actualiza la funciÃ³n para que tenga los parÃ¡metros correctos

DROP FUNCTION IF EXISTS public.upsert_task;

CREATE OR REPLACE FUNCTION public.upsert_task(
  p_task_id UUID DEFAULT NULL,
  p_screen_id UUID DEFAULT NULL,
  p_data JSONB DEFAULT '{}'::jsonb,
  p_state TEXT DEFAULT 'pendiente',
  p_status TEXT DEFAULT 'pendiente',
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL,
  p_location TEXT DEFAULT NULL,
  p_responsible_profile_id UUID DEFAULT NULL,
  p_assigned_to UUID DEFAULT NULL,
  p_assigned_profiles UUID[] DEFAULT NULL,
  p_assigned_vehicles UUID[] DEFAULT NULL
)
RETURNS TABLE (
  result_task_id UUID,
  result_action TEXT
) AS $$
DECLARE
  v_task_id UUID;
  v_action TEXT;
  v_user_role TEXT;
  v_permission_action TEXT;
BEGIN
  -- Obtener el rol del usuario actual
  SELECT role INTO v_user_role
  FROM public.profiles
  WHERE auth_user_id = auth.uid();

  -- Determinar si es creaciÃ³n o ediciÃ³n
  IF p_task_id IS NULL THEN
    v_permission_action := 'create';
  ELSE
    v_permission_action := 'edit';
  END IF;

  -- Validar permisos
  IF NOT public.has_permission(v_user_role, 'screens', v_permission_action) THEN
    RAISE EXCEPTION 'No tienes permisos para % tareas', v_permission_action;
  END IF;

  -- Validar parÃ¡metros requeridos
  IF p_screen_id IS NULL THEN
    RAISE EXCEPTION 'p_screen_id is required';
  END IF;

  -- Validar que el estado sea vÃ¡lido
  IF p_state NOT IN ('pendiente', 'urgente', 'en fabricacion', 'a la espera', 'terminado', 'incidente', 'arreglo') THEN
    RAISE EXCEPTION 'Estado invÃ¡lido: %', p_state;
  END IF;

  -- Validar que el status sea vÃ¡lido
  IF p_status NOT IN ('pendiente', 'acabado', 'en progreso') THEN
    RAISE EXCEPTION 'Status invÃ¡lido: %', p_status;
  END IF;

  -- Upsert de la tarea
  INSERT INTO public.screen_data (
    id, screen_id, data, state, status, start_date, end_date,
    location, responsible_profile_id, assigned_to
  ) VALUES (
    COALESCE(p_task_id, gen_random_uuid()), p_screen_id, p_data, p_state, p_status, p_start_date,
    p_end_date, p_location, p_responsible_profile_id, p_assigned_to
  )
  ON CONFLICT (id) DO UPDATE SET
    data = EXCLUDED.data,
    state = EXCLUDED.state,
    status = EXCLUDED.status,
    start_date = EXCLUDED.start_date,
    end_date = EXCLUDED.end_date,
    location = EXCLUDED.location,
    responsible_profile_id = EXCLUDED.responsible_profile_id,
    assigned_to = EXCLUDED.assigned_to,
    updated_at = NOW()
  RETURNING id INTO v_task_id;

  -- Determinar acciÃ³n realizada
  IF p_task_id IS NULL THEN
    v_action := 'created';
  ELSE
    v_action := 'updated';
  END IF;

  -- Eliminar asignaciones existentes si hay nuevas
  IF p_assigned_profiles IS NOT NULL OR p_assigned_vehicles IS NOT NULL THEN
    DELETE FROM public.task_profiles WHERE public.task_profiles.task_id = v_task_id;
    DELETE FROM public.task_vehicles WHERE public.task_vehicles.task_id = v_task_id;
  END IF;

  -- Insertar nuevas asignaciones de perfiles
  IF p_assigned_profiles IS NOT NULL THEN
    INSERT INTO public.task_profiles (task_id, profile_id)
    SELECT v_task_id, unnest(p_assigned_profiles);
  END IF;

  -- Insertar nuevas asignaciones de vehÃ­culos
  IF p_assigned_vehicles IS NOT NULL THEN
    INSERT INTO public.task_vehicles (task_id, vehicle_id)
    SELECT v_task_id, unnest(p_assigned_vehicles);
  END IF;

  RETURN QUERY SELECT v_task_id AS result_task_id, v_action AS result_action;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.upsert_task TO authenticated;

COMMENT ON FUNCTION public.upsert_task IS 'FunciÃ³n para crear o actualizar tareas con sus asignaciones. VersiÃ³n corregida con parÃ¡metros actualizados.';

-- MIGRACIÓN: 20251009000006_shared_plans.sql

-- =====================================================================
-- MIGRACIÃ“N: SHARED_PLANS PARA INSTALACIONES
-- =====================================================================
-- Fecha: 2025-10-09
-- Objetivo: Crear sistema de planes compartidos con access_token
-- =====================================================================

BEGIN;

-- Crear tabla shared_plans si no existe
create table if not exists shared_plans (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null,
  access_token text unique,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);

-- Asegurar NOT NULL si ya existÃ­a la tabla sin la columna
alter table shared_plans
  alter column access_token set not null;

-- Habilitar RLS
alter table shared_plans enable row level security;

-- Crear polÃ­ticas RLS
do $$ begin
  if not exists (select 1 from pg_policies where polname='sp_read_public') then
    DROP POLICY IF EXISTS "sp_read_public" ON shared_plans;
CREATE POLICY "sp_read_public" ON shared_plans for select using (true); -- solo token, no datos sensibles
  end if;
  if not exists (select 1 from pg_policies where polname='sp_write_owner') then
    DROP POLICY IF EXISTS "sp_write_owner" ON shared_plans;
CREATE POLICY "sp_write_owner" ON shared_plans for insert with check (auth.uid() = created_by);
  end if;
  if not exists (select 1 from pg_policies where polname='sp_update_owner') then
    DROP POLICY IF EXISTS "sp_update_owner" ON shared_plans;
CREATE POLICY "sp_update_owner" ON shared_plans for update using (auth.uid() = created_by);
  end if;
end $$;

-- FunciÃ³n para emitir/rotar token
create or replace function issue_shared_plan(p_plan_id uuid)
returns shared_plans as $$
declare
  v shared_plans;
begin
  insert into shared_plans(plan_id, access_token, created_by)
  values (p_plan_id, encode(gen_random_bytes(24),'hex'), auth.uid())
  returning * into v;
  return v;
end; 
$$ language plpgsql security definer;

-- FunciÃ³n para obtener dataset pÃºblico mÃ­nimo por token (evita fuga de datos)
create or replace function get_shared_plan_data(p_token text)
returns jsonb as $$
declare
  v shared_plans;
  v_plan_data jsonb;
begin
  select * into v from shared_plans
   where access_token = p_token and revoked_at is null;
  if not found then 
    return null; 
  end if;

  -- DEVUELVE SOLO LO NECESARIO PARA LA VISTA PÃšBLICA
  -- Obtener datos del plan del mes actual
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', sd.id,
      'title', coalesce(sd.data->>'site', coalesce(sd.data->>'description', 'Sin tÃ­tulo')),
      'date', sd.start_date,
      'status', sd.state,
      'operator', (
        select string_agg(p.full_name, ', ')
        from task_profiles tp
        join profiles p on tp.profile_id = p.id
        where tp.task_id = sd.id
      )
    ) order by sd.start_date
  ), '[]'::jsonb) into v_plan_data
  from screen_data sd
  where sd.start_date >= date_trunc('month', now())
    and sd.start_date < date_trunc('month', now()) + interval '1 month'
    and sd.state != 'terminado';

  return jsonb_build_object(
    'plan_id', v.plan_id,
    'month', date_trunc('month', now()),
    'installations', v_plan_data
  );
end; 
$$ language plpgsql security definer;

-- Ãndices
create index if not exists idx_shared_plans_access_token on shared_plans(access_token);
create index if not exists idx_shared_plans_plan_id on shared_plans(plan_id);
create index if not exists idx_shared_plans_created_by on shared_plans(created_by);
create index if not exists idx_shared_plans_created_at on shared_plans(created_at);

-- Comentarios
COMMENT ON TABLE shared_plans IS 'Planes compartidos con acceso pÃºblico vÃ­a token';
COMMENT ON COLUMN shared_plans.access_token IS 'Token Ãºnico para acceso pÃºblico';
COMMENT ON COLUMN shared_plans.revoked_at IS 'Fecha de revocaciÃ³n del acceso (null = activo)';

COMMIT;

-- =====================================================================
-- NOTAS DE IMPLEMENTACIÃ“N
-- =====================================================================
-- 1. Tabla shared_plans con access_token Ãºnico
-- 2. FunciÃ³n issue_shared_plan() para emitir tokens
-- 3. FunciÃ³n get_shared_plan_data() para vista pÃºblica segura
-- 4. RLS configurado para acceso pÃºblico solo por token
-- 5. Datos limitados a lo necesario para vista pÃºblica
-- =====================================================================

-- MIGRACIÓN: 20251009140000_fix_dashboard_stats_function.sql

-- =====================================================================
-- MIGRACIÃ“N: Corregir funciÃ³n get_dashboard_stats para dashboard
-- =====================================================================
-- Fecha: 2025-10-09
-- Problema: Los contadores del dashboard mostraban 0 cuando habÃ­a datos
--           porque la funciÃ³n filtraba por fechas (Ãºltimos 30 dÃ­as)
-- SoluciÃ³n: Cuando no se pasan parÃ¡metros de fecha, contar todas las tareas
-- =====================================================================

BEGIN;

-- FunciÃ³n corregida para obtener estadÃ­sticas del dashboard
CREATE OR REPLACE FUNCTION public.get_dashboard_stats(p_date_from DATE DEFAULT NULL, p_date_to DATE DEFAULT NULL)
RETURNS TABLE (
  total_tasks BIGINT,
  completed_tasks BIGINT,
  pending_tasks BIGINT,
  urgent_tasks BIGINT,
  overdue_tasks BIGINT,
  active_users BIGINT,
  active_vehicles BIGINT,
  completion_rate NUMERIC
) AS $$
DECLARE
  v_date_condition TEXT := '';
  v_total BIGINT;
  v_completed BIGINT;
BEGIN
  -- Si no se especifican fechas, contar todas las tareas activas
  IF p_date_from IS NULL AND p_date_to IS NULL THEN
    v_date_condition := '';
  ELSE
    v_date_condition := format(' AND sd.start_date BETWEEN %L AND %L',
      COALESCE(p_date_from, CURRENT_DATE - INTERVAL '30 days'),
      COALESCE(p_date_to, CURRENT_DATE));
  END IF;

  -- Contar tareas activas (no completadas)
  EXECUTE format('
    SELECT COUNT(*)
    FROM public.screen_data sd
    JOIN public.screens s ON sd.screen_id = s.id
    WHERE s.is_active = true
    AND sd.state != ''terminado''%s', v_date_condition) INTO v_total;

  -- Contar tareas completadas
  EXECUTE format('
    SELECT COUNT(*)
    FROM public.screen_data sd
    JOIN public.screens s ON sd.screen_id = s.id
    WHERE s.is_active = true
    AND sd.state = ''terminado''%s', v_date_condition) INTO v_completed;

  RETURN QUERY SELECT
    (v_total + v_completed) AS total_tasks,
    v_completed AS completed_tasks,
    v_total AS pending_tasks,
    (
      SELECT COUNT(*)
      FROM public.screen_data sd
      JOIN public.screens s ON sd.screen_id = s.id
      WHERE s.is_active = true
        AND sd.state = 'urgente'
        AND (p_date_from IS NULL AND p_date_to IS NULL OR sd.start_date BETWEEN COALESCE(p_date_from, CURRENT_DATE - INTERVAL '30 days') AND COALESCE(p_date_to, CURRENT_DATE))
    ) AS urgent_tasks,
    (
      SELECT COUNT(*)
      FROM public.screen_data sd
      JOIN public.screens s ON sd.screen_id = s.id
      WHERE s.is_active = true
        AND sd.end_date < CURRENT_DATE
        AND sd.state != 'terminado'
        AND (p_date_from IS NULL AND p_date_to IS NULL OR sd.start_date BETWEEN COALESCE(p_date_from, CURRENT_DATE - INTERVAL '30 days') AND COALESCE(p_date_to, CURRENT_DATE))
    ) AS overdue_tasks,
    (
      SELECT COUNT(DISTINCT p.id)
      FROM public.profiles p
      WHERE p.status = 'activo'
    ) AS active_users,
    (
      SELECT COUNT(*)
      FROM public.vehicles
      WHERE is_active = true
    ) AS active_vehicles,
    CASE
      WHEN (v_total + v_completed) > 0 THEN ROUND((v_completed::NUMERIC / (v_total + v_completed)::NUMERIC) * 100, 2)
      ELSE 0
    END AS completion_rate;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Actualizar comentario de documentaciÃ³n
COMMENT ON FUNCTION public.get_dashboard_stats IS 'FunciÃ³n para obtener estadÃ­sticas del dashboard. Si no se pasan fechas, cuenta todas las tareas activas.';

COMMIT;

-- =====================================================================
-- INSTRUCCIONES PARA APLICAR
-- =====================================================================
-- 1. Ejecutar este archivo en el SQL Editor de Supabase
-- 2. Recargar la aplicaciÃ³n (Ctrl + F5)
-- 3. Los contadores del dashboard deberÃ­an mostrar los valores correctos
-- =====================================================================

-- MIGRACIÓN: 20251009150000_add_audit_logging.sql

-- Create audit_logs table for tracking security events
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL CHECK (action IN ('permission_check', 'role_change')),
  resource TEXT NOT NULL,
  action_performed TEXT,
  result TEXT CHECK (result IN ('granted', 'denied')),
  details JSONB DEFAULT '{}'::jsonb,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add RLS policies for audit_logs
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
DROP POLICY IF EXISTS "Admins can view audit logs" ON audit_logs;
CREATE POLICY "Admins can view audit logs" ON audit_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Only admins can insert audit logs (for system functions)
DROP POLICY IF EXISTS "Admins can insert audit logs" ON audit_logs;
CREATE POLICY "Admins can insert audit logs" ON audit_logs
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- CREATE INDEX IF NOT EXISTS for efficient querying
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id_timestamp ON audit_logs(user_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource);

-- MIGRACIÓN: 20251009150001_add_rate_limiting_tables.sql

-- Add rate limiting tables for token-based access and anonymous screen data access
-- Migration: 20251009150000_add_rate_limiting_tables

-- =====================================================================
-- TABLA: rate_limits (lÃ­mite de tasa para tokens de acceso)
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.rate_limits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  token_hash TEXT NOT NULL, -- Hash del token para privacidad
  request_count INTEGER NOT NULL DEFAULT 1,
  window_start TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ãndices para rate_limits
CREATE INDEX IF NOT EXISTS idx_rate_limits_token_hash ON public.rate_limits(token_hash);
CREATE INDEX IF NOT EXISTS idx_rate_limits_window ON public.rate_limits(token_hash, window_start);

-- =====================================================================
-- TABLA: access_logs (registros de acceso para screen_data anÃ³nimo)
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.access_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  screen_id UUID NOT NULL REFERENCES public.screens(id) ON DELETE CASCADE,
  access_type TEXT NOT NULL DEFAULT 'anonymous', -- 'anonymous', 'authenticated'
  ip_hash TEXT, -- Hash de IP para privacidad (si disponible)
  user_agent TEXT,
  request_count INTEGER NOT NULL DEFAULT 1,
  window_start TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ãndices para access_logs
CREATE INDEX IF NOT EXISTS idx_access_logs_screen_id ON public.access_logs(screen_id);
CREATE INDEX IF NOT EXISTS idx_access_logs_window ON public.access_logs(screen_id, window_start);
CREATE INDEX IF NOT EXISTS idx_access_logs_ip_hash ON public.access_logs(ip_hash);

-- Trigger para updated_at en rate_limits
CREATE TRIGGER handle_rate_limits_updated_at
    BEFORE UPDATE ON public.rate_limits
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- PolÃ­ticas RLS para rate_limits (solo admins pueden gestionar)
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admins_can_manage_rate_limits" ON public.rate_limits;
CREATE POLICY "admins_can_manage_rate_limits" ON public.rate_limits FOR ALL
  TO authenticated
  USING (public.is_admin());

-- PolÃ­ticas RLS para access_logs (solo admins pueden gestionar)
ALTER TABLE public.access_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admins_can_manage_access_logs" ON public.access_logs;
CREATE POLICY "admins_can_manage_access_logs" ON public.access_logs FOR ALL
  TO authenticated
  USING (public.is_admin());

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON public.rate_limits TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.access_logs TO authenticated;

-- MIGRACIÓN: 20251009150002_fix_profiles_check_constraint.sql

-- Fix CHECK constraint in profiles table to include 'manager' role

ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('admin', 'manager', 'responsable', 'operario'));

-- MIGRACIÓN: 20251009160000_add_rate_limiting_functions.sql

-- Add rate limiting functions and update existing functions
-- Migration: 20251009160000_add_rate_limiting_functions

-- =====================================================================
-- FUNCIÃ“N: get_tasks_by_token (obtener tareas por token con validaciÃ³n y rate limiting)
-- =====================================================================
CREATE OR REPLACE FUNCTION public.get_tasks_by_token(p_token TEXT)
RETURNS TABLE(
  id UUID,
  data JSONB,
  state TEXT,
  start_date DATE,
  end_date DATE,
  profile JSONB,
  plan_date DATE,
  task_ids UUID[]
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_token_hash TEXT;
  v_current_count INTEGER;
  v_window_start TIMESTAMP WITH TIME ZONE;
  v_notification RECORD;
BEGIN
  -- Generar hash del token para rate limiting
  v_token_hash := encode(digest(p_token, 'sha256'), 'hex');

  -- Calcular ventana de 1 minuto
  v_window_start := date_trunc('minute', NOW());

  -- Verificar rate limiting
  SELECT COALESCE(SUM(request_count), 0) INTO v_current_count
  FROM public.rate_limits
  WHERE token_hash = v_token_hash
    AND window_start >= v_window_start - INTERVAL '1 minute';

  -- Si excede 10 requests por minuto, rechazar
  IF v_current_count >= 10 THEN
    RAISE EXCEPTION 'Rate limit exceeded. Maximum 10 requests per minute allowed.';
  END IF;

  -- Registrar el acceso en rate_limits
  INSERT INTO public.rate_limits (token_hash, request_count, window_start)
  VALUES (v_token_hash, 1, v_window_start)
  ON CONFLICT (token_hash, window_start)
  DO UPDATE SET
    request_count = public.rate_limits.request_count + 1,
    updated_at = NOW();

  -- Buscar la notificaciÃ³n con validaciÃ³n de expiraciÃ³n
  SELECT * INTO v_notification
  FROM public.task_notifications
  WHERE access_token = p_token
    AND (expires_at IS NULL OR expires_at > NOW());

  -- Si no existe o expirÃ³, retornar vacÃ­o
  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- Marcar como visto si no lo estaba
  IF v_notification.viewed_at IS NULL THEN
    UPDATE public.task_notifications
    SET viewed_at = NOW()
    WHERE id = v_notification.id;
  END IF;

  -- Retornar los datos
  RETURN QUERY
  SELECT
    tn.id,
    tn.data,
    tn.state,
    tn.start_date,
    tn.end_date,
    jsonb_build_object(
      'full_name', p.full_name,
      'phone', p.phone
    ) as profile,
    tn.plan_date,
    tn.task_ids
  FROM public.task_notifications tn
  LEFT JOIN public.profiles p ON tn.profile_id = p.id
  WHERE tn.id = v_notification.id;

END;
$$;

-- =====================================================================
-- FUNCIÃ“N: log_screen_access (registrar acceso a screen_data)
-- =====================================================================
CREATE OR REPLACE FUNCTION public.log_screen_access(p_screen_id UUID, p_access_type TEXT DEFAULT 'anonymous', p_ip_hash TEXT DEFAULT NULL, p_user_agent TEXT DEFAULT NULL)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_window_start TIMESTAMP WITH TIME ZONE;
  v_current_count INTEGER;
BEGIN
  -- Calcular ventana de 1 hora
  v_window_start := date_trunc('hour', NOW());

  -- Contar accesos en la Ãºltima hora
  SELECT COALESCE(SUM(request_count), 0) INTO v_current_count
  FROM public.access_logs
  WHERE screen_id = p_screen_id
    AND window_start >= v_window_start - INTERVAL '1 hour';

  -- Limitar a 100 accesos por hora por pantalla para anÃ³nimo
  IF p_access_type = 'anonymous' AND v_current_count >= 100 THEN
    RAISE EXCEPTION 'Access limit exceeded. Maximum 100 anonymous requests per hour allowed for this screen.';
  END IF;

  -- Registrar el acceso
  INSERT INTO public.access_logs (screen_id, access_type, ip_hash, user_agent, request_count, window_start)
  VALUES (p_screen_id, p_access_type, p_ip_hash, p_user_agent, 1, v_window_start);

  RETURN TRUE;
END;
$$;

-- =====================================================================
-- FUNCIÃ“N: check_screen_access (verificar acceso a pantalla con rate limiting)
-- =====================================================================
CREATE OR REPLACE FUNCTION public.check_screen_access(p_screen_id UUID, p_access_type TEXT DEFAULT 'anonymous')
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_window_start TIMESTAMP WITH TIME ZONE;
  v_current_count INTEGER;
BEGIN
  -- Para accesos autenticados, permitir siempre
  IF p_access_type = 'authenticated' THEN
    RETURN TRUE;
  END IF;

  -- Calcular ventana de 1 hora
  v_window_start := date_trunc('hour', NOW());

  -- Contar accesos anÃ³nimos en la Ãºltima hora para esta pantalla
  SELECT COALESCE(SUM(request_count), 0) INTO v_current_count
  FROM public.access_logs
  WHERE screen_id = p_screen_id
    AND access_type = 'anonymous'
    AND window_start >= v_window_start - INTERVAL '1 hour';

  -- Limitar a 100 accesos por hora por pantalla para anÃ³nimo
  IF v_current_count >= 100 THEN
    RETURN FALSE;
  END IF;

  -- Registrar el acceso
  INSERT INTO public.access_logs (screen_id, access_type, request_count, window_start)
  VALUES (p_screen_id, p_access_type, 1, v_window_start);

  RETURN TRUE;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_tasks_by_token(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.log_screen_access(UUID, TEXT, TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_screen_access(UUID, TEXT) TO anon, authenticated;

-- MIGRACIÓN: 20251009170000_update_screen_data_policy.sql

-- Update screen_data SELECT policy to include rate limiting for anonymous access
-- Migration: 20251009170000_update_screen_data_policy

-- =====================================================================
-- ACTUALIZAR POLÃTICA PARA screen_data
-- =====================================================================

-- Eliminar la polÃ­tica anterior


-- Crear nueva polÃ­tica con rate limiting para acceso anÃ³nimo
DROP POLICY IF EXISTS "rate_limited_screen_data_access" ON public.screen_data;
CREATE POLICY "rate_limited_screen_data_access" ON public.screen_data FOR SELECT
  TO anon, authenticated
  USING (
    -- Pantalla debe estar activa
    EXISTS (
      SELECT 1 FROM public.screens
      WHERE screens.id = screen_data.screen_id
      AND screens.is_active = true
    )
    AND
    -- Verificar rate limiting y registrar acceso
    public.check_screen_access(
      screen_data.screen_id,
      CASE WHEN auth.uid() IS NOT NULL THEN 'authenticated' ELSE 'anonymous' END
    )
  );

-- Mantener las otras polÃ­ticas para admins
-- (Ya existen de migraciones anteriores)

-- MIGRACIÓN: 20251009180000_add_user_management_functions.sql

-- =====================================================================
-- MIGRACIÃ“N: FUNCIONES DE GESTIÃ“N DE USUARIOS CON VALIDACIÃ“N DE PERMISOS
-- =====================================================================
-- Fecha: 2025-10-09
-- Objetivo: Crear funciones RPC para gestiÃ³n de usuarios con validaciÃ³n de permisos
-- =====================================================================

BEGIN;

-- FunciÃ³n para crear o actualizar usuarios
CREATE OR REPLACE FUNCTION public.upsert_user(
  p_user_id UUID DEFAULT NULL,
  p_auth_user_id UUID DEFAULT NULL,
  p_full_name TEXT,
  p_email TEXT,
  p_phone TEXT DEFAULT NULL,
  p_role TEXT DEFAULT 'operario',
  p_status TEXT DEFAULT 'activo',
  p_avatar_url TEXT DEFAULT NULL
)
RETURNS TABLE (
  result_user_id UUID,
  result_action TEXT
) AS $$
DECLARE
  v_user_id UUID;
  v_action TEXT;
  v_user_role TEXT;
  v_current_user_role TEXT;
  v_target_role TEXT;
BEGIN
  -- Obtener el rol del usuario actual
  SELECT role INTO v_current_user_role
  FROM public.profiles
  WHERE auth_user_id = auth.uid();

  -- Determinar si es creaciÃ³n o ediciÃ³n
  IF p_user_id IS NULL THEN
    v_action := 'create';
    v_target_role := p_role;
  ELSE
    v_action := 'edit';
    -- Obtener el rol actual del usuario a editar
    SELECT role INTO v_target_role
    FROM public.profiles
    WHERE id = p_user_id;
    v_target_role := COALESCE(v_target_role, p_role);
  END IF;

  -- Validar permisos para gestionar usuarios
  IF NOT public.has_permission(v_current_user_role, 'users', v_action) THEN
    RAISE EXCEPTION 'No tienes permisos para % usuarios', v_action;
  END IF;

  -- Si se estÃ¡ cambiando el rol, validar jerarquÃ­a
  IF p_user_id IS NOT NULL AND v_target_role != p_role THEN
    IF NOT public.can_manage_role(v_current_user_role, p_role) THEN
      RAISE EXCEPTION 'No puedes asignar el rol %', p_role;
    END IF;
  END IF;

  -- Validar rol vÃ¡lido
  IF p_role NOT IN ('admin', 'manager', 'responsable', 'operario') THEN
    RAISE EXCEPTION 'Rol invÃ¡lido: %', p_role;
  END IF;

  -- Validar status vÃ¡lido
  IF p_status NOT IN ('activo', 'inactivo', 'vacaciones', 'baja') THEN
    RAISE EXCEPTION 'Status invÃ¡lido: %', p_status;
  END IF;

  -- Upsert del usuario
  INSERT INTO public.profiles (
    id, auth_user_id, full_name, email, phone, role, status, avatar_url
  ) VALUES (
    COALESCE(p_user_id, gen_random_uuid()), p_auth_user_id, p_full_name, p_email,
    p_phone, p_role, p_status, p_avatar_url
  )
  ON CONFLICT (id) DO UPDATE SET
    auth_user_id = EXCLUDED.auth_user_id,
    full_name = EXCLUDED.full_name,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    role = EXCLUDED.role,
    status = EXCLUDED.status,
    avatar_url = EXCLUDED.avatar_url,
    updated_at = NOW()
  RETURNING id INTO v_user_id;

  -- Log role changes for updates
  IF p_user_id IS NOT NULL AND v_target_role != p_role THEN
    INSERT INTO public.audit_logs (user_id, action, resource, action_performed, result, details)
    VALUES (
      (SELECT id FROM public.profiles WHERE auth_user_id = auth.uid()),
      'role_change',
      'users',
      'update_role',
      'granted',
      jsonb_build_object(
        'target_user_id', p_user_id,
        'old_role', v_target_role,
        'new_role', p_role,
        'performed_by', (SELECT full_name FROM public.profiles WHERE auth_user_id = auth.uid())
      )
    );
  END IF;

  -- Determinar acciÃ³n realizada
  IF p_user_id IS NULL THEN
    v_action := 'created';
  ELSE
    v_action := 'updated';
  END IF;

  RETURN QUERY SELECT v_user_id AS result_user_id, v_action AS result_action;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- FunciÃ³n para eliminar usuarios (desactivar)
CREATE OR REPLACE FUNCTION public.deactivate_user(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_user_role TEXT;
  v_target_role TEXT;
BEGIN
  -- Obtener el rol del usuario actual
  SELECT role INTO v_user_role
  FROM public.profiles
  WHERE auth_user_id = auth.uid();

  -- Obtener el rol del usuario a desactivar
  SELECT role INTO v_target_role
  FROM public.profiles
  WHERE id = p_user_id;

  -- Validar permisos
  IF NOT public.has_permission(v_user_role, 'users', 'delete') THEN
    RAISE EXCEPTION 'No tienes permisos para eliminar usuarios';
  END IF;

  -- Validar jerarquÃ­a (no se puede eliminar usuarios de rol superior o igual)
  IF NOT public.can_manage_role(v_user_role, v_target_role) THEN
    RAISE EXCEPTION 'No puedes eliminar usuarios con rol %', v_target_role;
  END IF;

  -- Desactivar usuario en lugar de eliminar
  UPDATE public.profiles
  SET status = 'inactivo', updated_at = NOW()
  WHERE id = p_user_id;

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Otorgar permisos
GRANT EXECUTE ON FUNCTION public.upsert_user TO authenticated;
GRANT EXECUTE ON FUNCTION public.deactivate_user TO authenticated;

-- Comentarios
COMMENT ON FUNCTION public.upsert_user IS 'FunciÃ³n para crear o actualizar usuarios con validaciÃ³n de permisos y jerarquÃ­a de roles';
COMMENT ON FUNCTION public.deactivate_user IS 'FunciÃ³n para desactivar usuarios con validaciÃ³n de permisos y jerarquÃ­a';

COMMIT;

-- =====================================================================
-- NOTAS DE IMPLEMENTACIÃ“N
-- =====================================================================
-- 1. upsert_user valida permisos usando has_permission() y can_manage_role()
-- 2. Se previene la ediciÃ³n de roles superiores o iguales
-- 3. deactivate_user desactiva en lugar de eliminar fÃ­sicamente
-- 4. Todas las validaciones se hacen antes de la operaciÃ³n
-- =====================================================================

-- MIGRACIÓN: 20251009190000_add_vehicle_management_functions.sql

-- =====================================================================
-- MIGRACIÃ“N: FUNCIONES DE GESTIÃ“N DE VEHÃCULOS CON VALIDACIÃ“N DE PERMISOS
-- =====================================================================
-- Fecha: 2025-10-09
-- Objetivo: Crear funciones RPC para gestiÃ³n de vehÃ­culos con validaciÃ³n de permisos
-- =====================================================================

BEGIN;

-- FunciÃ³n para crear o actualizar vehÃ­culos
CREATE OR REPLACE FUNCTION public.upsert_vehicle(
  p_vehicle_id UUID DEFAULT NULL,
  p_name TEXT,
  p_type TEXT,
  p_license_plate TEXT DEFAULT NULL,
  p_capacity INTEGER DEFAULT NULL,
  p_is_active BOOLEAN DEFAULT true
)
RETURNS TABLE (
  result_vehicle_id UUID,
  result_action TEXT
) AS $$
DECLARE
  v_vehicle_id UUID;
  v_action TEXT;
  v_user_role TEXT;
BEGIN
  -- Obtener el rol del usuario actual
  SELECT role INTO v_user_role
  FROM public.profiles
  WHERE auth_user_id = auth.uid();

  -- Determinar si es creaciÃ³n o ediciÃ³n
  IF p_vehicle_id IS NULL THEN
    v_action := 'create';
  ELSE
    v_action := 'edit';
  END IF;

  -- Validar permisos para gestionar vehÃ­culos
  IF NOT public.has_permission(v_user_role, 'vehicles', v_action) THEN
    RAISE EXCEPTION 'No tienes permisos para % vehÃ­culos', v_action;
  END IF;

  -- Validar parÃ¡metros requeridos
  IF p_name IS NULL OR p_type IS NULL THEN
    RAISE EXCEPTION 'name y type son requeridos';
  END IF;

  -- Validar tipo vÃ¡lido
  IF p_type NOT IN ('furgoneta', 'camion', 'automovil', 'moto', 'otro') THEN
    RAISE EXCEPTION 'Tipo de vehÃ­culo invÃ¡lido: %', p_type;
  END IF;

  -- Upsert del vehÃ­culo
  INSERT INTO public.vehicles (
    id, name, type, license_plate, capacity, is_active
  ) VALUES (
    COALESCE(p_vehicle_id, gen_random_uuid()), p_name, p_type,
    p_license_plate, p_capacity, p_is_active
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    type = EXCLUDED.type,
    license_plate = EXCLUDED.license_plate,
    capacity = EXCLUDED.capacity,
    is_active = EXCLUDED.is_active,
    updated_at = NOW()
  RETURNING id INTO v_vehicle_id;

  -- Determinar acciÃ³n realizada
  IF p_vehicle_id IS NULL THEN
    v_action := 'created';
  ELSE
    v_action := 'updated';
  END IF;

  RETURN QUERY SELECT v_vehicle_id AS result_vehicle_id, v_action AS result_action;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- FunciÃ³n para desactivar vehÃ­culos
CREATE OR REPLACE FUNCTION public.deactivate_vehicle(p_vehicle_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_user_role TEXT;
BEGIN
  -- Obtener el rol del usuario actual
  SELECT role INTO v_user_role
  FROM public.profiles
  WHERE auth_user_id = auth.uid();

  -- Validar permisos
  IF NOT public.has_permission(v_user_role, 'vehicles', 'delete') THEN
    RAISE EXCEPTION 'No tienes permisos para eliminar vehÃ­culos';
  END IF;

  -- Desactivar vehÃ­culo
  UPDATE public.vehicles
  SET is_active = false, updated_at = NOW()
  WHERE id = p_vehicle_id;

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Otorgar permisos
GRANT EXECUTE ON FUNCTION public.upsert_vehicle TO authenticated;
GRANT EXECUTE ON FUNCTION public.deactivate_vehicle TO authenticated;

-- Comentarios
COMMENT ON FUNCTION public.upsert_vehicle IS 'FunciÃ³n para crear o actualizar vehÃ­culos con validaciÃ³n de permisos';
COMMENT ON FUNCTION public.deactivate_vehicle IS 'FunciÃ³n para desactivar vehÃ­culos con validaciÃ³n de permisos';

COMMIT;

-- =====================================================================
-- NOTAS DE IMPLEMENTACIÃ“N
-- =====================================================================
-- 1. upsert_vehicle valida permisos usando has_permission()
-- 2. deactivate_vehicle desactiva en lugar de eliminar fÃ­sicamente
-- 3. Todas las validaciones se hacen antes de la operaciÃ³n
-- =====================================================================

-- MIGRACIÓN: 20251009200000_add_template_management_functions.sql

-- =====================================================================
-- MIGRACIÃ“N: FUNCIONES DE GESTIÃ“N DE PLANTILLAS CON VALIDACIÃ“N DE PERMISOS
-- =====================================================================
-- Fecha: 2025-10-09
-- Objetivo: Crear funciones RPC para gestiÃ³n de plantillas con validaciÃ³n de permisos
-- =====================================================================

BEGIN;

-- FunciÃ³n para crear o actualizar plantillas
CREATE OR REPLACE FUNCTION public.upsert_template(
  p_template_id UUID DEFAULT NULL,
  p_name TEXT,
  p_template_type TEXT,
  p_category TEXT DEFAULT NULL,
  p_fields JSONB DEFAULT '[]'::jsonb,
  p_is_active BOOLEAN DEFAULT true
)
RETURNS TABLE (
  result_template_id UUID,
  result_action TEXT
) AS $$
DECLARE
  v_template_id UUID;
  v_action TEXT;
  v_user_role TEXT;
BEGIN
  -- Obtener el rol del usuario actual
  SELECT role INTO v_user_role
  FROM public.profiles
  WHERE auth_user_id = auth.uid();

  -- Determinar si es creaciÃ³n o ediciÃ³n
  IF p_template_id IS NULL THEN
    v_action := 'create';
  ELSE
    v_action := 'edit';
  END IF;

  -- Validar permisos para gestionar plantillas
  IF NOT public.has_permission(v_user_role, 'templates', v_action) THEN
    RAISE EXCEPTION 'No tienes permisos para % plantillas', v_action;
  END IF;

  -- Validar parÃ¡metros requeridos
  IF p_name IS NULL OR p_template_type IS NULL THEN
    RAISE EXCEPTION 'name y template_type son requeridos';
  END IF;

  -- Validar template_type vÃ¡lido (basado en screen_type)
  IF p_template_type NOT IN ('data', 'display') THEN
    RAISE EXCEPTION 'Tipo de plantilla invÃ¡lido: %', p_template_type;
  END IF;

  -- Upsert de la plantilla
  INSERT INTO public.templates (
    id, name, template_type, category, fields, is_active
  ) VALUES (
    COALESCE(p_template_id, gen_random_uuid()), p_name, p_template_type,
    p_category, p_fields, p_is_active
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    template_type = EXCLUDED.template_type,
    category = EXCLUDED.category,
    fields = EXCLUDED.fields,
    is_active = EXCLUDED.is_active,
    updated_at = NOW()
  RETURNING id INTO v_template_id;

  -- Determinar acciÃ³n realizada
  IF p_template_id IS NULL THEN
    v_action := 'created';
  ELSE
    v_action := 'updated';
  END IF;

  RETURN QUERY SELECT v_template_id AS result_template_id, v_action AS result_action;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- FunciÃ³n para desactivar plantillas
CREATE OR REPLACE FUNCTION public.deactivate_template(p_template_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_user_role TEXT;
BEGIN
  -- Obtener el rol del usuario actual
  SELECT role INTO v_user_role
  FROM public.profiles
  WHERE auth_user_id = auth.uid();

  -- Validar permisos
  IF NOT public.has_permission(v_user_role, 'templates', 'delete') THEN
    RAISE EXCEPTION 'No tienes permisos para eliminar plantillas';
  END IF;

  -- Desactivar plantilla
  UPDATE public.templates
  SET is_active = false, updated_at = NOW()
  WHERE id = p_template_id;

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Otorgar permisos
GRANT EXECUTE ON FUNCTION public.upsert_template TO authenticated;
GRANT EXECUTE ON FUNCTION public.deactivate_template TO authenticated;

-- Comentarios
COMMENT ON FUNCTION public.upsert_template IS 'FunciÃ³n para crear o actualizar plantillas con validaciÃ³n de permisos';
COMMENT ON FUNCTION public.deactivate_template IS 'FunciÃ³n para desactivar plantillas con validaciÃ³n de permisos';

COMMIT;

-- =====================================================================
-- NOTAS DE IMPLEMENTACIÃ“N
-- =====================================================================
-- 1. upsert_template valida permisos usando has_permission()
-- 2. deactivate_template desactiva en lugar de eliminar fÃ­sicamente
-- 3. Todas las validaciones se hacen antes de la operaciÃ³n
-- =====================================================================

-- MIGRACIÓN: 20251009210000_add_communication_management_functions.sql

-- =====================================================================
-- MIGRACIÃ“N: FUNCIONES DE GESTIÃ“N DE COMUNICACIONES CON VALIDACIÃ“N DE PERMISOS
-- =====================================================================
-- Fecha: 2025-10-09
-- Objetivo: Crear funciones RPC para gestiÃ³n de comunicaciones con validaciÃ³n de permisos
-- =====================================================================

BEGIN;

-- FunciÃ³n para enviar mensajes directos
CREATE OR REPLACE FUNCTION public.send_direct_message(
  p_to_profile_id UUID,
  p_message TEXT,
  p_message_type TEXT DEFAULT 'text'
)
RETURNS TABLE (
  result_message_id UUID,
  result_action TEXT
) AS $$
DECLARE
  v_message_id UUID;
  v_user_role TEXT;
  v_from_profile_id UUID;
BEGIN
  -- Obtener el rol y perfil del usuario actual
  SELECT role, id INTO v_user_role, v_from_profile_id
  FROM public.profiles
  WHERE auth_user_id = auth.uid();

  -- Validar permisos para enviar comunicaciones
  IF NOT public.has_permission(v_user_role, 'communications', 'create') THEN
    RAISE EXCEPTION 'No tienes permisos para enviar mensajes';
  END IF;

  -- Validar parÃ¡metros
  IF p_to_profile_id IS NULL OR p_message IS NULL THEN
    RAISE EXCEPTION 'to_profile_id y message son requeridos';
  END IF;

  -- Validar tipo de mensaje
  IF p_message_type NOT IN ('text', 'system', 'notification') THEN
    RAISE EXCEPTION 'Tipo de mensaje invÃ¡lido: %', p_message_type;
  END IF;

  -- No permitir enviar mensajes a uno mismo
  IF p_to_profile_id = v_from_profile_id THEN
    RAISE EXCEPTION 'No puedes enviarte mensajes a ti mismo';
  END IF;

  -- Insertar el mensaje
  INSERT INTO public.user_messages (
    from_profile_id, to_profile_id, message, message_type
  ) VALUES (
    v_from_profile_id, p_to_profile_id, p_message, p_message_type
  ) RETURNING id INTO v_message_id;

  RETURN QUERY SELECT v_message_id AS result_message_id, 'sent' AS result_action;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- FunciÃ³n para marcar mensajes como leÃ­dos
CREATE OR REPLACE FUNCTION public.mark_messages_as_read(p_message_ids UUID[])
RETURNS INTEGER AS $$
DECLARE
  v_user_role TEXT;
  v_profile_id UUID;
  v_updated_count INTEGER := 0;
BEGIN
  -- Obtener el rol y perfil del usuario actual
  SELECT role, id INTO v_user_role, v_profile_id
  FROM public.profiles
  WHERE auth_user_id = auth.uid();

  -- Validar permisos para gestionar comunicaciones
  IF NOT public.has_permission(v_user_role, 'communications', 'edit') THEN
    RAISE EXCEPTION 'No tienes permisos para gestionar mensajes';
  END IF;

  -- Marcar mensajes como leÃ­dos (solo los dirigidos al usuario actual)
  UPDATE public.user_messages
  SET is_read = true, read_at = NOW()
  WHERE id = ANY(p_message_ids)
    AND to_profile_id = v_profile_id
    AND is_read = false;

  GET DIAGNOSTICS v_updated_count = ROW_COUNT;

  RETURN v_updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- FunciÃ³n para registrar comunicaciones enviadas (WhatsApp, email, etc.)
CREATE OR REPLACE FUNCTION public.log_communication(
  p_action TEXT,
  p_target TEXT,
  p_content TEXT,
  p_status TEXT DEFAULT 'pending',
  p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
  v_log_id UUID;
  v_user_role TEXT;
  v_profile_id UUID;
BEGIN
  -- Obtener el rol y perfil del usuario actual
  SELECT role, id INTO v_user_role, v_profile_id
  FROM public.profiles
  WHERE auth_user_id = auth.uid();

  -- Validar permisos para registrar comunicaciones
  IF NOT public.has_permission(v_user_role, 'communications', 'create') THEN
    RAISE EXCEPTION 'No tienes permisos para registrar comunicaciones';
  END IF;

  -- Validar parÃ¡metros
  IF p_action IS NULL OR p_target IS NULL THEN
    RAISE EXCEPTION 'action y target son requeridos';
  END IF;

  -- Insertar el registro de comunicaciÃ³n
  INSERT INTO public.communication_logs (
    profile_id, action, target, content, status, metadata
  ) VALUES (
    v_profile_id, p_action, p_target, p_content, p_status, p_metadata
  ) RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Otorgar permisos
GRANT EXECUTE ON FUNCTION public.send_direct_message TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_messages_as_read TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_communication TO authenticated;

-- Comentarios
COMMENT ON FUNCTION public.send_direct_message IS 'FunciÃ³n para enviar mensajes directos con validaciÃ³n de permisos';
COMMENT ON FUNCTION public.mark_messages_as_read IS 'FunciÃ³n para marcar mensajes como leÃ­dos con validaciÃ³n de permisos';
COMMENT ON FUNCTION public.log_communication IS 'FunciÃ³n para registrar comunicaciones enviadas con validaciÃ³n de permisos';

COMMIT;

-- =====================================================================
-- NOTAS DE IMPLEMENTACIÃ“N
-- =====================================================================
-- 1. send_direct_message valida permisos usando has_permission()
-- 2. mark_messages_as_read permite solo marcar mensajes propios como leÃ­dos
-- 3. log_communication registra comunicaciones para auditorÃ­a
-- 4. Todas las validaciones se hacen antes de la operaciÃ³n
-- =====================================================================

-- MIGRACIÓN: 20251010100000_fix_has_permission_alias.sql

-- =====================================================================
-- MIGRACIÃ“N: RPC public.has_permission (versiÃ³n consistente con esquema moderno)
-- =====================================================================
-- Fecha: 2025-10-10
-- Objetivo: restaurar una implementaciÃ³n estable del RPC public.has_permission
--           alineada con la estructura actual de public.role_permissions
--           (columnas role/resource/action/granted), garantizando respuestas
--           correctas para el frontend PermissionGuard.
-- =====================================================================

BEGIN;

-- 1. Idempotencia: eliminar cualquier definiciÃ³n previa del RPC
DROP FUNCTION IF EXISTS public.has_permission(text, text, text);

-- 2. Crear la funciÃ³n basada en role_permissions (resource/action/granted)
CREATE OR REPLACE FUNCTION public.has_permission(
  user_role  TEXT,
  page       TEXT,
  permission TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_role        TEXT := lower(user_role);
  v_resource    TEXT := lower(page);
  v_action      TEXT := lower(permission);
  v_granted     BOOLEAN;
  v_user_id     UUID;
BEGIN
  -- Consultar permisos en la tabla moderna (role/resource/action/granted)
  SELECT rp.granted
  INTO v_granted
  FROM public.role_permissions rp
  WHERE lower(rp.role)     = v_role
    AND lower(rp.resource) = v_resource
    AND lower(rp.action)   = v_action
  LIMIT 1;

  v_granted := COALESCE(v_granted, false);

  -- Registrar auditorÃ­a cuando existan datos suficientes
  SELECT p.id
  INTO v_user_id
  FROM public.profiles p
  WHERE p.auth_user_id = auth.uid();

  IF to_regclass('public.audit_logs') IS NOT NULL AND v_user_id IS NOT NULL THEN
    INSERT INTO public.audit_logs (
      user_id,
      action,
      resource,
      action_performed,
      result,
      details
    )
    VALUES (
      v_user_id,
      'permission_check',
      page,
      permission,
      CASE WHEN v_granted THEN 'granted' ELSE 'denied' END,
      jsonb_build_object(
        'user_role', user_role,
        'normalized_role', v_role,
        'normalized_resource', v_resource,
        'normalized_action', v_action
      )
    );
  END IF;

  RETURN v_granted;
END;
$$;

-- 3. DocumentaciÃ³n de la funciÃ³n
COMMENT ON FUNCTION public.has_permission(text, text, text) IS
  'RPC que verifica permisos consultando role_permissions (role/resource/action/granted) y registra auditorÃ­a cuando estÃ¡ disponible.';

-- 4. Permisos de ejecuciÃ³n
GRANT EXECUTE ON FUNCTION public.has_permission(text, text, text) TO authenticated;

-- 5. Nota: tras aplicar la migraciÃ³n, ejecutar manualmente si es necesario:
--    NOTIFY pgrst, ''reload schema'';

COMMIT;

-- MIGRACIÓN: 20251010110000_fix_has_permission_legacy_permissions_schema.sql

-- =====================================================================
-- MIGRACIÃ“N: Ajustar public.has_permission al esquema actual de role_permissions
-- =====================================================================
-- Fecha: 2025-10-10
-- Objetivo: Restaurar el RPC public.has_permission para que funcione con
--           la estructura vigente de public.role_permissions (page/can_view/can_edit/can_delete)
--           y mantener compatibilidad con el frontend existente.
-- =====================================================================

BEGIN;

-- 1. Reemplazar la funciÃ³n has_permission para evitar referencias a columnas inexistentes
DROP FUNCTION IF EXISTS public.has_permission(text, text, text);

CREATE OR REPLACE FUNCTION public.has_permission(
  user_role  TEXT,
  resource   TEXT,
  action     TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_role             TEXT := lower(user_role);
  v_resource         TEXT := lower(resource);
  v_action           TEXT := lower(action);
  v_has_new_schema   BOOLEAN := FALSE;
  v_granted          BOOLEAN := FALSE;
  v_user_id          UUID;
  v_matched_page     TEXT := NULL;
  v_matched_action   TEXT := NULL;
  v_can_view         BOOLEAN := NULL;
  v_can_edit         BOOLEAN := NULL;
  v_can_delete       BOOLEAN := NULL;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'role_permissions'
      AND column_name  = 'granted'
  )
  INTO v_has_new_schema;

  IF v_has_new_schema THEN
    SELECT rp.granted,
           rp.resource,
           rp.action
    INTO v_granted,
         v_matched_page,
         v_matched_action
    FROM public.role_permissions rp
    WHERE lower(rp.role) = v_role
      AND (
        lower(rp.resource) = v_resource
        OR lower(rp.resource) = concat('/admin/', v_resource)
        OR (v_resource = 'dashboard' AND lower(rp.resource) IN ('dashboard', '/admin'))
        OR (v_resource = 'admin' AND lower(rp.resource) = '/admin')
      )
      AND lower(rp.action) IN (
        v_action,
        CASE WHEN v_action = 'update' THEN 'edit' ELSE NULL END,
        CASE WHEN v_action = 'edit' THEN 'update' ELSE NULL END,
        CASE WHEN v_action = 'create' THEN 'edit' ELSE NULL END
      )
    ORDER BY
      CASE
        WHEN lower(rp.resource) = v_resource THEN 0
        WHEN lower(rp.resource) = concat('/admin/', v_resource) THEN 1
        ELSE 2
      END,
      CASE
        WHEN lower(rp.action) = v_action THEN 0
        ELSE 1
      END
    LIMIT 1;

    v_granted := COALESCE(v_granted, FALSE);
    v_matched_page := COALESCE(v_matched_page, resource);
  ELSE
    SELECT rp.can_view,
           rp.can_edit,
           rp.can_delete,
           rp.page
    INTO v_can_view,
         v_can_edit,
         v_can_delete,
         v_matched_page
    FROM public.role_permissions rp
    WHERE lower(rp.role) = v_role
      AND (
        lower(rp.page) = v_resource
        OR lower(rp.page) = concat('/admin/', v_resource)
        OR (v_resource = 'dashboard' AND lower(rp.page) IN ('dashboard', '/admin'))
        OR (v_resource = 'admin' AND lower(rp.page) = '/admin')
      )
    ORDER BY
      CASE
        WHEN lower(rp.page) = v_resource THEN 0
        WHEN lower(rp.page) = concat('/admin/', v_resource) THEN 1
        ELSE 2
      END
    LIMIT 1;

    IF v_action = 'view' THEN
      v_granted := COALESCE(v_can_view, FALSE);
    ELSIF v_action IN ('create', 'edit', 'update') THEN
      v_granted := COALESCE(v_can_edit, FALSE);
    ELSIF v_action = 'delete' THEN
      v_granted := COALESCE(v_can_delete, FALSE);
    ELSE
      v_granted := FALSE;
    END IF;

    v_matched_action := CASE
      WHEN v_action = 'view' THEN 'view'
      WHEN v_action IN ('create', 'edit', 'update') THEN 'edit'
      WHEN v_action = 'delete' THEN 'delete'
      ELSE v_action
    END;
  END IF;

  v_matched_action := COALESCE(lower(v_matched_action), v_action);

  SELECT p.id
  INTO v_user_id
  FROM public.profiles p
  WHERE p.auth_user_id = auth.uid();

  IF to_regclass('public.audit_logs') IS NOT NULL AND v_user_id IS NOT NULL THEN
    INSERT INTO public.audit_logs (
      user_id,
      action,
      resource,
      action_performed,
      result,
      details
    )
    VALUES (
      v_user_id,
      'permission_check',
      COALESCE(v_matched_page, resource),
      action,
      CASE WHEN v_granted THEN 'granted' ELSE 'denied' END,
      jsonb_build_object(
        'user_role', user_role,
        'normalized_role', v_role,
        'requested_resource', resource,
        'normalized_resource', v_resource,
        'matched_page', v_matched_page,
        'requested_action', action,
        'normalized_action', v_action,
        'matched_action', v_matched_action,
        'schema_variant', CASE WHEN v_has_new_schema THEN 'resource_action_granted' ELSE 'legacy_page_flags' END
      )
    );
  END IF;

  RETURN COALESCE(v_granted, FALSE);
END;
$$;

-- 2. DocumentaciÃ³n y permisos
COMMENT ON FUNCTION public.has_permission(text, text, text) IS
  'RPC que verifica permisos usando las columnas can_view/can_edit/can_delete de role_permissions (formato legacy) y registra auditorÃ­a cuando estÃ¡ disponible.';

GRANT EXECUTE ON FUNCTION public.has_permission(text, text, text) TO authenticated;

COMMIT;

-- MIGRACIÓN: 20251011071500_refresh_detailed_tasks_view.sql

-- =====================================================================
-- HOTFIX: Actualizar vista detailed_tasks con columnas completas
-- =====================================================================
-- Fecha: 2025-10-11
-- Motivo: La vista existente en producciÃ³n no incluÃ­a los campos
--         esperados por el frontend (start_date, is_urgent, etc.),
--         provocando errores 400 en PostgREST.
-- =====================================================================

BEGIN;

DROP VIEW IF EXISTS public.user_workload;
DROP VIEW IF EXISTS public.task_summary;

DROP VIEW IF EXISTS public.detailed_tasks;

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
    (
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', p.id,
          'full_name', p.full_name,
          'email', p.email,
          'phone', p.phone,
          'status', p.status,
          'avatar_url', p.avatar_url,
          'role', p.role
        ) ORDER BY p.full_name
      )
      FROM public.task_profiles tp
      JOIN public.profiles p ON tp.profile_id = p.id
      WHERE tp.task_id = sd.id
    ),
    '[]'::jsonb
  ) AS assigned_profiles,

  COALESCE(
    (
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', v.id,
          'name', v.name,
          'type', v.type,
          'license_plate', v.license_plate,
          'capacity', v.capacity
        ) ORDER BY v.name
      )
      FROM public.task_vehicles tv
      JOIN public.vehicles v ON tv.vehicle_id = v.id
      WHERE tv.task_id = sd.id
    ),
    '[]'::jsonb
  ) AS assigned_vehicles,

  (
    SELECT COUNT(*)
    FROM public.task_profiles tp
    WHERE tp.task_id = sd.id
  ) AS assigned_profiles_count,

  (
    SELECT COUNT(*)
    FROM public.task_vehicles tv
    WHERE tv.task_id = sd.id
  ) AS assigned_vehicles_count,

  CASE
    WHEN sd.state = 'terminado' THEN true
    ELSE false
  END AS is_completed,

  CASE
    WHEN sd.state = 'urgente' THEN true
    ELSE false
  END AS is_urgent,

  CASE
    WHEN sd.start_date IS NOT NULL
      AND sd.start_date <= CURRENT_DATE
      AND (sd.end_date IS NULL OR sd.end_date >= CURRENT_DATE)
      THEN true
    ELSE false
  END AS is_current,

  CASE
    WHEN sd.end_date IS NOT NULL
      AND sd.end_date < CURRENT_DATE
      AND sd.state <> 'terminado'
      THEN true
    ELSE false
  END AS is_overdue,

  CASE
    WHEN sd.start_date IS NOT NULL
      AND sd.start_date > CURRENT_DATE
      THEN true
    ELSE false
  END AS is_future,

  CASE
    WHEN sd.start_date IS NULL THEN NULL
    ELSE (sd.start_date - CURRENT_DATE)
  END AS days_from_start,

  CASE
    WHEN sd.state = 'urgente' THEN 1
    WHEN sd.state = 'incidente' THEN 2
    WHEN sd.state = 'arreglo' THEN 3
    WHEN sd.state <> 'terminado'
      AND sd.end_date IS NOT NULL
      AND sd.end_date < CURRENT_DATE THEN 4
    WHEN sd.state = 'en fabricacion' THEN 5
    WHEN sd.state = 'a la espera' THEN 6
    ELSE 7
  END AS priority_order

FROM public.screen_data sd
LEFT JOIN public.screens s ON sd.screen_id = s.id
LEFT JOIN public.profiles rp ON sd.responsible_profile_id = rp.id
LEFT JOIN public.profiles ap ON sd.assigned_to = ap.id;

GRANT SELECT ON public.detailed_tasks TO authenticated, anon;

CREATE OR REPLACE VIEW public.user_workload AS
SELECT
  p.id AS profile_id,
  p.full_name,
  p.email,
  p.role,
  p.status,
  COUNT(DISTINCT tp.task_id) AS total_tasks,
  COUNT(DISTINCT CASE WHEN sd.state <> 'terminado' THEN tp.task_id END) AS active_tasks,
  COUNT(DISTINCT CASE WHEN sd.state = 'urgente' THEN tp.task_id END) AS urgent_tasks,
  COUNT(DISTINCT CASE WHEN sd.end_date IS NOT NULL AND sd.end_date < CURRENT_DATE AND sd.state <> 'terminado' THEN tp.task_id END) AS overdue_tasks,
  COUNT(DISTINCT CASE WHEN sd.start_date = CURRENT_DATE THEN tp.task_id END) AS today_tasks,
  COUNT(DISTINCT CASE WHEN sd.start_date IS NOT NULL AND sd.start_date <= CURRENT_DATE AND (sd.end_date IS NULL OR sd.end_date >= CURRENT_DATE) THEN tp.task_id END) AS current_tasks,
  STRING_AGG(DISTINCT s.screen_group, ', ' ORDER BY s.screen_group) AS working_groups
FROM public.profiles p
LEFT JOIN public.task_profiles tp ON p.id = tp.profile_id
LEFT JOIN public.screen_data sd ON tp.task_id = sd.id
LEFT JOIN public.screens s ON sd.screen_id = s.id
WHERE p.status = 'activo'
GROUP BY p.id, p.full_name, p.email, p.role, p.status;

CREATE OR REPLACE VIEW public.task_summary AS
SELECT
  s.screen_group,
  sd.state,
  sd.status,
  COUNT(*) AS task_count,
  COUNT(CASE WHEN sd.start_date = CURRENT_DATE THEN 1 END) AS today_count,
  COUNT(CASE WHEN sd.end_date IS NOT NULL AND sd.end_date < CURRENT_DATE AND sd.state <> 'terminado' THEN 1 END) AS overdue_count,
  COUNT(CASE WHEN sd.state = 'urgente' THEN 1 END) AS urgent_count,
  COUNT(CASE WHEN sd.state = 'terminado' THEN 1 END) AS completed_count,
  ROUND(
    (COUNT(CASE WHEN sd.state = 'terminado' THEN 1 END)::numeric / NULLIF(COUNT(*), 0)) * 100,
    2
  ) AS completion_percentage
FROM public.screen_data sd
JOIN public.screens s ON sd.screen_id = s.id
WHERE s.is_active = true
GROUP BY s.screen_group, sd.state, sd.status
ORDER BY s.screen_group, sd.state;

COMMIT;

-- MIGRACIÓN: 20251011083000_expand_profile_management_policies.sql

-- =====================================================================
-- Actualizar polÃ­ticas de profiles para permitir gestiÃ³n a responsables
-- =====================================================================
-- Fecha: 2025-10-11
-- Motivo: Permitir que usuarios con rol 'responsable' gestionen perfiles
--         (ademÃ¡s de admin/manager) y evitar errores 400 al crear/editar.
-- =====================================================================

BEGIN;

-- FunciÃ³n helper para roles con permisos de gestiÃ³n de perfiles
CREATE OR REPLACE FUNCTION public.has_profile_management_role()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE auth_user_id = auth.uid()
      AND role IN ('admin', 'manager', 'responsable')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Mantener compatibilidad con funciones existentes que consultan este helper
CREATE OR REPLACE FUNCTION public.is_admin_or_manager()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE auth_user_id = auth.uid()
      AND role IN ('admin', 'manager', 'responsable')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Reemplazar polÃ­ticas de gestiÃ³n

DROP POLICY IF EXISTS "management_can_view_all_profiles" ON public.profiles;
CREATE POLICY "management_can_view_all_profiles" ON public.profiles
  FOR SELECT TO authenticated
  USING (public.has_profile_management_role());


DROP POLICY IF EXISTS "management_can_manage_profiles" ON public.profiles;
CREATE POLICY "management_can_manage_profiles" ON public.profiles
  FOR ALL TO authenticated
  USING (
    public.has_profile_management_role()
    AND (
      EXISTS (
        SELECT 1 FROM public.profiles actor
        WHERE actor.auth_user_id = auth.uid()
          AND actor.role = 'admin'
      )
      OR public.profiles.role != 'admin'
    )
  )
  WITH CHECK (
    public.has_profile_management_role()
    AND (
      EXISTS (
        SELECT 1 FROM public.profiles actor
        WHERE actor.auth_user_id = auth.uid()
          AND actor.role = 'admin'
      )
      OR public.profiles.role != 'admin'
    )
  );

COMMIT;


-- MIGRACIÓN: 20251011084500_create_admin_upsert_profile.sql

-- =====================================================================
-- RPC: admin_upsert_profile (gestionar perfiles con SECURITY DEFINER)
-- =====================================================================
-- Fecha: 2025-10-11
-- Objetivo: Permitir a administradores, managers y responsables
--           crear/editar perfiles evitando errores de RLS desde el frontend.
-- =====================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.admin_upsert_profile(
  p_full_name TEXT,
  p_profile_id UUID DEFAULT NULL,
  p_email TEXT DEFAULT NULL,
  p_phone TEXT DEFAULT NULL,
  p_whatsapp TEXT DEFAULT NULL,
  p_status TEXT DEFAULT 'activo',
  p_role TEXT DEFAULT 'operario'
)
RETURNS public.profiles AS $$
DECLARE
  v_actor public.profiles;
  v_target public.profiles;
  v_result public.profiles;
BEGIN
  SELECT *
  INTO v_actor
  FROM public.profiles
  WHERE auth_user_id = auth.uid();

  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'No existe un perfil asociado al usuario autenticado';
  END IF;

  IF v_actor.role NOT IN ('admin', 'manager', 'responsable') THEN
    RAISE EXCEPTION 'No tienes permisos para gestionar perfiles';
  END IF;

  IF p_profile_id IS NOT NULL THEN
    SELECT * INTO v_target FROM public.profiles WHERE id = p_profile_id;
    IF v_target IS NULL THEN
      RAISE EXCEPTION 'Perfil no encontrado';
    END IF;
    IF v_target.role = 'admin' AND v_actor.role <> 'admin' THEN
      RAISE EXCEPTION 'Solo administradores pueden modificar perfiles de administradores';
    END IF;
  END IF;

  IF p_role = 'admin' AND v_actor.role <> 'admin' THEN
    RAISE EXCEPTION 'Solo administradores pueden asignar el rol admin';
  END IF;

  IF p_profile_id IS NULL THEN
    INSERT INTO public.profiles (full_name, email, phone, whatsapp, status, role)
    VALUES (p_full_name, p_email, p_phone, p_whatsapp, COALESCE(p_status, 'activo'), COALESCE(p_role, 'operario'))
    RETURNING * INTO v_result;
  ELSE
    UPDATE public.profiles
    SET full_name = p_full_name,
        email = p_email,
        phone = p_phone,
        whatsapp = p_whatsapp,
        status = COALESCE(p_status, status),
        role = CASE
          WHEN v_actor.role = 'admin' THEN COALESCE(p_role, v_target.role)
          ELSE v_target.role
        END
    WHERE id = p_profile_id
    RETURNING * INTO v_result;
  END IF;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.admin_upsert_profile TO authenticated;

COMMIT;

-- MIGRACIÓN: 20251011090000_update_admin_upsert_profile.sql

-- =====================================================================
-- Actualizar funciÃ³n admin_upsert_profile (sin campo whatsapp)
-- =====================================================================
-- Fecha: 2025-10-11
-- Motivo: Eliminar referencias a la columna whatsapp para evitar errores
--         cuando no existe en la tabla profiles.
-- =====================================================================

BEGIN;

DROP FUNCTION IF EXISTS public.admin_upsert_profile(
  TEXT,
  UUID,
  TEXT,
  TEXT,
  TEXT,
  TEXT,
  TEXT
);

DROP FUNCTION IF EXISTS public.admin_upsert_profile(
  TEXT,
  UUID,
  TEXT,
  TEXT,
  TEXT,
  TEXT
);

CREATE OR REPLACE FUNCTION public.admin_upsert_profile(
  p_full_name TEXT,
  p_profile_id UUID DEFAULT NULL,
  p_email TEXT DEFAULT NULL,
  p_phone TEXT DEFAULT NULL,
  p_status TEXT DEFAULT 'activo',
  p_role TEXT DEFAULT 'operario'
)
RETURNS public.profiles AS $$
DECLARE
  v_actor public.profiles;
  v_target public.profiles;
  v_result public.profiles;
BEGIN
  SELECT *
    INTO v_actor
    FROM public.profiles
    WHERE auth_user_id = auth.uid();

  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'No existe un perfil asociado al usuario autenticado';
  END IF;

  IF v_actor.role NOT IN ('admin', 'manager', 'responsable') THEN
    RAISE EXCEPTION 'No tienes permisos para gestionar perfiles';
  END IF;

  IF p_profile_id IS NOT NULL THEN
    SELECT * INTO v_target FROM public.profiles WHERE id = p_profile_id;
    IF v_target IS NULL THEN
      RAISE EXCEPTION 'Perfil no encontrado';
    END IF;
    IF v_target.role = 'admin' AND v_actor.role <> 'admin' THEN
      RAISE EXCEPTION 'Solo administradores pueden modificar perfiles de administradores';
    END IF;
  END IF;

  IF p_role = 'admin' AND v_actor.role <> 'admin' THEN
    RAISE EXCEPTION 'Solo administradores pueden asignar el rol admin';
  END IF;

  IF p_profile_id IS NULL THEN
    INSERT INTO public.profiles (full_name, email, phone, status, role)
    VALUES (
      p_full_name,
      p_email,
      p_phone,
      COALESCE(p_status, 'activo'),
      COALESCE(p_role, 'operario')
    )
    RETURNING * INTO v_result;
  ELSE
    UPDATE public.profiles
    SET full_name = p_full_name,
        email = p_email,
        phone = p_phone,
        status = COALESCE(p_status, status),
        role = CASE
          WHEN v_actor.role = 'admin' THEN COALESCE(p_role, v_target.role)
          WHEN v_actor.role = 'manager' THEN
            CASE
              WHEN p_role = 'admin' THEN v_target.role
              ELSE COALESCE(p_role, v_target.role)
            END
          WHEN v_actor.role = 'responsable' THEN
            CASE
              WHEN p_role IN ('responsable', 'operario') THEN COALESCE(p_role, v_target.role)
              ELSE v_target.role
            END
          ELSE v_target.role
        END,
        updated_at = NOW()
    WHERE id = p_profile_id
    RETURNING * INTO v_result;
  END IF;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.admin_upsert_profile TO authenticated;

COMMIT;

-- MIGRACIÓN: 20251011092000_archive_task_by_id.sql

-- =====================================================================
-- RPC: archive_task_by_id - archiva una tarea individual inmediatamente
-- =====================================================================
-- Fecha: 2025-10-11
-- Objetivo: Permitir que el panel admin archive tareas puntuales desde UI
-- =====================================================================

BEGIN;

DROP FUNCTION IF EXISTS public.archive_task_by_id(UUID);

CREATE OR REPLACE FUNCTION public.archive_task_by_id(p_task_id UUID)
RETURNS TABLE(archived BOOLEAN, message TEXT) AS $$
DECLARE
  v_actor public.profiles;
  v_inserted INTEGER := 0;
BEGIN
  SELECT *
    INTO v_actor
    FROM public.profiles
    WHERE auth_user_id = auth.uid();

  IF v_actor IS NULL THEN
    RETURN QUERY SELECT false, 'No existe un perfil asociado al usuario autenticado';
    RETURN;
  END IF;

  IF NOT public.has_permission(v_actor.role, 'archive', 'create') THEN
    RETURN QUERY SELECT false, 'No tienes permisos para archivar tareas';
    RETURN;
  END IF;

  WITH moved AS (
    INSERT INTO public.archived_tasks (
      id,
      archived_at,
      data,
      status,
      state,
      start_date,
      end_date,
      location,
      responsible_profile_id,
      responsible_name,
      assigned_users,
      assigned_vehicles,
      archived_by
    )
    SELECT
      sd.id,
      NOW(),
      sd.data,
      sd.status,
      sd.state,
      sd.start_date,
      sd.end_date,
      sd.location,
      sd.responsible_profile_id,
      rp.full_name AS responsible_name,
      COALESCE(
        (
          SELECT jsonb_agg(
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
        (
          SELECT jsonb_agg(
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
      ) AS assigned_vehicles,
      v_actor.id AS archived_by
    FROM public.screen_data sd
    LEFT JOIN public.profiles rp ON sd.responsible_profile_id = rp.id
    WHERE sd.id = p_task_id
    ON CONFLICT (id) DO NOTHING
    RETURNING id
  )
  SELECT COUNT(*) INTO v_inserted FROM moved;

  IF v_inserted = 0 THEN
    RETURN QUERY SELECT false, 'La tarea no existe o ya fue archivada';
    RETURN;
  END IF;

  DELETE FROM public.screen_data WHERE id = p_task_id;

  RETURN QUERY SELECT true, 'Tarea archivada correctamente';
EXCEPTION
  WHEN others THEN
    RETURN QUERY SELECT false, SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.archive_task_by_id(UUID) TO authenticated;

COMMIT;

-- =====================================================================
-- Uso:
--   SELECT * FROM public.archive_task_by_id('00000000-0000-0000-0000-000000000000');
-- =====================================================================

-- MIGRACIÓN: 20251015123000_fix_handle_new_user_profile_link.sql

-- ================================================================
-- Ajustar handle_new_user para respetar email Ãºnico en profiles
-- Fecha: 2025-10-15
-- Objetivo: evitar errores "Database error creating new user" cuando
--           ya existe un perfil con el mismo email sin auth_user_id.
-- ================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_full_name TEXT := COALESCE(NULLIF(NEW.raw_user_meta_data->>'full_name', ''), NEW.email);
  v_role TEXT := COALESCE(NULLIF(NEW.raw_user_meta_data->>'role', ''), 'operario');
  v_existing public.profiles%ROWTYPE;
BEGIN
  -- Intentar encontrar un perfil existente por email (insensible a mayÃºsculas)
  IF NEW.email IS NOT NULL THEN
    SELECT *
      INTO v_existing
      FROM public.profiles
      WHERE email IS NOT NULL
        AND lower(email) = lower(NEW.email)
      ORDER BY updated_at DESC
      LIMIT 1;
  END IF;

  IF v_existing.id IS NOT NULL THEN
    -- Si ya estÃ¡ vinculado a otro usuario diferente, detener el alta
    IF v_existing.auth_user_id IS NOT NULL AND v_existing.auth_user_id <> NEW.id THEN
      RAISE EXCEPTION 'El email % ya estÃ¡ asociado a otro usuario', NEW.email;
    END IF;

    UPDATE public.profiles
    SET
      auth_user_id = NEW.id,
      full_name = COALESCE(v_full_name, full_name),
      role = COALESCE(v_role, role),
      status = COALESCE(status, 'activo'),
      updated_at = NOW()
    WHERE id = v_existing.id;

    RETURN NEW;
  END IF;

  INSERT INTO public.profiles (auth_user_id, full_name, email, role, status)
  VALUES (
    NEW.id,
    v_full_name,
    NEW.email,
    v_role,
    'activo'
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;

-- ================================================================
-- Fin del script
-- ================================================================

-- MIGRACIÓN: 20251024093000_update_admin_upsert_profile_permissions.sql

-- =====================================================================
-- Actualizar funciÃ³n admin_upsert_profile para jerarquÃ­a de roles
-- =====================================================================
-- Fecha: 2025-10-24
-- Motivo: Permitir que managers y responsables ajusten roles dentro de
--         su jerarquÃ­a manteniendo la restricciÃ³n de admins.
-- =====================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.admin_upsert_profile(
  p_full_name TEXT,
  p_profile_id UUID DEFAULT NULL,
  p_email TEXT DEFAULT NULL,
  p_phone TEXT DEFAULT NULL,
  p_status TEXT DEFAULT 'activo',
  p_role TEXT DEFAULT 'operario'
)
RETURNS public.profiles AS $$
DECLARE
  v_actor public.profiles;
  v_target public.profiles;
  v_result public.profiles;
BEGIN
  SELECT *
    INTO v_actor
    FROM public.profiles
    WHERE auth_user_id = auth.uid();

  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'No existe un perfil asociado al usuario autenticado';
  END IF;

  IF v_actor.role NOT IN ('admin', 'manager', 'responsable') THEN
    RAISE EXCEPTION 'No tienes permisos para gestionar perfiles';
  END IF;

  IF p_profile_id IS NOT NULL THEN
    SELECT * INTO v_target FROM public.profiles WHERE id = p_profile_id;
    IF v_target IS NULL THEN
      RAISE EXCEPTION 'Perfil no encontrado';
    END IF;
    IF v_target.role = 'admin' AND v_actor.role <> 'admin' THEN
      RAISE EXCEPTION 'Solo administradores pueden modificar perfiles de administradores';
    END IF;
  END IF;

  IF p_role = 'admin' AND v_actor.role <> 'admin' THEN
    RAISE EXCEPTION 'Solo administradores pueden asignar el rol admin';
  END IF;

  IF p_profile_id IS NULL THEN
    INSERT INTO public.profiles (full_name, email, phone, status, role)
    VALUES (
      p_full_name,
      p_email,
      p_phone,
      COALESCE(p_status, 'activo'),
      COALESCE(p_role, 'operario')
    )
    RETURNING * INTO v_result;
  ELSE
    UPDATE public.profiles
    SET full_name = p_full_name,
        email = p_email,
        phone = p_phone,
        status = COALESCE(p_status, status),
        role = CASE
          WHEN v_actor.role = 'admin' THEN COALESCE(p_role, v_target.role)
          WHEN v_actor.role = 'manager' THEN
            CASE
              WHEN p_role = 'admin' THEN v_target.role
              ELSE COALESCE(p_role, v_target.role)
            END
          WHEN v_actor.role = 'responsable' THEN
            CASE
              WHEN p_role IN ('responsable', 'operario') THEN COALESCE(p_role, v_target.role)
              ELSE v_target.role
            END
          ELSE v_target.role
        END,
        updated_at = NOW()
    WHERE id = p_profile_id
    RETURNING * INTO v_result;
  END IF;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.admin_upsert_profile TO authenticated;

COMMIT;

-- MIGRACIÓN: 20251105090000_create_work_sites_and_enrich_tasks.sql

-- =====================================================================
-- MIGRACIÃ“N: CREAR TABLA work_sites Y ENRIQUECER screen_data/detailed_tasks
-- =====================================================================
-- Fecha: 2025-11-05
-- Objetivo:
--   1. Crear la entidad centralizada de ubicaciones (work_sites) con control
--      de imagotipo/mapas.
--   2. Asociar tareas (screen_data) a un work_site concreto y permitir meta-
--      datos estructurados de localizaciÃ³n.
--   3. Actualizar la vista detailed_tasks para exponer los nuevos campos.
-- =====================================================================

BEGIN;

-- =====================================================================
-- PASO 1: CREACIÃ“N DE TABLA work_sites
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.work_sites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  alias TEXT,
  address TEXT,
  city TEXT,
  province TEXT,
  postal_code TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  maps_url TEXT,
  notes TEXT,
  imagotipo_enabled BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT work_sites_name_unique UNIQUE (name)
);

ALTER TABLE public.work_sites ENABLE ROW LEVEL SECURITY;

-- PolÃ­tica de lectura para usuarios pÃºblicos/autenticados.
DROP POLICY IF EXISTS "read_work_sites" ON public.work_sites;
CREATE POLICY "read_work_sites" ON public.work_sites FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

-- PolÃ­tica de gestiÃ³n restringida a administradores mediante helper is_admin().
DROP POLICY IF EXISTS "manage_work_sites" ON public.work_sites;
CREATE POLICY "manage_work_sites" ON public.work_sites FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Reutilizar trigger genÃ©rico de updated_at.
CREATE TRIGGER handle_work_sites_updated_at
  BEFORE UPDATE ON public.work_sites
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

COMMENT ON TABLE public.work_sites IS 'CatÃ¡logo de ubicaciones/obras con control de imagotipo y metadatos de direcciÃ³n.';

-- =====================================================================
-- PASO 2: ENRIQUECER screen_data CON REFERENCIA A work_sites
-- =====================================================================

ALTER TABLE public.screen_data
  ADD COLUMN IF NOT EXISTS work_site_id UUID REFERENCES public.work_sites(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS location_metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

-- Ãndices de apoyo para consultas frecuentes
CREATE INDEX IF NOT EXISTS idx_screen_data_work_site_id
  ON public.screen_data(work_site_id);

CREATE INDEX IF NOT EXISTS idx_screen_data_location_metadata
  ON public.screen_data
  USING GIN (location_metadata)
  WHERE location_metadata IS NOT NULL AND location_metadata <> '{}'::jsonb;

COMMENT ON COLUMN public.screen_data.work_site_id IS 'UbicaciÃ³n estructurada asociada a la tarea.';
COMMENT ON COLUMN public.screen_data.location_metadata IS 'Metadatos adicionales de localizaciÃ³n (coordenadas, referencias externas, etc.).';

-- =====================================================================
-- PASO 3: REDEFINIR VISTA detailed_tasks CON LOS NUEVOS CAMPOS
-- =====================================================================

DROP VIEW IF EXISTS public.detailed_tasks;

CREATE OR REPLACE VIEW public.detailed_tasks AS
SELECT
  -- Datos bÃ¡sicos de la tarea
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
  sd.location_metadata,
  sd.work_site_id,
  sd.responsible_profile_id,
  sd.assigned_to,
  sd.checkin_token,
  sd."order",

  -- InformaciÃ³n del screen asociado
  s.name AS screen_name,
  s.screen_type,
  s.screen_group,
  s.next_screen_id,
  s.header_color,
  s.is_active AS screen_is_active,
  s.refresh_interval_sec,

  -- InformaciÃ³n del work_site (si existe)
  ws.name AS work_site_name,
  ws.alias AS work_site_alias,
  ws.address AS work_site_address,
  ws.city AS work_site_city,
  ws.province AS work_site_province,
  ws.postal_code AS work_site_postal_code,
  ws.latitude AS work_site_latitude,
  ws.longitude AS work_site_longitude,
  ws.maps_url AS work_site_maps_url,
  ws.imagotipo_enabled AS work_site_imagotipo_enabled,

  -- InformaciÃ³n del responsable (responsible_profile_id)
  rp.full_name AS responsible_name,
  rp.email AS responsible_email,
  rp.phone AS responsible_phone,
  rp.role AS responsible_role,
  rp.status AS responsible_status,
  rp.avatar_url AS responsible_avatar,

  -- InformaciÃ³n del assigned_to (puede ser diferente del responsable)
  ap.full_name AS assigned_name,
  ap.email AS assigned_email,
  ap.phone AS assigned_phone,
  ap.role AS assigned_role,
  ap.status AS assigned_status,

  -- Campos JSON aplanados para facilitar el acceso
  sd.data->>'site' AS site,
  sd.data->>'client' AS client,
  sd.data->>'address' AS address,
  sd.data->>'description' AS description,
  sd.data->>'notes' AS notes,
  sd.data->>'vehicle_type' AS vehicle_type,

  -- Operarios asignados (array agregado desde task_profiles)
  COALESCE(
    (
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', p.id,
          'full_name', p.full_name,
          'email', p.email,
          'phone', p.phone,
          'role', p.role,
          'status', p.status,
          'avatar_url', p.avatar_url
        ) ORDER BY p.full_name
      )
      FROM public.task_profiles tp
      JOIN public.profiles p ON tp.profile_id = p.id
      WHERE tp.task_id = sd.id
    ),
    '[]'::jsonb
  ) AS assigned_profiles,

  -- VehÃ­culos asignados (array agregado desde task_vehicles)
  COALESCE(
    (
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', v.id,
          'name', v.name,
          'type', v.type,
          'license_plate', v.license_plate,
          'capacity', v.capacity
        ) ORDER BY v.name
      )
      FROM public.task_vehicles tv
      JOIN public.vehicles v ON tv.vehicle_id = v.id
      WHERE tv.task_id = sd.id
    ),
    '[]'::jsonb
  ) AS assigned_vehicles,

  -- Contadores Ãºtiles
  (
    SELECT COUNT(*)
    FROM public.task_profiles tp
    WHERE tp.task_id = sd.id
  ) AS assigned_profiles_count,

  (
    SELECT COUNT(*)
    FROM public.task_vehicles tv
    WHERE tv.task_id = sd.id
  ) AS assigned_vehicles_count,

  -- Indicadores de estado Ãºtiles
  CASE
    WHEN sd.state = 'terminado' THEN true
    ELSE false
  END AS is_completed,

  CASE
    WHEN sd.state = 'urgente' THEN true
    ELSE false
  END AS is_urgent,

  CASE
    WHEN sd.start_date IS NOT NULL
      AND sd.start_date <= CURRENT_DATE
      AND (sd.end_date IS NULL OR sd.end_date >= CURRENT_DATE)
      THEN true
    ELSE false
  END AS is_current,

  CASE
    WHEN sd.end_date IS NOT NULL
      AND sd.end_date < CURRENT_DATE
      AND sd.state <> 'terminado'
      THEN true
    ELSE false
  END AS is_overdue,

  CASE
    WHEN sd.start_date IS NOT NULL AND sd.start_date > CURRENT_DATE THEN true
    ELSE false
  END AS is_future,

  CASE
    WHEN sd.start_date IS NULL THEN NULL
    ELSE (sd.start_date - CURRENT_DATE)
  END AS days_from_start,

  CASE
    WHEN sd.state = 'urgente' THEN 1
    WHEN sd.state = 'incidente' THEN 2
    WHEN sd.state = 'arreglo' THEN 3
    WHEN sd.state <> 'terminado'
      AND sd.end_date IS NOT NULL
      AND sd.end_date < CURRENT_DATE THEN 4
    WHEN sd.state = 'en fabricacion' THEN 5
    WHEN sd.state = 'a la espera' THEN 6
    ELSE 7
  END AS priority_order

FROM public.screen_data sd
LEFT JOIN public.screens s ON sd.screen_id = s.id
LEFT JOIN public.work_sites ws ON sd.work_site_id = ws.id
LEFT JOIN public.profiles rp ON sd.responsible_profile_id = rp.id
LEFT JOIN public.profiles ap ON sd.assigned_to = ap.id;

GRANT SELECT ON public.detailed_tasks TO authenticated, anon;

COMMENT ON VIEW public.detailed_tasks IS
'Vista optimizada que une screen_data con profiles, vehicles, screens y work_sites.
Incluye campos JSON aplanados y arrays agregados de operarios/vehÃ­culos, asÃ­ como
metadatos de ubicaciÃ³n centralizados.';

-- =====================================================================
-- PASO 4: ACTUALIZAR FUNCIÃ“N upsert_task PARA INCLUIR work_sites
-- =====================================================================

DROP FUNCTION IF EXISTS public.upsert_task;

CREATE OR REPLACE FUNCTION public.upsert_task(
  p_task_id UUID DEFAULT NULL,
  p_screen_id UUID DEFAULT NULL,
  p_data JSONB DEFAULT '{}'::jsonb,
  p_state TEXT DEFAULT 'pendiente',
  p_status TEXT DEFAULT 'pendiente',
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL,
  p_location TEXT DEFAULT NULL,
  p_location_metadata JSONB DEFAULT '{}'::jsonb,
  p_work_site_id UUID DEFAULT NULL,
  p_responsible_profile_id UUID DEFAULT NULL,
  p_assigned_to UUID DEFAULT NULL,
  p_assigned_profiles UUID[] DEFAULT NULL,
  p_assigned_vehicles UUID[] DEFAULT NULL
)
RETURNS TABLE (
  result_task_id UUID,
  result_action TEXT
) AS $$
DECLARE
  v_task_id UUID;
  v_action TEXT;
  v_user_role TEXT;
  v_permission_action TEXT;
  v_location_metadata JSONB := COALESCE(p_location_metadata, '{}'::jsonb);
BEGIN
  -- Obtener el rol del usuario actual
  SELECT role INTO v_user_role
  FROM public.profiles
  WHERE auth_user_id = auth.uid();

  -- Determinar si es creaciÃ³n o ediciÃ³n
  IF p_task_id IS NULL THEN
    v_permission_action := 'create';
  ELSE
    v_permission_action := 'edit';
  END IF;

  -- Validar permisos
  IF NOT public.has_permission(v_user_role, 'screens', v_permission_action) THEN
    RAISE EXCEPTION 'No tienes permisos para % tareas', v_permission_action;
  END IF;

  -- Validar parÃ¡metros requeridos
  IF p_screen_id IS NULL THEN
    RAISE EXCEPTION 'p_screen_id is required';
  END IF;

  -- Validar que el estado sea vÃ¡lido
  IF p_state NOT IN ('pendiente', 'urgente', 'en fabricacion', 'a la espera', 'terminado', 'incidente', 'arreglo') THEN
    RAISE EXCEPTION 'Estado invÃ¡lido: %', p_state;
  END IF;

  -- Validar que el status sea vÃ¡lido
  IF p_status NOT IN ('pendiente', 'acabado', 'en progreso') THEN
    RAISE EXCEPTION 'Status invÃ¡lido: %', p_status;
  END IF;

  -- Validar work_site si aplica
  IF p_work_site_id IS NOT NULL THEN
    PERFORM 1
    FROM public.work_sites ws
    WHERE ws.id = p_work_site_id
      AND ws.is_active = true;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'work_site_id % no existe o estÃ¡ inactivo', p_work_site_id;
    END IF;
  END IF;

  -- Upsert de la tarea con metadatos de localizaciÃ³n y work_site
  INSERT INTO public.screen_data (
    id,
    screen_id,
    data,
    state,
    status,
    start_date,
    end_date,
    location,
    location_metadata,
    work_site_id,
    responsible_profile_id,
    assigned_to
  )
  VALUES (
    COALESCE(p_task_id, gen_random_uuid()),
    p_screen_id,
    p_data,
    p_state,
    p_status,
    p_start_date,
    p_end_date,
    p_location,
    v_location_metadata,
    p_work_site_id,
    p_responsible_profile_id,
    p_assigned_to
  )
  ON CONFLICT (id) DO UPDATE SET
    data = EXCLUDED.data,
    state = EXCLUDED.state,
    status = EXCLUDED.status,
    start_date = EXCLUDED.start_date,
    end_date = EXCLUDED.end_date,
    location = EXCLUDED.location,
    location_metadata = EXCLUDED.location_metadata,
    work_site_id = EXCLUDED.work_site_id,
    responsible_profile_id = EXCLUDED.responsible_profile_id,
    assigned_to = EXCLUDED.assigned_to,
    updated_at = NOW()
  RETURNING id INTO v_task_id;

  -- Determinar acciÃ³n realizada
  IF p_task_id IS NULL THEN
    v_action := 'created';
  ELSE
    v_action := 'updated';
  END IF;

  -- Eliminar asignaciones existentes si hay nuevas
  IF p_assigned_profiles IS NOT NULL OR p_assigned_vehicles IS NOT NULL THEN
    DELETE FROM public.task_profiles WHERE public.task_profiles.task_id = v_task_id;
    DELETE FROM public.task_vehicles WHERE public.task_vehicles.task_id = v_task_id;
  END IF;

  -- Insertar nuevas asignaciones de perfiles
  IF p_assigned_profiles IS NOT NULL THEN
    INSERT INTO public.task_profiles (task_id, profile_id)
    SELECT v_task_id, unnest(p_assigned_profiles);
  END IF;

  -- Insertar nuevas asignaciones de vehÃ­culos
  IF p_assigned_vehicles IS NOT NULL THEN
    INSERT INTO public.task_vehicles (task_id, vehicle_id)
    SELECT v_task_id, unnest(p_assigned_vehicles);
  END IF;

  RETURN QUERY SELECT v_task_id AS result_task_id, v_action AS result_action;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.upsert_task TO authenticated;

COMMENT ON FUNCTION public.upsert_task IS 'FunciÃ³n para crear o actualizar tareas con asignaciones, work_sites y metadatos de localizaciÃ³n.';

COMMIT;

-- =====================================================================
-- NOTAS DE IMPLEMENTACIÃ“N
-- =====================================================================
-- 1. work_sites actÃºa como catÃ¡logo maestro de ubicaciones; su bandera
--    imagotipo_enabled permite controlar desde el frontend si se muestra
--    el imagotipo/mapas.
-- 2. location_metadata queda disponible para guardar coordenadas normalizadas,
--    identificadores externos (Google Place ID, etc.) y evitar lÃ³gica
--    heurÃ­stica en el frontend.
-- 3. detailed_tasks expone los campos ya listos para consumo directo.
-- =====================================================================

-- MIGRACIÓN: 20251105123000_add_work_session_functions.sql

-- =====================================================================
-- MIGRACIÃ“N: Funciones RPC para work_sessions e incidencias
-- =====================================================================
-- Fuente original: supabase/sql/work_sessions_functions.sql
-- Objetivo: registrar oficialmente las funciones necesarias para
--           sesiones de trabajo, incidencias y actualizaciones de
--           ubicaciÃ³n dentro del flujo de migraciones.
-- =====================================================================

BEGIN;

-- Asegurar extensiones requeridas
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================================
-- start_work_session
-- Cierra sesiones previas activas y abre una nueva
-- =====================================================================
CREATE OR REPLACE FUNCTION public.start_work_session(
  p_profile_id uuid,
  p_task_id uuid DEFAULT NULL,
  p_start_location jsonb DEFAULT NULL,
  p_device_info jsonb DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS TABLE (
  id uuid,
  profile_id uuid,
  task_id uuid,
  started_at timestamptz,
  ended_at timestamptz,
  start_location jsonb,
  end_location jsonb,
  device_info jsonb,
  status text,
  metadata jsonb,
  created_at timestamptz,
  updated_at timestamptz
) AS $$
DECLARE
  v_now timestamptz := now();
  v_session public.work_sessions%ROWTYPE;
BEGIN
  UPDATE public.work_sessions AS ws
     SET status = 'completed',
         ended_at = COALESCE(ws.ended_at, v_now),
         end_location = COALESCE(ws.end_location, p_start_location),
         updated_at = v_now
   WHERE ws.profile_id = p_profile_id
     AND ws.status = 'active'
     AND ws.ended_at IS NULL;

  INSERT INTO public.work_sessions (
    profile_id,
    task_id,
    started_at,
    start_location,
    device_info,
    status,
    metadata
  )
  VALUES (
    p_profile_id,
    p_task_id,
    v_now,
    p_start_location,
    p_device_info,
    'active',
    COALESCE(p_metadata, '{}'::jsonb)
  )
  RETURNING * INTO v_session;

  RETURN QUERY
    SELECT
      w.id,
      w.profile_id,
      w.task_id,
      w.started_at,
      w.ended_at,
      w.start_location,
      w.end_location,
      w.device_info,
      w.status,
      w.metadata,
      w.created_at,
      w.updated_at
    FROM public.work_sessions w
    WHERE w.id = v_session.id;
END;
$$ LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public, extensions;

GRANT EXECUTE ON FUNCTION public.start_work_session(uuid, uuid, jsonb, jsonb, jsonb) TO authenticated;

-- =====================================================================
-- end_work_session
-- Marca una sesiÃ³n como completada
-- =====================================================================
CREATE OR REPLACE FUNCTION public.end_work_session(
  p_session_id uuid,
  p_profile_id uuid DEFAULT NULL,
  p_end_location jsonb DEFAULT NULL,
  p_status text DEFAULT 'completed',
  p_metadata jsonb DEFAULT NULL
)
RETURNS public.work_sessions AS $$
DECLARE
  v_now timestamptz := now();
  v_session public.work_sessions;
BEGIN
  UPDATE public.work_sessions AS ws
     SET ended_at = COALESCE(ws.ended_at, v_now),
         end_location = COALESCE(p_end_location, ws.end_location),
         status = COALESCE(p_status, ws.status),
         metadata = CASE
           WHEN p_metadata IS NULL THEN ws.metadata
           ELSE jsonb_strip_nulls(ws.metadata || p_metadata)
         END,
         updated_at = v_now
   WHERE ws.id = p_session_id
     AND (p_profile_id IS NULL OR ws.profile_id = p_profile_id)
  RETURNING * INTO v_session;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No se encontrÃ³ la sesiÃ³n % o no pertenece al perfil indicado', p_session_id
      USING ERRCODE = 'P0002';
  END IF;

  RETURN v_session;
END;
$$ LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public, extensions;

GRANT EXECUTE ON FUNCTION public.end_work_session(uuid, uuid, jsonb, text, jsonb) TO authenticated;

-- =====================================================================
-- report_incident
-- Crea un registro en incident_reports vinculado a la sesiÃ³n
-- =====================================================================
CREATE OR REPLACE FUNCTION public.report_incident(
  p_session_id uuid,
  p_reported_by uuid,
  p_incident_type text,
  p_severity text DEFAULT 'medium',
  p_description text DEFAULT NULL,
  p_attachments jsonb DEFAULT '[]'::jsonb,
  p_task_id uuid DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS public.incident_reports AS $$
DECLARE
  v_session_task uuid;
  v_record public.incident_reports;
BEGIN
  SELECT ws.task_id
    INTO v_session_task
    FROM public.work_sessions AS ws
   WHERE ws.id = p_session_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'SesiÃ³n % no existe', p_session_id
      USING ERRCODE = 'P0002';
  END IF;

  INSERT INTO public.incident_reports (
    session_id,
    task_id,
    reported_by,
    incident_type,
    severity,
    status,
    description,
    attachments,
    metadata
  )
  VALUES (
    p_session_id,
    COALESCE(p_task_id, v_session_task),
    p_reported_by,
    p_incident_type,
    COALESCE(p_severity, 'medium'),
    'new',
    p_description,
    COALESCE(p_attachments, '[]'::jsonb),
    COALESCE(p_metadata, '{}'::jsonb)
  )
  RETURNING * INTO v_record;

  RETURN v_record;
END;
$$ LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public, extensions;

GRANT EXECUTE ON FUNCTION public.report_incident(uuid, uuid, text, text, text, jsonb, uuid, jsonb) TO authenticated;

-- =====================================================================
-- send_location_update
-- Registra una actualizaciÃ³n de geolocalizaciÃ³n solicitada
-- =====================================================================
CREATE OR REPLACE FUNCTION public.send_location_update(
  p_profile_id uuid,
  p_requested_by uuid,
  p_location jsonb,
  p_session_id uuid DEFAULT NULL,
  p_note text DEFAULT NULL,
  p_delivery_channel text DEFAULT 'in_app',
  p_expires_at timestamptz DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS public.location_updates AS $$
DECLARE
  v_record public.location_updates;
BEGIN
  IF p_location IS NULL THEN
    RAISE EXCEPTION 'Se requiere location (lat/lng)' USING ERRCODE = '23502';
  END IF;

  INSERT INTO public.location_updates (
    session_id,
    profile_id,
    requested_by,
    location,
    note,
    delivery_channel,
    expires_at,
    metadata
  )
  VALUES (
    p_session_id,
    p_profile_id,
    p_requested_by,
    jsonb_strip_nulls(p_location),
    p_note,
    COALESCE(p_delivery_channel, 'in_app'),
    p_expires_at,
    COALESCE(p_metadata, '{}'::jsonb)
  )
  RETURNING * INTO v_record;

  RETURN v_record;
END;
$$ LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public, extensions;

GRANT EXECUTE ON FUNCTION public.send_location_update(uuid, uuid, jsonb, uuid, text, text, timestamptz, jsonb) TO authenticated;

COMMIT;

-- MIGRACIÓN: 20251105124000_direct_messages_optimizations.sql

-- =====================================================================
-- MIGRACIÃ“N: Optimizaciones de mensajes directos y communication_logs
-- =====================================================================
-- Fuente: supabase/sql/direct_messages_optimizations.sql
-- Incluye funciÃ³n resumida de conversaciones e Ã­ndices adicionales.
-- =====================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE OR REPLACE FUNCTION public.get_direct_message_conversations(
  p_profile_id uuid,
  p_limit integer DEFAULT 20,
  p_offset integer DEFAULT 0
)
RETURNS TABLE (
  user_id uuid,
  user_name text,
  user_avatar text,
  last_message text,
  last_message_time timestamptz,
  unread_count integer,
  total_conversations bigint
) AS $$
DECLARE
  v_caller_profile_id uuid;
  v_is_admin boolean;
BEGIN
  SELECT id INTO v_caller_profile_id
  FROM public.profiles
  WHERE auth_user_id = auth.uid();

  IF v_caller_profile_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado' USING ERRCODE = '42501';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE auth_user_id = auth.uid()
      AND role IN ('admin', 'manager')
  ) INTO v_is_admin;

  IF NOT v_is_admin AND v_caller_profile_id <> p_profile_id THEN
    RAISE EXCEPTION 'No autorizado para consultar conversaciones de este perfil' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  WITH relevant AS (
    SELECT
      CASE
        WHEN dm.sender_id = p_profile_id THEN dm.recipient_id
        ELSE dm.sender_id
      END AS other_user_id,
      dm.content,
      dm.created_at
    FROM public.direct_messages dm
    WHERE dm.sender_id = p_profile_id
       OR dm.recipient_id = p_profile_id
  ),
  latest AS (
    SELECT DISTINCT ON (other_user_id)
      other_user_id,
      content AS last_message,
      created_at AS last_message_time
    FROM relevant
    ORDER BY other_user_id, created_at DESC
  ),
  unread AS (
    SELECT sender_id AS other_user_id, COUNT(*)::int AS unread_count
    FROM public.direct_messages
    WHERE recipient_id = p_profile_id
      AND read_at IS NULL
    GROUP BY sender_id
  )
  SELECT
    latest.other_user_id AS user_id,
    p.full_name AS user_name,
    p.avatar_url AS user_avatar,
    latest.last_message,
    latest.last_message_time,
    COALESCE(unread.unread_count, 0) AS unread_count,
    COUNT(*) OVER () AS total_conversations
  FROM latest
  JOIN public.profiles p ON p.id = latest.other_user_id
  LEFT JOIN unread ON unread.other_user_id = latest.other_user_id
  ORDER BY latest.last_message_time DESC NULLS LAST
  LIMIT GREATEST(p_limit, 1)
  OFFSET GREATEST(p_offset, 0);
END;
$$ LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public, extensions;

GRANT EXECUTE ON FUNCTION public.get_direct_message_conversations(uuid, integer, integer) TO authenticated;

CREATE INDEX IF NOT EXISTS idx_communication_logs_created_at
  ON public.communication_logs (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_communication_logs_metadata_profile
  ON public.communication_logs ((metadata->>'profile_id'));

CREATE INDEX IF NOT EXISTS idx_communication_logs_metadata_target
  ON public.communication_logs ((metadata->>'target_profile_id'));

CREATE INDEX IF NOT EXISTS idx_communication_logs_metadata_user
  ON public.communication_logs ((metadata->>'user_profile_id'));

COMMIT;

-- MIGRACIÓN: 20251105125000_fix_profiles_rls_after_decoupling.sql

-- =====================================================================
-- MIGRACIÃ“N: ActualizaciÃ³n de polÃ­ticas RLS para profiles
-- =====================================================================
-- Contenido proveniente de supabase/20251004100000_fix_profile_rls_after_decoupling.sql
-- Objetivo: asegurar que las polÃ­ticas vivan en la secuencia oficial de migraciones.
-- =====================================================================

BEGIN;







DROP POLICY IF EXISTS "Authenticated users can view all profiles" ON public.profiles;
CREATE POLICY "Authenticated users can view all profiles" ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = auth_user_id)
  WITH CHECK (auth.uid() = auth_user_id);

DROP POLICY IF EXISTS "Admins can manage all profiles (legacy)" ON public.profiles;
CREATE POLICY "Admins can manage all profiles (legacy)" ON public.profiles FOR ALL
  TO authenticated
  USING ((SELECT role FROM public.profiles WHERE auth_user_id = auth.uid()) = 'admin')
  WITH CHECK ((SELECT role FROM public.profiles WHERE auth_user_id = auth.uid()) = 'admin');

COMMIT;

-- MIGRACIÓN: 20251105125500_fix_archived_tasks_insert_policy.sql

-- =====================================================================
-- MIGRACIÃ“N: PolÃ­ticas para inserciÃ³n/eliminaciÃ³n en archived_tasks
-- =====================================================================
-- Fuente: supabase/20251005_fix_archived_tasks_insert_policy.sql
-- Objetivo: asegurar que sÃ³lo administradores puedan insertar/eliminar
--           registros en archived_tasks mediante RLS oficial.
-- =====================================================================

BEGIN;



DROP POLICY IF EXISTS "Los admins pueden insertar tareas archivadas" ON public.archived_tasks;
CREATE POLICY "Los admins pueden insertar tareas archivadas" ON public.archived_tasks
FOR INSERT
TO authenticated
WITH CHECK (
  (SELECT role FROM public.profiles WHERE auth_user_id = auth.uid()) = 'admin'
);



DROP POLICY IF EXISTS "Los admins pueden eliminar tareas archivadas" ON public.archived_tasks;
CREATE POLICY "Los admins pueden eliminar tareas archivadas" ON public.archived_tasks
FOR DELETE
TO authenticated
USING (
  (SELECT role FROM public.profiles WHERE auth_user_id = auth.uid()) = 'admin'
);

COMMIT;

-- MIGRACIÓN: 20251105130000_add_dashboard_sections_to_screens.sql

-- =====================================================================
-- MIGRACIÃ“N: Campos dashboard_section y dashboard_order en screens
-- =====================================================================
-- Fuente: supabase/sql/dashboard_sections.sql
-- Objetivo: formalizar las columnas utilizadas para agrupar pantallas
--           por secciones del dashboard y definir su orden.
-- =====================================================================

BEGIN;

ALTER TABLE public.screens
  ADD COLUMN IF NOT EXISTS dashboard_section text,
  ADD COLUMN IF NOT EXISTS dashboard_order integer DEFAULT 0;

COMMENT ON COLUMN public.screens.dashboard_section IS 'Identificador de secciÃ³n del dashboard (p.e. confecciÃ³n, tapicerÃ­a, pendientes).';
COMMENT ON COLUMN public.screens.dashboard_order IS 'Orden relativo dentro de la secciÃ³n del dashboard.';

COMMIT;

-- MIGRACIÓN: 20251105131500_migrate_user_messages_to_direct.sql

-- =====================================================================
-- MIGRACIÃ“N: Consolidar mensajerÃ­a en public.direct_messages
-- =====================================================================
-- Objetivo:
--   * Migrar los datos existentes de public.user_messages
--     hacia public.direct_messages.
--   * Eliminar la tabla legacy y las funciones asociadas.
--   * Reinstaurar las funciones RPC basadas en direct_messages.
-- =====================================================================

BEGIN;

-- 1. Copiar historial antiguo (si existe) a la nueva tabla
INSERT INTO public.direct_messages (
  id,
  sender_id,
  recipient_id,
  content,
  message_type,
  metadata,
  read_at,
  created_at,
  updated_at
)
SELECT
  um.id,
  um.from_profile_id AS sender_id,
  um.to_profile_id AS recipient_id,
  um.message AS content,
  CASE
    WHEN um.message_type IN ('text', 'image', 'file', 'system') THEN um.message_type
    ELSE 'text'
  END AS message_type,
  '{}'::jsonb AS metadata,
  um.read_at,
  um.created_at,
  COALESCE(um.read_at, um.created_at)
FROM public.user_messages um
ON CONFLICT (id) DO NOTHING;

-- 2. Eliminar funciones legacy basadas en user_messages
DROP FUNCTION IF EXISTS public.send_direct_message(uuid, text, text);
DROP FUNCTION IF EXISTS public.send_direct_message(uuid, text, text, jsonb);
DROP FUNCTION IF EXISTS public.mark_messages_as_read(uuid[]);

-- 3. Eliminar la tabla legacy
DROP TABLE IF EXISTS public.user_messages CASCADE;

-- 4. Re-crear las funciones RPC oficiales sobre direct_messages
CREATE OR REPLACE FUNCTION public.send_direct_message(
  p_recipient_id UUID,
  p_content TEXT,
  p_message_type TEXT DEFAULT 'text',
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS TABLE (
  success BOOLEAN,
  message_id UUID,
  error_message TEXT
) AS $$
DECLARE
  v_sender_id UUID;
  v_message_id UUID;
BEGIN
  SELECT id INTO v_sender_id
  FROM public.profiles
  WHERE auth_user_id = auth.uid();

  IF v_sender_id IS NULL THEN
    RETURN QUERY SELECT false, NULL::UUID, 'Usuario no encontrado'::TEXT;
    RETURN;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_recipient_id) THEN
    RETURN QUERY SELECT false, NULL::UUID, 'Destinatario no encontrado'::TEXT;
    RETURN;
  END IF;

  INSERT INTO public.direct_messages (
    sender_id,
    recipient_id,
    content,
    message_type,
    metadata
  )
  VALUES (
    v_sender_id,
    p_recipient_id,
    p_content,
    p_message_type,
    COALESCE(p_metadata, '{}'::jsonb)
  )
  RETURNING id INTO v_message_id;

  RETURN QUERY SELECT true, v_message_id, NULL::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.mark_messages_read(p_sender_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_current_user_id UUID;
  v_count INTEGER;
BEGIN
  SELECT id INTO v_current_user_id
  FROM public.profiles
  WHERE auth_user_id = auth.uid();

  IF v_current_user_id IS NULL THEN
    RETURN 0;
  END IF;

  UPDATE public.direct_messages
  SET read_at = NOW()
  WHERE sender_id = p_sender_id
    AND recipient_id = v_current_user_id
    AND read_at IS NULL;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.send_direct_message TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_messages_read TO authenticated;

COMMIT;

-- MIGRACIÓN: 20251106093000_fix_upsert_task_signature.sql

-- Repara la signatura de upsert_task para alinear Back y Front
-- Fecha: 2025-11-06

BEGIN;

DROP FUNCTION IF EXISTS public.upsert_task;

CREATE OR REPLACE FUNCTION public.upsert_task(
  p_task_id UUID DEFAULT NULL,
  p_screen_id UUID DEFAULT NULL,
  p_data JSONB DEFAULT '{}'::jsonb,
  p_state TEXT DEFAULT 'pendiente',
  p_status TEXT DEFAULT 'pendiente',
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL,
  p_location TEXT DEFAULT NULL,
  p_location_metadata JSONB DEFAULT '{}'::jsonb,
  p_work_site_id UUID DEFAULT NULL,
  p_responsible_profile_id UUID DEFAULT NULL,
  p_assigned_to UUID DEFAULT NULL,
  p_assigned_profiles UUID[] DEFAULT NULL,
  p_assigned_vehicles UUID[] DEFAULT NULL
)
RETURNS TABLE (
  result_task_id UUID,
  result_action TEXT
) AS $$
DECLARE
  v_task_id UUID;
  v_action TEXT;
  v_user_role TEXT;
  v_permission_action TEXT;
  v_location_metadata JSONB := COALESCE(p_location_metadata, '{}'::jsonb);
BEGIN
  SELECT role INTO v_user_role
  FROM public.profiles
  WHERE auth_user_id = auth.uid();

  IF p_task_id IS NULL THEN
    v_permission_action := 'create';
  ELSE
    v_permission_action := 'edit';
  END IF;

  IF NOT public.has_permission(v_user_role, 'screens', v_permission_action) THEN
    RAISE EXCEPTION 'No tienes permisos para % tareas', v_permission_action;
  END IF;

  IF p_screen_id IS NULL THEN
    RAISE EXCEPTION 'p_screen_id is required';
  END IF;

  IF p_state IS NULL OR p_status IS NULL THEN
    RAISE EXCEPTION 'Estado y status son obligatorios';
  END IF;

  IF p_task_id IS NULL THEN
    v_task_id := COALESCE(p_task_id, uuid_generate_v4());
    INSERT INTO public.screen_data (
      id,
      screen_id,
      data,
      state,
      status,
      start_date,
      end_date,
      location,
      location_metadata,
      work_site_id,
      responsible_profile_id,
      assigned_to
    ) VALUES (
      v_task_id,
      p_screen_id,
      p_data,
      p_state,
      p_status,
      p_start_date,
      p_end_date,
      p_location,
      v_location_metadata,
      p_work_site_id,
      p_responsible_profile_id,
      p_assigned_to
    );

    v_action := 'created';
  ELSE
    v_task_id := p_task_id;

    UPDATE public.screen_data
    SET
      data = p_data,
      state = p_state,
      status = p_status,
      start_date = p_start_date,
      end_date = p_end_date,
      location = p_location,
      location_metadata = v_location_metadata,
      work_site_id = p_work_site_id,
      responsible_profile_id = p_responsible_profile_id,
      assigned_to = p_assigned_to,
      updated_at = NOW()
    WHERE id = v_task_id;

    v_action := 'updated';
  END IF;

  DELETE FROM public.task_profiles WHERE task_id = v_task_id;
  IF p_assigned_profiles IS NOT NULL THEN
    INSERT INTO public.task_profiles (task_id, profile_id)
    SELECT v_task_id, profile_id
    FROM UNNEST(p_assigned_profiles) AS profile_id;
  END IF;

  DELETE FROM public.task_vehicles WHERE task_id = v_task_id;
  IF p_assigned_vehicles IS NOT NULL THEN
    INSERT INTO public.task_vehicles (task_id, vehicle_id)
    SELECT v_task_id, vehicle_id
    FROM UNNEST(p_assigned_vehicles) AS vehicle_id;
  END IF;

  result_task_id := v_task_id;
  result_action := v_action;
  RETURN NEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.upsert_task(
  uuid,
  uuid,
  jsonb,
  text,
  text,
  date,
  date,
  text,
  jsonb,
  uuid,
  uuid,
  uuid,
  uuid[],
  uuid[]
) TO authenticated;

COMMENT ON FUNCTION public.upsert_task IS
'Funcion para crear o actualizar tareas con asignaciones y metadatos de ubicacion.';

COMMIT;
