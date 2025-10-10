-- ==================================================================================
-- VERIFICAR DATOS - Comprobar que las tareas se están creando correctamente
-- ==================================================================================
-- EJECUTAR EN: Dashboard Supabase > SQL Editor
-- ==================================================================================

-- 1. Ver todas las tareas creadas recientemente
SELECT
  id,
  created_at,
  start_date,
  end_date,
  state,
  location,
  data->>'site' as sitio,
  data->>'description' as descripcion,
  responsible_profile_id
FROM public.screen_data
ORDER BY created_at DESC
LIMIT 10;

-- 2. Ver relaciones de tareas con operarios
SELECT
  tp.task_id,
  sd.data->>'site' as sitio,
  p.full_name as operario
FROM public.task_profiles tp
JOIN public.screen_data sd ON tp.task_id = sd.id
JOIN public.profiles p ON tp.profile_id = p.id
ORDER BY sd.created_at DESC
LIMIT 10;

-- 3. Ver relaciones de tareas con vehículos
SELECT
  tv.task_id,
  sd.data->>'site' as sitio,
  v.name as vehiculo
FROM public.task_vehicles tv
JOIN public.screen_data sd ON tv.task_id = sd.id
JOIN public.vehicles v ON tv.vehicle_id = v.id
ORDER BY sd.created_at DESC
LIMIT 10;

-- 4. Contar tareas por estado
SELECT
  state,
  COUNT(*) as total
FROM public.screen_data
GROUP BY state;

-- 5. Ver tareas de hoy en adelante (las que deberían aparecer en dashboard)
SELECT
  id,
  start_date,
  end_date,
  state,
  location,
  data->>'site' as sitio,
  data->>'description' as descripcion,
  (SELECT COUNT(*) FROM task_profiles WHERE task_id = screen_data.id) as num_operarios,
  (SELECT COUNT(*) FROM task_vehicles WHERE task_id = screen_data.id) as num_vehiculos
FROM public.screen_data
WHERE start_date >= CURRENT_DATE
ORDER BY start_date, created_at;
