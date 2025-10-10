-- ==================================================================================
-- VERIFICAR POLÍTICAS RLS - Comprobar que las políticas permiten leer las tareas
-- ==================================================================================
-- EJECUTAR EN: Dashboard Supabase > SQL Editor
-- ==================================================================================

-- 1. Ver todas las políticas activas en screen_data
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'screen_data';

-- 2. Ver todas las políticas activas en task_profiles
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'task_profiles';

-- 3. Ver todas las políticas activas en task_vehicles
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'task_vehicles';

-- 4. Probar si puedes leer las tareas (simular una consulta desde la app)
-- Esto debería devolver las tareas creadas recientemente
SELECT
  sd.id,
  sd.start_date,
  sd.data,
  (
    SELECT jsonb_agg(jsonb_build_object('profiles', jsonb_build_object('id', p.id, 'full_name', p.full_name)))
    FROM task_profiles tp
    JOIN profiles p ON tp.profile_id = p.id
    WHERE tp.task_id = sd.id
  ) as task_profiles,
  (
    SELECT jsonb_agg(jsonb_build_object('vehicles', jsonb_build_object('id', v.id, 'name', v.name)))
    FROM task_vehicles tv
    JOIN vehicles v ON tv.vehicle_id = v.id
    WHERE tv.task_id = sd.id
  ) as task_vehicles
FROM screen_data sd
WHERE sd.start_date >= CURRENT_DATE
ORDER BY sd.start_date
LIMIT 5;
