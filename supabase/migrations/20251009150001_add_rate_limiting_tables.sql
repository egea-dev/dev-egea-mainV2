-- Add rate limiting tables for token-based access and anonymous screen data access
-- Migration: 20251009150000_add_rate_limiting_tables

-- =====================================================================
-- TABLA: rate_limits (límite de tasa para tokens de acceso)
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.rate_limits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  token_hash TEXT NOT NULL, -- Hash del token para privacidad
  request_count INTEGER NOT NULL DEFAULT 1,
  window_start TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para rate_limits
CREATE INDEX IF NOT EXISTS idx_rate_limits_token_hash ON public.rate_limits(token_hash);
CREATE INDEX IF NOT EXISTS idx_rate_limits_window ON public.rate_limits(token_hash, window_start);

-- =====================================================================
-- TABLA: access_logs (registros de acceso para screen_data anónimo)
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.access_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  screen_id UUID NOT NULL REFERENCES public.screens(id) ON DELETE CASCADE,
  access_type TEXT NOT NULL DEFAULT 'anonymous', -- 'anonymous', 'authenticated'
  ip_hash TEXT, -- Hash de IP para privacidad (si disponible)
  user_agent TEXT,
  request_count INTEGER NOT NULL DEFAULT 1,
  window_start TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para access_logs
CREATE INDEX IF NOT EXISTS idx_access_logs_screen_id ON public.access_logs(screen_id);
CREATE INDEX IF NOT EXISTS idx_access_logs_window ON public.access_logs(screen_id, window_start);
CREATE INDEX IF NOT EXISTS idx_access_logs_ip_hash ON public.access_logs(ip_hash);

-- Trigger para updated_at en rate_limits
CREATE TRIGGER handle_rate_limits_updated_at
    BEFORE UPDATE ON public.rate_limits
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Políticas RLS para rate_limits (solo admins pueden gestionar)
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins_can_manage_rate_limits"
  ON public.rate_limits FOR ALL
  TO authenticated
  USING (public.is_admin());

-- Políticas RLS para access_logs (solo admins pueden gestionar)
ALTER TABLE public.access_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins_can_manage_access_logs"
  ON public.access_logs FOR ALL
  TO authenticated
  USING (public.is_admin());

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON public.rate_limits TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.access_logs TO authenticated;