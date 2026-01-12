-- =====================================================================
-- MIGRACIÓN: Funciones RPC para verificación de permisos
-- Fecha: 2 de enero de 2026
-- Autor: Sistema de Mejoras EGEA
-- Descripción: Implementa las funciones RPC has_permission y can_manage_role
--              que son llamadas desde el frontend para verificar permisos
-- =====================================================================

BEGIN;

-- =====================================================================
-- PARTE 1: FUNCIÓN has_permission
-- =====================================================================

-- 1.1 Eliminar función anterior si existe
DROP FUNCTION IF EXISTS public.has_permission(TEXT, TEXT, TEXT);

-- 1.2 Crear función has_permission
CREATE OR REPLACE FUNCTION public.has_permission(
  user_role TEXT,
  resource TEXT,
  action TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  permission_exists BOOLEAN;
  can_perform BOOLEAN := false;
  normalized_role TEXT;
  normalized_action TEXT;
BEGIN
  -- Normalizar el rol (lowercase y trim)
  normalized_role := LOWER(TRIM(user_role));
  normalized_action := LOWER(TRIM(action));
  
  -- Log para debugging (solo en desarrollo)
  -- RAISE NOTICE 'Checking permission: role=%, resource=%, action=%', normalized_role, resource, normalized_action;
  
  -- Admins siempre tienen permiso total
  IF normalized_role = 'admin' THEN
    RETURN true;
  END IF;
  
  -- Managers tienen casi todos los permisos
  IF normalized_role = 'manager' THEN
    -- Restricciones específicas para managers
    IF resource = 'users' AND normalized_action = 'delete' THEN
      RETURN false;
    END IF;
    
    IF resource = 'archive' AND (normalized_action = 'create' OR normalized_action = 'delete') THEN
      RETURN false;
    END IF;
    
    IF resource = 'system-log' AND normalized_action != 'view' THEN
      RETURN false;
    END IF;
    
    -- Para todo lo demás, los managers tienen permiso
    RETURN true;
  END IF;

  -- Para otros roles, buscar en la tabla role_permissions
  SELECT EXISTS (
    SELECT 1 FROM public.role_permissions
    WHERE role = normalized_role AND resource = resource
  ) INTO permission_exists;

  IF permission_exists THEN
    -- Verificar el permiso específico según la acción
    CASE normalized_action
      WHEN 'view', 'read' THEN
        SELECT can_view INTO can_perform
        FROM public.role_permissions
        WHERE role = normalized_role AND resource = resource;
        
      WHEN 'edit', 'update' THEN
        SELECT can_edit INTO can_perform
        FROM public.role_permissions
        WHERE role = normalized_role AND resource = resource;
        
      WHEN 'delete', 'remove' THEN
        SELECT can_delete INTO can_perform
        FROM public.role_permissions
        WHERE role = normalized_role AND resource = resource;
        
      WHEN 'create', 'add' THEN
        -- Asumimos que can_edit implica can_create
        SELECT can_edit INTO can_perform
        FROM public.role_permissions
        WHERE role = normalized_role AND resource = resource;
        
      ELSE
        -- Acción no reconocida, denegar por defecto
        can_perform := false;
    END CASE;
    
    RETURN COALESCE(can_perform, false);
  ELSE
    -- Si no existe el permiso en la tabla, usar lógica de fallback
    -- basada en la jerarquía de roles
    
    IF normalized_role = 'responsable' THEN
      -- Responsables tienen acceso limitado
      CASE resource
        WHEN 'dashboard', 'installations', 'screens', 'communications', 'vehicles' THEN
          RETURN normalized_action IN ('view', 'create', 'edit');
        WHEN 'users', 'archive' THEN
          RETURN normalized_action = 'view';
        ELSE
          RETURN false;
      END CASE;
      
    ELSIF normalized_role = 'operario' THEN
      -- Operarios solo pueden ver y comunicarse
      CASE resource
        WHEN 'dashboard', 'installations', 'screens', 'vehicles' THEN
          RETURN normalized_action = 'view';
        WHEN 'communications' THEN
          RETURN normalized_action IN ('view', 'create', 'edit');
        ELSE
          RETURN false;
      END CASE;
      
    ELSE
      -- Rol no reconocido, denegar por defecto
      RETURN false;
    END IF;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 1.3 Otorgar permisos de ejecución
GRANT EXECUTE ON FUNCTION public.has_permission TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_permission TO anon;

-- 1.4 Agregar comentario
COMMENT ON FUNCTION public.has_permission(TEXT, TEXT, TEXT) IS 
  'Verifica si un rol tiene permiso para realizar una acción sobre un recurso.
   Parámetros:
   - user_role: El rol del usuario (admin, manager, responsable, operario)
   - resource: El recurso a acceder (dashboard, users, installations, etc.)
   - action: La acción a realizar (view, create, edit, delete)
   Retorna: true si tiene permiso, false en caso contrario';

-- =====================================================================
-- PARTE 2: FUNCIÓN can_manage_role
-- =====================================================================

-- 2.1 Eliminar función anterior si existe
DROP FUNCTION IF EXISTS public.can_manage_role(TEXT, TEXT);

-- 2.2 Crear función can_manage_role
CREATE OR REPLACE FUNCTION public.can_manage_role(
  p_manager_role TEXT,
  p_target_role TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  manager_rank INTEGER;
  target_rank INTEGER;
  normalized_manager_role TEXT;
  normalized_target_role TEXT;
BEGIN
  -- Normalizar roles
  normalized_manager_role := LOWER(TRIM(p_manager_role));
  normalized_target_role := LOWER(TRIM(p_target_role));
  
  -- Log para debugging (solo en desarrollo)
  -- RAISE NOTICE 'Checking role management: manager=%, target=%', normalized_manager_role, normalized_target_role;
  
  -- Definir jerarquía de roles (mayor número = mayor autoridad)
  CASE normalized_manager_role
    WHEN 'admin' THEN manager_rank := 4;
    WHEN 'manager' THEN manager_rank := 3;
    WHEN 'responsable' THEN manager_rank := 2;
    WHEN 'operario' THEN manager_rank := 1;
    ELSE manager_rank := 0;
  END CASE;

  CASE normalized_target_role
    WHEN 'admin' THEN target_rank := 4;
    WHEN 'manager' THEN target_rank := 3;
    WHEN 'responsable' THEN target_rank := 2;
    WHEN 'operario' THEN target_rank := 1;
    ELSE target_rank := 0;
  END CASE;

  -- Un rol puede gestionar roles de menor jerarquía
  -- (manager_rank > target_rank)
  RETURN manager_rank > target_rank;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 2.3 Otorgar permisos de ejecución
GRANT EXECUTE ON FUNCTION public.can_manage_role TO authenticated;

-- 2.4 Agregar comentario
COMMENT ON FUNCTION public.can_manage_role(TEXT, TEXT) IS 
  'Verifica si un rol puede gestionar (crear, editar, eliminar) usuarios de otro rol.
   Basado en jerarquía: admin(4) > manager(3) > responsable(2) > operario(1)
   Parámetros:
   - p_manager_role: El rol del gestor
   - p_target_role: El rol del usuario a gestionar
   Retorna: true si puede gestionar, false en caso contrario';

-- =====================================================================
-- PARTE 3: FUNCIÓN AUXILIAR get_current_user_role
-- =====================================================================

-- 3.1 Eliminar función anterior si existe
DROP FUNCTION IF EXISTS public.get_current_user_role();

-- 3.2 Crear función get_current_user_role
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT AS $$
DECLARE
  user_role TEXT;
BEGIN
  -- Obtener el rol del usuario autenticado actual
  SELECT role INTO user_role
  FROM public.profiles
  WHERE auth_user_id = auth.uid();
  
  -- Retornar el rol o 'operario' por defecto
  RETURN COALESCE(user_role, 'operario');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 3.3 Otorgar permisos de ejecución
GRANT EXECUTE ON FUNCTION public.get_current_user_role TO authenticated;

-- 3.4 Agregar comentario
COMMENT ON FUNCTION public.get_current_user_role() IS 
  'Obtiene el rol del usuario autenticado actual.
   Retorna el rol del usuario o operario por defecto si no se encuentra.';

-- =====================================================================
-- PARTE 4: FUNCIÓN AUXILIAR check_current_user_permission
-- =====================================================================

-- 4.1 Eliminar función anterior si existe
DROP FUNCTION IF EXISTS public.check_current_user_permission(TEXT, TEXT);

-- 4.2 Crear función check_current_user_permission
CREATE OR REPLACE FUNCTION public.check_current_user_permission(
  resource TEXT,
  action TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  current_role TEXT;
BEGIN
  -- Obtener el rol del usuario actual
  current_role := public.get_current_user_role();
  
  -- Verificar el permiso usando has_permission
  RETURN public.has_permission(current_role, resource, action);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 4.3 Otorgar permisos de ejecución
GRANT EXECUTE ON FUNCTION public.check_current_user_permission TO authenticated;

-- 4.4 Agregar comentario
COMMENT ON FUNCTION public.check_current_user_permission(TEXT, TEXT) IS 
  'Verifica si el usuario autenticado actual tiene permiso para una acción.
   Wrapper conveniente de has_permission que obtiene automáticamente el rol del usuario.
   Parámetros:
   - resource: El recurso a acceder
   - action: La acción a realizar
   Retorna: true si tiene permiso, false en caso contrario';

-- =====================================================================
-- PARTE 5: FUNCIÓN PARA OBTENER TODOS LOS PERMISOS DE UN ROL
-- =====================================================================

-- 5.1 Eliminar función anterior si existe
DROP FUNCTION IF EXISTS public.get_role_permissions(TEXT);

-- 5.2 Crear función get_role_permissions
CREATE OR REPLACE FUNCTION public.get_role_permissions(
  p_role TEXT
)
RETURNS TABLE(
  resource TEXT,
  can_view BOOLEAN,
  can_edit BOOLEAN,
  can_delete BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    rp.resource,
    rp.can_view,
    rp.can_edit,
    rp.can_delete
  FROM public.role_permissions rp
  WHERE rp.role = LOWER(TRIM(p_role))
  ORDER BY rp.resource;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 5.3 Otorgar permisos de ejecución
GRANT EXECUTE ON FUNCTION public.get_role_permissions TO authenticated;

-- 5.4 Agregar comentario
COMMENT ON FUNCTION public.get_role_permissions(TEXT) IS 
  'Obtiene todos los permisos configurados para un rol específico.
   Parámetro:
   - p_role: El rol a consultar
   Retorna: Tabla con resource, can_view, can_edit, can_delete';

-- =====================================================================
-- PARTE 6: VALIDACIÓN Y TESTING
-- =====================================================================

-- 6.1 Test de has_permission
DO $$
DECLARE
  test_result BOOLEAN;
BEGIN
  -- Test 1: Admin debe tener todos los permisos
  test_result := public.has_permission('admin', 'users', 'delete');
  IF test_result THEN
    RAISE NOTICE 'TEST 1 PASSED: Admin tiene permiso para eliminar usuarios';
  ELSE
    RAISE WARNING 'TEST 1 FAILED: Admin debería tener permiso para eliminar usuarios';
  END IF;
  
  -- Test 2: Manager NO debe poder eliminar usuarios
  test_result := public.has_permission('manager', 'users', 'delete');
  IF NOT test_result THEN
    RAISE NOTICE 'TEST 2 PASSED: Manager NO puede eliminar usuarios';
  ELSE
    RAISE WARNING 'TEST 2 FAILED: Manager NO debería poder eliminar usuarios';
  END IF;
  
  -- Test 3: Manager SÍ debe poder editar usuarios
  test_result := public.has_permission('manager', 'users', 'edit');
  IF test_result THEN
    RAISE NOTICE 'TEST 3 PASSED: Manager puede editar usuarios';
  ELSE
    RAISE WARNING 'TEST 3 FAILED: Manager debería poder editar usuarios';
  END IF;
  
  -- Test 4: Operario NO debe tener acceso a admin
  test_result := public.has_permission('operario', 'admin', 'view');
  IF NOT test_result THEN
    RAISE NOTICE 'TEST 4 PASSED: Operario NO tiene acceso a admin';
  ELSE
    RAISE WARNING 'TEST 4 FAILED: Operario NO debería tener acceso a admin';
  END IF;
  
  -- Test 5: Responsable debe poder ver usuarios
  test_result := public.has_permission('responsable', 'users', 'view');
  IF test_result THEN
    RAISE NOTICE 'TEST 5 PASSED: Responsable puede ver usuarios';
  ELSE
    RAISE WARNING 'TEST 5 FAILED: Responsable debería poder ver usuarios';
  END IF;
END $$;

-- 6.2 Test de can_manage_role
DO $$
DECLARE
  test_result BOOLEAN;
BEGIN
  -- Test 1: Admin puede gestionar managers
  test_result := public.can_manage_role('admin', 'manager');
  IF test_result THEN
    RAISE NOTICE 'TEST 6 PASSED: Admin puede gestionar managers';
  ELSE
    RAISE WARNING 'TEST 6 FAILED: Admin debería poder gestionar managers';
  END IF;
  
  -- Test 2: Manager puede gestionar responsables
  test_result := public.can_manage_role('manager', 'responsable');
  IF test_result THEN
    RAISE NOTICE 'TEST 7 PASSED: Manager puede gestionar responsables';
  ELSE
    RAISE WARNING 'TEST 7 FAILED: Manager debería poder gestionar responsables';
  END IF;
  
  -- Test 3: Manager NO puede gestionar admins
  test_result := public.can_manage_role('manager', 'admin');
  IF NOT test_result THEN
    RAISE NOTICE 'TEST 8 PASSED: Manager NO puede gestionar admins';
  ELSE
    RAISE WARNING 'TEST 8 FAILED: Manager NO debería poder gestionar admins';
  END IF;
  
  -- Test 4: Operario NO puede gestionar a nadie
  test_result := public.can_manage_role('operario', 'operario');
  IF NOT test_result THEN
    RAISE NOTICE 'TEST 9 PASSED: Operario NO puede gestionar a otros operarios';
  ELSE
    RAISE WARNING 'TEST 9 FAILED: Operario NO debería poder gestionar a nadie';
  END IF;
END $$;

COMMIT;

-- =====================================================================
-- FIN DE LA MIGRACIÓN
-- =====================================================================

-- Log final
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'MIGRACIÓN COMPLETADA: 20260102_add_permission_functions';
  RAISE NOTICE 'Funciones creadas:';
  RAISE NOTICE '  - has_permission(user_role, resource, action)';
  RAISE NOTICE '  - can_manage_role(manager_role, target_role)';
  RAISE NOTICE '  - get_current_user_role()';
  RAISE NOTICE '  - check_current_user_permission(resource, action)';
  RAISE NOTICE '  - get_role_permissions(role)';
  RAISE NOTICE 'Fecha: %', NOW();
  RAISE NOTICE '========================================';
END $$;
