-- =====================================================================
-- MIGRACIÓN: TABLAS DE COMUNICACIONES EN TIEMPO REAL
-- =====================================================================
-- Fecha: 2025-10-06
-- Objetivo: Crear tablas para gestión de comunicaciones y presencia en tiempo real
-- =====================================================================

BEGIN;

-- =====================================================================
-- PASO 1: CREAR TABLA user_sessions
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.user_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_online BOOLEAN DEFAULT TRUE,
  user_agent TEXT,
  ip_address INET,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Un usuario solo puede tener una sesión activa
  UNIQUE(profile_id)
);

-- =====================================================================
-- PASO 2: CREAR TABLA user_messages
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.user_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  from_profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  to_profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  message_type TEXT DEFAULT 'text', -- text, system, notification
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Índices para consultas eficientes
  INDEX idx_user_messages_from_to (from_profile_id, to_profile_id),
  INDEX idx_user_messages_to_unread (to_profile_id, is_read),
  INDEX idx_user_messages_created (created_at DESC)
);

-- =====================================================================
-- PASO 3: CREAR TABLA communication_logs
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.communication_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  action TEXT NOT NULL, -- whatsapp_sent, email_sent, notification_sent, etc.
  target TEXT, -- email, phone, etc.
  content TEXT, -- message content
  status TEXT DEFAULT 'pending', -- pending, sent, failed
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  INDEX idx_communication_logs_profile (profile_id),
  INDEX idx_communication_logs_action (action),
  INDEX idx_communication_logs_status (status),
  INDEX idx_communication_logs_created (created_at DESC)
);

-- =====================================================================
-- PASO 4: HABILITAR RLS
-- =====================================================================

ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.communication_logs ENABLE ROW LEVEL SECURITY;

-- =====================================================================
-- PASO 5: POLÍTICAS RLS PARA user_sessions
-- =====================================================================

-- Lectura para todos los autenticados
CREATE POLICY "read_user_sessions" ON public.user_sessions FOR SELECT
  TO authenticated
  USING (true);

-- Los usuarios pueden ver sus propias sesiones
CREATE POLICY "read_own_user_sessions" ON public.user_sessions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = user_sessions.profile_id
      AND auth_user_id = auth.uid()
    )
  );

-- Gestión solo para admins
CREATE POLICY "manage_user_sessions" ON public.user_sessions FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- =====================================================================
-- PASO 6: POLÍTICAS RLS PARA user_messages
-- =====================================================================

-- Lectura para todos los autenticados
CREATE POLICY "read_user_messages" ON public.user_messages FOR SELECT
  TO authenticated
  USING (
    -- Puede ver mensajes que envió o que recibió
    from_profile_id IN (
      SELECT id FROM public.profiles WHERE auth_user_id = auth.uid()
    ) OR 
    to_profile_id IN (
      SELECT id FROM public.profiles WHERE auth_user_id = auth.uid()
    )
  );

-- Los usuarios pueden enviar mensajes
CREATE POLICY "send_user_messages" ON public.user_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    from_profile_id IN (
      SELECT id FROM public.profiles WHERE auth_user_id = auth.uid()
    )
  );

-- Los usuarios pueden marcar mensajes como leídos
CREATE POLICY "mark_messages_read" ON public.user_messages FOR UPDATE
  TO authenticated
  USING (
    to_profile_id IN (
      SELECT id FROM public.profiles WHERE auth_user_id = auth.uid()
    )
  )
  WITH CHECK (
    to_profile_id IN (
      SELECT id FROM public.profiles WHERE auth_user_id = auth.uid()
    )
  );

-- =====================================================================
-- PASO 7: POLÍTICAS RLS PARA communication_logs
-- =====================================================================

-- Lectura para todos los autenticados
CREATE POLICY "read_communication_logs" ON public.communication_logs FOR SELECT
  TO authenticated
  USING (true);

-- Gestión solo para admins
CREATE POLICY "manage_communication_logs" ON public.communication_logs FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- =====================================================================
-- PASO 8: TRIGGERS PARA updated_at
-- =====================================================================

-- Trigger para user_sessions
CREATE OR REPLACE FUNCTION public.handle_user_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER handle_user_sessions_updated_at
  BEFORE UPDATE ON public.user_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_user_sessions_updated_at();

-- =====================================================================
-- PASO 9: FUNCIONES ÚTILES
-- =====================================================================

-- Función para actualizar o crear sesión de usuario
CREATE OR REPLACE FUNCTION public.update_user_session(
  user_profile_id UUID,
  user_agent_param TEXT DEFAULT NULL,
  ip_address_param INET DEFAULT NULL
)
RETURNS TABLE (
  session_id UUID,
  is_online BOOLEAN,
  last_seen TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  INSERT INTO public.user_sessions (
    profile_id, 
    user_agent, 
    ip_address, 
    is_online, 
    last_seen
  ) VALUES (
    user_profile_id, 
    user_agent_param, 
    ip_address_param, 
    TRUE, 
    NOW()
  )
  ON CONFLICT (profile_id) 
  DO UPDATE SET
    is_online = TRUE,
    last_seen = NOW(),
    user_agent = COALESCE(user_agent_param, user_sessions.user_agent),
    ip_address = COALESCE(ip_address_param, user_sessions.ip_address)
  RETURNING id, is_online, last_seen;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para marcar usuario como offline
CREATE OR REPLACE FUNCTION public.mark_user_offline(user_profile_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE public.user_sessions 
  SET is_online = FALSE, last_seen = NOW()
  WHERE profile_id = user_profile_id;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para obtener usuarios online
CREATE OR REPLACE FUNCTION public.get_online_users()
RETURNS TABLE (
  profile_id UUID,
  full_name TEXT,
  email TEXT,
  status TEXT,
  last_seen TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.full_name,
    p.email,
    p.status,
    us.last_seen
  FROM public.profiles p
  JOIN public.user_sessions us ON p.id = us.profile_id
  WHERE us.is_online = TRUE
    AND us.last_seen > NOW() - INTERVAL '5 minutes'
  ORDER BY us.last_seen DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para contar mensajes no leídos
CREATE OR REPLACE FUNCTION public.get_unread_message_count(user_profile_id UUID)
RETURNS INTEGER AS $$
DECLARE
  unread_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO unread_count
  FROM public.user_messages
  WHERE to_profile_id = user_profile_id
    AND is_read = FALSE;
  
  RETURN COALESCE(unread_count, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================================
-- PASO 10: TRIGGER AUTOMÁTICO PARA LIMPIAR SESIONES INACTIVAS
-- =====================================================================

-- Función para limpiar sesiones inactivas
CREATE OR REPLACE FUNCTION public.cleanup_inactive_sessions()
RETURNS TABLE (
  cleaned_count INTEGER
) AS $$
DECLARE
  sessions_cleaned INTEGER := 0;
BEGIN
  UPDATE public.user_sessions
  SET is_online = FALSE
  WHERE is_online = TRUE
    AND last_seen < NOW() - INTERVAL '5 minutes';
  
  GET DIAGNOSTICS sessions_cleaned = ROW_COUNT;
  
  RETURN QUERY SELECT sessions_cleaned;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================================
-- COMENTARIOS
-- =====================================================================

COMMENT ON TABLE public.user_sessions IS 'Tabla para rastrear sesiones y presencia de usuarios en tiempo real';
COMMENT ON TABLE public.user_messages IS 'Tabla para mensajes directos entre usuarios';
COMMENT ON TABLE public.communication_logs IS 'Tabla para registrar todas las comunicaciones enviadas (WhatsApp, email, etc.)';
COMMENT ON COLUMN public.user_sessions.is_online IS 'Indica si el usuario está actualmente activo';
COMMENT ON COLUMN public.user_messages.message_type IS 'Tipo de mensaje: text, system, notification';
COMMENT ON COLUMN public.communication_logs.metadata IS 'Datos adicionales en formato JSON';

COMMIT;

-- =====================================================================
-- NOTAS DE IMPLEMENTACIÓN
-- =====================================================================
-- 1. Esta migración crea las tablas necesarias para comunicaciones en tiempo real
-- 2. user_sessions rastrea la presencia de usuarios con timeout de 5 minutos
-- 3. user_messages permite mensajería directa entre usuarios
-- 4. communication_logs registra todas las comunicaciones enviadas
-- 5. Se incluyen funciones útiles para gestionar presencia y mensajes
-- 6. Las políticas RLS permiten que los usuarios vean sus propios mensajes y las sesiones
-- 7. El trigger de cleanup puede ser ejecutado periódicamente para limpiar sesiones inactivas
-- =====================================================================