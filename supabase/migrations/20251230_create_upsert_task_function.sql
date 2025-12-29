-- =====================================================================
-- FIX COMPLETO: Crear función upsert_task en DB MAIN
-- Ejecutar en DB MAIN (jyaudpctcqcuskzwmism)
-- =====================================================================

BEGIN;

-- 2. Eliminar función anterior si existe
DROP FUNCTION IF EXISTS public.upsert_task;

-- 3. Crear función upsert_task
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
  -- Obtener rol del usuario actual
  SELECT role INTO v_user_role
  FROM public.profiles
  WHERE auth_user_id = auth.uid();

  -- Determinar acción para permisos
  IF p_task_id IS NULL THEN
    v_permission_action := 'create';
  ELSE
    v_permission_action := 'edit';
  END IF;

  -- Verificar permisos (si la función has_permission existe)
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'has_permission') THEN
    IF NOT public.has_permission(v_user_role, 'screens', v_permission_action) THEN
      RAISE EXCEPTION 'No tienes permisos para % tareas', v_permission_action;
    END IF;
  END IF;

  -- Validaciones
  IF p_screen_id IS NULL THEN
    RAISE EXCEPTION 'p_screen_id is required';
  END IF;

  IF p_state IS NULL OR p_status IS NULL THEN
    RAISE EXCEPTION 'Estado y status son obligatorios';
  END IF;

  -- Crear o actualizar tarea
  IF p_task_id IS NULL THEN
    -- CREAR nueva tarea
    v_task_id := gen_random_uuid();
    
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
    -- ACTUALIZAR tarea existente
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

  -- Gestionar asignaciones de perfiles
  DELETE FROM public.task_profiles WHERE task_id = v_task_id;
  IF p_assigned_profiles IS NOT NULL THEN
    INSERT INTO public.task_profiles (task_id, profile_id)
    SELECT v_task_id, profile_id
    FROM UNNEST(p_assigned_profiles) AS profile_id;
  END IF;

  -- Gestionar asignaciones de vehículos
  DELETE FROM public.task_vehicles WHERE task_id = v_task_id;
  IF p_assigned_vehicles IS NOT NULL THEN
    INSERT INTO public.task_vehicles (task_id, vehicle_id)
    SELECT v_task_id, vehicle_id
    FROM UNNEST(p_assigned_vehicles) AS vehicle_id;
  END IF;

  -- Retornar resultado
  result_task_id := v_task_id;
  result_action := v_action;
  RETURN NEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 4. Otorgar permisos
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

-- 5. Añadir comentario
COMMENT ON FUNCTION public.upsert_task IS
'Función para crear o actualizar tareas con asignaciones y metadatos de ubicación.';

COMMIT;

-- =====================================================================
-- VERIFICACIÓN
-- =====================================================================
SELECT 
    'Función upsert_task creada correctamente' as status,
    proname as function_name,
    pronargs as num_args
FROM pg_proc 
WHERE proname = 'upsert_task';
