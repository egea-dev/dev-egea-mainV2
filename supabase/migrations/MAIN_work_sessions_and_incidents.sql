-- ==============================================================================
-- WORK SESSIONS (Fichajes / Jornada)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.work_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    profile_id UUID NOT NULL REFERENCES public.profiles(id),
    task_id UUID REFERENCES public.screen_data(id), -- Puede ser null si es jornada general
    status TEXT DEFAULT 'active', -- 'active', 'completed', 'paused'
    started_at TIMESTAMPTZ DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    start_location JSONB,
    end_location JSONB,
    device_info JSONB,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE public.work_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own sessions" ON public.work_sessions
    FOR SELECT USING (profile_id = auth.uid());

CREATE POLICY "Users can insert their own sessions" ON public.work_sessions
    FOR INSERT WITH CHECK (profile_id = auth.uid());

CREATE POLICY "Users can update their own sessions" ON public.work_sessions
    FOR UPDATE USING (profile_id = auth.uid());

CREATE POLICY "Admins can view all sessions" ON public.work_sessions
    FOR SELECT USING (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

-- RPC: start_work_session
CREATE OR REPLACE FUNCTION start_work_session(
    p_profile_id UUID,
    p_task_id UUID DEFAULT NULL,
    p_start_location JSONB DEFAULT NULL,
    p_device_info JSONB DEFAULT NULL,
    p_metadata JSONB DEFAULT NULL
)
RETURNS SETOF public.work_sessions AS $$
BEGIN
    -- Cerrar cualquier sesión activa previa del usuario (opcional, para evitar dobles fichajes)
    -- UPDATE public.work_sessions SET status = 'completed', ended_at = NOW() 
    -- WHERE profile_id = p_profile_id AND status = 'active';

    RETURN QUERY
    INSERT INTO public.work_sessions (profile_id, task_id, start_location, device_info, metadata, status, started_at)
    VALUES (p_profile_id, p_task_id, p_start_location, p_device_info, p_metadata, 'active', NOW())
    RETURNING *;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC: end_work_session
CREATE OR REPLACE FUNCTION end_work_session(
    p_session_id UUID,
    p_profile_id UUID DEFAULT NULL, -- Opcional, para validación extra
    p_end_location JSONB DEFAULT NULL,
    p_status TEXT DEFAULT 'completed',
    p_metadata JSONB DEFAULT NULL
)
RETURNS SETOF public.work_sessions AS $$
BEGIN
    RETURN QUERY
    UPDATE public.work_sessions
    SET 
        status = p_status,
        ended_at = NOW(),
        end_location = p_end_location,
        metadata = COALESCE(metadata, '{}'::jsonb) || COALESCE(p_metadata, '{}'::jsonb)
    WHERE id = p_session_id
    RETURNING *;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ==============================================================================
-- INCIDENCIAS (MAIN DB - Para Instalaciones/Tareas)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.incidencias (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    task_id UUID REFERENCES public.screen_data(id), -- Referencia a tabla de MAIN
    type TEXT NOT NULL,
    description TEXT NOT NULL,
    status TEXT DEFAULT 'pendiente',
    priority TEXT DEFAULT 'media',
    reported_by_user_id UUID DEFAULT auth.uid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved_by_user_id UUID,
    resolution_notes TEXT
);

-- RLS Incidencias
ALTER TABLE public.incidencias ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Todos authenticated ven incidencias" ON public.incidencias
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Todos authenticated crean incidencias" ON public.incidencias
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Todos authenticated actualizan incidencias" ON public.incidencias
    FOR UPDATE USING (auth.role() = 'authenticated');
