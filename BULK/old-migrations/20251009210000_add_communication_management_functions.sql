-- =====================================================================
-- MIGRACIÓN: FUNCIONES DE GESTIÓN DE COMUNICACIONES CON VALIDACIÓN DE PERMISOS
-- =====================================================================
-- Fecha: 2025-10-09
-- Objetivo: Crear funciones RPC para gestión de comunicaciones con validación de permisos
-- =====================================================================

BEGIN;

-- Función para enviar mensajes directos
CREATE OR REPLACE FUNCTION public.send_direct_message(
  p_to_profile_id UUID,
  p_message TEXT,
  p_message_type TEXT DEFAULT 'text'
)
RETURNS TABLE (
  result_message_id UUID,
  result_action TEXT
) AS $$
DECLARE
  v_message_id UUID;
  v_user_role TEXT;
  v_from_profile_id UUID;
BEGIN
  -- Obtener el rol y perfil del usuario actual
  SELECT role, id INTO v_user_role, v_from_profile_id
  FROM public.profiles
  WHERE auth_user_id = auth.uid();

  -- Validar permisos para enviar comunicaciones
  IF NOT public.has_permission(v_user_role, 'communications', 'create') THEN
    RAISE EXCEPTION 'No tienes permisos para enviar mensajes';
  END IF;

  -- Validar parámetros
  IF p_to_profile_id IS NULL OR p_message IS NULL THEN
    RAISE EXCEPTION 'to_profile_id y message son requeridos';
  END IF;

  -- Validar tipo de mensaje
  IF p_message_type NOT IN ('text', 'system', 'notification') THEN
    RAISE EXCEPTION 'Tipo de mensaje inválido: %', p_message_type;
  END IF;

  -- No permitir enviar mensajes a uno mismo
  IF p_to_profile_id = v_from_profile_id THEN
    RAISE EXCEPTION 'No puedes enviarte mensajes a ti mismo';
  END IF;

  -- Insertar el mensaje
  INSERT INTO public.user_messages (
    from_profile_id, to_profile_id, message, message_type
  ) VALUES (
    v_from_profile_id, p_to_profile_id, p_message, p_message_type
  ) RETURNING id INTO v_message_id;

  RETURN QUERY SELECT v_message_id AS result_message_id, 'sent' AS result_action;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para marcar mensajes como leídos
CREATE OR REPLACE FUNCTION public.mark_messages_as_read(p_message_ids UUID[])
RETURNS INTEGER AS $$
DECLARE
  v_user_role TEXT;
  v_profile_id UUID;
  v_updated_count INTEGER := 0;
BEGIN
  -- Obtener el rol y perfil del usuario actual
  SELECT role, id INTO v_user_role, v_profile_id
  FROM public.profiles
  WHERE auth_user_id = auth.uid();

  -- Validar permisos para gestionar comunicaciones
  IF NOT public.has_permission(v_user_role, 'communications', 'edit') THEN
    RAISE EXCEPTION 'No tienes permisos para gestionar mensajes';
  END IF;

  -- Marcar mensajes como leídos (solo los dirigidos al usuario actual)
  UPDATE public.user_messages
  SET is_read = true, read_at = NOW()
  WHERE id = ANY(p_message_ids)
    AND to_profile_id = v_profile_id
    AND is_read = false;

  GET DIAGNOSTICS v_updated_count = ROW_COUNT;

  RETURN v_updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para registrar comunicaciones enviadas (WhatsApp, email, etc.)
CREATE OR REPLACE FUNCTION public.log_communication(
  p_action TEXT,
  p_target TEXT,
  p_content TEXT,
  p_status TEXT DEFAULT 'pending',
  p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
  v_log_id UUID;
  v_user_role TEXT;
  v_profile_id UUID;
BEGIN
  -- Obtener el rol y perfil del usuario actual
  SELECT role, id INTO v_user_role, v_profile_id
  FROM public.profiles
  WHERE auth_user_id = auth.uid();

  -- Validar permisos para registrar comunicaciones
  IF NOT public.has_permission(v_user_role, 'communications', 'create') THEN
    RAISE EXCEPTION 'No tienes permisos para registrar comunicaciones';
  END IF;

  -- Validar parámetros
  IF p_action IS NULL OR p_target IS NULL THEN
    RAISE EXCEPTION 'action y target son requeridos';
  END IF;

  -- Insertar el registro de comunicación
  INSERT INTO public.communication_logs (
    profile_id, action, target, content, status, metadata
  ) VALUES (
    v_profile_id, p_action, p_target, p_content, p_status, p_metadata
  ) RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Otorgar permisos
GRANT EXECUTE ON FUNCTION public.send_direct_message TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_messages_as_read TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_communication TO authenticated;

-- Comentarios
COMMENT ON FUNCTION public.send_direct_message IS 'Función para enviar mensajes directos con validación de permisos';
COMMENT ON FUNCTION public.mark_messages_as_read IS 'Función para marcar mensajes como leídos con validación de permisos';
COMMENT ON FUNCTION public.log_communication IS 'Función para registrar comunicaciones enviadas con validación de permisos';

COMMIT;

-- =====================================================================
-- NOTAS DE IMPLEMENTACIÓN
-- =====================================================================
-- 1. send_direct_message valida permisos usando has_permission()
-- 2. mark_messages_as_read permite solo marcar mensajes propios como leídos
-- 3. log_communication registra comunicaciones para auditoría
-- 4. Todas las validaciones se hacen antes de la operación
-- =====================================================================