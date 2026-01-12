-- Crear función upsert_vehicle para gestionar vehículos
CREATE OR REPLACE FUNCTION public.upsert_vehicle(
  p_vehicle_id UUID DEFAULT NULL,
  p_name TEXT DEFAULT NULL,
  p_type TEXT DEFAULT NULL,
  p_license_plate TEXT DEFAULT NULL,
  p_capacity INTEGER DEFAULT 1,
  p_is_active BOOLEAN DEFAULT TRUE,
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
BEGIN
  -- Si se proporciona un ID, actualizar
  IF p_vehicle_id IS NOT NULL THEN
    UPDATE public.vehicles
    SET
      name = COALESCE(p_name, name),
      type = COALESCE(p_type, type),
      license_plate = COALESCE(p_license_plate, license_plate),
      capacity = COALESCE(p_capacity, capacity),
      is_active = COALESCE(p_is_active, is_active),
      updated_at = NOW()
    WHERE id = p_vehicle_id
    RETURNING id INTO v_vehicle_id;
    
    v_action := 'updated';
  ELSE
    -- Crear nuevo vehículo
    INSERT INTO public.vehicles (
      name,
      type,
      license_plate,
      capacity,
      is_active
    ) VALUES (
      p_name,
      p_type,
      p_license_plate,
      p_capacity,
      p_is_active
    )
    RETURNING id INTO v_vehicle_id;
    
    v_action := 'created';
  END IF;

  RETURN QUERY SELECT v_vehicle_id, v_action;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Otorgar permisos
GRANT EXECUTE ON FUNCTION public.upsert_vehicle TO authenticated;

COMMENT ON FUNCTION public.upsert_vehicle IS 'Crea o actualiza un vehículo en la tabla vehicles';
