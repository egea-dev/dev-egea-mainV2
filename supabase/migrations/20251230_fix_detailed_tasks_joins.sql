-- =====================================================================
-- FIX FINAL JOINS: Detailed Tasks View with Screen Group
-- Ejecutar en DB MAIN
-- =====================================================================

BEGIN;

-- 1. Recrear la vista detailed_tasks con JOIN a screens
DROP VIEW IF EXISTS public.detailed_tasks CASCADE;

CREATE OR REPLACE VIEW public.detailed_tasks AS
SELECT 
  sd.*,
  s.screen_group,
  s.name as screen_name,
  -- Array de perfiles asignados
  COALESCE(
    (SELECT json_agg(json_build_object(
      'id', p.id, 
      'full_name', p.full_name,
      'email', p.email,
      'phone', p.phone,
      'role', p.role,
      'status', p.status
    ))
     FROM public.task_profiles tp
     JOIN public.profiles p ON p.id = tp.profile_id
     WHERE tp.task_id = sd.id),
    '[]'::json
  ) AS assigned_profiles,
  -- Array de vehículos asignados
  COALESCE(
    (SELECT json_agg(json_build_object(
      'id', v.id, 
      'name', v.name, 
      'license_plate', v.license_plate,
      'type', v.type
    ))
     FROM public.task_vehicles tv
     JOIN public.vehicles v ON v.id = tv.vehicle_id
     WHERE tv.task_id = sd.id),
    '[]'::json
  ) AS assigned_vehicles,
  -- Información del responsable
  rp.full_name as responsible_name,
  rp.email as responsible_email,
  rp.phone as responsible_phone,
  rp.role as responsible_role,
  rp.status as responsible_status
FROM public.screen_data sd
LEFT JOIN public.screens s ON sd.screen_id = s.id
LEFT JOIN public.profiles rp ON sd.responsible_profile_id = rp.id;

COMMENT ON VIEW public.detailed_tasks IS 'View that includes tasks with their assigned profiles, vehicles, screen info and work site';

-- 2. Otorgar permisos EXPLICITOS
GRANT SELECT ON public.detailed_tasks TO authenticated;
GRANT SELECT ON public.detailed_tasks TO anon;

COMMIT;
