-- ================================================================
-- Optimizaciones para mensajes directos y comunicación
-- Incluye resumen de conversaciones y nuevos índices.
-- ================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ================================================================
-- Función: get_direct_message_conversations
-- Devuelve un resumen paginado de las conversaciones del usuario.
-- ================================================================

CREATE OR REPLACE FUNCTION public.get_direct_message_conversations(
  p_profile_id uuid,
  p_limit integer DEFAULT 20,
  p_offset integer DEFAULT 0
)
RETURNS TABLE (
  user_id uuid,
  user_name text,
  user_avatar text,
  last_message text,
  last_message_time timestamptz,
  unread_count integer,
  total_conversations bigint
) AS $$
DECLARE
  v_caller_profile_id uuid;
  v_is_admin boolean;
BEGIN
  -- Obtener perfil del usuario autenticado
  SELECT id INTO v_caller_profile_id
  FROM public.profiles
  WHERE auth_user_id = auth.uid();

  IF v_caller_profile_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado' USING ERRCODE = '42501';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE auth_user_id = auth.uid()
      AND role IN ('admin', 'manager')
  ) INTO v_is_admin;

  IF NOT v_is_admin AND v_caller_profile_id <> p_profile_id THEN
    RAISE EXCEPTION 'No autorizado para consultar conversaciones de este perfil' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  WITH relevant AS (
    SELECT
      CASE
        WHEN dm.sender_id = p_profile_id THEN dm.recipient_id
        ELSE dm.sender_id
      END AS other_user_id,
      dm.content,
      dm.created_at
    FROM public.direct_messages dm
    WHERE dm.sender_id = p_profile_id
       OR dm.recipient_id = p_profile_id
  ),
  latest AS (
    SELECT DISTINCT ON (other_user_id)
      other_user_id,
      content AS last_message,
      created_at AS last_message_time
    FROM relevant
    ORDER BY other_user_id, created_at DESC
  ),
  unread AS (
    SELECT sender_id AS other_user_id, COUNT(*)::int AS unread_count
    FROM public.direct_messages
    WHERE recipient_id = p_profile_id
      AND read_at IS NULL
    GROUP BY sender_id
  )
  SELECT
    latest.other_user_id AS user_id,
    p.full_name AS user_name,
    p.avatar_url AS user_avatar,
    latest.last_message,
    latest.last_message_time,
    COALESCE(unread.unread_count, 0) AS unread_count,
    COUNT(*) OVER () AS total_conversations
  FROM latest
  JOIN public.profiles p ON p.id = latest.other_user_id
  LEFT JOIN unread ON unread.other_user_id = latest.other_user_id
  ORDER BY latest.last_message_time DESC NULLS LAST
  LIMIT GREATEST(p_limit, 1)
  OFFSET GREATEST(p_offset, 0);
END;
$$ LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public, extensions;

GRANT EXECUTE ON FUNCTION public.get_direct_message_conversations(uuid, integer, integer) TO authenticated;

-- ================================================================
-- Índices para mejorar filtros de communication_logs
-- ================================================================

CREATE INDEX IF NOT EXISTS idx_communication_logs_created_at
  ON public.communication_logs (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_communication_logs_metadata_profile
  ON public.communication_logs ((metadata->>'profile_id'));

CREATE INDEX IF NOT EXISTS idx_communication_logs_metadata_target
  ON public.communication_logs ((metadata->>'target_profile_id'));

CREATE INDEX IF NOT EXISTS idx_communication_logs_metadata_user
  ON public.communication_logs ((metadata->>'user_profile_id'));
