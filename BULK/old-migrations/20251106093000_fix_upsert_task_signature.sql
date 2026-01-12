-- Repara la signatura de upsert_task para alinear Back y Front
-- Fecha: 2025-11-06

BEGIN;

DROP FUNCTION IF EXISTS public.upsert_task;

CREATE OR REPLACE FUNCTION public.upsert_task(
  p_task_id UUID DEFAULT NULL,
  p_screen_id UUID DEFAULT NULL,
  p_data JSONB DEFAULT '{}'::jsonb,
  p_state TEXT DEFAULT 'pendiente',
  p_status TEXT DEFAULT 'pendiente',
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL,
  p_location TEXT DEFAULT NULL,
  p_location_metadata JSONB DEFAULT '{}'::jsonb,
  p_work_site_id UUID DEFAULT NULL,
  p_responsible_profile_id UUID DEFAULT NULL,
  p_assigned_to UUID DEFAULT NULL,
  p_assigned_profiles UUID[] DEFAULT NULL,
  p_assigned_vehicles UUID[] DEFAULT NULL
)
RETURNS TABLE (
  result_task_id UUID,
  result_action TEXT
) AS $$
DECLARE
  v_task_id UUID;
  v_action TEXT;
  v_user_role TEXT;
  v_permission_action TEXT;
  v_location_metadata JSONB := COALESCE(p_location_metadata, '{}'::jsonb);
BEGIN
  SELECT role INTO v_user_role
  FROM public.profiles
  WHERE auth_user_id = auth.uid();

  IF p_task_id IS NULL THEN
    v_permission_action := 'create';
  ELSE
    v_permission_action := 'edit';
  END IF;

  IF NOT public.has_permission(v_user_role, 'screens', v_permission_action) THEN
    RAISE EXCEPTION 'No tienes permisos para % tareas', v_permission_action;
  END IF;

  IF p_screen_id IS NULL THEN
    RAISE EXCEPTION 'p_screen_id is required';
  END IF;

  IF p_state IS NULL OR p_status IS NULL THEN
    RAISE EXCEPTION 'Estado y status son obligatorios';
  END IF;

  IF p_task_id IS NULL THEN
    v_task_id := COALESCE(p_task_id, uuid_generate_v4());
    INSERT INTO public.screen_data (
      id,
      screen_id,
      data,
      state,
      status,
      start_date,
      end_date,
      location,
      location_metadata,
      work_site_id,
      responsible_profile_id,
      assigned_to
    ) VALUES (
      v_task_id,
      p_screen_id,
      p_data,
      p_state,
      p_status,
      p_start_date,
      p_end_date,
      p_location,
      v_location_metadata,
      p_work_site_id,
      p_responsible_profile_id,
      p_assigned_to
    );

    v_action := 'created';
  ELSE
    v_task_id := p_task_id;

    UPDATE public.screen_data
    SET
      data = p_data,
      state = p_state,
      status = p_status,
      start_date = p_start_date,
      end_date = p_end_date,
      location = p_location,
      location_metadata = v_location_metadata,
      work_site_id = p_work_site_id,
      responsible_profile_id = p_responsible_profile_id,
      assigned_to = p_assigned_to,
      updated_at = NOW()
    WHERE id = v_task_id;

    v_action := 'updated';
  END IF;

  DELETE FROM public.task_profiles WHERE task_id = v_task_id;
  IF p_assigned_profiles IS NOT NULL THEN
    INSERT INTO public.task_profiles (task_id, profile_id)
    SELECT v_task_id, profile_id
    FROM UNNEST(p_assigned_profiles) AS profile_id;
  END IF;

  DELETE FROM public.task_vehicles WHERE task_id = v_task_id;
  IF p_assigned_vehicles IS NOT NULL THEN
    INSERT INTO public.task_vehicles (task_id, vehicle_id)
    SELECT v_task_id, vehicle_id
    FROM UNNEST(p_assigned_vehicles) AS vehicle_id;
  END IF;

  result_task_id := v_task_id;
  result_action := v_action;
  RETURN NEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.upsert_task(
  uuid,
  uuid,
  jsonb,
  text,
  text,
  date,
  date,
  text,
  jsonb,
  uuid,
  uuid,
  uuid,
  uuid[],
  uuid[]
) TO authenticated;

COMMENT ON FUNCTION public.upsert_task IS
'Funcion para crear o actualizar tareas con asignaciones y metadatos de ubicacion.';

COMMIT;
