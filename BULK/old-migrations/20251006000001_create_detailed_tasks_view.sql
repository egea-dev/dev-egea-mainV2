-- =====================================================================
-- VISTA OPTIMIZADA: detailed_tasks
-- =====================================================================
-- Fecha: 2025-10-06
-- Objetivo: Crear una vista que simplifica las consultas de tareas
--           al pre-unir datos de screen_data con profiles, vehicles
--           y aplanar campos JSON para facilitar el uso en el frontend.
-- =====================================================================

BEGIN;

-- =====================================================================
-- PASO 1: ELIMINAR VISTA SI EXISTE (para permitir re-ejecución)
-- =====================================================================

DROP VIEW IF EXISTS public.detailed_tasks;

-- =====================================================================
-- PASO 2: CREAR LA VISTA detailed_tasks
-- =====================================================================

CREATE OR REPLACE VIEW public.detailed_tasks AS
SELECT
  -- Datos básicos de la tarea
  sd.id,
  sd.created_at,
  sd.screen_id,
  sd.data,
  sd.state,
  sd.status,
  sd.start_date,
  sd.end_date,
  sd.location,
  sd.responsible_profile_id,
  sd.assigned_to,
  sd.checkin_token,
  sd."order",

  -- Información del screen asociado
  s.name AS screen_name,
  s.screen_type,
  s.screen_group,
  s.next_screen_id,
  s.header_color,
  s.is_active AS screen_is_active,

  -- Información del responsable (responsible_profile_id)
  rp.full_name AS responsible_name,
  rp.email AS responsible_email,
  rp.phone AS responsible_phone,
  rp.role AS responsible_role,
  rp.status AS responsible_status,
  rp.avatar_url AS responsible_avatar,

  -- Información del assigned_to (puede ser diferente del responsible)
  ap.full_name AS assigned_name,
  ap.email AS assigned_email,
  ap.phone AS assigned_phone,
  ap.role AS assigned_role,
  ap.status AS assigned_status,

  -- Campos JSON aplanados para facilitar el acceso
  sd.data->>'site' AS site,
  sd.data->>'client' AS client,
  sd.data->>'address' AS address,
  sd.data->>'description' AS description,
  sd.data->>'notes' AS notes,
  sd.data->>'vehicle_type' AS vehicle_type,

  -- Operarios asignados (array agregado desde task_profiles)
  COALESCE(
    (
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', p.id,
          'full_name', p.full_name,
          'email', p.email,
          'phone', p.phone,
          'status', p.status,
          'avatar_url', p.avatar_url
        ) ORDER BY p.full_name
      )
      FROM public.task_profiles tp
      JOIN public.profiles p ON tp.profile_id = p.id
      WHERE tp.task_id = sd.id
    ),
    '[]'::jsonb
  ) AS assigned_profiles,

  -- Vehículos asignados (array agregado desde task_vehicles)
  COALESCE(
    (
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', v.id,
          'name', v.name,
          'type', v.type
        ) ORDER BY v.name
      )
      FROM public.task_vehicles tv
      JOIN public.vehicles v ON tv.vehicle_id = v.id
      WHERE tv.task_id = sd.id
    ),
    '[]'::jsonb
  ) AS assigned_vehicles,

  -- Contadores útiles
  (
    SELECT COUNT(*)
    FROM public.task_profiles tp
    WHERE tp.task_id = sd.id
  ) AS assigned_profiles_count,

  (
    SELECT COUNT(*)
    FROM public.task_vehicles tv
    WHERE tv.task_id = sd.id
  ) AS assigned_vehicles_count,

  -- Indicadores de estado útiles
  CASE
    WHEN sd.state = 'terminado' THEN true
    ELSE false
  END AS is_completed,

  CASE
    WHEN sd.state = 'urgente' THEN true
    ELSE false
  END AS is_urgent,

  CASE
    WHEN sd.start_date <= CURRENT_DATE AND sd.end_date >= CURRENT_DATE THEN true
    ELSE false
  END AS is_current,

  CASE
    WHEN sd.end_date < CURRENT_DATE AND sd.state != 'terminado' THEN true
    ELSE false
  END AS is_overdue

FROM public.screen_data sd
LEFT JOIN public.screens s ON sd.screen_id = s.id
LEFT JOIN public.profiles rp ON sd.responsible_profile_id = rp.id
LEFT JOIN public.profiles ap ON sd.assigned_to = ap.id;

-- =====================================================================
-- PASO 3: OTORGAR PERMISOS DE LECTURA
-- =====================================================================

-- Permitir lectura de la vista a usuarios autenticados y anónimos
-- (las políticas RLS de las tablas subyacentes siguen aplicando)
GRANT SELECT ON public.detailed_tasks TO authenticated, anon;

-- =====================================================================
-- PASO 4: COMENTARIOS PARA DOCUMENTACIÓN
-- =====================================================================

COMMENT ON VIEW public.detailed_tasks IS
'Vista optimizada que une screen_data con profiles, vehicles y screens.
Incluye campos JSON aplanados y arrays agregados de operarios/vehículos.
Úsala en lugar de hacer múltiples JOINs manuales en el frontend.

Ejemplo de uso:
SELECT * FROM detailed_tasks
WHERE screen_group = ''Instalaciones''
AND is_current = true
ORDER BY is_urgent DESC, start_date ASC;';

COMMIT;

-- =====================================================================
-- NOTAS DE IMPLEMENTACIÓN
-- =====================================================================
-- 1. Esta vista NO reemplaza las tablas originales, solo facilita consultas.
--
-- 2. Las operaciones de INSERT/UPDATE/DELETE deben seguir haciéndose
--    en las tablas base (screen_data, task_profiles, task_vehicles).
--
-- 3. Campos útiles añadidos:
--    - assigned_profiles: Array JSON con todos los operarios
--    - assigned_vehicles: Array JSON con todos los vehículos
--    - is_completed, is_urgent, is_current, is_overdue: Booleanos
--    - site, client, address: Campos del JSON 'data' aplanados
--
-- 4. Para usar en el frontend (ejemplo con React Query):
--    const { data } = useQuery({
--      queryKey: ['detailed-tasks'],
--      queryFn: async () => {
--        const { data } = await supabase
--          .from('detailed_tasks')
--          .select('*')
--          .eq('screen_group', 'Instalaciones');
--        return data;
--      }
--    });
-- =====================================================================
