-- Script para crear datos de prueba en ProductionPage
-- Base de datos: PRODUCTIVITY DB
-- Ejecutar después de la migración 20251231_add_production_fields_to_work_orders.sql

-- Limpiar datos de prueba anteriores (opcional)
DELETE FROM produccion_work_order_lines WHERE work_order_id IN (
  SELECT id FROM produccion_work_orders WHERE order_number LIKE 'INT-2025-TEST%'
);
DELETE FROM produccion_work_orders WHERE order_number LIKE 'INT-2025-TEST%';

-- Orden 1: PENDIENTE (lista para iniciar producción)
INSERT INTO produccion_work_orders (
  order_number, 
  customer_name, 
  status, 
  fabric, 
  color,
  quantity_total, 
  packages_count, 
  region, 
  qr_payload,
  notes_internal,
  priority
) VALUES (
  'INT-2025-TEST01', 
  'Cliente Demo A', 
  'PENDIENTE', 
  'Ignífugo', 
  'Beige',
  3, 
  NULL, 
  'MALLORCA', 
  'INT-2025-TEST01|Cliente Demo A|PENDIENTE',
  'Material ignífugo certificado. Revisar medidas con especial atención.',
  1
);

-- Líneas de desglose para Orden 1
INSERT INTO produccion_work_order_lines (work_order_id, quantity, width, height, notes)
SELECT id, 1, 150, 280, 'Ventana principal' FROM produccion_work_orders WHERE order_number = 'INT-2025-TEST01'
UNION ALL
SELECT id, 1, 140, 280, 'Ventana lateral izquierda' FROM produccion_work_orders WHERE order_number = 'INT-2025-TEST01'
UNION ALL
SELECT id, 1, 140, 280, 'Ventana lateral derecha' FROM produccion_work_orders WHERE order_number = 'INT-2025-TEST01';

-- Orden 2: CORTE (en proceso de producción)
INSERT INTO produccion_work_orders (
  order_number, 
  customer_name, 
  status, 
  fabric, 
  color,
  quantity_total, 
  packages_count, 
  region, 
  qr_payload,
  process_start_at,
  due_date,
  sla_days,
  priority
) VALUES (
  'INT-2025-TEST02', 
  'Hotel Mediterráneo', 
  'CORTE', 
  'Tela Demo', 
  'Blanco',
  5, 
  NULL, 
  'IBIZA', 
  'INT-2025-TEST02|Hotel Mediterráneo|CORTE',
  NOW(),
  NOW() + INTERVAL '10 days',
  10,
  2
);

-- Líneas de desglose para Orden 2
INSERT INTO produccion_work_order_lines (work_order_id, quantity, width, height)
SELECT id, 2, 200, 300 FROM produccion_work_orders WHERE order_number = 'INT-2025-TEST02'
UNION ALL
SELECT id, 3, 180, 280 FROM produccion_work_orders WHERE order_number = 'INT-2025-TEST02';

-- Orden 3: PTE_ENVIO (lista para envío)
INSERT INTO produccion_work_orders (
  order_number, 
  customer_name, 
  status, 
  fabric, 
  color,
  quantity_total, 
  packages_count, 
  region, 
  qr_payload,
  process_start_at,
  due_date,
  sla_days,
  delivery_address,
  contact_name,
  phone
) VALUES (
  'INT-2025-TEST03', 
  'Restaurante Sa Fonda', 
  'LISTO_ENVIO', 
  'Blackout Premium', 
  'Gris Oscuro',
  6, 
  2, 
  'MENORCA', 
  'INT-2025-TEST03|Restaurante Sa Fonda|LISTO_ENVIO',
  NOW() - INTERVAL '5 days',
  NOW() + INTERVAL '5 days',
  10,
  'Carrer de Sant Roc, 15, Mahón, Menorca',
  'Juan García',
  '971 123 456'
);

-- Líneas de desglose para Orden 3
INSERT INTO produccion_work_order_lines (work_order_id, quantity, width, height, material)
SELECT id, 6, 150, 180, 'Blackout Premium' FROM produccion_work_orders WHERE order_number = 'INT-2025-TEST03';

-- Orden 4: CONFECCION (en confección)
INSERT INTO produccion_work_orders (
  order_number, 
  customer_name, 
  status, 
  fabric, 
  color,
  quantity_total, 
  packages_count, 
  region, 
  qr_payload,
  process_start_at,
  due_date,
  sla_days
) VALUES (
  'INT-2025-TEST04', 
  'Oficinas Central', 
  'CONFECCION', 
  'Screen Solar', 
  'Gris Perla',
  10, 
  NULL, 
  'PENINSULA', 
  'INT-2025-TEST04|Oficinas Central|CONFECCION',
  NOW() - INTERVAL '2 days',
  NOW() + INTERVAL '12 days',
  14
);

-- Líneas de desglose para Orden 4
INSERT INTO produccion_work_order_lines (work_order_id, quantity, width, height)
SELECT id, 5, 120, 200 FROM produccion_work_orders WHERE order_number = 'INT-2025-TEST04'
UNION ALL
SELECT id, 5, 120, 200 FROM produccion_work_orders WHERE order_number = 'INT-2025-TEST04';

-- Verificación
SELECT 
  wo.order_number,
  wo.customer_name,
  wo.status,
  wo.fabric,
  wo.quantity_total,
  wo.packages_count,
  COUNT(wol.id) as num_lines
FROM produccion_work_orders wo
LEFT JOIN produccion_work_order_lines wol ON wo.id = wol.work_order_id
WHERE wo.order_number LIKE 'INT-2025-TEST%'
GROUP BY wo.id, wo.order_number, wo.customer_name, wo.status, wo.fabric, wo.quantity_total, wo.packages_count
ORDER BY wo.order_number;

-- Mensaje de confirmación
DO $$
BEGIN
  RAISE NOTICE '✅ Datos de prueba creados exitosamente';
  RAISE NOTICE '4 órdenes de trabajo creadas con diferentes estados';
  RAISE NOTICE 'Puedes escanear los siguientes QR:';
  RAISE NOTICE '  - INT-2025-TEST01 (PENDIENTE)';
  RAISE NOTICE '  - INT-2025-TEST02 (CORTE)';
  RAISE NOTICE '  - INT-2025-TEST03 (LISTO_ENVIO)';
  RAISE NOTICE '  - INT-2025-TEST04 (CONFECCION)';
END $$;
