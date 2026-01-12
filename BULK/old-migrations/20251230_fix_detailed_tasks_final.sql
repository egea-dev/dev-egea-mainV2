-- =====================================================================
-- FIX FINAL: Detailed Tasks View & Permissions
-- Ejecutar en DB MAIN (jyaudpctcqcuskzwmism)
-- =====================================================================

BEGIN;

-- 1. Asegurar que existen las tablas base (si no existen)
CREATE TABLE IF NOT EXISTS public.task_profiles (
    task_id UUID NOT NULL,
    profile_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (task_id, profile_id)
);

CREATE TABLE IF NOT EXISTS public.task_vehicles (
    task_id UUID NOT NULL,
    vehicle_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (task_id, vehicle_id)
);

-- 2. Asegurar columnas en screen_data
ALTER TABLE public.screen_data ADD COLUMN IF NOT EXISTS start_date DATE;
ALTER TABLE public.screen_data ADD COLUMN IF NOT EXISTS end_date DATE;
ALTER TABLE public.screen_data ADD COLUMN IF NOT EXISTS state TEXT;
ALTER TABLE public.screen_data ADD COLUMN IF NOT EXISTS status TEXT;
ALTER TABLE public.screen_data ADD COLUMN IF NOT EXISTS location TEXT;

-- 3. Recrear la vista detailed_tasks
DROP VIEW IF EXISTS public.detailed_tasks CASCADE;

CREATE OR REPLACE VIEW public.detailed_tasks AS
SELECT 
  sd.*,
  -- Array de perfiles asignados
  COALESCE(
    (SELECT json_agg(json_build_object('id', p.id, 'full_name', p.full_name))
     FROM public.task_profiles tp
     JOIN public.profiles p ON p.id = tp.profile_id
     WHERE tp.task_id = sd.id),
    '[]'::json
  ) AS assigned_profiles,
  -- Array de vehículos asignados
  COALESCE(
    (SELECT json_agg(json_build_object('id', v.id, 'name', v.name, 'license_plate', v.license_plate))
     FROM public.task_vehicles tv
     JOIN public.vehicles v ON v.id = tv.vehicle_id
     WHERE tv.task_id = sd.id),
    '[]'::json
  ) AS assigned_vehicles
FROM public.screen_data sd;

COMMENT ON VIEW public.detailed_tasks IS 'View that includes tasks with their assigned profiles and vehicles';

-- 4. Otorgar permisos EXPLICITOS
GRANT SELECT ON public.detailed_tasks TO authenticated;
GRANT SELECT ON public.detailed_tasks TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.task_profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.task_vehicles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.screen_data TO authenticated;

COMMIT;

-- Verificación
SELECT count(*) as view_rows FROM public.detailed_tasks;
