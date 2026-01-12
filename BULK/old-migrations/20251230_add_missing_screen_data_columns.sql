-- =====================================================================
-- Añadir columnas faltantes a screen_data
-- Ejecutar en DB MAIN (jyaudpctcqcuskzwmism)
-- =====================================================================

BEGIN;

-- Añadir location_metadata si no existe
ALTER TABLE public.screen_data 
ADD COLUMN IF NOT EXISTS location_metadata JSONB DEFAULT '{}'::jsonb;

-- Añadir work_site_id si no existe (sin FK porque work_sites no existe)
ALTER TABLE public.screen_data 
ADD COLUMN IF NOT EXISTS work_site_id UUID;

-- Añadir responsible_profile_id si no existe
ALTER TABLE public.screen_data 
ADD COLUMN IF NOT EXISTS responsible_profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Añadir assigned_to si no existe
ALTER TABLE public.screen_data 
ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Añadir índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_screen_data_work_site_id ON public.screen_data(work_site_id);
CREATE INDEX IF NOT EXISTS idx_screen_data_responsible_profile_id ON public.screen_data(responsible_profile_id);
CREATE INDEX IF NOT EXISTS idx_screen_data_assigned_to ON public.screen_data(assigned_to);

-- Comentarios
COMMENT ON COLUMN public.screen_data.location_metadata IS 'Metadatos adicionales de ubicación en formato JSON';
COMMENT ON COLUMN public.screen_data.work_site_id IS 'Referencia al sitio de trabajo asociado';
COMMENT ON COLUMN public.screen_data.responsible_profile_id IS 'Perfil responsable de la tarea';
COMMENT ON COLUMN public.screen_data.assigned_to IS 'Perfil asignado a la tarea';

COMMIT;

-- =====================================================================
-- VERIFICACIÓN
-- =====================================================================
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'screen_data'
  AND column_name IN ('location_metadata', 'work_site_id', 'responsible_profile_id', 'assigned_to')
ORDER BY column_name;
