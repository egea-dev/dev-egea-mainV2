-- =====================================================
-- ELIMINAR DATOS DE EJEMPLO/FAKE
-- =====================================================

-- Eliminar tareas de ejemplo de Confección y Tapicería
DELETE FROM public.screen_data
WHERE screen_id IN (
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222'
);

-- Eliminar pantallas de ejemplo
DELETE FROM public.screens
WHERE id IN (
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222'
);

-- Verificar que se eliminaron
SELECT COUNT(*) as tareas_restantes FROM public.screen_data;
SELECT COUNT(*) as pantallas_restantes FROM public.screens;
