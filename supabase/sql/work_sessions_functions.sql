-- ================================================================
-- RPCs para sesiones, incidencias y ubicaciones
-- Listas para pegar en el editor SQL de Supabase.
-- ================================================================

-- Asegurar extensiones básicas
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ================================================================
-- start_work_session
-- Cierra cualquier sesión activa previa del operario y abre una nueva.
-- ================================================================

CREATE OR REPLACE FUNCTION public.start_work_session(
  p_profile_id uuid,
  p_task_id uuid DEFAULT NULL,
  p_start_location jsonb DEFAULT NULL,
  p_device_info jsonb DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS TABLE (
  id uuid,
  profile_id uuid,
  task_id uuid,
  started_at timestamptz,
  ended_at timestamptz,
  start_location jsonb,
  end_location jsonb,
  device_info jsonb,
  status text,
  metadata jsonb,
  created_at timestamptz,
  updated_at timestamptz
) AS $$
DECLARE
  v_now timestamptz := now();
  v_session public.work_sessions%ROWTYPE;
BEGIN
  -- Cerrar sesiones activas previas
  UPDATE public.work_sessions AS ws
     SET status = 'completed',
         ended_at = COALESCE(ws.ended_at, v_now),
         end_location = COALESCE(ws.end_location, p_start_location),
         updated_at = v_now
  WHERE ws.profile_id = p_profile_id
    AND ws.status = 'active'
    AND ws.ended_at IS NULL;

  -- Insertar nueva sesión
  INSERT INTO public.work_sessions (
    profile_id,
    task_id,
    started_at,
    start_location,
    device_info,
    status,
    metadata,
    updated_at,
    created_at
  )
  VALUES (
    p_profile_id,
    p_task_id,
    v_now,
    p_start_location,
    p_device_info,
    'active',
    COALESCE(p_metadata, '{}'::jsonb),
    v_now,
    v_now
  )
  RETURNING * INTO v_session;

  RETURN QUERY
    SELECT
      w.id,
      w.profile_id,
      w.task_id,
      w.started_at,
      w.ended_at,
      w.start_location,
      w.end_location,
      w.device_info,
      w.status,
      w.metadata,
      w.created_at,
      w.updated_at
    FROM public.work_sessions w
    WHERE w.id = v_session.id;
END;
$$ LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public, extensions;

GRANT EXECUTE ON FUNCTION public.start_work_session(uuid, uuid, jsonb, jsonb, jsonb) TO authenticated;

-- ================================================================
-- end_work_session
-- Marca una sesión como completada/cerrada.
-- ================================================================

CREATE OR REPLACE FUNCTION public.end_work_session(
  p_session_id uuid,
  p_profile_id uuid DEFAULT NULL,
  p_end_location jsonb DEFAULT NULL,
  p_status text DEFAULT 'completed',
  p_metadata jsonb DEFAULT NULL
)
RETURNS public.work_sessions AS $$
DECLARE
  v_now timestamptz := now();
  v_session public.work_sessions;
BEGIN
  UPDATE public.work_sessions AS ws
     SET ended_at = COALESCE(ws.ended_at, v_now),
         end_location = COALESCE(p_end_location, ws.end_location),
         status = COALESCE(p_status, ws.status),
         metadata = CASE
           WHEN p_metadata IS NULL THEN ws.metadata
           ELSE jsonb_strip_nulls(ws.metadata || p_metadata)
         END,
         updated_at = v_now
  WHERE ws.id = p_session_id
    AND (p_profile_id IS NULL OR ws.profile_id = p_profile_id)
  RETURNING * INTO v_session;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No se encontró la sesión % o no pertenece al perfil indicado', p_session_id
      USING ERRCODE = 'P0002';
  END IF;

  RETURN v_session;
END;
$$ LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public, extensions;

GRANT EXECUTE ON FUNCTION public.end_work_session(uuid, uuid, jsonb, text, jsonb) TO authenticated;

-- ================================================================
-- report_incident
-- Registra una incidencia ligada a la sesión (y opcionalmente tarea).
-- ================================================================

CREATE OR REPLACE FUNCTION public.report_incident(
  p_session_id uuid,
  p_reported_by uuid,
  p_incident_type text,
  p_severity text DEFAULT 'medium',
  p_description text DEFAULT NULL,
  p_attachments jsonb DEFAULT '[]'::jsonb,
  p_task_id uuid DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS public.incident_reports AS $$
DECLARE
  v_session_task uuid;
  v_record public.incident_reports;
BEGIN
  SELECT ws.task_id
    INTO v_session_task
    FROM public.work_sessions AS ws
   WHERE ws.id = p_session_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Sesión % no existe', p_session_id
      USING ERRCODE = 'P0002';
  END IF;

  INSERT INTO public.incident_reports (
    session_id,
    task_id,
    reported_by,
    incident_type,
    severity,
    status,
    description,
    attachments,
    metadata
  )
  VALUES (
    p_session_id,
    COALESCE(p_task_id, v_session_task),
    p_reported_by,
    p_incident_type,
    COALESCE(p_severity, 'medium'),
    'new',
    p_description,
    COALESCE(p_attachments, '[]'::jsonb),
    COALESCE(p_metadata, '{}'::jsonb)
  )
  RETURNING * INTO v_record;

  RETURN v_record;
END;
$$ LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public, extensions;

GRANT EXECUTE ON FUNCTION public.report_incident(uuid, uuid, text, text, text, jsonb, uuid, jsonb) TO authenticated;

-- ================================================================
-- send_location_update
-- Registra una solicitud de ubicación para un operario.
-- ================================================================

CREATE OR REPLACE FUNCTION public.send_location_update(
  p_profile_id uuid,
  p_requested_by uuid,
  p_location jsonb,
  p_session_id uuid DEFAULT NULL,
  p_note text DEFAULT NULL,
  p_delivery_channel text DEFAULT 'in_app',
  p_expires_at timestamptz DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS public.location_updates AS $$
DECLARE
  v_record public.location_updates;
BEGIN
  IF p_location IS NULL THEN
    RAISE EXCEPTION 'Se requiere location (lat/lng)' USING ERRCODE = '23502';
  END IF;

  INSERT INTO public.location_updates (
    session_id,
    profile_id,
    requested_by,
    location,
    note,
    delivery_channel,
    expires_at,
    metadata
  )
  VALUES (
    p_session_id,
    p_profile_id,
    p_requested_by,
    jsonb_strip_nulls(p_location),
    p_note,
    COALESCE(p_delivery_channel, 'in_app'),
    p_expires_at,
    COALESCE(p_metadata, '{}'::jsonb)
  )
  RETURNING * INTO v_record;

  RETURN v_record;
END;
$$ LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public, extensions;

GRANT EXECUTE ON FUNCTION public.send_location_update(uuid, uuid, jsonb, uuid, text, text, timestamptz, jsonb) TO authenticated;
