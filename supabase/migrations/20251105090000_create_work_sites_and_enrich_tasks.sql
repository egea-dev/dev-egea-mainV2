-- =====================================================================
-- MIGRACIÓN: CREAR TABLA work_sites Y ENRIQUECER screen_data/detailed_tasks
-- =====================================================================
-- Fecha: 2025-11-05
-- Objetivo:
--   1. Crear la entidad centralizada de ubicaciones (work_sites) con control
--      de imagotipo/mapas.
--   2. Asociar tareas (screen_data) a un work_site concreto y permitir meta-
--      datos estructurados de localización.
--   3. Actualizar la vista detailed_tasks para exponer los nuevos campos.
-- =====================================================================

BEGIN;

-- =====================================================================
-- PASO 1: CREACIÓN DE TABLA work_sites
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.work_sites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  alias TEXT,
  address TEXT,
  city TEXT,
  province TEXT,
  postal_code TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  maps_url TEXT,
  notes TEXT,
  imagotipo_enabled BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT work_sites_name_unique UNIQUE (name)
);

ALTER TABLE public.work_sites ENABLE ROW LEVEL SECURITY;

-- Política de lectura para usuarios públicos/autenticados.
CREATE POLICY IF NOT EXISTS "read_work_sites"
  ON public.work_sites FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

-- Política de gestión restringida a administradores mediante helper is_admin().
CREATE POLICY IF NOT EXISTS "manage_work_sites"
  ON public.work_sites FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Reutilizar trigger genérico de updated_at.
CREATE TRIGGER handle_work_sites_updated_at
  BEFORE UPDATE ON public.work_sites
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

COMMENT ON TABLE public.work_sites IS 'Catálogo de ubicaciones/obras con control de imagotipo y metadatos de dirección.';

-- =====================================================================
-- PASO 2: ENRIQUECER screen_data CON REFERENCIA A work_sites
-- =====================================================================

ALTER TABLE public.screen_data
  ADD COLUMN IF NOT EXISTS work_site_id UUID REFERENCES public.work_sites(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS location_metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

-- Índices de apoyo para consultas frecuentes
CREATE INDEX IF NOT EXISTS idx_screen_data_work_site_id
  ON public.screen_data(work_site_id);

CREATE INDEX IF NOT EXISTS idx_screen_data_location_metadata
  ON public.screen_data
  USING GIN (location_metadata)
  WHERE location_metadata IS NOT NULL AND location_metadata <> '{}'::jsonb;

COMMENT ON COLUMN public.screen_data.work_site_id IS 'Ubicación estructurada asociada a la tarea.';
COMMENT ON COLUMN public.screen_data.location_metadata IS 'Metadatos adicionales de localización (coordenadas, referencias externas, etc.).';

-- =====================================================================
-- PASO 3: REDEFINIR VISTA detailed_tasks CON LOS NUEVOS CAMPOS
-- =====================================================================

DROP VIEW IF EXISTS public.detailed_tasks;

CREATE OR REPLACE VIEW public.detailed_tasks AS
SELECT
  -- Datos básicos de la tarea
  sd.id,
  sd.created_at,
  sd.updated_at,
  sd.screen_id,
  sd.data,
  sd.state,
  sd.status,
  sd.start_date,
  sd.end_date,
  sd.location,
  sd.location_metadata,
  sd.work_site_id,
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
  s.refresh_interval_sec,

  -- Información del work_site (si existe)
  ws.name AS work_site_name,
  ws.alias AS work_site_alias,
  ws.address AS work_site_address,
  ws.city AS work_site_city,
  ws.province AS work_site_province,
  ws.postal_code AS work_site_postal_code,
  ws.latitude AS work_site_latitude,
  ws.longitude AS work_site_longitude,
  ws.maps_url AS work_site_maps_url,
  ws.imagotipo_enabled AS work_site_imagotipo_enabled,

  -- Información del responsable (responsible_profile_id)
  rp.full_name AS responsible_name,
  rp.email AS responsible_email,
  rp.phone AS responsible_phone,
  rp.role AS responsible_role,
  rp.status AS responsible_status,
  rp.avatar_url AS responsible_avatar,

  -- Información del assigned_to (puede ser diferente del responsable)
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
          'role', p.role,
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
          'type', v.type,
          'license_plate', v.license_plate,
          'capacity', v.capacity
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
    WHEN sd.start_date IS NOT NULL
      AND sd.start_date <= CURRENT_DATE
      AND (sd.end_date IS NULL OR sd.end_date >= CURRENT_DATE)
      THEN true
    ELSE false
  END AS is_current,

  CASE
    WHEN sd.end_date IS NOT NULL
      AND sd.end_date < CURRENT_DATE
      AND sd.state <> 'terminado'
      THEN true
    ELSE false
  END AS is_overdue,

  CASE
    WHEN sd.start_date IS NOT NULL AND sd.start_date > CURRENT_DATE THEN true
    ELSE false
  END AS is_future,

  CASE
    WHEN sd.start_date IS NULL THEN NULL
    ELSE (sd.start_date - CURRENT_DATE)
  END AS days_from_start,

  CASE
    WHEN sd.state = 'urgente' THEN 1
    WHEN sd.state = 'incidente' THEN 2
    WHEN sd.state = 'arreglo' THEN 3
    WHEN sd.state <> 'terminado'
      AND sd.end_date IS NOT NULL
      AND sd.end_date < CURRENT_DATE THEN 4
    WHEN sd.state = 'en fabricacion' THEN 5
    WHEN sd.state = 'a la espera' THEN 6
    ELSE 7
  END AS priority_order

FROM public.screen_data sd
LEFT JOIN public.screens s ON sd.screen_id = s.id
LEFT JOIN public.work_sites ws ON sd.work_site_id = ws.id
LEFT JOIN public.profiles rp ON sd.responsible_profile_id = rp.id
LEFT JOIN public.profiles ap ON sd.assigned_to = ap.id;

GRANT SELECT ON public.detailed_tasks TO authenticated, anon;

COMMENT ON VIEW public.detailed_tasks IS
'Vista optimizada que une screen_data con profiles, vehicles, screens y work_sites.
Incluye campos JSON aplanados y arrays agregados de operarios/vehículos, así como
metadatos de ubicación centralizados.';

-- =====================================================================
-- PASO 4: ACTUALIZAR FUNCIÓN upsert_task PARA INCLUIR work_sites
-- =====================================================================

DROP FUNCTION IF EXISTS public.upsert_task;

CREATE OR REPLACE FUNCTION public.upsert_task(
  p_task_id UUID DEFAULT NULL,
  p_screen_id UUID DEFAULT NULL,
  p_data JSONB DEFAULT '{}'::jsonb,
  p_state TEXT DEFAULT 'pendiente',
  p_status TEXT DEFAULT 'pendiente',
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL,
  p_location TEXT DEFAULT NULL,
  p_location_metadata JSONB DEFAULT '{}'::jsonb,
  p_work_site_id UUID DEFAULT NULL,
  p_responsible_profile_id UUID DEFAULT NULL,
  p_assigned_to UUID DEFAULT NULL,
  p_assigned_profiles UUID[] DEFAULT NULL,
  p_assigned_vehicles UUID[] DEFAULT NULL
)
RETURNS TABLE (
  result_task_id UUID,
  result_action TEXT
) AS $$
DECLARE
  v_task_id UUID;
  v_action TEXT;
  v_user_role TEXT;
  v_permission_action TEXT;
  v_location_metadata JSONB := COALESCE(p_location_metadata, '{}'::jsonb);
BEGIN
  -- Obtener el rol del usuario actual
  SELECT role INTO v_user_role
  FROM public.profiles
  WHERE auth_user_id = auth.uid();

  -- Determinar si es creación o edición
  IF p_task_id IS NULL THEN
    v_permission_action := 'create';
  ELSE
    v_permission_action := 'edit';
  END IF;

  -- Validar permisos
  IF NOT public.has_permission(v_user_role, 'screens', v_permission_action) THEN
    RAISE EXCEPTION 'No tienes permisos para % tareas', v_permission_action;
  END IF;

  -- Validar parámetros requeridos
  IF p_screen_id IS NULL THEN
    RAISE EXCEPTION 'p_screen_id is required';
  END IF;

  -- Validar que el estado sea válido
  IF p_state NOT IN ('pendiente', 'urgente', 'en fabricacion', 'a la espera', 'terminado', 'incidente', 'arreglo') THEN
    RAISE EXCEPTION 'Estado inválido: %', p_state;
  END IF;

  -- Validar que el status sea válido
  IF p_status NOT IN ('pendiente', 'acabado', 'en progreso') THEN
    RAISE EXCEPTION 'Status inválido: %', p_status;
  END IF;

  -- Validar work_site si aplica
  IF p_work_site_id IS NOT NULL THEN
    PERFORM 1
    FROM public.work_sites ws
    WHERE ws.id = p_work_site_id
      AND ws.is_active = true;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'work_site_id % no existe o está inactivo', p_work_site_id;
    END IF;
  END IF;

  -- Upsert de la tarea con metadatos de localización y work_site
  INSERT INTO public.screen_data (
    id,
    screen_id,
    data,
    state,
    status,
    start_date,
    end_date,
    location,
    location_metadata,
    work_site_id,
    responsible_profile_id,
    assigned_to
  )
  VALUES (
    COALESCE(p_task_id, gen_random_uuid()),
    p_screen_id,
    p_data,
    p_state,
    p_status,
    p_start_date,
    p_end_date,
    p_location,
    v_location_metadata,
    p_work_site_id,
    p_responsible_profile_id,
    p_assigned_to
  )
  ON CONFLICT (id) DO UPDATE SET
    data = EXCLUDED.data,
    state = EXCLUDED.state,
    status = EXCLUDED.status,
    start_date = EXCLUDED.start_date,
    end_date = EXCLUDED.end_date,
    location = EXCLUDED.location,
    location_metadata = EXCLUDED.location_metadata,
    work_site_id = EXCLUDED.work_site_id,
    responsible_profile_id = EXCLUDED.responsible_profile_id,
    assigned_to = EXCLUDED.assigned_to,
    updated_at = NOW()
  RETURNING id INTO v_task_id;

  -- Determinar acción realizada
  IF p_task_id IS NULL THEN
    v_action := 'created';
  ELSE
    v_action := 'updated';
  END IF;

  -- Eliminar asignaciones existentes si hay nuevas
  IF p_assigned_profiles IS NOT NULL OR p_assigned_vehicles IS NOT NULL THEN
    DELETE FROM public.task_profiles WHERE public.task_profiles.task_id = v_task_id;
    DELETE FROM public.task_vehicles WHERE public.task_vehicles.task_id = v_task_id;
  END IF;

  -- Insertar nuevas asignaciones de perfiles
  IF p_assigned_profiles IS NOT NULL THEN
    INSERT INTO public.task_profiles (task_id, profile_id)
    SELECT v_task_id, unnest(p_assigned_profiles);
  END IF;

  -- Insertar nuevas asignaciones de vehículos
  IF p_assigned_vehicles IS NOT NULL THEN
    INSERT INTO public.task_vehicles (task_id, vehicle_id)
    SELECT v_task_id, unnest(p_assigned_vehicles);
  END IF;

  RETURN QUERY SELECT v_task_id AS result_task_id, v_action AS result_action;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.upsert_task TO authenticated;

COMMENT ON FUNCTION public.upsert_task IS 'Función para crear o actualizar tareas con asignaciones, work_sites y metadatos de localización.';

COMMIT;

-- =====================================================================
-- NOTAS DE IMPLEMENTACIÓN
-- =====================================================================
-- 1. work_sites actúa como catálogo maestro de ubicaciones; su bandera
--    imagotipo_enabled permite controlar desde el frontend si se muestra
--    el imagotipo/mapas.
-- 2. location_metadata queda disponible para guardar coordenadas normalizadas,
--    identificadores externos (Google Place ID, etc.) y evitar lógica
--    heurística en el frontend.
-- 3. detailed_tasks expone los campos ya listos para consumo directo.
-- =====================================================================
