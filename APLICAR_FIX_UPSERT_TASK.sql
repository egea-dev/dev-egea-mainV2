-- =====================================================================
-- FIX PARA LA FUNCIÓN upsert_task
-- Ejecuta este SQL directamente en el SQL Editor de Supabase
-- =====================================================================

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
BEGIN
  -- Validar parámetros requeridos
  IF p_screen_id IS NULL THEN
    RAISE EXCEPTION 'p_screen_id is required';
  END IF;

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
    COALESCE(p_task_id, gen_random_uuid()), p_screen_id, p_data, p_state, p_status, p_start_date,
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
    DELETE FROM public.task_profiles WHERE public.task_profiles.task_id = v_task_id;
    DELETE FROM public.task_vehicles WHERE public.task_vehicles.task_id = v_task_id;
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

  RETURN QUERY SELECT v_task_id AS result_task_id, v_action AS result_action;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.upsert_task TO authenticated;

COMMENT ON FUNCTION public.upsert_task IS 'Función para crear o actualizar tareas con sus asignaciones. Versión corregida con parámetros actualizados.';