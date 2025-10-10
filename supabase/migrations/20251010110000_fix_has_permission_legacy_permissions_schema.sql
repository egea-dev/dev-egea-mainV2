-- =====================================================================
-- MIGRACIÓN: Ajustar public.has_permission al esquema actual de role_permissions
-- =====================================================================
-- Fecha: 2025-10-10
-- Objetivo: Restaurar el RPC public.has_permission para que funcione con
--           la estructura vigente de public.role_permissions (page/can_view/can_edit/can_delete)
--           y mantener compatibilidad con el frontend existente.
-- =====================================================================

BEGIN;

-- 1. Reemplazar la función has_permission para evitar referencias a columnas inexistentes
DROP FUNCTION IF EXISTS public.has_permission(text, text, text);

CREATE OR REPLACE FUNCTION public.has_permission(
  user_role  TEXT,
  resource   TEXT,
  action     TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_role             TEXT := lower(user_role);
  v_resource         TEXT := lower(resource);
  v_action           TEXT := lower(action);
  v_has_new_schema   BOOLEAN := FALSE;
  v_granted          BOOLEAN := FALSE;
  v_user_id          UUID;
  v_matched_page     TEXT := NULL;
  v_matched_action   TEXT := NULL;
  v_can_view         BOOLEAN := NULL;
  v_can_edit         BOOLEAN := NULL;
  v_can_delete       BOOLEAN := NULL;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'role_permissions'
      AND column_name  = 'granted'
  )
  INTO v_has_new_schema;

  IF v_has_new_schema THEN
    SELECT rp.granted,
           rp.resource,
           rp.action
    INTO v_granted,
         v_matched_page,
         v_matched_action
    FROM public.role_permissions rp
    WHERE lower(rp.role) = v_role
      AND (
        lower(rp.resource) = v_resource
        OR lower(rp.resource) = concat('/admin/', v_resource)
        OR (v_resource = 'dashboard' AND lower(rp.resource) IN ('dashboard', '/admin'))
        OR (v_resource = 'admin' AND lower(rp.resource) = '/admin')
      )
      AND lower(rp.action) IN (
        v_action,
        CASE WHEN v_action = 'update' THEN 'edit' ELSE NULL END,
        CASE WHEN v_action = 'edit' THEN 'update' ELSE NULL END,
        CASE WHEN v_action = 'create' THEN 'edit' ELSE NULL END
      )
    ORDER BY
      CASE
        WHEN lower(rp.resource) = v_resource THEN 0
        WHEN lower(rp.resource) = concat('/admin/', v_resource) THEN 1
        ELSE 2
      END,
      CASE
        WHEN lower(rp.action) = v_action THEN 0
        ELSE 1
      END
    LIMIT 1;

    v_granted := COALESCE(v_granted, FALSE);
    v_matched_page := COALESCE(v_matched_page, resource);
  ELSE
    SELECT rp.can_view,
           rp.can_edit,
           rp.can_delete,
           rp.page
    INTO v_can_view,
         v_can_edit,
         v_can_delete,
         v_matched_page
    FROM public.role_permissions rp
    WHERE lower(rp.role) = v_role
      AND (
        lower(rp.page) = v_resource
        OR lower(rp.page) = concat('/admin/', v_resource)
        OR (v_resource = 'dashboard' AND lower(rp.page) IN ('dashboard', '/admin'))
        OR (v_resource = 'admin' AND lower(rp.page) = '/admin')
      )
    ORDER BY
      CASE
        WHEN lower(rp.page) = v_resource THEN 0
        WHEN lower(rp.page) = concat('/admin/', v_resource) THEN 1
        ELSE 2
      END
    LIMIT 1;

    IF v_action = 'view' THEN
      v_granted := COALESCE(v_can_view, FALSE);
    ELSIF v_action IN ('create', 'edit', 'update') THEN
      v_granted := COALESCE(v_can_edit, FALSE);
    ELSIF v_action = 'delete' THEN
      v_granted := COALESCE(v_can_delete, FALSE);
    ELSE
      v_granted := FALSE;
    END IF;

    v_matched_action := CASE
      WHEN v_action = 'view' THEN 'view'
      WHEN v_action IN ('create', 'edit', 'update') THEN 'edit'
      WHEN v_action = 'delete' THEN 'delete'
      ELSE v_action
    END;
  END IF;

  v_matched_action := COALESCE(lower(v_matched_action), v_action);

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
      COALESCE(v_matched_page, resource),
      action,
      CASE WHEN v_granted THEN 'granted' ELSE 'denied' END,
      jsonb_build_object(
        'user_role', user_role,
        'normalized_role', v_role,
        'requested_resource', resource,
        'normalized_resource', v_resource,
        'matched_page', v_matched_page,
        'requested_action', action,
        'normalized_action', v_action,
        'matched_action', v_matched_action,
        'schema_variant', CASE WHEN v_has_new_schema THEN 'resource_action_granted' ELSE 'legacy_page_flags' END
      )
    );
  END IF;

  RETURN COALESCE(v_granted, FALSE);
END;
$$;

-- 2. Documentación y permisos
COMMENT ON FUNCTION public.has_permission(text, text, text) IS
  'RPC que verifica permisos usando las columnas can_view/can_edit/can_delete de role_permissions (formato legacy) y registra auditoría cuando está disponible.';

GRANT EXECUTE ON FUNCTION public.has_permission(text, text, text) TO authenticated;

COMMIT;