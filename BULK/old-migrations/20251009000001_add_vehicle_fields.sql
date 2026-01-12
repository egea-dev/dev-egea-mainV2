-- =====================================================================
-- MIGRACIÓN: AÑADIR CAMPOS KM Y ESTADO A VEHÍCULOS
-- =====================================================================
-- Fecha: 2025-10-09
-- Objetivo: Añadir campos de kilometraje y estado a la tabla vehicles
-- =====================================================================

BEGIN;

-- Añadir campos a la tabla vehicles
ALTER TABLE IF EXISTS public.vehicles
  ADD COLUMN IF NOT EXISTS km INTEGER CHECK (km >= 0),
  ADD COLUMN IF NOT EXISTS status TEXT CHECK (status IN ('normal', 'accidentado', 'revision')) DEFAULT 'normal';

-- Actualizar vehículos existentes con valores por defecto
UPDATE public.vehicles 
SET km = 0 
WHERE km IS NULL;

-- Crear índices para los nuevos campos
CREATE INDEX IF NOT EXISTS idx_vehicles_status ON public.vehicles(status);
CREATE INDEX IF NOT EXISTS idx_vehicles_km ON public.vehicles(km);

-- Añadir comentario a los nuevos campos
COMMENT ON COLUMN public.vehicles.km IS 'Kilometraje actual del vehículo';
COMMENT ON COLUMN public.vehicles.status IS 'Estado actual del vehículo: normal, accidentado, en revisión';

COMMIT;

-- =====================================================================
-- NOTAS DE IMPLEMENTACIÓN
-- =====================================================================
-- 1. Se añaden los campos km y status con validaciones
-- 2. km debe ser un número entero no negativo
-- 3. status tiene valores predefinidos con 'normal' como valor por defecto
-- 4. Se crean índices para optimizar consultas por estos campos
-- =====================================================================