-- Actualiza la función RPC upsert_vehicle para incluir km y status con validaciones completas
BEGIN;

CREATE OR REPLACE FUNCTION public.upsert_vehicle(
  p_name TEXT,
  p_type TEXT,
  p_vehicle_id UUID DEFAULT NULL,
  p_license_plate TEXT DEFAULT NULL,
  p_capacity INTEGER DEFAULT NULL,
  p_is_active BOOLEAN DEFAULT true,
  p_km INTEGER DEFAULT 0,
  p_status TEXT DEFAULT 'normal'
)
RETURNS TABLE (
  result_vehicle_id UUID,
  result_action TEXT
) AS $$
DECLARE
  v_vehicle_id UUID;
  v_action TEXT;
  v_user_role TEXT;
  v_is_admin BOOLEAN;
BEGIN
  v_is_admin := public.is_admin();

  IF v_is_admin THEN
    v_user_role := 'admin';
  ELSE
    SELECT role INTO v_user_role
    FROM public.profiles
    WHERE auth_user_id = auth.uid();

    IF v_user_role IS NULL THEN
      RAISE EXCEPTION 'No se pudo determinar tu rol. Verifica que tu perfil esté configurado correctamente.';
    END IF;
  END IF;

  IF p_vehicle_id IS NULL THEN
    v_action := 'create';
  ELSE
    v_action := 'edit';
  END IF;

  IF NOT v_is_admin THEN
    IF NOT public.has_permission(v_user_role, 'vehicles', v_action) THEN
      RAISE EXCEPTION 'No tienes permisos para % vehículos', v_action;
    END IF;
  END IF;

  IF p_name IS NULL OR trim(p_name) = '' THEN
    RAISE EXCEPTION 'El nombre del vehículo es requerido';
  END IF;

  IF p_type NOT IN ('jumper', 'camion', 'furgoneta', 'otro') THEN
    RAISE EXCEPTION 'Tipo de vehículo inválido: %', p_type;
  END IF;

  IF p_capacity IS NOT NULL AND p_capacity < 0 THEN
    RAISE EXCEPTION 'La capacidad no puede ser negativa';
  END IF;

  IF p_km IS NOT NULL AND p_km < 0 THEN
    RAISE EXCEPTION 'El kilometraje no puede ser negativo';
  END IF;

  IF p_status NOT IN ('normal', 'accidentado', 'revision') THEN
    RAISE EXCEPTION 'Estado de vehículo inválido: %', p_status;
  END IF;

  INSERT INTO public.vehicles (
    id,
    name,
    type,
    license_plate,
    capacity,
    is_active,
    km,
    status
  ) VALUES (
    COALESCE(p_vehicle_id, gen_random_uuid()),
    trim(p_name),
    p_type,
    NULLIF(p_license_plate, ''),
    COALESCE(p_capacity, 1),
    COALESCE(p_is_active, true),
    COALESCE(p_km, 0),
    COALESCE(p_status, 'normal')
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    type = EXCLUDED.type,
    license_plate = EXCLUDED.license_plate,
    capacity = EXCLUDED.capacity,
    is_active = EXCLUDED.is_active,
    km = EXCLUDED.km,
    status = EXCLUDED.status,
    updated_at = NOW()
  RETURNING id INTO v_vehicle_id;

  IF p_vehicle_id IS NULL THEN
    v_action := 'created';
  ELSE
    v_action := 'updated';
  END IF;

  RETURN QUERY SELECT v_vehicle_id AS result_vehicle_id, v_action AS result_action;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;
