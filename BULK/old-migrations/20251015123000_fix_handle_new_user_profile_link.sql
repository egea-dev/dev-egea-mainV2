-- ================================================================
-- Ajustar handle_new_user para respetar email único en profiles
-- Fecha: 2025-10-15
-- Objetivo: evitar errores "Database error creating new user" cuando
--           ya existe un perfil con el mismo email sin auth_user_id.
-- ================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_full_name TEXT := COALESCE(NULLIF(NEW.raw_user_meta_data->>'full_name', ''), NEW.email);
  v_role TEXT := COALESCE(NULLIF(NEW.raw_user_meta_data->>'role', ''), 'operario');
  v_existing public.profiles%ROWTYPE;
BEGIN
  -- Intentar encontrar un perfil existente por email (insensible a mayúsculas)
  IF NEW.email IS NOT NULL THEN
    SELECT *
      INTO v_existing
      FROM public.profiles
      WHERE email IS NOT NULL
        AND lower(email) = lower(NEW.email)
      ORDER BY updated_at DESC
      LIMIT 1;
  END IF;

  IF v_existing.id IS NOT NULL THEN
    -- Si ya está vinculado a otro usuario diferente, detener el alta
    IF v_existing.auth_user_id IS NOT NULL AND v_existing.auth_user_id <> NEW.id THEN
      RAISE EXCEPTION 'El email % ya está asociado a otro usuario', NEW.email;
    END IF;

    UPDATE public.profiles
    SET
      auth_user_id = NEW.id,
      full_name = COALESCE(v_full_name, full_name),
      role = COALESCE(v_role, role),
      status = COALESCE(status, 'activo'),
      updated_at = NOW()
    WHERE id = v_existing.id;

    RETURN NEW;
  END IF;

  INSERT INTO public.profiles (auth_user_id, full_name, email, role, status)
  VALUES (
    NEW.id,
    v_full_name,
    NEW.email,
    v_role,
    'activo'
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;

-- ================================================================
-- Fin del script
-- ================================================================
