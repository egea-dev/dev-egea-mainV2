-- =====================================================
-- APLICAR EN SUPABASE SQL EDITOR
-- =====================================================
-- Recrear la tabla archived_tasks con todas las columnas necesarias
-- =====================================================

-- 1. Eliminar tabla existente (CUIDADO: esto borra los datos)
DROP TABLE IF EXISTS public.archived_tasks CASCADE;

-- 2. Recrear tabla con estructura correcta
CREATE TABLE public.archived_tasks (
  id UUID PRIMARY KEY,
  archived_at TIMESTAMPTZ DEFAULT NOW(),
  data JSONB,
  status TEXT,
  state TEXT,
  start_date DATE,
  end_date DATE,
  location TEXT,
  responsible_profile_id UUID,
  assigned_users JSONB,
  assigned_vehicles JSONB
);

-- 3. Habilitar RLS
ALTER TABLE public.archived_tasks ENABLE ROW LEVEL SECURITY;

-- 4. Crear políticas RLS
DROP POLICY IF EXISTS "Los admins pueden ver las tareas archivadas" ON public.archived_tasks;
DROP POLICY IF EXISTS "Los admins pueden insertar tareas archivadas" ON public.archived_tasks;
DROP POLICY IF EXISTS "Los admins pueden eliminar tareas archivadas" ON public.archived_tasks;

CREATE POLICY "Los admins pueden ver las tareas archivadas"
ON public.archived_tasks
FOR SELECT
TO authenticated
USING (
  (SELECT role FROM public.profiles WHERE auth_user_id = auth.uid()) = 'admin'
);

CREATE POLICY "Los admins pueden insertar tareas archivadas"
ON public.archived_tasks
FOR INSERT
TO authenticated
WITH CHECK (
  (SELECT role FROM public.profiles WHERE auth_user_id = auth.uid()) = 'admin'
);

CREATE POLICY "Los admins pueden eliminar tareas archivadas"
ON public.archived_tasks
FOR DELETE
TO authenticated
USING (
  (SELECT role FROM public.profiles WHERE auth_user_id = auth.uid()) = 'admin'
);

-- 5. Verificar la estructura
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'archived_tasks'
ORDER BY ordinal_position;
