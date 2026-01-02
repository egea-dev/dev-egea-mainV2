-- =====================================================
-- SCRIPT DE VERIFICACIÓN: Datos del Dashboard
-- =====================================================
-- Este script verifica si hay datos en las tablas
-- y muestra estadísticas básicas
-- =====================================================

-- 1. Verificar tablas principales
SELECT 'VERIFICANDO TABLAS PRINCIPALES' AS paso;

-- Verificar profiles
SELECT 
  'profiles' AS tabla,
  COUNT(*) AS total_registros,
  COUNT(CASE WHEN status = 'activo' THEN 1 END) AS activos,
  COUNT(CASE WHEN status = 'baja' THEN 1 END) AS bajas,
  COUNT(CASE WHEN status = 'vacaciones' THEN 1 END) AS vacaciones
FROM profiles;

-- Verificar vehicles
SELECT 
  'vehicles' AS tabla,
  COUNT(*) AS total_registros,
  COUNT(CASE WHEN is_active = true THEN 1 END) AS activos
FROM vehicles;

-- Verificar screens
SELECT 
  'screens' AS tabla,
  COUNT(*) AS total_registros,
  COUNT(CASE WHEN is_active = true THEN 1 END) AS activos
FROM screens;

-- Verificar screen_data (tareas)
SELECT 
  'screen_data' AS tabla,
  COUNT(*) AS total_registros,
  COUNT(CASE WHEN state = 'terminado' THEN 1 END) AS terminadas,
  COUNT(CASE WHEN state != 'terminado' THEN 1 END) AS pendientes,
  MIN(start_date) AS fecha_mas_antigua,
  MAX(start_date) AS fecha_mas_reciente
FROM screen_data;

-- 2. Verificar si existe la función get_dashboard_stats
SELECT 'VERIFICANDO SI EXISTE get_dashboard_stats' AS paso;

SELECT
  proname AS function_name,
  pg_get_functiondef(oid) AS definition
FROM pg_proc
WHERE proname = 'get_dashboard_stats';

-- Si la función existe, probarla
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_dashboard_stats') THEN
    RAISE NOTICE 'La función get_dashboard_stats existe. Ejecutándola...';
  ELSE
    RAISE NOTICE 'La función get_dashboard_stats NO EXISTE. Debes ejecutar las migraciones.';
  END IF;
END $$;

-- 3. Verificar vista detailed_tasks
SELECT 'VERIFICANDO VISTA detailed_tasks' AS paso;

SELECT 
  COUNT(*) AS total_tareas,
  COUNT(CASE WHEN screen_group = 'Instalaciones' THEN 1 END) AS instalaciones,
  COUNT(CASE WHEN screen_group = 'Confección' THEN 1 END) AS confeccion,
  COUNT(CASE WHEN screen_group = 'Tapicería' THEN 1 END) AS tapiceria
FROM detailed_tasks;

-- 4. Mostrar ejemplo de tareas si existen
SELECT 'MOSTRANDO EJEMPLOS DE TAREAS (máx 5)' AS paso;

SELECT 
  id,
  screen_group,
  state,
  start_date,
  site,
  description
FROM detailed_tasks
ORDER BY start_date DESC
LIMIT 5;

-- =====================================================
-- INTERPRETACIÓN DE RESULTADOS:
-- =====================================================
-- Si todos los contadores son 0:
--   → No hay datos en las tablas
--   → Necesitas insertar datos de prueba o reales
--
-- Si hay registros pero get_dashboard_stats() devuelve 0:
--   → Los datos están fuera del rango de fechas (muy antiguos)
--   → Prueba la consulta con rango amplio
--
-- Si get_dashboard_stats() con rango amplio funciona:
--   → Los datos existen pero son antiguos
--   → Actualiza las fechas o inserta datos recientes
-- =====================================================