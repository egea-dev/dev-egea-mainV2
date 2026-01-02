-- ==================================================================================
-- ⚡ SOLUCIÓN INMEDIATA - EJECUTA ESTO EN SUPABASE AHORA
-- ==================================================================================
-- 1. Ve a: https://supabase.com/dashboard/project/llcjtkksaqzbijwgqwou/sql/new
-- 2. Copia TODO este archivo
-- 3. Pega y haz clic en RUN
-- 4. Recarga la app (Ctrl+Shift+R)
-- ==================================================================================

-- DESHABILITAR RLS EN TODAS LAS TABLAS
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.screen_data DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_availability DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_vehicles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.shared_plans DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.archived_tasks DISABLE ROW LEVEL SECURITY;

-- AGREGAR COLUMNA STATUS SI NO EXISTE
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'activo';

-- ==================================================================================
-- ✅ LISTO - Recarga la app ahora
-- ==================================================================================
