-- ==================================================================================
-- DEBUG COMPLETO - Verificar cada paso de la carga de tareas
-- ==================================================================================

-- PASO 1: ¿Cuál es la fecha actual del servidor?
SELECT CURRENT_DATE as fecha_servidor, NOW() as hora_servidor;

-- PASO 2: ¿Existe la tarea que creaste?
SELECT
  id,
  start_date,
  end_date,
  state,
  location,
  data,
  created_at
FROM screen_data
WHERE id = '6eab816e-6a44-463b-971a-4199f1845b4a';

-- PASO 3: ¿La tarea cumple la condición start_date >= CURRENT_DATE?
SELECT
  id,
  start_date,
  CURRENT_DATE as fecha_hoy,
  (start_date >= CURRENT_DATE) as cumple_condicion
FROM screen_data
WHERE id = '6eab816e-6a44-463b-971a-4199f1845b4a';

-- PASO 4: ¿Existen las relaciones con operarios?
SELECT
  tp.task_id,
  tp.profile_id,
  p.full_name as operario
FROM task_profiles tp
LEFT JOIN profiles p ON tp.profile_id = p.id
WHERE tp.task_id = '6eab816e-6a44-463b-971a-4199f1845b4a';

-- PASO 5: ¿Existen las relaciones con vehículos?
SELECT
  tv.task_id,
  tv.vehicle_id,
  v.name as vehiculo
FROM task_vehicles tv
LEFT JOIN vehicles v ON tv.vehicle_id = v.id
WHERE tv.task_id = '6eab816e-6a44-463b-971a-4199f1845b4a';

-- PASO 6: ¿La consulta completa del dashboard devuelve esta tarea?
SELECT
  sd.id,
  sd.start_date,
  sd.data->>'site' as sitio,
  sd.data->>'description' as descripcion,
  (
    SELECT jsonb_agg(
      jsonb_build_object(
        'profiles', jsonb_build_object(
          'id', p.id,
          'full_name', p.full_name
        )
      )
    )
    FROM task_profiles tp
    JOIN profiles p ON tp.profile_id = p.id
    WHERE tp.task_id = sd.id
  ) as task_profiles,
  (
    SELECT jsonb_agg(
      jsonb_build_object(
        'vehicles', jsonb_build_object(
          'id', v.id,
          'name', v.name
        )
      )
    )
    FROM task_vehicles tv
    JOIN vehicles v ON tv.vehicle_id = v.id
    WHERE tv.task_id = sd.id
  ) as task_vehicles
FROM screen_data sd
WHERE sd.start_date >= CURRENT_DATE
ORDER BY sd.start_date ASC;

-- PASO 7: ¿Hay algún error en las políticas RLS?
-- Verificar si las políticas permiten SELECT
SELECT
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('screen_data', 'task_profiles', 'task_vehicles')
  AND cmd = 'SELECT';
