-- Add rate limiting functions and update existing functions
-- Migration: 20251009160000_add_rate_limiting_functions

-- =====================================================================
-- FUNCIÓN: get_tasks_by_token (obtener tareas por token con validación y rate limiting)
-- =====================================================================
CREATE OR REPLACE FUNCTION public.get_tasks_by_token(p_token TEXT)
RETURNS TABLE(
  id UUID,
  data JSONB,
  state TEXT,
  start_date DATE,
  end_date DATE,
  profile JSONB,
  plan_date DATE,
  task_ids UUID[]
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_token_hash TEXT;
  v_current_count INTEGER;
  v_window_start TIMESTAMP WITH TIME ZONE;
  v_notification RECORD;
BEGIN
  -- Generar hash del token para rate limiting
  v_token_hash := encode(digest(p_token, 'sha256'), 'hex');

  -- Calcular ventana de 1 minuto
  v_window_start := date_trunc('minute', NOW());

  -- Verificar rate limiting
  SELECT COALESCE(SUM(request_count), 0) INTO v_current_count
  FROM public.rate_limits
  WHERE token_hash = v_token_hash
    AND window_start >= v_window_start - INTERVAL '1 minute';

  -- Si excede 10 requests por minuto, rechazar
  IF v_current_count >= 10 THEN
    RAISE EXCEPTION 'Rate limit exceeded. Maximum 10 requests per minute allowed.';
  END IF;

  -- Registrar el acceso en rate_limits
  INSERT INTO public.rate_limits (token_hash, request_count, window_start)
  VALUES (v_token_hash, 1, v_window_start)
  ON CONFLICT (token_hash, window_start)
  DO UPDATE SET
    request_count = public.rate_limits.request_count + 1,
    updated_at = NOW();

  -- Buscar la notificación con validación de expiración
  SELECT * INTO v_notification
  FROM public.task_notifications
  WHERE access_token = p_token
    AND (expires_at IS NULL OR expires_at > NOW());

  -- Si no existe o expiró, retornar vacío
  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- Marcar como visto si no lo estaba
  IF v_notification.viewed_at IS NULL THEN
    UPDATE public.task_notifications
    SET viewed_at = NOW()
    WHERE id = v_notification.id;
  END IF;

  -- Retornar los datos
  RETURN QUERY
  SELECT
    tn.id,
    tn.data,
    tn.state,
    tn.start_date,
    tn.end_date,
    jsonb_build_object(
      'full_name', p.full_name,
      'phone', p.phone
    ) as profile,
    tn.plan_date,
    tn.task_ids
  FROM public.task_notifications tn
  LEFT JOIN public.profiles p ON tn.profile_id = p.id
  WHERE tn.id = v_notification.id;

END;
$$;

-- =====================================================================
-- FUNCIÓN: log_screen_access (registrar acceso a screen_data)
-- =====================================================================
CREATE OR REPLACE FUNCTION public.log_screen_access(p_screen_id UUID, p_access_type TEXT DEFAULT 'anonymous', p_ip_hash TEXT DEFAULT NULL, p_user_agent TEXT DEFAULT NULL)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_window_start TIMESTAMP WITH TIME ZONE;
  v_current_count INTEGER;
BEGIN
  -- Calcular ventana de 1 hora
  v_window_start := date_trunc('hour', NOW());

  -- Contar accesos en la última hora
  SELECT COALESCE(SUM(request_count), 0) INTO v_current_count
  FROM public.access_logs
  WHERE screen_id = p_screen_id
    AND window_start >= v_window_start - INTERVAL '1 hour';

  -- Limitar a 100 accesos por hora por pantalla para anónimo
  IF p_access_type = 'anonymous' AND v_current_count >= 100 THEN
    RAISE EXCEPTION 'Access limit exceeded. Maximum 100 anonymous requests per hour allowed for this screen.';
  END IF;

  -- Registrar el acceso
  INSERT INTO public.access_logs (screen_id, access_type, ip_hash, user_agent, request_count, window_start)
  VALUES (p_screen_id, p_access_type, p_ip_hash, p_user_agent, 1, v_window_start);

  RETURN TRUE;
END;
$$;

-- =====================================================================
-- FUNCIÓN: check_screen_access (verificar acceso a pantalla con rate limiting)
-- =====================================================================
CREATE OR REPLACE FUNCTION public.check_screen_access(p_screen_id UUID, p_access_type TEXT DEFAULT 'anonymous')
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_window_start TIMESTAMP WITH TIME ZONE;
  v_current_count INTEGER;
BEGIN
  -- Para accesos autenticados, permitir siempre
  IF p_access_type = 'authenticated' THEN
    RETURN TRUE;
  END IF;

  -- Calcular ventana de 1 hora
  v_window_start := date_trunc('hour', NOW());

  -- Contar accesos anónimos en la última hora para esta pantalla
  SELECT COALESCE(SUM(request_count), 0) INTO v_current_count
  FROM public.access_logs
  WHERE screen_id = p_screen_id
    AND access_type = 'anonymous'
    AND window_start >= v_window_start - INTERVAL '1 hour';

  -- Limitar a 100 accesos por hora por pantalla para anónimo
  IF v_current_count >= 100 THEN
    RETURN FALSE;
  END IF;

  -- Registrar el acceso
  INSERT INTO public.access_logs (screen_id, access_type, request_count, window_start)
  VALUES (p_screen_id, p_access_type, 1, v_window_start);

  RETURN TRUE;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_tasks_by_token(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.log_screen_access(UUID, TEXT, TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_screen_access(UUID, TEXT) TO anon, authenticated;