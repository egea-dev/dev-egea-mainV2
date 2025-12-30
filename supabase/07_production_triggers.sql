-- TRIGGERS AUTOMÁTICOS PARA PRODUCCIÓN
-- Ejecutar en SQL Editor de PRODUCTIVITY DB (zslcblcetrhbsdirkvza)

-- ==========================================
-- TRIGGER 1: Crear Work Order cuando pedido pasa a PAGADO
-- ==========================================

CREATE OR REPLACE FUNCTION public.create_work_order_from_order()
RETURNS TRIGGER AS $$
DECLARE
    v_work_order_id UUID;
BEGIN
    -- Solo crear work order si el estado cambia a PAGADO
    IF (NEW.status = 'PAGADO' AND (OLD.status IS NULL OR OLD.status <> 'PAGADO')) THEN
        
        -- Insertar work order
        INSERT INTO public.produccion_work_orders (
            order_id,
            order_number,
            status,
            technical_specs,
            priority,
            notes
        ) VALUES (
            NEW.id,
            NEW.order_number,
            'PENDIENTE',
            NEW.lines, -- Copiar desglose técnico
            0, -- Prioridad normal
            'Work order creada automáticamente desde pedido ' || NEW.order_number
        )
        RETURNING id INTO v_work_order_id;
        
        -- Log de actividad
        INSERT INTO public.produccion_activity (
            work_order_id,
            operator_id,
            previous_status,
            new_status,
            notes
        ) VALUES (
            v_work_order_id,
            NULL,
            NULL,
            'PENDIENTE',
            'Work order creada automáticamente. Esperando asignación de operario.'
        );
        
        RAISE NOTICE 'Work order % creada para pedido %', v_work_order_id, NEW.order_number;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Crear trigger
DROP TRIGGER IF EXISTS tr_create_work_order ON public.comercial_orders;
CREATE TRIGGER tr_create_work_order
    AFTER UPDATE ON public.comercial_orders
    FOR EACH ROW
    EXECUTE FUNCTION public.create_work_order_from_order();

-- ==========================================
-- TRIGGER 2: Log de cambios de estado en Work Orders
-- ==========================================

CREATE OR REPLACE FUNCTION public.log_work_order_status_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Solo registrar si el estado cambió
    IF (NEW.status <> OLD.status) THEN
        INSERT INTO public.produccion_activity (
            work_order_id,
            operator_id,
            previous_status,
            new_status,
            notes
        ) VALUES (
            NEW.id,
            NEW.assigned_technician_id,
            OLD.status,
            NEW.status,
            CASE 
                WHEN NEW.status = 'LISTO_ENVIO' THEN 'Work order completada y lista para almacén'
                WHEN NEW.status = 'CANCELADO' THEN 'Work order cancelada'
                ELSE 'Cambio de estado en producción'
            END
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Crear trigger
DROP TRIGGER IF EXISTS tr_log_work_order_status ON public.produccion_work_orders;
CREATE TRIGGER tr_log_work_order_status
    AFTER UPDATE ON public.produccion_work_orders
    FOR EACH ROW
    EXECUTE FUNCTION public.log_work_order_status_change();

-- ==========================================
-- VERIFICACIÓN
-- ==========================================

-- Verificar que los triggers existen
SELECT 
    tgname as trigger_name,
    tgrelid::regclass as table_name,
    proname as function_name
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE tgname IN ('tr_create_work_order', 'tr_log_work_order_status')
ORDER BY tgname;

-- Test: Simular cambio de estado (comentar si no quieres ejecutar)
-- UPDATE public.comercial_orders 
-- SET status = 'PAGADO' 
-- WHERE order_number = 'INT-2025-001' AND status <> 'PAGADO';

-- Verificar work orders creadas
SELECT 
    wo.id,
    wo.order_number,
    wo.status,
    wo.created_at,
    o.customer_name
FROM public.produccion_work_orders wo
JOIN public.comercial_orders o ON wo.order_id = o.id
ORDER BY wo.created_at DESC
LIMIT 5;

-- Verificar actividad registrada
SELECT 
    pa.created_at,
    wo.order_number,
    pa.previous_status,
    pa.new_status,
    pa.notes
FROM public.produccion_activity pa
JOIN public.produccion_work_orders wo ON pa.work_order_id = wo.id
ORDER BY pa.created_at DESC
LIMIT 10;
