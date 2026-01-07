-- ============================================================================
-- MIGRACIÓN CONSOLIDADA TODO-EN-UNO
-- Ejecuta este script COMPLETO en Supabase Dashboard → SQL Editor
-- ============================================================================

BEGIN;

-- ============================================================================
-- PARTE 1: ELIMINAR CONSTRAINT DE ROLES
-- ============================================================================

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

DO $$ BEGIN
  RAISE NOTICE '✓ Paso 1/4: Constraint de roles eliminado';
END $$;

-- ============================================================================
-- PARTE 2: CORREGIR NOMBRES DE ROLES (INGLÉS → ESPAÑOL)
-- ============================================================================

-- Actualizar role_permissions
UPDATE public.role_permissions SET role = 'produccion' WHERE role = 'production';
UPDATE public.role_permissions SET role = 'envios' WHERE role = 'shipping';
UPDATE public.role_permissions SET role = 'almacen' WHERE role = 'warehouse';

-- Actualizar profiles de usuarios
UPDATE public.profiles SET role = 'produccion' WHERE role = 'production';
UPDATE public.profiles SET role = 'envios' WHERE role = 'shipping';
UPDATE public.profiles SET role = 'almacen' WHERE role = 'warehouse';

DO $$ BEGIN
  RAISE NOTICE '✓ Paso 2/4: Roles actualizados a español';
END $$;

-- ============================================================================
-- PARTE 3: CORREGIR FUNCIÓN admin_upsert_profile (SIN WHATSAPP)
-- ============================================================================

-- Eliminar versiones anteriores
DROP FUNCTION IF EXISTS public.admin_upsert_profile(TEXT, UUID, TEXT, TEXT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.admin_upsert_profile(TEXT, UUID, TEXT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.admin_upsert_profile(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT);

-- Crear versión correcta
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
  SELECT * INTO v_actor FROM public.profiles WHERE auth_user_id = auth.uid();
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
    VALUES (p_full_name, p_email, p_phone, COALESCE(p_status, 'activo'), COALESCE(p_role, 'operario'))
    RETURNING * INTO v_result;
  ELSE
    UPDATE public.profiles
    SET full_name = p_full_name,
        email = COALESCE(p_email, email),
        phone = COALESCE(p_phone, phone),
        status = COALESCE(p_status, status),
        role = CASE
          WHEN v_actor.role = 'admin' THEN COALESCE(p_role, v_target.role)
          WHEN v_actor.role = 'manager' THEN
            CASE WHEN p_role = 'admin' THEN v_target.role ELSE COALESCE(p_role, v_target.role) END
          WHEN v_actor.role = 'responsable' THEN
            CASE WHEN p_role IN ('responsable', 'operario', 'produccion', 'envios', 'almacen', 'comercial') 
              THEN COALESCE(p_role, v_target.role) ELSE v_target.role END
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

DO $$ BEGIN
  RAISE NOTICE '✓ Paso 3/4: Función admin_upsert_profile actualizada';
END $$;

-- ============================================================================
-- PARTE 4: CREAR FUNCIÓN invite_user_by_email
-- ============================================================================

CREATE OR REPLACE FUNCTION public.invite_user_by_email(
  p_email TEXT,
  p_full_name TEXT DEFAULT NULL,
  p_role TEXT DEFAULT 'operario'
)
RETURNS JSONB AS $$
DECLARE
  v_actor public.profiles;
  v_new_profile public.profiles;
BEGIN
  SELECT * INTO v_actor FROM public.profiles WHERE auth_user_id = auth.uid();
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'No existe un perfil asociado al usuario autenticado';
  END IF;

  IF v_actor.role NOT IN ('admin', 'manager') THEN
    RAISE EXCEPTION 'No tienes permisos para invitar usuarios';
  END IF;

  IF p_email IS NULL OR p_email = '' THEN
    RAISE EXCEPTION 'El email es obligatorio';
  END IF;

  IF EXISTS (SELECT 1 FROM public.profiles WHERE email = p_email) THEN
    RAISE EXCEPTION 'Ya existe un usuario con este email';
  END IF;

  INSERT INTO public.profiles (full_name, email, role, status)
  VALUES (COALESCE(p_full_name, p_email), p_email, COALESCE(p_role, 'operario'), 'pendiente')
  RETURNING * INTO v_new_profile;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Perfil creado. El usuario debe ser invitado manualmente desde Supabase Dashboard.',
    'profile_id', v_new_profile.id,
    'email', v_new_profile.email
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.invite_user_by_email TO authenticated;

DO $$ BEGIN
  RAISE NOTICE '✓ Paso 4/4: Función invite_user_by_email creada';
END $$;

-- ============================================================================
-- RESUMEN FINAL
-- ============================================================================

DO $$ 
DECLARE
  v_roles TEXT;
BEGIN
  SELECT string_agg(role, ', ' ORDER BY role) INTO v_roles
  FROM (SELECT DISTINCT role FROM public.profiles WHERE role IS NOT NULL) AS r;
  
  RAISE NOTICE '================================================';
  RAISE NOTICE '✅ MIGRACIÓN COMPLETADA EXITOSAMENTE';
  RAISE NOTICE '================================================';
  RAISE NOTICE 'Roles actuales: %', v_roles;
  RAISE NOTICE '✓ Constraint eliminado';
  RAISE NOTICE '✓ Roles en español';
  RAISE NOTICE '✓ admin_upsert_profile actualizado';
  RAISE NOTICE '✓ invite_user_by_email creado';
  RAISE NOTICE '================================================';
END $$;

COMMIT;
