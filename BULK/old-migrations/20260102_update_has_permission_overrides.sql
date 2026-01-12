-- =====================================================================
-- MIGRACIÓN: Incluir Overrides de Usuario en has_permission
-- =====================================================================
-- Fecha: 2026-01-02
-- Objetivo: Modificar public.has_permission para que verifique primero
--           la tabla public.user_permissions antes de los roles.
-- =====================================================================

BEGIN;

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
  v_profile_id       UUID; -- ID de la tabla public.profiles
  v_override         BOOLEAN := NULL;
  v_matched_page     TEXT := NULL;
  v_matched_action   TEXT := NULL;
  v_can_view         BOOLEAN := NULL;
  v_can_edit         BOOLEAN := NULL;
  v_can_delete       BOOLEAN := NULL;
BEGIN
  -- 1. Obtener IDs del usuario actual
  SELECT id INTO v_profile_id
  FROM public.profiles
  WHERE auth_user_id = auth.uid();

  -- Si no hay perfil, no hay permisos individuales
  IF v_profile_id IS NOT NULL THEN
    -- 2. Verificar si existe un override individual
    -- Mapeamos el recurso si es necesario (ej: /admin/users -> users)
    SELECT enabled INTO v_override
    FROM public.user_permissions
    WHERE user_id = v_profile_id
      AND (
        module = v_resource
        OR module = replace(v_resource, '/admin/', '') -- Quitar el prefijo si existe
        OR (v_resource = '/admin' AND module = 'dashboard')
      );

    -- Si hay un override, lo usamos y saltamos la lógica de roles
    IF v_override IS NOT NULL THEN
      v_granted := v_override;
      v_matched_page := v_resource;
      v_matched_action := v_action;
      
      -- Registrar auditoría si el override deniega algo o es relevante
      -- (Opcional, pero útil para depurar)
      GOTO audit_and_return;
    END IF;
  END IF;

  -- 3. Lógica original de Role Permissions (Si no hay override)
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

<<audit_and_return>>
  v_matched_action := COALESCE(lower(v_matched_action), v_action);

  -- 4. Registro de Auditoría
  IF to_regclass('public.audit_logs') IS NOT NULL AND v_profile_id IS NOT NULL THEN
    INSERT INTO public.audit_logs (
      user_id,
      action,
      resource,
      action_performed,
      result,
      details
    )
    VALUES (
      v_profile_id,
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
        'override_applied', v_override IS NOT NULL,
        'schema_variant', CASE WHEN v_has_new_schema THEN 'resource_action_granted' ELSE 'legacy_page_flags' END
      )
    );
  END IF;

  RETURN COALESCE(v_granted, FALSE);
END;
$$;

COMMIT;
