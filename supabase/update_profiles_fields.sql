-- Script para añadir columnas de carnet y certificado a profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS has_driving_license BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS has_residence_certificate BOOLEAN DEFAULT false;

-- Actualizar la función RPC admin_upsert_profile
CREATE OR REPLACE FUNCTION admin_upsert_profile(
  p_full_name TEXT,
  p_profile_id UUID DEFAULT NULL,
  p_email TEXT DEFAULT NULL,
  p_phone TEXT DEFAULT NULL,
  p_status TEXT DEFAULT 'activo',
  p_role TEXT DEFAULT 'operario',
  p_has_driving_license BOOLEAN DEFAULT false,
  p_has_residence_certificate BOOLEAN DEFAULT false
) RETURNS VOID AS $$
BEGIN
  IF p_profile_id IS NOT NULL THEN
    UPDATE profiles
    SET 
      full_name = p_full_name,
      email = p_email,
      phone = p_phone,
      status = p_status,
      role = p_role,
      has_driving_license = p_has_driving_license,
      has_residence_certificate = p_has_residence_certificate,
      updated_at = NOW()
    WHERE id = p_profile_id;
  ELSE
    INSERT INTO profiles (
      full_name, 
      email, 
      phone, 
      status, 
      role, 
      has_driving_license, 
      has_residence_certificate
    )
    VALUES (
      p_full_name, 
      p_email, 
      p_phone, 
      p_status, 
      p_role, 
      p_has_driving_license, 
      p_has_residence_certificate
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
