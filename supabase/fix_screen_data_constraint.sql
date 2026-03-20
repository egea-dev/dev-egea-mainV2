-- Saneamiento de Base de Datos (Instalaciones)
-- 1. Limpiar estados inválidos para evitar errores de restricción
UPDATE screen_data 
SET status = 'pendiente' 
WHERE status IS NULL 
   OR status NOT IN ('pendiente', 'en_curso', 'completado', 'cancelado', 'no_realizado');

-- 2. Actualizar la restricción de estados
ALTER TABLE screen_data DROP CONSTRAINT IF EXISTS screen_data_status_check;
ALTER TABLE screen_data ADD CONSTRAINT screen_data_status_check 
CHECK (status IN ('pendiente', 'en_curso', 'completado', 'cancelado', 'no_realizado'));

-- 3. Añadir la columna de kilometraje si no existe
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS km INTEGER DEFAULT 0;
