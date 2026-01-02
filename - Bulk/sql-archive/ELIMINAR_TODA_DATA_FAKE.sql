-- =====================================================
-- ELIMINAR TODA LA DATA FAKE/EJEMPLO
-- =====================================================

-- 1. Eliminar tareas asociadas a pantallas fake
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

-- 3. Verificar que no queden datos fake
SELECT
  'screen_data' as tabla,
  COUNT(*) as registros
FROM public.screen_data

UNION ALL

SELECT
  'screens' as tabla,
  COUNT(*) as registros
FROM public.screens

UNION ALL

SELECT
  'profiles' as tabla,
  COUNT(*) as registros
FROM public.profiles

UNION ALL

SELECT
  'vehicles' as tabla,
  COUNT(*) as registros
FROM public.vehicles;
