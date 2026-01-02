-- CREAR TABLA DE LOGS DE ESTADO DE PEDIDOS
-- Ejecutar en SQL Editor de PRODUCTIVITY DB (zslcblcetrhbsdirkvza)

-- Tabla para registrar todos los cambios de estado
CREATE TABLE IF NOT EXISTS public.comercial_order_status_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.comercial_orders(id) ON DELETE CASCADE,
    old_status TEXT,
    new_status TEXT NOT NULL,
    comment TEXT NOT NULL,
    changed_by UUID NOT NULL,
    changed_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Índices para mejorar rendimiento
    CONSTRAINT valid_status CHECK (
        new_status IN (
            'PENDIENTE_PAGO', 'PAGADO', 'EN_PRODUCCION',
            'LISTO_ENVIO', 'ENVIADO', 'ENTREGADO', 'CANCELADO'
        )
    )
);

-- Índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_status_log_order_id 
    ON public.comercial_order_status_log(order_id);
    
CREATE INDEX IF NOT EXISTS idx_status_log_changed_at 
    ON public.comercial_order_status_log(changed_at DESC);

-- Comentarios para documentación
COMMENT ON TABLE public.comercial_order_status_log IS 
    'Registro histórico de todos los cambios de estado de pedidos';
    
COMMENT ON COLUMN public.comercial_order_status_log.old_status IS 
    'Estado anterior (NULL si es el primer registro)';
    
COMMENT ON COLUMN public.comercial_order_status_log.new_status IS 
    'Nuevo estado aplicado';
    
COMMENT ON COLUMN public.comercial_order_status_log.comment IS 
    'Comentario obligatorio del usuario que realizó el cambio';
    
COMMENT ON COLUMN public.comercial_order_status_log.changed_by IS 
    'UUID del usuario que realizó el cambio (de MAIN DB)';

-- Verificar creación
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'comercial_order_status_log'
ORDER BY ordinal_position;
