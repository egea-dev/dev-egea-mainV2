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
BEGIN
  -- Cerrar sesiones activas previas
  UPDATE public.work_sessions
     SET status = 'completed',
         ended_at = COALESCE(ended_at, v_now),
         end_location = COALESCE(end_location, p_start_location),
         updated_at = v_now
   WHERE profile_id = p_profile_id
     AND status = 'active'
     AND ended_at IS NULL;

  -- Insertar nueva sesión
  INSERT INTO public.work_sessions (
    profile_id,
    task_id,
    started_at,
    start_location,
    device_info,
    status,
    metadata
  )
  VALUES (
    p_profile_id,
    p_task_id,
    v_now,
    p_start_location,
    p_device_info,
    'active',
    COALESCE(p_metadata, '{}'::jsonb)
  )
  RETURNING * INTO STRICT
    id,
    profile_id,
    task_id,
    started_at,
    ended_at,
    start_location,
    end_location,
    device_info,
    status,
    metadata,
    created_at,
    updated_at;

  RETURN NEXT;
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
  UPDATE public.work_sessions
     SET ended_at = COALESCE(ended_at, v_now),
         end_location = COALESCE(p_end_location, end_location),
         status = COALESCE(p_status, status),
         metadata = CASE
           WHEN p_metadata IS NULL THEN metadata
           ELSE jsonb_strip_nulls(metadata || p_metadata)
         END,
         updated_at = v_now
   WHERE id = p_session_id
     AND (p_profile_id IS NULL OR profile_id = p_profile_id)
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
  SELECT task_id
    INTO v_session_task
    FROM public.work_sessions
   WHERE id = p_session_id;

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
