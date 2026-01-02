-- ==================================================================================
-- MIGRACIÓN COMPLETA - Aplicar todas las funciones RPC necesarias
-- ==================================================================================
-- Ejecutar en: Dashboard Supabase > SQL Editor
-- ==================================================================================

BEGIN;

-- =============================================
-- 1. CREAR/ACTUALIZAR FUNCIÓN upsert_task
-- =============================================

CREATE OR REPLACE FUNCTION public.upsert_task(
    task_id_in uuid,
    start_date_in date,
    end_date_in date,
    site_in text,
    description_in text,
    location_in text,
    responsible_id_in uuid,
    user_ids uuid[],
    vehicle_ids uuid[]
)
RETURNS uuid AS $$
DECLARE
    new_task_id uuid;
BEGIN
    -- Insertar o actualizar la tarea en la tabla screen_data
    IF task_id_in IS NULL THEN
        -- Insertar nueva tarea si no se proporciona ID
        INSERT INTO public.screen_data (
            start_date,
            end_date,
            data,
            state,
            location,
            responsible_profile_id
        )
        VALUES (
            start_date_in,
            end_date_in,
            jsonb_build_object('site', site_in, 'description', description_in),
            'pendiente',
            location_in,
            responsible_id_in
        )
        RETURNING id INTO new_task_id;
    ELSE
        -- Actualizar tarea existente
        UPDATE public.screen_data
        SET
            start_date = start_date_in,
            end_date = end_date_in,
            data = jsonb_build_object('site', site_in, 'description', description_in),
            location = location_in,
            responsible_profile_id = responsible_id_in
        WHERE id = task_id_in
        RETURNING id INTO new_task_id;
    END IF;

    -- Gestionar relaciones con operarios (profiles)
    DELETE FROM public.task_profiles WHERE task_id = new_task_id;
    IF array_length(user_ids, 1) > 0 THEN
        INSERT INTO public.task_profiles (task_id, profile_id)
        SELECT new_task_id, unnest(user_ids);
    END IF;

    -- Gestionar relaciones con vehículos
    DELETE FROM public.task_vehicles WHERE task_id = new_task_id;
    IF array_length(vehicle_ids, 1) > 0 THEN
        INSERT INTO public.task_vehicles (task_id, vehicle_id)
        SELECT new_task_id, unnest(vehicle_ids);
    END IF;

    RETURN new_task_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.upsert_task(uuid, date, date, text, text, text, uuid, uuid[], uuid[]) TO authenticated;

-- =============================================
-- 2. FUNCIÓN get_user_workload
-- =============================================

CREATE OR REPLACE FUNCTION public.get_user_workload(user_id uuid, target_date date)
RETURNS int AS $$
DECLARE
  task_count int;
BEGIN
  SELECT COUNT(*) INTO task_count
  FROM public.screen_data
  WHERE responsible_profile_id = user_id
  AND target_date >= start_date AND target_date <= end_date
  AND state <> 'terminado';

  RETURN task_count;
END;
$$ LANGUAGE plpgsql STABLE;

GRANT EXECUTE ON FUNCTION public.get_user_workload(uuid, date) TO authenticated;

-- =============================================
-- 3. FUNCIÓN get_user_status
-- =============================================

CREATE OR REPLACE FUNCTION public.get_user_status(user_id uuid, target_date date)
RETURNS text AS $$
DECLARE
  current_status text;
BEGIN
  -- Revisar disponibilidad (vacaciones/baja)
  SELECT status INTO current_status
  FROM public.user_availability
  WHERE profile_id = user_id
  AND target_date >= start_date AND target_date <= end_date
  LIMIT 1;

  IF FOUND THEN
    RETURN current_status;
  END IF;

  -- Estado general del perfil
  SELECT status INTO current_status
  FROM public.profiles
  WHERE id = user_id;

  RETURN current_status;
END;
$$ LANGUAGE plpgsql STABLE;

GRANT EXECUTE ON FUNCTION public.get_user_status(uuid, date) TO authenticated;

-- =============================================
-- 4. FUNCIÓN archive_completed_tasks
-- =============================================

CREATE OR REPLACE FUNCTION public.archive_completed_tasks()
RETURNS void AS $$
BEGIN
  INSERT INTO public.archived_tasks (
    id, data, state, start_date, end_date, location,
    responsible_profile_id, responsible_name, assigned_users, assigned_vehicles
  )
  SELECT
    sd.id,
    sd.data,
    sd.state,
    sd.start_date,
    sd.end_date,
    sd.location,
    sd.responsible_profile_id,
    p.full_name,
    (SELECT jsonb_agg(jsonb_build_object('id', pr.id, 'full_name', pr.full_name))
     FROM public.task_profiles tp
     JOIN public.profiles pr ON tp.profile_id = pr.id
     WHERE tp.task_id = sd.id),
    (SELECT jsonb_agg(jsonb_build_object('id', v.id, 'name', v.name))
     FROM public.task_vehicles tv
     JOIN public.vehicles v ON tv.vehicle_id = v.id
     WHERE tv.task_id = sd.id)
  FROM public.screen_data sd
  LEFT JOIN public.profiles p ON sd.responsible_profile_id = p.id
  WHERE sd.state = 'terminado' AND sd.end_date < (NOW() - INTERVAL '1 day');

  DELETE FROM public.screen_data
  WHERE id IN (SELECT id FROM public.archived_tasks WHERE archived_at >= NOW() - INTERVAL '1 minute');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.archive_completed_tasks() TO authenticated;

COMMIT;

-- ==================================================================================
-- ✅ VERIFICAR FUNCIONES CREADAS
-- ==================================================================================

SELECT
  proname as function_name,
  pg_get_function_arguments(oid) as arguments
FROM pg_proc
WHERE pronamespace = 'public'::regnamespace
  AND proname IN ('upsert_task', 'get_user_workload', 'get_user_status', 'archive_completed_tasks', 'is_admin')
ORDER BY proname;
