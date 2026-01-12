-- =====================================================================
-- MIGRACIÓN: TABLA DE MENSAJES DIRECTOS
-- =====================================================================
-- Fecha: 2025-10-09
-- Objetivo: Crear tabla para mensajes directos entre usuarios con Realtime
-- =====================================================================

BEGIN;

-- Crear tabla de mensajes directos
CREATE TABLE IF NOT EXISTS public.direct_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file', 'system')),
  metadata JSONB DEFAULT '{}'::jsonb,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE public.direct_messages ENABLE ROW LEVEL SECURITY;

-- Políticas de seguridad
CREATE POLICY "users_can_view_own_messages" ON public.direct_messages
  FOR SELECT TO authenticated
  USING (auth.uid() IN (
    SELECT auth_user_id FROM public.profiles WHERE id = sender_id
    UNION
    SELECT auth_user_id FROM public.profiles WHERE id = recipient_id
  ));

CREATE POLICY "users_can_send_messages" ON public.direct_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() IN (
      SELECT auth_user_id FROM public.profiles WHERE id = sender_id
    )
  );

CREATE POLICY "users_can_mark_own_messages_read" ON public.direct_messages
  FOR UPDATE TO authenticated
  USING (
    auth.uid() IN (
      SELECT auth_user_id FROM public.profiles WHERE id = recipient_id
    )
  )
  WITH CHECK (
    auth.uid() IN (
      SELECT auth_user_id FROM public.profiles WHERE id = recipient_id
    )
  );

-- Políticas para admin/manager
CREATE POLICY "admin_manager_can_view_all_messages" ON public.direct_messages
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE auth_user_id = auth.uid() 
      AND role IN ('admin', 'manager')
    )
  );

-- Índices
CREATE INDEX IF NOT EXISTS idx_direct_messages_sender_id ON public.direct_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_direct_messages_recipient_id ON public.direct_messages(recipient_id);
CREATE INDEX IF NOT EXISTS idx_direct_messages_created_at ON public.direct_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_direct_messages_read_at ON public.direct_messages(read_at) WHERE read_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_direct_messages_conversation ON public.direct_messages(sender_id, recipient_id);

-- Trigger para updated_at
CREATE TRIGGER handle_direct_messages_updated_at
    BEFORE UPDATE ON public.direct_messages
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Función para obtener conversación entre dos usuarios
CREATE OR REPLACE FUNCTION public.get_conversation(user1_id UUID, user2_id UUID, limit_count INTEGER DEFAULT 50, offset_count INTEGER DEFAULT 0)
RETURNS TABLE (
  id UUID,
  sender_id UUID,
  recipient_id UUID,
  content TEXT,
  message_type TEXT,
  metadata JSONB,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE,
  sender_name TEXT,
  sender_avatar TEXT,
  is_sent BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    dm.id,
    dm.sender_id,
    dm.recipient_id,
    dm.content,
    dm.message_type,
    dm.metadata,
    dm.read_at,
    dm.created_at,
    p.full_name as sender_name,
    p.avatar_url as sender_avatar,
    CASE WHEN dm.sender_id = user1_id THEN true ELSE false END as is_sent
  FROM public.direct_messages dm
  JOIN public.profiles p ON p.id = dm.sender_id
  WHERE (
    (dm.sender_id = user1_id AND dm.recipient_id = user2_id) OR
    (dm.sender_id = user2_id AND dm.recipient_id = user1_id)
  )
  ORDER BY dm.created_at DESC
  LIMIT limit_count OFFSET offset_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para enviar mensaje directo
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
  v_error TEXT;
BEGIN
  -- Obtener ID del remitente actual
  SELECT id INTO v_sender_id 
  FROM public.profiles 
  WHERE auth_user_id = auth.uid();
  
  IF v_sender_id IS NULL THEN
    RETURN QUERY SELECT false, NULL::UUID, 'Usuario no encontrado'::TEXT;
    RETURN;
  END IF;
  
  -- Verificar que el destinatario existe
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_recipient_id) THEN
    RETURN QUERY SELECT false, NULL::UUID, 'Destinatario no encontrado'::TEXT;
    RETURN;
  END IF;
  
  -- Insertar mensaje
  INSERT INTO public.direct_messages (
    sender_id, 
    recipient_id, 
    content, 
    message_type, 
    metadata
  ) VALUES (
    v_sender_id, 
    p_recipient_id, 
    p_content, 
    p_message_type, 
    p_metadata
  ) RETURNING id INTO v_message_id;
  
  RETURN QUERY SELECT true, v_message_id, NULL::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para marcar mensajes como leídos
CREATE OR REPLACE FUNCTION public.mark_messages_read(p_sender_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_current_user_id UUID;
  v_count INTEGER;
BEGIN
  -- Obtener ID del usuario actual
  SELECT id INTO v_current_user_id 
  FROM public.profiles 
  WHERE auth_user_id = auth.uid();
  
  IF v_current_user_id IS NULL THEN
    RETURN 0;
  END IF;
  
  -- Actualizar mensajes no leídos
  UPDATE public.direct_messages 
  SET read_at = NOW() 
  WHERE sender_id = p_sender_id 
  AND recipient_id = v_current_user_id 
  AND read_at IS NULL;
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para contar mensajes no leídos
CREATE OR REPLACE FUNCTION public.get_unread_count()
RETURNS INTEGER AS $$
DECLARE
  v_current_user_id UUID;
  v_count INTEGER;
BEGIN
  -- Obtener ID del usuario actual
  SELECT id INTO v_current_user_id 
  FROM public.profiles 
  WHERE auth_user_id = auth.uid();
  
  IF v_current_user_id IS NULL THEN
    RETURN 0;
  END IF;
  
  -- Contar mensajes no leídos
  SELECT COUNT(*) INTO v_count
  FROM public.direct_messages 
  WHERE recipient_id = v_current_user_id 
  AND read_at IS NULL;
  
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Permisos para las funciones
GRANT EXECUTE ON FUNCTION public.get_conversation TO authenticated;
GRANT EXECUTE ON FUNCTION public.send_direct_message TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_messages_read TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_unread_count TO authenticated;

-- Comentarios
COMMENT ON TABLE public.direct_messages IS 'Mensajes directos entre usuarios del sistema';
COMMENT ON COLUMN public.direct_messages.message_type IS 'Tipo de mensaje: text, image, file, system';
COMMENT ON COLUMN public.direct_messages.metadata IS 'Metadatos adicionales del mensaje (JSON)';

COMMIT;

-- =====================================================================
-- NOTAS DE IMPLEMENTACIÓN
-- =====================================================================
-- 1. Se crea tabla de mensajes directos con RLS habilitado
-- 2. Los usuarios solo pueden ver sus propios mensajes (enviados o recibidos)
-- 3. Admins y managers pueden ver todos los mensajes
-- 4. Se incluyen funciones para gestionar conversaciones
-- 5. Se prepara para integración con Realtime de Supabase
-- 6. Se incluyen índices para optimizar el rendimiento
-- =====================================================================