-- =====================================================
-- LIMPIAR DATOS FAKE/EJEMPLO
-- =====================================================

-- 1. Eliminar tareas fake de Confección y Tapicería
DELETE FROM public.screen_data
WHERE screen_id IN (
  SELECT id FROM public.screens
  WHERE id IN (
    '11111111-1111-1111-1111-111111111111',
    '22222222-2222-2222-2222-222222222222'
  )
);

-- 2. Eliminar pantallas fake
DELETE FROM public.screens
WHERE id IN (
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222'
);

-- 3. Verificar limpieza
SELECT 'Tareas restantes:' as tipo, COUNT(*) as cantidad FROM public.screen_data
UNION ALL
SELECT 'Pantallas restantes:' as tipo, COUNT(*) as cantidad FROM public.screens;
