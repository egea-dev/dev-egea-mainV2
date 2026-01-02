-- =====================================================
-- APLICAR EN SUPABASE SQL EDITOR
-- =====================================================
-- Crear datos de ejemplo para las tarjetas de Confección y Tapicería
-- =====================================================

-- 1. Crear pantallas de ejemplo con screen_group
INSERT INTO public.screens (id, name, screen_group, is_active)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'Pantalla Confección Principal', 'Confeccion', true),
  ('22222222-2222-2222-2222-222222222222', 'Pantalla Tapicería Principal', 'Tapiceria', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Crear tareas de ejemplo para Confección
INSERT INTO public.screen_data (screen_id, data, state, start_date, end_date, location)
VALUES
  (
    '11111111-1111-1111-1111-111111111111',
    '{"site": "Taller A", "description": "Confección de fundas", "tipo": "Fundas estándar"}'::jsonb,
    'urgente',
    CURRENT_DATE,
    CURRENT_DATE + INTERVAL '3 days',
    'en la isla'
  ),
  (
    '11111111-1111-1111-1111-111111111111',
    '{"site": "Taller B", "description": "Confección de cortinas", "tipo": "Cortinas premium"}'::jsonb,
    'en fabricacion',
    CURRENT_DATE,
    CURRENT_DATE + INTERVAL '5 days',
    'en la isla'
  ),
  (
    '11111111-1111-1111-1111-111111111111',
    '{"site": "Taller C", "description": "Confección de cojines", "tipo": "Cojines decorativos"}'::jsonb,
    'a la espera',
    CURRENT_DATE + INTERVAL '1 day',
    CURRENT_DATE + INTERVAL '7 days',
    'en la isla'
  ),
  (
    '11111111-1111-1111-1111-111111111111',
    '{"site": "Taller D", "description": "Confección de manteles", "tipo": "Manteles industriales"}'::jsonb,
    'terminado',
    CURRENT_DATE - INTERVAL '2 days',
    CURRENT_DATE,
    'en la isla'
  );

-- 3. Crear tareas de ejemplo para Tapicería
INSERT INTO public.screen_data (screen_id, data, state, start_date, end_date, location, responsible_profile_id)
VALUES
  (
    '22222222-2222-2222-2222-222222222222',
    '{"site": "Zona 1", "description": "Tapizado de sillas", "gestor": "Juan Pérez"}'::jsonb,
    'en fabricacion',
    CURRENT_DATE,
    CURRENT_DATE + INTERVAL '4 days',
    'en la isla',
    (SELECT id FROM public.profiles WHERE role = 'admin' LIMIT 1)
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    '{"site": "Zona 2", "description": "Tapizado de sofás", "gestor": "María García"}'::jsonb,
    'a la espera',
    CURRENT_DATE + INTERVAL '1 day',
    CURRENT_DATE + INTERVAL '6 days',
    'fuera',
    (SELECT id FROM public.profiles WHERE role = 'admin' LIMIT 1)
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    '{"site": "Zona 3", "description": "Restauración de butacas", "gestor": "Carlos López"}'::jsonb,
    'pendiente',
    CURRENT_DATE + INTERVAL '2 days',
    CURRENT_DATE + INTERVAL '8 days',
    'en la isla',
    (SELECT id FROM public.profiles WHERE role = 'admin' LIMIT 1)
  );

-- 4. Verificar que se crearon correctamente
SELECT
  s.name as pantalla,
  s.screen_group as grupo,
  sd.data->>'tipo' as tipo,
  sd.data->>'gestor' as gestor,
  sd.state as estado,
  sd.start_date,
  sd.end_date
FROM public.screens s
LEFT JOIN public.screen_data sd ON sd.screen_id = s.id
WHERE s.screen_group IN ('Confeccion', 'Tapiceria')
ORDER BY s.screen_group, sd.created_at;
