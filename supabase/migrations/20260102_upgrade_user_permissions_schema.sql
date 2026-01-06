-- =====================================================================
-- MIGRACIÓN: Unificación de Esquemas de Permisos
-- =====================================================================
-- Fecha: 2026-01-02
-- Objetivo: Actualizar user_permissions para que use el mismo esquema
--           que role_permissions (resource, action, granted).
-- =====================================================================

BEGIN;

-- 1. Añadir nuevas columnas a user_permissions si no existen
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='user_permissions' AND column_name='resource') THEN
        ALTER TABLE public.user_permissions ADD COLUMN resource TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='user_permissions' AND column_name='action') THEN
        ALTER TABLE public.user_permissions ADD COLUMN action TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='user_permissions' AND column_name='granted') THEN
        ALTER TABLE public.user_permissions ADD COLUMN granted BOOLEAN;
    END IF;
END $$;

-- 2. Migrar datos existentes (de enabled a resource/action/granted)
-- Si enabled era true, creamos un registro de 'view' concedido.
UPDATE public.user_permissions 
SET resource = module, 
    action = 'view', 
    granted = enabled
WHERE resource IS NULL;

-- 3. Limpiar columnas antiguas (opcional, pero mejor mantener hasta estar seguros)
-- ALTER TABLE public.user_permissions DROP COLUMN module;
-- ALTER TABLE public.user_permissions DROP COLUMN enabled;

-- 4. Actualizar la función has_permission para leer el nuevo esquema de forma dual o final
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
  v_profile_id       UUID;
  v_override         BOOLEAN := NULL;
  v_matched_page     TEXT := NULL;
  v_matched_action   TEXT := NULL;
  v_can_view         BOOLEAN := NULL;
  v_can_edit         BOOLEAN := NULL;
  v_can_delete       BOOLEAN := NULL;
BEGIN
  -- 1. Obtener ID del perfil actual
  SELECT id INTO v_profile_id
  FROM public.profiles
  WHERE auth_user_id = auth.uid();

  -- 2. Verificar OVERRIDE INDIVIDUAL (Esquema Nuevo: resource, action, granted)
  IF v_profile_id IS NOT NULL THEN
    SELECT up.granted INTO v_override
    FROM public.user_permissions up
    WHERE up.user_id = v_profile_id
      AND (
        lower(up.resource) = v_resource
        OR lower(up.resource) = replace(v_resource, '/admin/', '')
      )
      AND lower(up.action) IN (
        v_action,
        CASE WHEN v_action = 'update' THEN 'edit' ELSE NULL END,
        CASE WHEN v_action = 'edit' THEN 'update' ELSE NULL END,
        CASE WHEN v_action = 'create' THEN 'edit' ELSE NULL END
      )
    ORDER BY 
      CASE WHEN lower(up.action) = v_action THEN 0 ELSE 1 END
    LIMIT 1;

    -- Si no encontramos en esquema nuevo, buscar en esquema legacy (módulo/enabled)
    -- Esto es por compatibilidad durante la migración
    IF v_override IS NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='user_permissions' AND column_name='module') THEN
        SELECT enabled INTO v_override
        FROM public.user_permissions
        WHERE user_id = v_profile_id
          AND (module = v_resource OR module = replace(v_resource, '/admin/', ''))
        LIMIT 1;
    END IF;

    -- Si hay override (sea cual sea el esquema), lo aplicamos
    IF v_override IS NOT NULL THEN
      v_granted := v_override;
      v_matched_page := v_resource;
      v_matched_action := v_action;
      GOTO audit_and_return;
    END IF;
  END IF;

  -- 3. Lógica de ROLE PERMISSIONS
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'role_permissions' AND column_name = 'granted'
  ) INTO v_has_new_schema;

  IF v_has_new_schema THEN
    SELECT rp.granted, rp.resource, rp.action
    INTO v_granted, v_matched_page, v_matched_action
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
      CASE WHEN lower(rp.action) = v_action THEN 0 ELSE 1 END
    LIMIT 1;
  ELSE
    -- Legacy Role logic
    SELECT rp.can_view, rp.can_edit, rp.can_delete, rp.page
    INTO v_can_view, v_can_edit, v_can_delete, v_matched_page
    FROM public.role_permissions rp
    WHERE lower(rp.role) = v_role
      AND (lower(rp.page) = v_resource OR lower(rp.page) = concat('/admin/', v_resource))
    LIMIT 1;

    IF v_action = 'view' THEN v_granted := COALESCE(v_can_view, FALSE);
    ELSIF v_action IN ('create', 'edit', 'update') THEN v_granted := COALESCE(v_can_edit, FALSE);
    ELSIF v_action = 'delete' THEN v_granted := COALESCE(v_can_delete, FALSE);
    END IF;
  END IF;

<<audit_and_return>>
  v_granted := COALESCE(v_granted, FALSE);
  v_matched_action := COALESCE(lower(v_matched_action), v_action);

  -- 4. Registro de Auditoría
  IF to_regclass('public.audit_logs') IS NOT NULL AND v_profile_id IS NOT NULL THEN
    INSERT INTO public.audit_logs (user_id, action, resource, action_performed, result, details)
    VALUES (
      v_profile_id, 'permission_check', COALESCE(v_matched_page, resource), action,
      CASE WHEN v_granted THEN 'granted' ELSE 'denied' END,
      jsonb_build_object(
        'user_role', user_role,
        'requested_resource', resource,
        'requested_action', action,
        'override_applied', v_override IS NOT NULL
      )
    );
  END IF;

  RETURN v_granted;
END;
$$;

COMMIT;
