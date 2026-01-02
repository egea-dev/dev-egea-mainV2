-- CONSULTAR PEDIDOS CREADOS EN PRODUCTIVITY
-- Ejecutar en SQL Editor de PRODUCTIVITY DB (zslcblcetrhbsdirkvza)

-- Ver todos los pedidos con todos los campos
SELECT 
    id,
    order_number,
    created_by,
    admin_code,
    customer_name,
    contact_name,
    email,
    phone,
    delivery_address,
    delivery_city,
    delivery_region,
    fabric,
    quantity_total,
    status,
    notes,
    delivery_date,
    production_start_date,
    shipped_date,
    delivered_date,
    lines,
    documents,
    created_at,
    updated_at
FROM public.comercial_orders
ORDER BY created_at DESC
LIMIT 10;

-- Ver solo los campos principales
SELECT 
    order_number,
    customer_name,
    fabric,
    quantity_total,
    status,
    created_at,
    lines::text as lines_json,
    documents::text as documents_json
FROM public.comercial_orders
ORDER BY created_at DESC
LIMIT 5;

-- Contar pedidos por estado
SELECT 
    status,
    COUNT(*) as total
FROM public.comercial_orders
GROUP BY status
ORDER BY total DESC;
