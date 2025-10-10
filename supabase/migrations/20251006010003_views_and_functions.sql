
-- =====================================================================
-- MIGRACIÓN: VISTAS OPTIMIZADAS Y FUNCIONES
-- =====================================================================
-- Fecha: 2025-10-06
-- Objetivo: Crear vistas optimizadas y funciones de utilidad
-- =====================================================================

BEGIN;

-- =====================================================================
-- VISTA: detailed_tasks (vista optimizada para consultas de tareas)
-- =====================================================================

DROP VIEW IF EXISTS public.detailed_tasks;

CREATE OR REPLACE VIEW public.detailed_tasks AS
SELECT
  -- Datos básicos de la tarea
  sd.id,
  sd.created_at,
  sd.updated_at,
  sd.screen_id,
  sd.data,
  sd.state,
  sd.status,
  sd.start_date,
  sd.end_date,
  sd.location,
  sd.responsible_profile_id,
  sd.assigned_to,
  sd.checkin_token,
  sd."order",

  -- Información del screen asociado
  s.name AS screen_name,
  s.screen_type,
  s.screen_group,
  s.next_screen_id,
  s.header_color,
  s.is_active AS screen_is_active,
  s.refresh_interval_sec,

  -- Información del responsable (responsible_profile_id)
  rp.full_name AS responsible_name,
  rp.email AS responsible_email,
  rp.phone AS responsible_phone,
  rp.role AS responsible_role,
  rp.status AS responsible_status,
  rp.avatar_url AS responsible_avatar,

  -- Información del assigned_to (puede ser diferente del responsible)
  ap.full_name AS assigned_name,
  ap.email AS assigned_email,
  ap.phone AS assigned_phone,
  ap.role AS assigned_role,
  ap.status AS assigned_status,

  -- Campos JSON aplanados para facilitar el acceso
  sd.data->>'site' AS site,
  sd.data->>'client' AS client,
  sd.data->>'address' AS address,
  sd.data->>'description' AS description,
  sd.data->>'notes' AS notes,
  sd.data->>'vehicle_type' AS vehicle_type,

  -- Operarios asignados (array agregado desde task_profiles)
  COALESCE(
    (
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', p.id,
          'full_name', p.full_name,
          'email', p.email,
          'phone', p.phone,
          'status', p.status,
          'avatar_url', p.avatar_url,
          'role', p.role
        ) ORDER BY p.full_name
      )
      FROM public.task_profiles tp
      JOIN public.profiles p ON tp.profile_id = p.id
      WHERE tp.task_id = sd.id
    ),
    '[]'::jsonb
  ) AS assigned_profiles,

  -- Vehículos asignados (array agregado desde task_vehicles)
  COALESCE(
    (
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', v.id,
          'name', v.name,
          'type', v.type,
          'license_plate', v.license_plate,
          'capacity', v.capacity
        ) ORDER BY v.name
      )
      FROM public.task_vehicles tv
      JOIN public.vehicles v ON tv.vehicle_id = v.id
      WHERE tv.task_id = sd.id
    ),
    '[]'::jsonb
  ) AS assigned_vehicles,

  -- Contadores útiles
  (
    SELECT COUNT(*)
    FROM public.task_profiles tp
    WHERE tp.task_id = sd.id
  ) AS assigned_profiles_count,

  (
    SELECT COUNT(*)
    FROM public.task_vehicles tv
    WHERE tv.task_id = sd.id
  ) AS assigned_vehicles_count,

  -- Indicadores de estado útiles
  CASE
    WHEN sd.state = 'terminado' THEN true
    ELSE false
  END AS is_completed,

  CASE
    WHEN sd.state = 'urgente' THEN true
    ELSE false
  END AS is_urgent,

  CASE
    WHEN sd.start_date <= CURRENT_DATE AND sd.end_date >= CURRENT_DATE THEN true
    ELSE false
  END AS is_current,

  CASE
    WHEN sd.end_date < CURRENT_DATE AND sd.state != 'terminado' THEN true
    ELSE false
  END AS is_overdue,

  CASE
    WHEN sd.start_date > CURRENT_DATE THEN true
    ELSE false
  END AS is_future,

  -- Días hasta/desde la tarea
  CASE
    WHEN sd.start_date IS NULL THEN NULL
    WHEN sd.start_date = CURRENT_DATE THEN 0
    WHEN sd.start_date > CURRENT_DATE THEN sd.start_date - CURRENT_DATE
    ELSE CURRENT_DATE - sd.start_date
  END AS days_from_start,

  -- Prioridad calculada
  CASE
    WHEN sd.state = 'urgente' THEN 1
    WHEN sd.state = 'incidente' THEN 2
    WHEN sd.state = 'arreglo' THEN 3
    WHEN sd.is_overdue THEN 4
    WHEN sd.state = 'en fabricacion' THEN 5
    WHEN sd.state = 'a la espera' THEN 6
    ELSE 7
  END AS priority_order

FROM public.screen_data sd
LEFT JOIN public.screens s ON sd.screen_id = s.id
LEFT JOIN public.profiles rp ON sd.responsible_profile_id = rp.id
LEFT JOIN public.profiles ap ON sd.assigned_to = ap.id;

-- =====================================================================
-- VISTA: user_workload (carga de trabajo por usuario)
-- =====================================================================

DROP VIEW IF EXISTS public.user_workload;

CREATE OR REPLACE VIEW public.user_workload AS
SELECT
  p.id AS profile_id,
  p.full_name,
  p.email,
  p.role,
  p.status,
  COUNT(DISTINCT tp.task_id) AS total_tasks,
  COUNT(DISTINCT CASE WHEN sd.state != 'terminado' THEN tp.task_id END) AS active_tasks,
  COUNT(DISTINCT CASE WHEN sd.state = 'urgente' THEN tp.task_id END) AS urgent_tasks,
  COUNT(DISTINCT CASE WHEN sd.is_overdue THEN tp.task_id END) AS overdue_tasks,
  COUNT(DISTINCT CASE WHEN sd.start_date = CURRENT_DATE THEN tp.task_id END) AS today_tasks,
  COUNT(DISTINCT CASE WHEN sd.start_date <= CURRENT_DATE AND sd.end_date >= CURRENT_DATE THEN tp.task_id END) AS current_tasks,
  STRING_AGG(DISTINCT s.screen_group, ', ') AS working_groups
FROM public.profiles p
LEFT JOIN public.task_profiles tp ON p.id = tp.profile_id
LEFT JOIN public.screen_data sd ON tp.task_id = sd.id
LEFT JOIN public.screens s ON sd.screen_id = s.id
WHERE p.status = 'activo'
GROUP BY p.id, p.full_name, p.email, p.role, p.status;

-- =====================================================================
-- VISTA: vehicle_utilization (utilización de vehículos)
-- =====================================================================

DROP VIEW IF EXISTS public.vehicle_utilization;

CREATE OR REPLACE VIEW public.vehicle_utilization AS
SELECT
  v.id AS vehicle_id,
  v.name,
  v.type,
  v.license_plate,
  v.capacity,
  v.is_active,
  COUNT(DISTINCT tv.task_id) AS total_assignments,
  COUNT(DISTINCT CASE WHEN sd.state != 'terminado' THEN tv.task_id END) AS active_assignments,
  COUNT(DISTINCT CASE WHEN sd.start_date = CURRENT_DATE THEN tv.task_id END) AS today_assignments,
  COUNT(DISTINCT CASE WHEN sd.start_date <= CURRENT_DATE AND sd.end_date >= CURRENT_DATE THEN tv.task_id END) AS current_assignments,
  ROUND(
    (COUNT(DISTINCT CASE WHEN sd.state != 'terminado' THEN tv.task_id END)::float / NULLIF(v.capacity, 0)) * 100, 
    2
  ) AS utilization_percentage
FROM public.vehicles v
LEFT JOIN public.task_vehicles tv ON v.id = tv.vehicle_id
LEFT JOIN public.screen_data sd ON tv.task_id = sd.id
WHERE v.is_active = true
GROUP BY v.id, v.name, v.type, v.license_plate, v.capacity, v.is_active;

-- =====================================================================
-- VISTA: task_summary (resumen de tareas por grupo y estado)
-- =====================================================================

DROP VIEW IF EXISTS public.task_summary;

CREATE OR REPLACE VIEW public.task_summary AS
SELECT
  s.screen_group,
  sd.state,
  sd.status,
  COUNT(*) AS task_count,
  COUNT(CASE WHEN sd.start_date = CURRENT_DATE THEN 1 END) AS today_count,
  COUNT(CASE WHEN sd.is_overdue THEN 1 END) AS overdue_count,
  COUNT(CASE WHEN sd.state = 'urgente' THEN 1 END) AS urgent_count,
  COUNT(CASE WHEN sd.state = 'terminado' THEN 1 END) AS completed_count,
  ROUND(
    (COUNT(CASE WHEN sd.state = 'terminado' THEN 1 END)::float / NULLIF(COUNT(*), 0)) * 100, 
    2
  ) AS completion_percentage
FROM public.screen_data sd
JOIN public.screens s ON sd.screen_id = s.id
WHERE s.is_active = true
GROUP BY s.screen_group, sd.state, sd.status
ORDER BY s.screen_group, sd.state;

-- =====================================================================
-- FUNCIONES RPC (Remote Procedure Calls)
-- =====================================================================

-- Función para upsert de tarea (crear o actualizar)
CREATE OR REPLACE FUNCTION public.upsert_task(
  p_task_id UUID DEFAULT NULL,
  p_screen_id UUID,
  p_data JSONB DEFAULT '{}'::jsonb,
  p_state TEXT DEFAULT 'pendiente',
  p_status TEXT DEFAULT 'pendiente',
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL,
  p_location TEXT DEFAULT NULL,
  p_responsible_profile_id UUID DEFAULT NULL,
  p_assigned_to UUID DEFAULT NULL,
  p_assigned_profiles UUID[] DEFAULT NULL,
  p_assigned_vehicles UUID[] DEFAULT NULL
)
RETURNS TABLE (
  task_id UUID,
  action TEXT
) AS $$
DECLARE
  v_task_id UUID;
  v_action TEXT;
BEGIN
  -- Validar que el estado sea válido
  IF p_state NOT IN ('pendiente', 'urgente', 'en fabricacion', 'a la espera', 'terminado', 'incidente', 'arreglo') THEN
    RAISE EXCEPTION 'Estado inválido: %', p_state;
  END IF;

  -- Validar que el status sea válido
  IF p_status NOT IN ('pendiente', 'acabado', 'en progreso') THEN
    RAISE EXCEPTION 'Status inválido: %', p_status;
  END IF;

  -- Upsert de la tarea
  INSERT INTO public.screen_data (
    id, screen_id, data, state, status, start_date, end_date, 
    location, responsible_profile_id, assigned_to
  ) VALUES (
    p_task_id, p_screen_id, p_data, p_state, p_status, p_start_date, 
    p_end_date, p_location, p_responsible_profile_id, p_assigned_to
  )
  ON CONFLICT (id) DO UPDATE SET
    data = EXCLUDED.data,
    state = EXCLUDED.state,
    status = EXCLUDED.status,
    start_date = EXCLUDED.start_date,
    end_date = EXCLUDED.end_date,
    location = EXCLUDED.location,
    responsible_profile_id = EXCLUDED.responsible_profile_id,
    assigned_to = EXCLUDED.assigned_to,
    updated_at = NOW()
  RETURNING id INTO v_task_id;

  -- Determinar acción realizada
  IF p_task_id IS NULL THEN
    v_action := 'created';
  ELSE
    v_action := 'updated';
  END IF;

  -- Eliminar asignaciones existentes si hay nuevas
  IF p_assigned_profiles IS NOT NULL OR p_assigned_vehicles IS NOT NULL THEN
    DELETE FROM public.task_profiles WHERE task_id = v_task_id;
    DELETE FROM public.task_vehicles WHERE task_id = v_task_id;
  END IF;

  -- Insertar nuevas asignaciones de perfiles
  IF p_assigned_profiles IS NOT NULL THEN
    INSERT INTO public.task_profiles (task_id, profile_id)
    SELECT v_task_id, unnest(p_assigned_profiles);
  END IF;

  -- Insertar nuevas asignaciones de vehículos
  IF p_assigned_vehicles IS NOT NULL THEN
    INSERT INTO public.task_vehicles (task_id, vehicle_id)
    SELECT v_task_id, unnest(p_assigned_vehicles);
  END IF;

  RETURN QUERY SELECT v_task_id, v_action;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.upsert_task TO authenticated;

-- Función para archivar tareas completadas
CREATE OR REPLACE FUNCTION public.archive_completed_tasks(
  p_days_old INTEGER DEFAULT 1
)
RETURNS TABLE (
  archived_count INTEGER,
  message TEXT
) AS $$
DECLARE
  v_archived_count INTEGER := 0;
  v_cutoff_date DATE;
BEGIN
  v_cutoff_date := CURRENT_DATE - p_days_old;

  -- Insertar tareas completadas en archived_tasks
  WITH archived AS (
    INSERT INTO public.archived_tasks (
      id, archived_at, data, status, state,
      start_date, end_date, location,
      responsible_profile_id, responsible_name,
      assigned_users, assigned_vehicles
    )
    SELECT
      sd.id,
      NOW() AS archived_at,
      sd.data,
      sd.status,
      sd.state,
      sd.start_date,
      sd.end_date,
      sd.location,
      sd.responsible_profile_id,
      rp.full_name AS responsible_name,
      -- Operarios asignados
      COALESCE(
        (
          SELECT jsonb_agg(
            jsonb_build_object(
              'id', p.id,
              'full_name', p.full_name,
              'email', p.email
            )
          )
          FROM public.task_profiles tp
          JOIN public.profiles p ON tp.profile_id = p.id
          WHERE tp.task_id = sd.id
        ),
        '[]'::jsonb
      ) AS assigned_users,
      -- Vehículos asignados
      COALESCE(
        (
          SELECT jsonb_agg(
            jsonb_build_object(
              'id', v.id,
              'name', v.name,
              'type', v.type
            )
          )
          FROM public.task_vehicles tv
          JOIN public.vehicles v ON tv.vehicle_id = v.id
          WHERE tv.task_id = sd.id
        ),
        '[]'::jsonb
      ) AS assigned_vehicles
    FROM public.screen_data sd
    LEFT JOIN public.profiles rp ON sd.responsible_profile_id = rp.id
    WHERE
      sd.state = 'terminado'
      AND sd.end_date < v_cutoff_date
      -- Evitar duplicados verificando que no exista ya en archived_tasks
      AND NOT EXISTS (
        SELECT 1 FROM public.archived_tasks at
        WHERE at.id = sd.id
      )
    RETURNING id
  )
  SELECT COUNT(*)::INTEGER INTO v_archived_count FROM archived;

  -- Eliminar las tareas que acabamos de archivar
  IF v_archived_count > 0 THEN
    DELETE FROM public.screen_data
    WHERE id IN (
      SELECT id FROM public.archived_tasks
      WHERE archived_at >= NOW() - INTERVAL '5 minutes'
    )
    AND state = 'terminado'
    AND end_date < v_cutoff_date;
  END IF;

  RETURN QUERY SELECT v_archived_count,
    format('Archivadas %d tareas completadas con más de %d días', v_archived_count, p_days_old);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.archive_completed_tasks TO authenticated;

-- Función para generar token de check-in
CREATE OR REPLACE FUNCTION public.generate_checkin_token(p_task_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_token TEXT;
BEGIN
  -- Generar token único
  v_token := encode(sha256(p_task_id::text || NOW()::text || random()::text), 'hex');
  
  -- Actualizar tarea con el token
  UPDATE public.screen_data
  SET checkin_token = v_token
  WHERE id = p_task_id;
  
  RETURN v_token;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.generate_checkin_token TO authenticated;

-- Función para verificar y completar check-in
CREATE OR REPLACE FUNCTION public.complete_checkin(p_token TEXT, p_location TEXT DEFAULT NULL)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT,
  task_id UUID
) AS $$
DECLARE
  v_task_id UUID;
  v_current_state TEXT;
BEGIN
  -- Buscar tarea por token
  SELECT id, state INTO v_task_id, v_current_state
  FROM public.screen_data
  WHERE checkin_token = p_token;
  
  -- Si no se encuentra la tarea
  IF v_task_id IS NULL THEN
    RETURN QUERY SELECT false, 'Token inválido o expirado', NULL::UUID;
    RETURN;
  END IF;
  
  -- Si ya está completada
  IF v_current_state = 'terminado' THEN
    RETURN QUERY SELECT false, 'Esta tarea ya está completada', v_task_id;
    RETURN;
  END IF;
  
  -- Actualizar tarea
  UPDATE public.screen_data
  SET
    state = 'terminado',
    status = 'acabado',
    location = COALESCE(p_location, location),
    checkin_token = NULL,
    updated_at = NOW()
  WHERE id = v_task_id;
  
  RETURN QUERY SELECT true, 'Check-in completado exitosamente', v_task_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.complete_checkin TO authenticated, anon;

-- Función para obtener estadísticas del dashboard
CREATE OR REPLACE FUNCTION public.get_dashboard_stats(p_date_from DATE DEFAULT NULL, p_date_to DATE DEFAULT NULL)
RETURNS TABLE (
  total_tasks BIGINT,
  completed_tasks BIGINT,
  pending_tasks BIGINT,
  urgent_tasks BIGINT,
  overdue_tasks BIGINT,
  active_users BIGINT,
  active_vehicles BIGINT,
  completion_rate NUMERIC
) AS $$
DECLARE
  v_date_condition TEXT := '';
  v_total BIGINT;
  v_completed BIGINT;
BEGIN
  -- Si no se especifican fechas, contar todas las tareas activas
  IF p_date_from IS NULL AND p_date_to IS NULL THEN
    v_date_condition := '';
  ELSE
    v_date_condition := format(' AND sd.start_date BETWEEN %L AND %L',
      COALESCE(p_date_from, CURRENT_DATE - INTERVAL '30 days'),
      COALESCE(p_date_to, CURRENT_DATE));
  END IF;

  -- Contar tareas activas (no completadas)
  EXECUTE format('
    SELECT COUNT(*)
    FROM public.screen_data sd
    JOIN public.screens s ON sd.screen_id = s.id
    WHERE s.is_active = true
    AND sd.state != ''terminado''%s', v_date_condition) INTO v_total;

  -- Contar tareas completadas
  EXECUTE format('
    SELECT COUNT(*)
    FROM public.screen_data sd
    JOIN public.screens s ON sd.screen_id = s.id
    WHERE s.is_active = true
    AND sd.state = ''terminado''%s', v_date_condition) INTO v_completed;

  RETURN QUERY SELECT
    (v_total + v_completed) AS total_tasks,
    v_completed AS completed_tasks,
    v_total AS pending_tasks,
    (
      SELECT COUNT(*)
      FROM public.screen_data sd
      JOIN public.screens s ON sd.screen_id = s.id
      WHERE s.is_active = true
        AND sd.state = 'urgente'
        AND (p_date_from IS NULL AND p_date_to IS NULL OR sd.start_date BETWEEN COALESCE(p_date_from, CURRENT_DATE - INTERVAL '30 days') AND COALESCE(p_date_to, CURRENT_DATE))
    ) AS urgent_tasks,
    (
      SELECT COUNT(*)
      FROM public.screen_data sd
      JOIN public.screens s ON sd.screen_id = s.id
      WHERE s.is_active = true
        AND sd.end_date < CURRENT_DATE
        AND sd.state != 'terminado'
        AND (p_date_from IS NULL AND p_date_to IS NULL OR sd.start_date BETWEEN COALESCE(p_date_from, CURRENT_DATE - INTERVAL '30 days') AND COALESCE(p_date_to, CURRENT_DATE))
    ) AS overdue_tasks,
    (
      SELECT COUNT(DISTINCT p.id)
      FROM public.profiles p
      WHERE p.status = 'activo'
    ) AS active_users,
    (
      SELECT COUNT(*)
      FROM public.vehicles
      WHERE is_active = true
    ) AS active_vehicles,
    CASE
      WHEN (v_total + v_completed) > 0 THEN ROUND((v_completed::NUMERIC / (v_total + v_completed)::NUMERIC) * 100, 2)
      ELSE 0
    END AS completion_rate;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.get_dashboard_stats TO authenticated;

-- =====================================================================
-- PERMISOS PARA VISTAS
-- =====================================================================

GRANT SELECT ON public.detailed_tasks TO authenticated, anon;
GRANT SELECT ON public.user_workload TO authenticated;
GRANT SELECT ON public.vehicle_utilization TO authenticated;
GRANT SELECT ON public.task_summary TO authenticated;

-- =====================================================================
-- COMENTARIOS DE DOCUMENTACIÓN
-- =====================================================================

COMMENT ON VIEW public.detailed_tasks IS 'Vista optimizada que une screen_data con profiles, vehicles y screens. Incluye campos JSON aplanados y arrays agregados.';
COMMENT ON VIEW public.user_workload IS 'Vista que muestra la carga de trabajo de cada usuario con contadores de tareas.';
COMMENT ON VIEW public.vehicle_utilization IS 'Vista que muestra la utilización de vehículos y su capacidad actual.';
COMMENT ON VIEW public.task_summary IS 'Vista que resume las tareas por grupo y estado con estadísticas.';

COMMENT ON FUNCTION public.upsert_task IS 'Función para crear o actualizar tareas con sus asignaciones.';
COMMENT ON FUNCTION public.archive_completed_tasks IS 'Función para archivar automáticamente tareas completadas.';
COMMENT ON FUNCTION public.generate_checkin_token IS 'Función para generar token único de check-in para tareas.';
COMMENT ON FUNCTION public.complete_checkin IS 'Función para completar check-in usando token.';
COMMENT ON FUNCTION public.get_dashboard_stats IS 'Función para obtener estadísticas del dashboard.';

COMMIT;

-- =====================================================================
-- NOTAS DE IMPLEMENTACIÓN
-- =====================================================================
-- 1. Las vistas optimizadas reducen la complejidad de queries en el frontend
-- 2. Las funciones RPC encapsulan lógica de negocio compleja
-- 3. Todas las funciones usan SECURITY DEFINER para evitar problemas de RLS
-- 4. Los tokens de check-in permiten acceso público a funciones específicas
-- 5. Las estadísticas del dashboard facilitan la creación de dashboards
-- =====================================================================