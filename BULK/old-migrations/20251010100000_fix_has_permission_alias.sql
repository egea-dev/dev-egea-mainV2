-- =====================================================================
-- MIGRACIÓN: RPC public.has_permission (versión consistente con esquema moderno)
-- =====================================================================
-- Fecha: 2025-10-10
-- Objetivo: restaurar una implementación estable del RPC public.has_permission
--           alineada con la estructura actual de public.role_permissions
--           (columnas role/resource/action/granted), garantizando respuestas
--           correctas para el frontend PermissionGuard.
-- =====================================================================

BEGIN;

-- 1. Idempotencia: eliminar cualquier definición previa del RPC
DROP FUNCTION IF EXISTS public.has_permission(text, text, text);

-- 2. Crear la función basada en role_permissions (resource/action/granted)
CREATE OR REPLACE FUNCTION public.has_permission(
  user_role  TEXT,
  page       TEXT,
  permission TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_role        TEXT := lower(user_role);
  v_resource    TEXT := lower(page);
  v_action      TEXT := lower(permission);
  v_granted     BOOLEAN;
  v_user_id     UUID;
BEGIN
  -- Consultar permisos en la tabla moderna (role/resource/action/granted)
  SELECT rp.granted
  INTO v_granted
  FROM public.role_permissions rp
  WHERE lower(rp.role)     = v_role
    AND lower(rp.resource) = v_resource
    AND lower(rp.action)   = v_action
  LIMIT 1;

  v_granted := COALESCE(v_granted, false);

  -- Registrar auditoría cuando existan datos suficientes
  SELECT p.id
  INTO v_user_id
  FROM public.profiles p
  WHERE p.auth_user_id = auth.uid();

  IF to_regclass('public.audit_logs') IS NOT NULL AND v_user_id IS NOT NULL THEN
    INSERT INTO public.audit_logs (
      user_id,
      action,
      resource,
      action_performed,
      result,
      details
    )
    VALUES (
      v_user_id,
      'permission_check',
      page,
      permission,
      CASE WHEN v_granted THEN 'granted' ELSE 'denied' END,
      jsonb_build_object(
        'user_role', user_role,
        'normalized_role', v_role,
        'normalized_resource', v_resource,
        'normalized_action', v_action
      )
    );
  END IF;

  RETURN v_granted;
END;
$$;

-- 3. Documentación de la función
COMMENT ON FUNCTION public.has_permission(text, text, text) IS
  'RPC que verifica permisos consultando role_permissions (role/resource/action/granted) y registra auditoría cuando está disponible.';

-- 4. Permisos de ejecución
GRANT EXECUTE ON FUNCTION public.has_permission(text, text, text) TO authenticated;

-- 5. Nota: tras aplicar la migración, ejecutar manualmente si es necesario:
--    NOTIFY pgrst, ''reload schema'';

COMMIT;