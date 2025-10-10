-- =====================================================================
-- SOLUCIÓN TEMPORAL: DESHABILITAR RLS EN PROFILES PARA DIAGNOSTICAR
-- =====================================================================
-- EJECUTAR EN SQL EDITOR DE SUPABASE
-- ADVERTENCIA: Esto deshabilitará la seguridad temporalmente
-- =====================================================================

-- Deshabilitar RLS en la tabla profiles
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- Verificar que RLS esté deshabilitado
SELECT
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE tablename = 'profiles';

-- =====================================================================
-- NOTA: Con RLS deshabilitado, todos los usuarios autenticados podrán
-- ver todos los perfiles. Esto es solo temporal para diagnosticar.
-- Una vez que funcione, implementaremos una solución RLS correcta.
-- =====================================================================
