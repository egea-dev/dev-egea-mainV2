-- =====================================================================
-- RPC: archive_task_by_id - archiva una tarea individual inmediatamente
-- =====================================================================
-- Fecha: 2025-10-11
-- Objetivo: Permitir que el panel admin archive tareas puntuales desde UI
-- =====================================================================

BEGIN;

DROP FUNCTION IF EXISTS public.archive_task_by_id(UUID);

CREATE OR REPLACE FUNCTION public.archive_task_by_id(p_task_id UUID)
RETURNS TABLE(archived BOOLEAN, message TEXT) AS $$
DECLARE
  v_actor public.profiles;
  v_inserted INTEGER := 0;
BEGIN
  SELECT *
    INTO v_actor
    FROM public.profiles
    WHERE auth_user_id = auth.uid();

  IF v_actor IS NULL THEN
    RETURN QUERY SELECT false, 'No existe un perfil asociado al usuario autenticado';
    RETURN;
  END IF;

  IF NOT public.has_permission(v_actor.role, 'archive', 'create') THEN
    RETURN QUERY SELECT false, 'No tienes permisos para archivar tareas';
    RETURN;
  END IF;

  WITH moved AS (
    INSERT INTO public.archived_tasks (
      id,
      archived_at,
      data,
      status,
      state,
      start_date,
      end_date,
      location,
      responsible_profile_id,
      responsible_name,
      assigned_users,
      assigned_vehicles,
      archived_by
    )
    SELECT
      sd.id,
      NOW(),
      sd.data,
      sd.status,
      sd.state,
      sd.start_date,
      sd.end_date,
      sd.location,
      sd.responsible_profile_id,
      rp.full_name AS responsible_name,
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
      ) AS assigned_vehicles,
      v_actor.id AS archived_by
    FROM public.screen_data sd
    LEFT JOIN public.profiles rp ON sd.responsible_profile_id = rp.id
    WHERE sd.id = p_task_id
    ON CONFLICT (id) DO NOTHING
    RETURNING id
  )
  SELECT COUNT(*) INTO v_inserted FROM moved;

  IF v_inserted = 0 THEN
    RETURN QUERY SELECT false, 'La tarea no existe o ya fue archivada';
    RETURN;
  END IF;

  DELETE FROM public.screen_data WHERE id = p_task_id;

  RETURN QUERY SELECT true, 'Tarea archivada correctamente';
EXCEPTION
  WHEN others THEN
    RETURN QUERY SELECT false, SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.archive_task_by_id(UUID) TO authenticated;

COMMIT;

-- =====================================================================
-- Uso:
--   SELECT * FROM public.archive_task_by_id('00000000-0000-0000-0000-000000000000');
-- =====================================================================
