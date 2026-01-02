-- Insertar un pedido de prueba completo para verificar PlantBoard y ShippingScan
-- Fecha: 2026-01-02

INSERT INTO public.produccion_work_orders (
  order_number,
  customer_name,
  status,
  priority,
  fabric,
  color,
  quantity_total,
  packages_count,
  scanned_packages,
  region,
  delivery_address,
  contact_name,
  phone,
  notes_internal,
  technical_specs,
  created_at,
  due_date
) VALUES (
  'TEST-2026-BOARD',           -- order_number
  'Hotel Grand Luxe Demo',     -- customer_name
  'CONFECCION',                -- status (Para que salga en Board y no en envios aun, o cambiar a PTE_ENVIO para probar ambos)
  1,                           -- priority
  'Terciopelo Royal',          -- fabric
  'Azul Noche',                -- color
  150,                         -- quantity_total
  8,                           -- packages_count
  0,                           -- scanned_packages
  'MADRID CENTRO',             -- region
  'Gran Vía 12, Madrid',       -- delivery_address
  'Director de Compras',       -- contact_name
  '+34 600 000 000',           -- phone
  'Pedido urgente para inauguración. Revisar costuras.', -- notes_internal
  '{"fabric": "Terciopelo Royal", "color": "Azul Noche", "quantity": 150, "customer_name": "Hotel Grand Luxe Demo", "region": "MADRID CENTRO"}'::jsonb, -- technical_specs (Redundancia para probar parsing)
  NOW() - INTERVAL '2 days',   -- created_at
  NOW() + INTERVAL '5 days'    -- due_date
);

-- Insertar líneas de desglose para este pedido
WITH new_order AS (SELECT id FROM public.produccion_work_orders WHERE order_number = 'TEST-2026-BOARD' LIMIT 1)
INSERT INTO public.produccion_work_order_lines (work_order_id, quantity, width, height, notes, material)
SELECT id, 50, 200, 250, 'Habitaciones Planta 1', 'Terciopelo Royal' FROM new_order
UNION ALL
SELECT id, 50, 200, 250, 'Habitaciones Planta 2', 'Terciopelo Royal' FROM new_order
UNION ALL
SELECT id, 50, 150, 150, 'Hall Principal', 'Visillo Premium' FROM new_order;
