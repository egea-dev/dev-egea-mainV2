-- =====================================================================
-- FIX: Corregir trigger de creación de work orders
-- =====================================================================
-- Ejecutar en SQL Editor de PRODUCTIVITY DB (zslcblcetrhbsdirkvza)
-- Fecha: 14 de enero de 2026
-- =====================================================================

-- Crear función para generar número de work order si no existe
CREATE OR REPLACE FUNCTION public.generate_work_order_number()
RETURNS TEXT AS $$
DECLARE
    year_code TEXT;
    sequence_num INTEGER;
    new_number TEXT;
BEGIN
    year_code := to_char(NOW(), 'YY');
    
    SELECT COALESCE(MAX(CAST(SUBSTRING(work_order_number FROM 5 FOR 4) AS INTEGER)), 0) + 1
    INTO sequence_num
    FROM public.produccion_work_orders
    WHERE work_order_number LIKE 'WO-' || year_code || '%';
    
    new_number := 'WO-' || year_code || '-' || LPAD(sequence_num::TEXT, 4, '0');
    
    RETURN new_number;
END;
$$ LANGUAGE plpgsql;

-- Eliminar trigger antiguo
DROP TRIGGER IF EXISTS tr_create_work_order ON public.comercial_orders;
DROP FUNCTION IF EXISTS public.create_work_order_from_order();

-- Crear función corregida
CREATE OR REPLACE FUNCTION public.create_work_order_from_order()
RETURNS TRIGGER AS $$
DECLARE
    v_work_order_id UUID;
    v_work_order_number TEXT;
BEGIN
    -- Solo crear work order si el estado cambia a PAGADO o EN_PROCESO
    IF (NEW.status IN ('PAGADO', 'EN_PROCESO') AND (OLD.status IS NULL OR OLD.status NOT IN ('PAGADO', 'EN_PROCESO'))) THEN
        
        -- Generar número de work order
        v_work_order_number := public.generate_work_order_number();
        
        -- Insertar work order con columna CORRECTA: comercial_order_id
        INSERT INTO public.produccion_work_orders (
            work_order_number,
            comercial_order_id,  -- CORREGIDO: era order_id
            product_type,
            fabric,
            color,
            quantity,
            status,
            notes
        ) VALUES (
            v_work_order_number,
            NEW.id,
            'Pedido comercial',
            NEW.fabric,
            NEW.color,
            NEW.quantity_total,
            'PENDIENTE',
            'Work order creada automáticamente desde pedido ' || NEW.order_number
        )
        RETURNING id INTO v_work_order_id;
        
        RAISE NOTICE 'Work order % creada para pedido %', v_work_order_number, NEW.order_number;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Crear trigger
CREATE TRIGGER tr_create_work_order
    AFTER UPDATE ON public.comercial_orders
    FOR EACH ROW
    EXECUTE FUNCTION public.create_work_order_from_order();

-- =====================================================================
-- VERIFICACIÓN
-- =====================================================================

-- Verificar que el trigger existe
SELECT 
    tgname as trigger_name,
    tgrelid::regclass as table_name,
    proname as function_name
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE tgname = 'tr_create_work_order';

-- Verificar estructura de la tabla
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'produccion_work_orders' 
AND column_name IN ('comercial_order_id', 'order_id')
ORDER BY column_name;
