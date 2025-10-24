-- ================================================================
-- Diagnostics Fase 1: integridad de estados y ubicaciones
-- Ejecutar en Supabase SQL Editor o desde CLI antes de aplicar cambios.
-- ================================================================

-- 1. Estados fuera de catálogo esperado
SELECT
  sd.state,
  COUNT(*) AS task_count
FROM public.screen_data sd
GROUP BY sd.state
ORDER BY task_count DESC;

-- Estados no contemplados explícitamente (segunda pasada)
SELECT
  sd.state,
  COUNT(*) AS task_count
FROM public.screen_data sd
WHERE LOWER(COALESCE(sd.state, '')) NOT IN (
  'urgente',
  'incidente',
  'arreglo',
  'terminado',
  'en fabricacion',
  'a la espera',
  'pendiente'
)
GROUP BY sd.state
ORDER BY task_count DESC;

-- 2. Ubicaciones faltantes susceptibles de backfill
SELECT
  sd.id,
  sd.screen_id,
  sd.state,
  sd.location,
  sd.data ->> 'site'      AS site,
  sd.data ->> 'client'    AS client,
  sd.data ->> 'address'   AS address,
  sd.data ->> 'direccion' AS direccion,
  sd.data ->> 'ubicacion' AS ubicacion
FROM public.screen_data sd
WHERE (sd.location IS NULL OR TRIM(sd.location) = '')
  AND (
    COALESCE(TRIM(sd.data ->> 'site'), '') <> ''
    OR COALESCE(TRIM(sd.data ->> 'client'), '') <> ''
    OR COALESCE(TRIM(sd.data ->> 'address'), '') <> ''
    OR COALESCE(TRIM(sd.data ->> 'direccion'), '') <> ''
    OR COALESCE(TRIM(sd.data ->> 'ubicacion'), '') <> ''
  )
ORDER BY sd.updated_at DESC
LIMIT 100;

-- 3. Ubicaciones presentes pero potencialmente inválidas
SELECT
  sd.id,
  sd.screen_id,
  sd.state,
  sd.location
FROM public.screen_data sd
WHERE sd.location IS NOT NULL
  AND LOWER(TRIM(sd.location)) IN (
    'n/a',
    'na',
    'pendiente',
    'sin direccion',
    'sin dirección',
    'por definir',
    'tbd'
  )
ORDER BY sd.updated_at DESC
LIMIT 100;

-- 4. Tareas activas sin perfiles asignados
SELECT
  sd.id,
  sd.screen_id,
  sd.state,
  sd.status,
  COUNT(tp.profile_id) AS profiles_assigned
FROM public.screen_data sd
LEFT JOIN public.task_profiles tp ON tp.task_id = sd.id
WHERE sd.state <> 'terminado'
GROUP BY sd.id, sd.screen_id, sd.state, sd.status
HAVING COUNT(tp.profile_id) = 0
ORDER BY sd.updated_at DESC
LIMIT 100;

-- 5. Fechas inconsistentes (start_date posterior a end_date)
SELECT
  sd.id,
  sd.screen_id,
  sd.state,
  sd.start_date,
  sd.end_date
FROM public.screen_data sd
WHERE sd.start_date IS NOT NULL
  AND sd.end_date IS NOT NULL
  AND sd.start_date > sd.end_date
ORDER BY sd.start_date DESC
LIMIT 100;

