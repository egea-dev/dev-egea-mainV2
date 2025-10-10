-- =====================================================================
-- MIGRACIÓN: FUNCIONES DE GESTIÓN DE USUARIOS CON VALIDACIÓN DE PERMISOS
-- =====================================================================
-- Fecha: 2025-10-09
-- Objetivo: Crear funciones RPC para gestión de usuarios con validación de permisos
-- =====================================================================

BEGIN;

-- Función para crear o actualizar usuarios
CREATE OR REPLACE FUNCTION public.upsert_user(
  p_user_id UUID DEFAULT NULL,
  p_auth_user_id UUID DEFAULT NULL,
  p_full_name TEXT,
  p_email TEXT,
  p_phone TEXT DEFAULT NULL,
  p_role TEXT DEFAULT 'operario',
  p_status TEXT DEFAULT 'activo',
  p_avatar_url TEXT DEFAULT NULL
)
RETURNS TABLE (
  result_user_id UUID,
  result_action TEXT
) AS $$
DECLARE
  v_user_id UUID;
  v_action TEXT;
  v_user_role TEXT;
  v_current_user_role TEXT;
  v_target_role TEXT;
BEGIN
  -- Obtener el rol del usuario actual
  SELECT role INTO v_current_user_role
  FROM public.profiles
  WHERE auth_user_id = auth.uid();

  -- Determinar si es creación o edición
  IF p_user_id IS NULL THEN
    v_action := 'create';
    v_target_role := p_role;
  ELSE
    v_action := 'edit';
    -- Obtener el rol actual del usuario a editar
    SELECT role INTO v_target_role
    FROM public.profiles
    WHERE id = p_user_id;
    v_target_role := COALESCE(v_target_role, p_role);
  END IF;

  -- Validar permisos para gestionar usuarios
  IF NOT public.has_permission(v_current_user_role, 'users', v_action) THEN
    RAISE EXCEPTION 'No tienes permisos para % usuarios', v_action;
  END IF;

  -- Si se está cambiando el rol, validar jerarquía
  IF p_user_id IS NOT NULL AND v_target_role != p_role THEN
    IF NOT public.can_manage_role(v_current_user_role, p_role) THEN
      RAISE EXCEPTION 'No puedes asignar el rol %', p_role;
    END IF;
  END IF;

  -- Validar rol válido
  IF p_role NOT IN ('admin', 'manager', 'responsable', 'operario') THEN
    RAISE EXCEPTION 'Rol inválido: %', p_role;
  END IF;

  -- Validar status válido
  IF p_status NOT IN ('activo', 'inactivo', 'vacaciones', 'baja') THEN
    RAISE EXCEPTION 'Status inválido: %', p_status;
  END IF;

  -- Upsert del usuario
  INSERT INTO public.profiles (
    id, auth_user_id, full_name, email, phone, role, status, avatar_url
  ) VALUES (
    COALESCE(p_user_id, gen_random_uuid()), p_auth_user_id, p_full_name, p_email,
    p_phone, p_role, p_status, p_avatar_url
  )
  ON CONFLICT (id) DO UPDATE SET
    auth_user_id = EXCLUDED.auth_user_id,
    full_name = EXCLUDED.full_name,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    role = EXCLUDED.role,
    status = EXCLUDED.status,
    avatar_url = EXCLUDED.avatar_url,
    updated_at = NOW()
  RETURNING id INTO v_user_id;

  -- Log role changes for updates
  IF p_user_id IS NOT NULL AND v_target_role != p_role THEN
    INSERT INTO public.audit_logs (user_id, action, resource, action_performed, result, details)
    VALUES (
      (SELECT id FROM public.profiles WHERE auth_user_id = auth.uid()),
      'role_change',
      'users',
      'update_role',
      'granted',
      jsonb_build_object(
        'target_user_id', p_user_id,
        'old_role', v_target_role,
        'new_role', p_role,
        'performed_by', (SELECT full_name FROM public.profiles WHERE auth_user_id = auth.uid())
      )
    );
  END IF;

  -- Determinar acción realizada
  IF p_user_id IS NULL THEN
    v_action := 'created';
  ELSE
    v_action := 'updated';
  END IF;

  RETURN QUERY SELECT v_user_id AS result_user_id, v_action AS result_action;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para eliminar usuarios (desactivar)
CREATE OR REPLACE FUNCTION public.deactivate_user(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_user_role TEXT;
  v_target_role TEXT;
BEGIN
  -- Obtener el rol del usuario actual
  SELECT role INTO v_user_role
  FROM public.profiles
  WHERE auth_user_id = auth.uid();

  -- Obtener el rol del usuario a desactivar
  SELECT role INTO v_target_role
  FROM public.profiles
  WHERE id = p_user_id;

  -- Validar permisos
  IF NOT public.has_permission(v_user_role, 'users', 'delete') THEN
    RAISE EXCEPTION 'No tienes permisos para eliminar usuarios';
  END IF;

  -- Validar jerarquía (no se puede eliminar usuarios de rol superior o igual)
  IF NOT public.can_manage_role(v_user_role, v_target_role) THEN
    RAISE EXCEPTION 'No puedes eliminar usuarios con rol %', v_target_role;
  END IF;

  -- Desactivar usuario en lugar de eliminar
  UPDATE public.profiles
  SET status = 'inactivo', updated_at = NOW()
  WHERE id = p_user_id;

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Otorgar permisos
GRANT EXECUTE ON FUNCTION public.upsert_user TO authenticated;
GRANT EXECUTE ON FUNCTION public.deactivate_user TO authenticated;

-- Comentarios
COMMENT ON FUNCTION public.upsert_user IS 'Función para crear o actualizar usuarios con validación de permisos y jerarquía de roles';
COMMENT ON FUNCTION public.deactivate_user IS 'Función para desactivar usuarios con validación de permisos y jerarquía';

COMMIT;

-- =====================================================================
-- NOTAS DE IMPLEMENTACIÓN
-- =====================================================================
-- 1. upsert_user valida permisos usando has_permission() y can_manage_role()
-- 2. Se previene la edición de roles superiores o iguales
-- 3. deactivate_user desactiva en lugar de eliminar físicamente
-- 4. Todas las validaciones se hacen antes de la operación
-- =====================================================================