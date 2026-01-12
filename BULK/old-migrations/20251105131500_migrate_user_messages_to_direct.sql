-- =====================================================================
-- MIGRACIÓN: Consolidar mensajería en public.direct_messages
-- =====================================================================
-- Objetivo:
--   * Migrar los datos existentes de public.user_messages
--     hacia public.direct_messages.
--   * Eliminar la tabla legacy y las funciones asociadas.
--   * Reinstaurar las funciones RPC basadas en direct_messages.
-- =====================================================================

BEGIN;

-- 1. Copiar historial antiguo (si existe) a la nueva tabla
INSERT INTO public.direct_messages (
  id,
  sender_id,
  recipient_id,
  content,
  message_type,
  metadata,
  read_at,
  created_at,
  updated_at
)
SELECT
  um.id,
  um.from_profile_id AS sender_id,
  um.to_profile_id AS recipient_id,
  um.message AS content,
  CASE
    WHEN um.message_type IN ('text', 'image', 'file', 'system') THEN um.message_type
    ELSE 'text'
  END AS message_type,
  '{}'::jsonb AS metadata,
  um.read_at,
  um.created_at,
  COALESCE(um.read_at, um.created_at)
FROM public.user_messages um
ON CONFLICT (id) DO NOTHING;

-- 2. Eliminar funciones legacy basadas en user_messages
DROP FUNCTION IF EXISTS public.send_direct_message(uuid, text, text);
DROP FUNCTION IF EXISTS public.send_direct_message(uuid, text, text, jsonb);
DROP FUNCTION IF EXISTS public.mark_messages_as_read(uuid[]);

-- 3. Eliminar la tabla legacy
DROP TABLE IF EXISTS public.user_messages CASCADE;

-- 4. Re-crear las funciones RPC oficiales sobre direct_messages
CREATE OR REPLACE FUNCTION public.send_direct_message(
  p_recipient_id UUID,
  p_content TEXT,
  p_message_type TEXT DEFAULT 'text',
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS TABLE (
  success BOOLEAN,
  message_id UUID,
  error_message TEXT
) AS $$
DECLARE
  v_sender_id UUID;
  v_message_id UUID;
BEGIN
  SELECT id INTO v_sender_id
  FROM public.profiles
  WHERE auth_user_id = auth.uid();

  IF v_sender_id IS NULL THEN
    RETURN QUERY SELECT false, NULL::UUID, 'Usuario no encontrado'::TEXT;
    RETURN;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_recipient_id) THEN
    RETURN QUERY SELECT false, NULL::UUID, 'Destinatario no encontrado'::TEXT;
    RETURN;
  END IF;

  INSERT INTO public.direct_messages (
    sender_id,
    recipient_id,
    content,
    message_type,
    metadata
  )
  VALUES (
    v_sender_id,
    p_recipient_id,
    p_content,
    p_message_type,
    COALESCE(p_metadata, '{}'::jsonb)
  )
  RETURNING id INTO v_message_id;

  RETURN QUERY SELECT true, v_message_id, NULL::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.mark_messages_read(p_sender_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_current_user_id UUID;
  v_count INTEGER;
BEGIN
  SELECT id INTO v_current_user_id
  FROM public.profiles
  WHERE auth_user_id = auth.uid();

  IF v_current_user_id IS NULL THEN
    RETURN 0;
  END IF;

  UPDATE public.direct_messages
  SET read_at = NOW()
  WHERE sender_id = p_sender_id
    AND recipient_id = v_current_user_id
    AND read_at IS NULL;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.send_direct_message TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_messages_read TO authenticated;

COMMIT;
