-- Añadir campos para sistema de tracking flexible
ALTER TABLE public.produccion_work_orders
ADD COLUMN IF NOT EXISTS tracking_pending BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS tracking_added_at TIMESTAMP WITH TIME ZONE;

-- Comentarios detallados
COMMENT ON COLUMN public.produccion_work_orders.tracking_pending 
IS 'Indica si el pedido fue enviado sin numero de seguimiento y está pendiente de ser añadido manualmente';

COMMENT ON COLUMN public.produccion_work_orders.tracking_added_at 
IS 'Fecha y hora exacta en que se añadió el número de seguimiento a posteriori';

-- Crear índice para búsquedas rápidas de pendientes
CREATE INDEX IF NOT EXISTS idx_produccion_orders_tracking_pending 
ON public.produccion_work_orders(tracking_pending) 
WHERE tracking_pending = TRUE;
