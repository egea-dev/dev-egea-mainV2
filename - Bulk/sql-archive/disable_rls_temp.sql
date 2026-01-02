-- ==================================================================================
-- DESHABILITAR RLS TEMPORALMENTE - SOLO PARA DIAGNÓSTICO
-- ==================================================================================
-- ⚠️ ADVERTENCIA: Esto deshabilita la seguridad temporalmente
-- ⚠️ SOLO ejecutar en desarrollo, NUNCA en producción
-- ==================================================================================

BEGIN;

-- Deshabilitar RLS en todas las tablas
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.screen_data DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_availability DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_vehicles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.shared_plans DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.archived_tasks DISABLE ROW LEVEL SECURITY;

-- Deshabilitar en screens y templates si existen
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'screens') THEN
    ALTER TABLE public.screens DISABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'templates') THEN
    ALTER TABLE public.templates DISABLE ROW LEVEL SECURITY;
  END IF;
END $$;

COMMIT;

-- ==================================================================================
-- ⚠️ AHORA LA BASE DE DATOS ESTÁ SIN PROTECCIÓN RLS
-- ⚠️ Recarga la app y verifica si funciona
-- ⚠️ Si funciona, el problema es RLS. Usa enable_rls_correct.sql después
-- ==================================================================================
