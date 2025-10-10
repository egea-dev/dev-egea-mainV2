-- FASE 1: Evolución del Esquema de BD para funcionalidades de planificación avanzadas (Versión Corregida)
BEGIN;

-- TAREA 1.1.1: Modificar 'screen_data' para rangos de fecha.
-- Este bloque es idempotente: se ejecuta de forma segura tanto si 'due_date' existe como si no.
DO $$
BEGIN
    -- Comprueba si la columna 'due_date' existe.
    IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name='screen_data' AND column_name='due_date') THEN
        -- Si existe, la renombramos a 'start_date', que es más seguro que añadir/borrar.
        ALTER TABLE public.screen_data RENAME COLUMN due_date TO start_date;
        -- Añadimos la nueva columna 'end_date'.
        ALTER TABLE public.screen_data ADD COLUMN IF NOT EXISTS end_date DATE;
        -- Poblamos 'end_date' con el valor de 'start_date' para los registros existentes.
        UPDATE public.screen_data SET end_date = start_date;
    ELSE
        -- Si 'due_date' no existe, nos aseguramos de que 'start_date' y 'end_date' existan.
        ALTER TABLE public.screen_data ADD COLUMN IF NOT EXISTS start_date DATE;
        ALTER TABLE public.screen_data ADD COLUMN IF NOT EXISTS end_date DATE;
    END IF;
END $$;

-- TAREA 1.1.1 (Continuación): Añadir ubicación y responsable.
ALTER TABLE public.screen_data ADD COLUMN IF NOT EXISTS location TEXT CHECK (location IN ('en la isla', 'fuera'));
ALTER TABLE public.screen_data ADD COLUMN IF NOT EXISTS responsible_profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- TAREA 1.1.2: Añadir nuevo estado 'urgente' y otros al campo 'state'.
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

-- TAREA 1.1.7: Añadir color de cabecera a 'screens'.
ALTER TABLE public.screens ADD COLUMN IF NOT EXISTS header_color TEXT;

-- TAREA 1.1.8: Crear índices para optimizar rendimiento.
CREATE INDEX IF NOT EXISTS idx_screen_data_dates ON public.screen_data(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_screen_data_responsible ON public.screen_data(responsible_profile_id);
CREATE INDEX IF NOT EXISTS idx_user_availability_profile_id ON public.user_availability(profile_id);

COMMIT;

-- ========= PLAN DE ROLLBACK (En caso de fallo) =========
-- BEGIN;
-- ALTER TABLE public.screen_data ADD COLUMN due_date DATE;
-- UPDATE public.screen_data SET due_date = start_date;
-- ALTER TABLE public.screen_data DROP COLUMN start_date, DROP COLUMN end_date, DROP COLUMN location, DROP COLUMN responsible_profile_id;
-- ALTER TABLE public.profiles DROP COLUMN phone, DROP COLUMN role, DROP COLUMN avatar_url;
-- DROP TABLE IF EXISTS public.user_availability;
-- DROP TABLE IF EXISTS public.archived_tasks;
-- DROP TABLE IF EXISTS public.shared_plans;
-- ALTER TABLE public.screens DROP COLUMN header_color;
-- COMMIT;