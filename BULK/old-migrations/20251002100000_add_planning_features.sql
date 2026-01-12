-- ========= GESTIÓN DE USUARIOS Y EQUIPOS =========

-- Tabla para perfiles de usuario extendidos
-- Se vincula 1 a 1 con la tabla de autenticación de Supabase (auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  team TEXT,
  status TEXT DEFAULT 'activo' NOT NULL -- Ej: 'activo', 'baja', 'vacaciones'
);

-- Habilitar RLS y definir políticas para perfiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Los usuarios pueden ver su propio perfil"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Los administradores pueden gestionar todos los perfiles"
  ON public.profiles FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND team = 'admin')); -- Asumimos un rol/equipo 'admin'


-- ========= GESTIÓN DE VEHÍCULOS =========

-- Tabla para almacenar los vehículos
CREATE TABLE IF NOT EXISTS public.vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT -- Ej: 'CAMION', 'JUMPER', 'FURGONETA'
);

-- Habilitar RLS y políticas para vehículos
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Los usuarios autenticados pueden ver los vehículos"
  ON public.vehicles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Los administradores pueden gestionar los vehículos"
  ON public.vehicles FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND team = 'admin'));


-- ========= MEJORAS EN TAREAS (SCREEN_DATA) =========

-- Añadir columnas a la tabla de datos de pantalla (tareas)
ALTER TABLE public.screen_data
  ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL, -- Usuario asignado
  ADD COLUMN IF NOT EXISTS due_date DATE, -- Fecha de vencimiento para ordenar
  ADD COLUMN IF NOT EXISTS checkin_token TEXT UNIQUE, -- Token único para el checking de la tarea
  ADD COLUMN IF NOT EXISTS "order" INTEGER; -- Para el orden manual (drag-and-drop)

-- Tabla de unión para asignar múltiples vehículos a una tarea
CREATE TABLE IF NOT EXISTS public.task_vehicles (
  task_id UUID REFERENCES public.screen_data(id) ON DELETE CASCADE,
  vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE CASCADE,
  PRIMARY KEY (task_id, vehicle_id)
);

-- Habilitar RLS y políticas para la tabla de unión
ALTER TABLE public.task_vehicles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Los usuarios autenticados pueden ver las asignaciones de vehículos"
  ON public.task_vehicles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Los administradores pueden gestionar las asignaciones"
  ON public.task_vehicles FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND team = 'admin'));


-- ========= MEJORAS EN PANTALLAS (SCREENS) =========

-- Añadir columna para vincular pantallas (ej: pendiente -> acabado)
ALTER TABLE public.screens
  ADD COLUMN IF NOT EXISTS next_screen_id UUID REFERENCES public.screens(id) ON DELETE SET NULL;

-- Añadir columna para grupos de pantallas (ej: 'Corte', 'Planchado')
ALTER TABLE public.screens
  ADD COLUMN IF NOT EXISTS screen_group TEXT;
