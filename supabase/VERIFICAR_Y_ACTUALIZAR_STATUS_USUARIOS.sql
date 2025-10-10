-- =====================================================
-- APLICAR EN SUPABASE SQL EDITOR
-- =====================================================
-- Verificar y actualizar el status de los usuarios
-- =====================================================

-- 1. Ver el status actual de todos los usuarios
SELECT id, full_name, role, status
FROM public.profiles
ORDER BY full_name;

-- 2. Actualizar usuarios sin status a 'activo'
UPDATE public.profiles
SET status = 'activo'
WHERE status IS NULL;

-- 3. Ejemplo: Cambiar algunos usuarios a diferentes estados para probar
-- DESCOMENTA las líneas que necesites:

-- Poner un usuario en vacaciones (reemplaza 'Nombre Usuario' con el nombre real)
-- UPDATE public.profiles
-- SET status = 'vacaciones'
-- WHERE full_name = 'Nombre Usuario';

-- Poner un usuario de baja (reemplaza 'Nombre Usuario' con el nombre real)
-- UPDATE public.profiles
-- SET status = 'baja'
-- WHERE full_name = 'Nombre Usuario';

-- 4. Verificar los cambios
SELECT
  full_name,
  status,
  CASE
    WHEN status = 'activo' THEN '🟢 Verde'
    WHEN status = 'vacaciones' THEN '🟠 Naranja'
    WHEN status = 'baja' THEN '🔴 Rojo'
    ELSE '⚫ Gris (sin status)'
  END as color_semaforo
FROM public.profiles
ORDER BY status, full_name;
