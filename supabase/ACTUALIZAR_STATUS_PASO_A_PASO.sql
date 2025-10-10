-- =====================================================
-- INSTRUCCIONES: Ejecuta cada bloque por separado
-- Copia y pega cada sección en Supabase SQL Editor
-- =====================================================

-- PASO 1: Ver usuarios actuales
-- Copia SOLO estas 3 líneas:
SELECT id, full_name, role, status
FROM public.profiles
ORDER BY full_name;

-- PASO 2: Actualizar usuarios sin status a 'activo'
-- Copia SOLO estas 3 líneas:
UPDATE public.profiles
SET status = 'activo'
WHERE status IS NULL;

-- PASO 3: (OPCIONAL) Cambiar un usuario a vacaciones para probar
-- Reemplaza 'Juan' con el nombre real del usuario
-- Copia SOLO estas 3 líneas:
UPDATE public.profiles
SET status = 'vacaciones'
WHERE full_name LIKE '%Juan%';

-- PASO 4: (OPCIONAL) Cambiar un usuario a baja para probar
-- Reemplaza 'Pedro' con el nombre real del usuario
-- Copia SOLO estas 3 líneas:
UPDATE public.profiles
SET status = 'baja'
WHERE full_name LIKE '%Pedro%';

-- PASO 5: Verificar los cambios finales
-- Copia SOLO estas líneas:
SELECT
  full_name,
  role,
  status,
  CASE
    WHEN status = 'activo' THEN '🟢 Verde'
    WHEN status = 'vacaciones' THEN '🟠 Naranja'
    WHEN status = 'baja' THEN '🔴 Rojo'
    ELSE '⚫ Gris'
  END as color_semaforo
FROM public.profiles
ORDER BY status, full_name;
