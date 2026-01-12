-- =====================================================================
-- MIGRACIÓN: Corregir función get_dashboard_stats para dashboard
-- =====================================================================
-- Fecha: 2025-10-09
-- Problema: Los contadores del dashboard mostraban 0 cuando había datos
--           porque la función filtraba por fechas (últimos 30 días)
-- Solución: Cuando no se pasan parámetros de fecha, contar todas las tareas
-- =====================================================================

BEGIN;

-- Función corregida para obtener estadísticas del dashboard
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

-- Actualizar comentario de documentación
COMMENT ON FUNCTION public.get_dashboard_stats IS 'Función para obtener estadísticas del dashboard. Si no se pasan fechas, cuenta todas las tareas activas.';

COMMIT;

-- =====================================================================
-- INSTRUCCIONES PARA APLICAR
-- =====================================================================
-- 1. Ejecutar este archivo en el SQL Editor de Supabase
-- 2. Recargar la aplicación (Ctrl + F5)
-- 3. Los contadores del dashboard deberían mostrar los valores correctos
-- =====================================================================