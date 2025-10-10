-- =====================================================================
-- MIGRACIÓN: FUNCIONES DE GESTIÓN DE VEHÍCULOS CON VALIDACIÓN DE PERMISOS
-- =====================================================================
-- Fecha: 2025-10-09
-- Objetivo: Crear funciones RPC para gestión de vehículos con validación de permisos
-- =====================================================================

BEGIN;

-- Función para crear o actualizar vehículos
CREATE OR REPLACE FUNCTION public.upsert_vehicle(
  p_vehicle_id UUID DEFAULT NULL,
  p_name TEXT,
  p_type TEXT,
  p_license_plate TEXT DEFAULT NULL,
  p_capacity INTEGER DEFAULT NULL,
  p_is_active BOOLEAN DEFAULT true
)
RETURNS TABLE (
  result_vehicle_id UUID,
  result_action TEXT
) AS $$
DECLARE
  v_vehicle_id UUID;
  v_action TEXT;
  v_user_role TEXT;
BEGIN
  -- Obtener el rol del usuario actual
  SELECT role INTO v_user_role
  FROM public.profiles
  WHERE auth_user_id = auth.uid();

  -- Determinar si es creación o edición
  IF p_vehicle_id IS NULL THEN
    v_action := 'create';
  ELSE
    v_action := 'edit';
  END IF;

  -- Validar permisos para gestionar vehículos
  IF NOT public.has_permission(v_user_role, 'vehicles', v_action) THEN
    RAISE EXCEPTION 'No tienes permisos para % vehículos', v_action;
  END IF;

  -- Validar parámetros requeridos
  IF p_name IS NULL OR p_type IS NULL THEN
    RAISE EXCEPTION 'name y type son requeridos';
  END IF;

  -- Validar tipo válido
  IF p_type NOT IN ('furgoneta', 'camion', 'automovil', 'moto', 'otro') THEN
    RAISE EXCEPTION 'Tipo de vehículo inválido: %', p_type;
  END IF;

  -- Upsert del vehículo
  INSERT INTO public.vehicles (
    id, name, type, license_plate, capacity, is_active
  ) VALUES (
    COALESCE(p_vehicle_id, gen_random_uuid()), p_name, p_type,
    p_license_plate, p_capacity, p_is_active
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    type = EXCLUDED.type,
    license_plate = EXCLUDED.license_plate,
    capacity = EXCLUDED.capacity,
    is_active = EXCLUDED.is_active,
    updated_at = NOW()
  RETURNING id INTO v_vehicle_id;

  -- Determinar acción realizada
  IF p_vehicle_id IS NULL THEN
    v_action := 'created';
  ELSE
    v_action := 'updated';
  END IF;

  RETURN QUERY SELECT v_vehicle_id AS result_vehicle_id, v_action AS result_action;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para desactivar vehículos
CREATE OR REPLACE FUNCTION public.deactivate_vehicle(p_vehicle_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_user_role TEXT;
BEGIN
  -- Obtener el rol del usuario actual
  SELECT role INTO v_user_role
  FROM public.profiles
  WHERE auth_user_id = auth.uid();

  -- Validar permisos
  IF NOT public.has_permission(v_user_role, 'vehicles', 'delete') THEN
    RAISE EXCEPTION 'No tienes permisos para eliminar vehículos';
  END IF;

  -- Desactivar vehículo
  UPDATE public.vehicles
  SET is_active = false, updated_at = NOW()
  WHERE id = p_vehicle_id;

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Otorgar permisos
GRANT EXECUTE ON FUNCTION public.upsert_vehicle TO authenticated;
GRANT EXECUTE ON FUNCTION public.deactivate_vehicle TO authenticated;

-- Comentarios
COMMENT ON FUNCTION public.upsert_vehicle IS 'Función para crear o actualizar vehículos con validación de permisos';
COMMENT ON FUNCTION public.deactivate_vehicle IS 'Función para desactivar vehículos con validación de permisos';

COMMIT;

-- =====================================================================
-- NOTAS DE IMPLEMENTACIÓN
-- =====================================================================
-- 1. upsert_vehicle valida permisos usando has_permission()
-- 2. deactivate_vehicle desactiva en lugar de eliminar físicamente
-- 3. Todas las validaciones se hacen antes de la operación
-- =====================================================================