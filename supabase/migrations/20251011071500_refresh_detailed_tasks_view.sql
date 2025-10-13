-- =====================================================================
-- HOTFIX: Actualizar vista detailed_tasks con columnas completas
-- =====================================================================
-- Fecha: 2025-10-11
-- Motivo: La vista existente en producción no incluía los campos
--         esperados por el frontend (start_date, is_urgent, etc.),
--         provocando errores 400 en PostgREST.
-- =====================================================================

BEGIN;

DROP VIEW IF EXISTS public.user_workload;
DROP VIEW IF EXISTS public.task_summary;

DROP VIEW IF EXISTS public.detailed_tasks;

CREATE OR REPLACE VIEW public.detailed_tasks AS
SELECT
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

  s.name AS screen_name,
  s.screen_type,
  s.screen_group,
  s.next_screen_id,
  s.header_color,
  s.is_active AS screen_is_active,
  s.refresh_interval_sec,

  rp.full_name AS responsible_name,
  rp.email AS responsible_email,
  rp.phone AS responsible_phone,
  rp.role AS responsible_role,
  rp.status AS responsible_status,
  rp.avatar_url AS responsible_avatar,

  ap.full_name AS assigned_name,
  ap.email AS assigned_email,
  ap.phone AS assigned_phone,
  ap.role AS assigned_role,
  ap.status AS assigned_status,

  sd.data->>'site' AS site,
  sd.data->>'client' AS client,
  sd.data->>'address' AS address,
  sd.data->>'description' AS description,
  sd.data->>'notes' AS notes,
  sd.data->>'vehicle_type' AS vehicle_type,

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

  CASE
    WHEN sd.state = 'terminado' THEN true
    ELSE false
  END AS is_completed,

  CASE
    WHEN sd.state = 'urgente' THEN true
    ELSE false
  END AS is_urgent,

  CASE
    WHEN sd.start_date IS NOT NULL
      AND sd.start_date <= CURRENT_DATE
      AND (sd.end_date IS NULL OR sd.end_date >= CURRENT_DATE)
      THEN true
    ELSE false
  END AS is_current,

  CASE
    WHEN sd.end_date IS NOT NULL
      AND sd.end_date < CURRENT_DATE
      AND sd.state <> 'terminado'
      THEN true
    ELSE false
  END AS is_overdue,

  CASE
    WHEN sd.start_date IS NOT NULL
      AND sd.start_date > CURRENT_DATE
      THEN true
    ELSE false
  END AS is_future,

  CASE
    WHEN sd.start_date IS NULL THEN NULL
    ELSE (sd.start_date - CURRENT_DATE)
  END AS days_from_start,

  CASE
    WHEN sd.state = 'urgente' THEN 1
    WHEN sd.state = 'incidente' THEN 2
    WHEN sd.state = 'arreglo' THEN 3
    WHEN sd.state <> 'terminado'
      AND sd.end_date IS NOT NULL
      AND sd.end_date < CURRENT_DATE THEN 4
    WHEN sd.state = 'en fabricacion' THEN 5
    WHEN sd.state = 'a la espera' THEN 6
    ELSE 7
  END AS priority_order

FROM public.screen_data sd
LEFT JOIN public.screens s ON sd.screen_id = s.id
LEFT JOIN public.profiles rp ON sd.responsible_profile_id = rp.id
LEFT JOIN public.profiles ap ON sd.assigned_to = ap.id;

GRANT SELECT ON public.detailed_tasks TO authenticated, anon;

CREATE OR REPLACE VIEW public.user_workload AS
SELECT
  p.id AS profile_id,
  p.full_name,
  p.email,
  p.role,
  p.status,
  COUNT(DISTINCT tp.task_id) AS total_tasks,
  COUNT(DISTINCT CASE WHEN sd.state <> 'terminado' THEN tp.task_id END) AS active_tasks,
  COUNT(DISTINCT CASE WHEN sd.state = 'urgente' THEN tp.task_id END) AS urgent_tasks,
  COUNT(DISTINCT CASE WHEN sd.end_date IS NOT NULL AND sd.end_date < CURRENT_DATE AND sd.state <> 'terminado' THEN tp.task_id END) AS overdue_tasks,
  COUNT(DISTINCT CASE WHEN sd.start_date = CURRENT_DATE THEN tp.task_id END) AS today_tasks,
  COUNT(DISTINCT CASE WHEN sd.start_date IS NOT NULL AND sd.start_date <= CURRENT_DATE AND (sd.end_date IS NULL OR sd.end_date >= CURRENT_DATE) THEN tp.task_id END) AS current_tasks,
  STRING_AGG(DISTINCT s.screen_group, ', ' ORDER BY s.screen_group) AS working_groups
FROM public.profiles p
LEFT JOIN public.task_profiles tp ON p.id = tp.profile_id
LEFT JOIN public.screen_data sd ON tp.task_id = sd.id
LEFT JOIN public.screens s ON sd.screen_id = s.id
WHERE p.status = 'activo'
GROUP BY p.id, p.full_name, p.email, p.role, p.status;

CREATE OR REPLACE VIEW public.task_summary AS
SELECT
  s.screen_group,
  sd.state,
  sd.status,
  COUNT(*) AS task_count,
  COUNT(CASE WHEN sd.start_date = CURRENT_DATE THEN 1 END) AS today_count,
  COUNT(CASE WHEN sd.end_date IS NOT NULL AND sd.end_date < CURRENT_DATE AND sd.state <> 'terminado' THEN 1 END) AS overdue_count,
  COUNT(CASE WHEN sd.state = 'urgente' THEN 1 END) AS urgent_count,
  COUNT(CASE WHEN sd.state = 'terminado' THEN 1 END) AS completed_count,
  ROUND(
    (COUNT(CASE WHEN sd.state = 'terminado' THEN 1 END)::numeric / NULLIF(COUNT(*), 0)) * 100,
    2
  ) AS completion_percentage
FROM public.screen_data sd
JOIN public.screens s ON sd.screen_id = s.id
WHERE s.is_active = true
GROUP BY s.screen_group, sd.state, sd.status
ORDER BY s.screen_group, sd.state;

COMMIT;
