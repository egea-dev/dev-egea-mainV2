-- Tabla de Incidencias
CREATE TABLE IF NOT EXISTS public.incidencias (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id UUID REFERENCES public.produccion_work_orders(id) ON DELETE CASCADE,
    type TEXT NOT NULL, -- 'calidad', 'rotura', 'falta_material', 'otro'
    description TEXT NOT NULL,
    status TEXT DEFAULT 'pendiente', -- 'pendiente', 'en_revision', 'resuelto', 'desestimado'
    priority TEXT DEFAULT 'media', -- 'baja', 'media', 'alta', 'critica'
    reported_by_name TEXT,
    reported_by_user_id UUID DEFAULT auth.uid(),
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved_by_user_id UUID,
    resolution_notes TEXT
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_incidencias_order_id ON public.incidencias(order_id);
CREATE INDEX IF NOT EXISTS idx_incidencias_status ON public.incidencias(status);
CREATE INDEX IF NOT EXISTS idx_incidencias_created_at ON public.incidencias(created_at);

-- RLS
ALTER TABLE public.incidencias ENABLE ROW LEVEL SECURITY;

-- Políticas
-- Todos los usuarios autenticados pueden ver incidencias (o restringir si es necesario)
CREATE POLICY "Usuarios pueden ver incidencias" ON public.incidencias
    FOR SELECT USING (auth.role() = 'authenticated');

-- Todos los usuarios autenticados pueden crear incidencias
CREATE POLICY "Usuarios pueden crear incidencias" ON public.incidencias
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Solo admins/managers pueden actualizar estado (simplificado para ahora: todos pueden editar sus propias o admins todas)
-- Por ahora permitimos update a todos para facilitar desarrollo, luego restringir
CREATE POLICY "Usuarios pueden actualizar incidencias" ON public.incidencias
    FOR UPDATE USING (auth.role() = 'authenticated');

-- Comentarios
COMMENT ON TABLE public.incidencias IS 'Registro de problemas reportados en producción o envíos';
