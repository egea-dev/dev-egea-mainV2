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

-- 3. Ejemplo: Cambiar algunos usuarios para probar los colores del semáforo
-- DESCOMENTA y modifica según necesites:

-- Poner un usuario en vacaciones (reemplaza el ID)
-- UPDATE public.profiles
-- SET status = 'vacaciones'
-- WHERE full_name LIKE '%NOMBRE%';

-- Poner un usuario de baja (reemplaza el ID)
-- UPDATE public.profiles
-- SET status = 'baja'
-- WHERE full_name LIKE '%NOMBRE%';

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
