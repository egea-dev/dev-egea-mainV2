-- ============================================================================
-- CONFIGURACIÓN DIRECTA DE PERMISOS PARA ROLES OPERACIONALES
-- Ejecuta este script en Supabase Dashboard → SQL Editor
-- ============================================================================

BEGIN;

-- ============================================================================
-- PASO 1: Eliminar constraint de roles (permitir cualquier rol)
-- ============================================================================
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

-- ============================================================================
-- PASO 2: Actualizar usuarios específicos con sus roles correctos
-- ============================================================================

-- Usuario de producción
UPDATE public.profiles 
SET role = 'produccion', status = 'activo'
WHERE email = 'produccion@decoracionesegea.com';

-- Usuario de envíos
UPDATE public.profiles 
SET role = 'envios', status = 'activo'
WHERE email = 'envios@decoracionesegea.com';

-- ============================================================================
-- PASO 3: Asegurar que existen permisos para roles operacionales
-- ============================================================================

-- Eliminar permisos antiguos en inglés
DELETE FROM public.role_permissions WHERE role IN ('production', 'shipping', 'warehouse');

-- Insertar permisos para PRODUCCION (solo si no existen)
INSERT INTO public.role_permissions (role, resource, action, granted)
VALUES 
  ('produccion', 'production', 'view', true),
  ('produccion', 'production', 'create', true),
  ('produccion', 'production', 'edit', true),
  ('produccion', 'dashboard', 'view', true)
ON CONFLICT (role, resource, action) DO NOTHING;

-- Insertar permisos para ENVIOS (solo si no existen)
INSERT INTO public.role_permissions (role, resource, action, granted)
VALUES 
  ('envios', 'envios', 'view', true),
  ('envios', 'envios', 'create', true),
  ('envios', 'envios', 'edit', true),
  ('envios', 'dashboard', 'view', true)
ON CONFLICT (role, resource, action) DO NOTHING;

-- Insertar permisos para ALMACEN (solo si no existen)
INSERT INTO public.role_permissions (role, resource, action, granted)
VALUES 
  ('almacen', 'warehouse', 'view', true),
  ('almacen', 'warehouse', 'create', true),
  ('almacen', 'warehouse', 'edit', true),
  ('almacen', 'warehouse', 'delete', true),
  ('almacen', 'comercial', 'view', true),
  ('almacen', 'dashboard', 'view', true)
ON CONFLICT (role, resource, action) DO NOTHING;

-- Insertar permisos para COMERCIAL (solo si no existen)
INSERT INTO public.role_permissions (role, resource, action, granted)
VALUES 
  ('comercial', 'comercial', 'view', true),
  ('comercial', 'comercial', 'create', true),
  ('comercial', 'comercial', 'edit', true),
  ('comercial', 'comercial', 'delete', true),
  ('comercial', 'dashboard', 'view', true)
ON CONFLICT (role, resource, action) DO NOTHING;

-- ============================================================================
-- PASO 4: Actualizar función admin_upsert_profile (sin whatsapp)
-- ============================================================================

DROP FUNCTION IF EXISTS public.admin_upsert_profile(TEXT, UUID, TEXT, TEXT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.admin_upsert_profile(TEXT, UUID, TEXT, TEXT, TEXT, TEXT);

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
  IF v_actor IS NULL THEN RAISE EXCEPTION 'No existe un perfil asociado al usuario autenticado'; END IF;
  IF v_actor.role NOT IN ('admin', 'manager', 'responsable') THEN RAISE EXCEPTION 'No tienes permisos para gestionar perfiles'; END IF;

  IF p_profile_id IS NOT NULL THEN
    SELECT * INTO v_target FROM public.profiles WHERE id = p_profile_id;
    IF v_target IS NULL THEN RAISE EXCEPTION 'Perfil no encontrado'; END IF;
    IF v_target.role = 'admin' AND v_actor.role <> 'admin' THEN RAISE EXCEPTION 'Solo administradores pueden modificar perfiles de administradores'; END IF;
  END IF;

  IF p_role = 'admin' AND v_actor.role <> 'admin' THEN RAISE EXCEPTION 'Solo administradores pueden asignar el rol admin'; END IF;

  IF p_profile_id IS NULL THEN
    INSERT INTO public.profiles (full_name, email, phone, status, role)
    VALUES (p_full_name, p_email, p_phone, COALESCE(p_status, 'activo'), COALESCE(p_role, 'operario'))
    RETURNING * INTO v_result;
  ELSE
    UPDATE public.profiles
    SET full_name = p_full_name, email = COALESCE(p_email, email), phone = COALESCE(p_phone, phone),
        status = COALESCE(p_status, status),
        role = CASE
          WHEN v_actor.role = 'admin' THEN COALESCE(p_role, v_target.role)
          WHEN v_actor.role = 'manager' THEN CASE WHEN p_role = 'admin' THEN v_target.role ELSE COALESCE(p_role, v_target.role) END
          ELSE v_target.role
        END,
        updated_at = NOW()
    WHERE id = p_profile_id RETURNING * INTO v_result;
  END IF;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.admin_upsert_profile TO authenticated;

-- ============================================================================
-- VERIFICACIÓN FINAL
-- ============================================================================

DO $$ 
DECLARE
  v_prod_role TEXT;
  v_envios_role TEXT;
  v_prod_perms INT;
  v_envios_perms INT;
BEGIN
  -- Verificar usuario produccion
  SELECT role INTO v_prod_role FROM public.profiles WHERE email = 'produccion@decoracionesegea.com';
  SELECT COUNT(*) INTO v_prod_perms FROM public.role_permissions WHERE role = 'produccion';
  
  -- Verificar usuario envios
  SELECT role INTO v_envios_role FROM public.profiles WHERE email = 'envios@decoracionesegea.com';
  SELECT COUNT(*) INTO v_envios_perms FROM public.role_permissions WHERE role = 'envios';
  
  RAISE NOTICE '================================================';
  RAISE NOTICE '✅ CONFIGURACIÓN COMPLETADA';
  RAISE NOTICE '================================================';
  RAISE NOTICE 'Usuario produccion@decoracionesegea.com → Rol: %', COALESCE(v_prod_role, 'NO ENCONTRADO');
  RAISE NOTICE 'Permisos para rol produccion: % registros', v_prod_perms;
  RAISE NOTICE '';
  RAISE NOTICE 'Usuario envios@decoracionesegea.com → Rol: %', COALESCE(v_envios_role, 'NO ENCONTRADO');
  RAISE NOTICE 'Permisos para rol envios: % registros', v_envios_perms;
  RAISE NOTICE '================================================';
  
  IF v_prod_role IS NULL THEN
    RAISE WARNING 'Usuario produccion@decoracionesegea.com NO EXISTE - Créalo manualmente';
  END IF;
  
  IF v_envios_role IS NULL THEN
    RAISE WARNING 'Usuario envios@decoracionesegea.com NO EXISTE - Créalo manualmente';
  END IF;
END $$;

COMMIT;
