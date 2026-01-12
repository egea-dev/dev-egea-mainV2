-- =====================================================================
-- MIGRACIÓN: FUNCIONES DE GESTIÓN DE PLANTILLAS CON VALIDACIÓN DE PERMISOS
-- =====================================================================
-- Fecha: 2025-10-09
-- Objetivo: Crear funciones RPC para gestión de plantillas con validación de permisos
-- =====================================================================

BEGIN;

-- Función para crear o actualizar plantillas
CREATE OR REPLACE FUNCTION public.upsert_template(
  p_template_id UUID DEFAULT NULL,
  p_name TEXT,
  p_template_type TEXT,
  p_category TEXT DEFAULT NULL,
  p_fields JSONB DEFAULT '[]'::jsonb,
  p_is_active BOOLEAN DEFAULT true
)
RETURNS TABLE (
  result_template_id UUID,
  result_action TEXT
) AS $$
DECLARE
  v_template_id UUID;
  v_action TEXT;
  v_user_role TEXT;
BEGIN
  -- Obtener el rol del usuario actual
  SELECT role INTO v_user_role
  FROM public.profiles
  WHERE auth_user_id = auth.uid();

  -- Determinar si es creación o edición
  IF p_template_id IS NULL THEN
    v_action := 'create';
  ELSE
    v_action := 'edit';
  END IF;

  -- Validar permisos para gestionar plantillas
  IF NOT public.has_permission(v_user_role, 'templates', v_action) THEN
    RAISE EXCEPTION 'No tienes permisos para % plantillas', v_action;
  END IF;

  -- Validar parámetros requeridos
  IF p_name IS NULL OR p_template_type IS NULL THEN
    RAISE EXCEPTION 'name y template_type son requeridos';
  END IF;

  -- Validar template_type válido (basado en screen_type)
  IF p_template_type NOT IN ('data', 'display') THEN
    RAISE EXCEPTION 'Tipo de plantilla inválido: %', p_template_type;
  END IF;

  -- Upsert de la plantilla
  INSERT INTO public.templates (
    id, name, template_type, category, fields, is_active
  ) VALUES (
    COALESCE(p_template_id, gen_random_uuid()), p_name, p_template_type,
    p_category, p_fields, p_is_active
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    template_type = EXCLUDED.template_type,
    category = EXCLUDED.category,
    fields = EXCLUDED.fields,
    is_active = EXCLUDED.is_active,
    updated_at = NOW()
  RETURNING id INTO v_template_id;

  -- Determinar acción realizada
  IF p_template_id IS NULL THEN
    v_action := 'created';
  ELSE
    v_action := 'updated';
  END IF;

  RETURN QUERY SELECT v_template_id AS result_template_id, v_action AS result_action;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para desactivar plantillas
CREATE OR REPLACE FUNCTION public.deactivate_template(p_template_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_user_role TEXT;
BEGIN
  -- Obtener el rol del usuario actual
  SELECT role INTO v_user_role
  FROM public.profiles
  WHERE auth_user_id = auth.uid();

  -- Validar permisos
  IF NOT public.has_permission(v_user_role, 'templates', 'delete') THEN
    RAISE EXCEPTION 'No tienes permisos para eliminar plantillas';
  END IF;

  -- Desactivar plantilla
  UPDATE public.templates
  SET is_active = false, updated_at = NOW()
  WHERE id = p_template_id;

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Otorgar permisos
GRANT EXECUTE ON FUNCTION public.upsert_template TO authenticated;
GRANT EXECUTE ON FUNCTION public.deactivate_template TO authenticated;

-- Comentarios
COMMENT ON FUNCTION public.upsert_template IS 'Función para crear o actualizar plantillas con validación de permisos';
COMMENT ON FUNCTION public.deactivate_template IS 'Función para desactivar plantillas con validación de permisos';

COMMIT;

-- =====================================================================
-- NOTAS DE IMPLEMENTACIÓN
-- =====================================================================
-- 1. upsert_template valida permisos usando has_permission()
-- 2. deactivate_template desactiva en lugar de eliminar físicamente
-- 3. Todas las validaciones se hacen antes de la operación
-- =====================================================================