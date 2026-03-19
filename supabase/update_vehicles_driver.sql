-- Script para añadir conductor asignado a vehicles
ALTER TABLE vehicles 
ADD COLUMN IF NOT EXISTS assigned_driver_id UUID REFERENCES profiles(id) ON DELETE SET NULL;

-- Actualizar la función RPC upsert_vehicle
CREATE OR REPLACE FUNCTION upsert_vehicle(
  p_vehicle_id UUID,
  p_name TEXT,
  p_type TEXT,
  p_license_plate TEXT DEFAULT NULL,
  p_capacity INT DEFAULT 1,
  p_is_active BOOLEAN DEFAULT true,
  p_km INT DEFAULT 0,
  p_status TEXT DEFAULT 'normal',
  p_assigned_driver_id UUID DEFAULT NULL
) RETURNS TABLE (result_action TEXT) AS $$
DECLARE
  v_action TEXT;
BEGIN
  IF p_vehicle_id IS NOT NULL THEN
    UPDATE vehicles
    SET 
      name = p_name,
      type = p_type,
      license_plate = p_license_plate,
      capacity = p_capacity,
      is_active = p_is_active,
      km = p_km,
      status = p_status,
      assigned_driver_id = p_assigned_driver_id,
      updated_at = NOW()
    WHERE id = p_vehicle_id;
    v_action := 'updated';
  ELSE
    INSERT INTO vehicles (
      name, 
      type, 
      license_plate, 
      capacity, 
      is_active, 
      km, 
      status, 
      assigned_driver_id
    )
    VALUES (
      p_name, 
      p_type, 
      p_license_plate, 
      p_capacity, 
      p_is_active, 
      p_km, 
      p_status, 
      p_assigned_driver_id
    );
    v_action := 'inserted';
  END IF;
  
  RETURN QUERY SELECT v_action;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
