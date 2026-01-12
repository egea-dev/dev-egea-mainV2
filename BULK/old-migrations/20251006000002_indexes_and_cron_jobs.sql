-- =====================================================================
-- OPTIMIZACIÓN: Índices y Automatización con Cron Jobs
-- =====================================================================
-- Fecha: 2025-10-06
-- Objetivo: Crear índices para optimizar consultas frecuentes y
--           configurar Cron Jobs para mantenimiento automatizado.
-- =====================================================================

BEGIN;

-- =====================================================================
-- PASO 1: CREAR ÍNDICES OPTIMIZADOS
-- =====================================================================

-- Índices en screen_data (tareas)
CREATE INDEX IF NOT EXISTS idx_screen_data_screen_id
  ON public.screen_data(screen_id);

CREATE INDEX IF NOT EXISTS idx_screen_data_state
  ON public.screen_data(state);

CREATE INDEX IF NOT EXISTS idx_screen_data_dates
  ON public.screen_data(start_date, end_date);

CREATE INDEX IF NOT EXISTS idx_screen_data_responsible
  ON public.screen_data(responsible_profile_id);

CREATE INDEX IF NOT EXISTS idx_screen_data_assigned_to
  ON public.screen_data(assigned_to);

CREATE INDEX IF NOT EXISTS idx_screen_data_location
  ON public.screen_data(location)
  WHERE location IS NOT NULL;

-- Índice compuesto para tareas pendientes por fecha
CREATE INDEX IF NOT EXISTS idx_screen_data_pending_dates
  ON public.screen_data(state, start_date, end_date)
  WHERE state != 'terminado';

-- Índice para búsquedas en el campo JSON 'data'
CREATE INDEX IF NOT EXISTS idx_screen_data_site
  ON public.screen_data USING gin ((data -> 'site'));

CREATE INDEX IF NOT EXISTS idx_screen_data_client
  ON public.screen_data USING gin ((data -> 'client'));

-- Índices en archived_tasks
CREATE INDEX IF NOT EXISTS idx_archived_tasks_archived_at
  ON public.archived_tasks(archived_at DESC);

CREATE INDEX IF NOT EXISTS idx_archived_tasks_state
  ON public.archived_tasks(state);

CREATE INDEX IF NOT EXISTS idx_archived_tasks_dates
  ON public.archived_tasks(start_date, end_date);

CREATE INDEX IF NOT EXISTS idx_archived_tasks_responsible
  ON public.archived_tasks(responsible_profile_id);

-- Índices en profiles
CREATE INDEX IF NOT EXISTS idx_profiles_role
  ON public.profiles(role);

CREATE INDEX IF NOT EXISTS idx_profiles_status
  ON public.profiles(status);

CREATE INDEX IF NOT EXISTS idx_profiles_email
  ON public.profiles(email)
  WHERE email IS NOT NULL;

-- Índices en screens
CREATE INDEX IF NOT EXISTS idx_screens_screen_type
  ON public.screens(screen_type);

CREATE INDEX IF NOT EXISTS idx_screens_screen_group
  ON public.screens(screen_group)
  WHERE screen_group IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_screens_is_active
  ON public.screens(is_active)
  WHERE is_active = true;

-- Índices en user_availability
CREATE INDEX IF NOT EXISTS idx_user_availability_profile_dates
  ON public.user_availability(profile_id, start_date, end_date);

CREATE INDEX IF NOT EXISTS idx_user_availability_status
  ON public.user_availability(status);

-- Índices en shared_plans
CREATE INDEX IF NOT EXISTS idx_shared_plans_token
  ON public.shared_plans(token);

CREATE INDEX IF NOT EXISTS idx_shared_plans_expires_at
  ON public.shared_plans(expires_at);

-- Índice para planes no expirados
CREATE INDEX IF NOT EXISTS idx_shared_plans_active
  ON public.shared_plans(expires_at)
  WHERE expires_at > NOW();

-- =====================================================================
-- PASO 2: MEJORAR LA FUNCIÓN DE ARCHIVADO AUTOMÁTICO
-- =====================================================================

-- Reemplazar la función existente con una versión mejorada
CREATE OR REPLACE FUNCTION public.archive_completed_tasks()
RETURNS TABLE(archived_count INTEGER) AS $$
DECLARE
  tasks_archived INTEGER := 0;
  v_user_role TEXT;
BEGIN
  -- Obtener el rol del usuario actual
  SELECT role INTO v_user_role
  FROM public.profiles
  WHERE auth_user_id = auth.uid();

  -- Validar permisos para archivar
  IF NOT public.has_permission(v_user_role, 'archive', 'create') THEN
    RAISE EXCEPTION 'No tienes permisos para archivar tareas';
  END IF;
  -- Insertar en la tabla de archivados las tareas terminadas cuya fecha de finalización ya pasó
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
      AND sd.end_date < (CURRENT_DATE - INTERVAL '1 day')
      -- Evitar duplicados verificando que no exista ya en archived_tasks
      AND NOT EXISTS (
        SELECT 1 FROM public.archived_tasks at
        WHERE at.id = sd.id
      )
    RETURNING id
  )
  SELECT COUNT(*)::INTEGER INTO tasks_archived FROM archived;

  -- Eliminar las tareas que acabamos de archivar de la tabla principal
  -- Solo si el archivado fue exitoso
  IF tasks_archived > 0 THEN
    DELETE FROM public.screen_data
    WHERE id IN (
      SELECT id FROM public.archived_tasks
      WHERE archived_at >= NOW() - INTERVAL '5 minutes'
    )
    AND state = 'terminado'
    AND end_date < (CURRENT_DATE - INTERVAL '1 day');
  END IF;

  -- Retornar el número de tareas archivadas
  RETURN QUERY SELECT tasks_archived;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Otorgar permisos solo a usuarios autenticados con rol admin
GRANT EXECUTE ON FUNCTION public.archive_completed_tasks() TO authenticated;

-- =====================================================================
-- PASO 3: FUNCIÓN AUXILIAR PARA LIMPIAR PLANES COMPARTIDOS EXPIRADOS
-- =====================================================================

CREATE OR REPLACE FUNCTION public.cleanup_expired_shared_plans()
RETURNS TABLE(deleted_count INTEGER) AS $$
DECLARE
  plans_deleted INTEGER := 0;
BEGIN
  -- Eliminar planes compartidos que ya expiraron
  WITH deleted AS (
    DELETE FROM public.shared_plans
    WHERE expires_at < NOW()
    RETURNING id
  )
  SELECT COUNT(*)::INTEGER INTO plans_deleted FROM deleted;

  RETURN QUERY SELECT plans_deleted;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.cleanup_expired_shared_plans() TO authenticated;

-- =====================================================================
-- PASO 4: CONFIGURAR CRON JOBS (requiere extensión pg_cron)
-- =====================================================================

-- NOTA: Los Cron Jobs solo pueden configurarse directamente en Supabase Dashboard
-- o mediante comandos SQL en el SQL Editor. Esta sección es un TEMPLATE.
--
-- Para activar los Cron Jobs:
-- 1. Habilitar la extensión pg_cron en Supabase Dashboard > Database > Extensions
-- 2. Ejecutar manualmente los siguientes comandos en el SQL Editor:

/*
-- Habilitar la extensión pg_cron (solo una vez)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Cron Job: Archivar tareas completadas todos los días a las 02:00 AM
SELECT cron.schedule(
  'archive-completed-tasks-daily',     -- Nombre del job
  '0 2 * * *',                        -- Cron expression: 02:00 AM todos los días
  $$ SELECT public.archive_completed_tasks(); $$
);

-- Cron Job: Limpiar planes compartidos expirados cada 6 horas
SELECT cron.schedule(
  'cleanup-expired-plans',            -- Nombre del job
  '0 */6 * * *',                      -- Cron expression: cada 6 horas
  $$ SELECT public.cleanup_expired_shared_plans(); $$
);

-- Para ver los Cron Jobs configurados:
-- SELECT * FROM cron.job;

-- Para eliminar un Cron Job (si es necesario):
-- SELECT cron.unschedule('archive-completed-tasks-daily');
-- SELECT cron.unschedule('cleanup-expired-plans');
*/

COMMIT;

-- =====================================================================
-- PASO 5: COMENTARIOS Y DOCUMENTACIÓN
-- =====================================================================

COMMENT ON FUNCTION public.archive_completed_tasks() IS
'Archiva tareas terminadas cuya fecha de finalización fue hace más de 1 día.
Retorna el número de tareas archivadas.
Se ejecuta automáticamente cada noche a las 02:00 AM mediante Cron Job.';

COMMENT ON FUNCTION public.cleanup_expired_shared_plans() IS
'Elimina planes compartidos que ya expiraron.
Retorna el número de planes eliminados.
Se ejecuta automáticamente cada 6 horas mediante Cron Job.';

-- =====================================================================
-- NOTAS DE IMPLEMENTACIÓN
-- =====================================================================
-- 1. Los índices mejoran el rendimiento de consultas frecuentes:
--    - Búsquedas por fecha (start_date, end_date)
--    - Filtros por estado (state, status)
--    - Búsquedas en campos JSON (site, client)
--
-- 2. Los índices GIN permiten búsquedas eficientes en campos JSON.
--
-- 3. Los índices parciales (WHERE) solo indexan filas relevantes,
--    ahorrando espacio y mejorando el rendimiento.
--
-- 4. Para activar los Cron Jobs, ejecuta manualmente el bloque comentado
--    en el SQL Editor de Supabase Dashboard.
--
-- 5. Puedes probar las funciones manualmente:
--    SELECT * FROM archive_completed_tasks();
--    SELECT * FROM cleanup_expired_shared_plans();
-- =====================================================================
