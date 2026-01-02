-- CONFIGURAR SLA (Service Level Agreement) POR REGIÓN
-- Ejecutar en SQL Editor de PRODUCTIVITY DB (zslcblcetrhbsdirkvza)

-- 1. Poblar tabla de configuración SLA
INSERT INTO public.comercial_sla_config (region, days)
VALUES 
    ('PENINSULA', 7),
    ('BALEARES', 10),
    ('CANARIAS', 14)
ON CONFLICT (region) 
DO UPDATE SET days = EXCLUDED.days;

-- 2. Verificar configuración
SELECT * FROM public.comercial_sla_config ORDER BY days;

-- 3. Función para calcular fecha límite de entrega
CREATE OR REPLACE FUNCTION calculate_delivery_deadline(
    p_order_date TIMESTAMPTZ,
    p_region TEXT
) RETURNS DATE AS $$
DECLARE
    v_days INTEGER;
BEGIN
    -- Obtener días SLA para la región
    SELECT days INTO v_days
    FROM public.comercial_sla_config
    WHERE region = p_region;
    
    -- Si no existe configuración, usar 7 días por defecto
    IF v_days IS NULL THEN
        v_days := 7;
    END IF;
    
    -- Calcular fecha límite (fecha pedido + días SLA)
    RETURN (p_order_date + (v_days || ' days')::INTERVAL)::DATE;
END;
$$ LANGUAGE plpgsql;

-- 4. Función para verificar si un pedido está cerca del límite
CREATE OR REPLACE FUNCTION is_order_near_deadline(
    p_delivery_date DATE,
    p_warning_days INTEGER DEFAULT 2
) RETURNS BOOLEAN AS $$
BEGIN
    -- Retorna TRUE si faltan menos de warning_days días
    RETURN (p_delivery_date - CURRENT_DATE) <= p_warning_days 
           AND (p_delivery_date - CURRENT_DATE) >= 0;
END;
$$ LANGUAGE plpgsql;

-- 5. Función para verificar si un pedido está retrasado
CREATE OR REPLACE FUNCTION is_order_overdue(
    p_delivery_date DATE
) RETURNS BOOLEAN AS $$
BEGIN
    -- Retorna TRUE si la fecha de entrega ya pasó
    RETURN p_delivery_date < CURRENT_DATE;
END;
$$ LANGUAGE plpgsql;

-- 6. Vista para pedidos con información de SLA
CREATE OR REPLACE VIEW comercial_orders_with_sla AS
SELECT 
    o.*,
    s.days as sla_days,
    calculate_delivery_deadline(o.created_at, o.delivery_region) as calculated_deadline,
    is_order_near_deadline(o.delivery_date) as is_near_deadline,
    is_order_overdue(o.delivery_date) as is_overdue,
    CASE 
        WHEN is_order_overdue(o.delivery_date) THEN 'OVERDUE'
        WHEN is_order_near_deadline(o.delivery_date) THEN 'WARNING'
        ELSE 'OK'
    END as sla_status
FROM public.comercial_orders o
LEFT JOIN public.comercial_sla_config s ON s.region = o.delivery_region;

-- 7. Verificar vista
SELECT 
    order_number,
    delivery_region,
    sla_days,
    delivery_date,
    calculated_deadline,
    sla_status
FROM comercial_orders_with_sla
LIMIT 5;
