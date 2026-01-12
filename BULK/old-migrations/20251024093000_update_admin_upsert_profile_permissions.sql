-- =====================================================================
-- Actualizar función admin_upsert_profile para jerarquía de roles
-- =====================================================================
-- Fecha: 2025-10-24
-- Motivo: Permitir que managers y responsables ajusten roles dentro de
--         su jerarquía manteniendo la restricción de admins.
-- =====================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.admin_upsert_profile(
  p_full_name TEXT,
  p_profile_id UUID DEFAULT NULL,
  p_email TEXT DEFAULT NULL,
  p_phone TEXT DEFAULT NULL,
  p_status TEXT DEFAULT 'activo',
  p_role TEXT DEFAULT 'operario'
)
RETURNS public.profiles AS $$
DECLARE
  v_actor public.profiles;
  v_target public.profiles;
  v_result public.profiles;
BEGIN
  SELECT *
    INTO v_actor
    FROM public.profiles
    WHERE auth_user_id = auth.uid();

  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'No existe un perfil asociado al usuario autenticado';
  END IF;

  IF v_actor.role NOT IN ('admin', 'manager', 'responsable') THEN
    RAISE EXCEPTION 'No tienes permisos para gestionar perfiles';
  END IF;

  IF p_profile_id IS NOT NULL THEN
    SELECT * INTO v_target FROM public.profiles WHERE id = p_profile_id;
    IF v_target IS NULL THEN
      RAISE EXCEPTION 'Perfil no encontrado';
    END IF;
    IF v_target.role = 'admin' AND v_actor.role <> 'admin' THEN
      RAISE EXCEPTION 'Solo administradores pueden modificar perfiles de administradores';
    END IF;
  END IF;

  IF p_role = 'admin' AND v_actor.role <> 'admin' THEN
    RAISE EXCEPTION 'Solo administradores pueden asignar el rol admin';
  END IF;

  IF p_profile_id IS NULL THEN
    INSERT INTO public.profiles (full_name, email, phone, status, role)
    VALUES (
      p_full_name,
      p_email,
      p_phone,
      COALESCE(p_status, 'activo'),
      COALESCE(p_role, 'operario')
    )
    RETURNING * INTO v_result;
  ELSE
    UPDATE public.profiles
    SET full_name = p_full_name,
        email = p_email,
        phone = p_phone,
        status = COALESCE(p_status, status),
        role = CASE
          WHEN v_actor.role = 'admin' THEN COALESCE(p_role, v_target.role)
          WHEN v_actor.role = 'manager' THEN
            CASE
              WHEN p_role = 'admin' THEN v_target.role
              ELSE COALESCE(p_role, v_target.role)
            END
          WHEN v_actor.role = 'responsable' THEN
            CASE
              WHEN p_role IN ('responsable', 'operario') THEN COALESCE(p_role, v_target.role)
              ELSE v_target.role
            END
          ELSE v_target.role
        END,
        updated_at = NOW()
    WHERE id = p_profile_id
    RETURNING * INTO v_result;
  END IF;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.admin_upsert_profile TO authenticated;

COMMIT;
