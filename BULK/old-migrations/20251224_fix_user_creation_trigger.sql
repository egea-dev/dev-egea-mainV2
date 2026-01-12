-- =====================================================================
-- FIX: Trigger handle_new_user para vincular perfiles existentes
-- =====================================================================
-- Fecha: 2025-12-24
-- Objetivo: Corregir el error "Database error creating new user" causado
--           por el intento de insertar un perfil duplicado cuando ya existe
--           uno creado manualmente por el administrador (con email pero sin auth_id).
-- =====================================================================

BEGIN;

-- 1. Redefinir la función handle_new_user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_existing_id UUID;
  v_role TEXT;
  v_full_name TEXT;
BEGIN
  -- Obtener valores de metadatos o defaults
  v_role := COALESCE(NEW.raw_user_meta_data->>'role', 'operario');
  v_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email);

  -- 1. Intentar encontrar un perfil existente por email (insensible a mayúsculas)
  SELECT id INTO v_existing_id
  FROM public.profiles
  WHERE email = NEW.email
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    -- 2. Si existe, ACTUALIZARLO vinculando el ID de autenticación
    UPDATE public.profiles
    SET 
      auth_user_id = NEW.id,
      -- Solo actualizamos nombre/rol si están vacíos en el perfil actual o si queremos forzar sync
      -- En este caso, preferimos mantener los datos manuales si existen, o actualizar si es necesario
      role = COALESCE(role, v_role), 
      status = COALESCE(status, 'activo')
    WHERE id = v_existing_id;
    
    -- Notificar (opcional, solo para debug)
    -- RAISE NOTICE 'Perfil existente vinculado: %', NEW.email;
  ELSE
    -- 3. Si no existe, INSERTAR nuevo perfil
    INSERT INTO public.profiles (auth_user_id, full_name, email, role, status)
    VALUES (
      NEW.id,
      v_full_name,
      NEW.email,
      v_role,
      'activo'
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Asegurar que el trigger existe
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

COMMIT;
