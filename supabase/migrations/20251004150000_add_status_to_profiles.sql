-- FASE DE CORRECCIÓN ARQUITECTÓNICA: Añadir la columna 'status' que falta a la tabla 'profiles'.

BEGIN;

-- 1. AÑADIR LA COLUMNA 'status' A LA TABLA 'profiles'
-- Se define como TEXT y se permite que sea nulo, con un valor por defecto de 'activo'.
-- El CHECK constraint asegura la integridad de los datos.
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'activo' CHECK (status IN ('activo', 'baja', 'vacaciones'));

-- 2. INICIALIZAR LA COLUMNA PARA LOS REGISTROS EXISTENTES
-- Nos aseguramos de que todos los perfiles existentes tengan el estado 'activo' por defecto.
UPDATE public.profiles SET status = 'activo' WHERE status IS NULL;

COMMIT;