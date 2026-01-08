-- =====================================================
-- CONFIGURACIÓN DE PERMISOS PARA ROLES OPERACIONALES
-- =====================================================
-- Este script configura los permisos RLS para que:
-- - produccion@decoracionesegea.com solo acceda a producción
-- - envios@decoracionesegea.com solo acceda a envíos
-- =====================================================

-- 1. INSERTAR PERMISOS EN role_permissions
-- =====================================================

-- Permisos para rol PRODUCCION
INSERT INTO public.role_permissions (role, resource, action)
VALUES 
  ('produccion', 'produccion', 'view'),
  ('produccion', 'produccion', 'create'),
  ('produccion', 'produccion', 'edit'),
  ('produccion', 'produccion_work_orders', 'view'),
  ('produccion', 'produccion_work_orders', 'edit')
ON CONFLICT (role, resource, action) DO NOTHING;

-- Permisos para rol ENVIOS
INSERT INTO public.role_permissions (role, resource, action)
VALUES 
  ('envios', 'envios', 'view'),
  ('envios', 'envios', 'create'),
  ('envios', 'envios', 'edit'),
  ('envios', 'produccion_work_orders', 'view'),
  ('envios', 'produccion_work_orders', 'edit')
ON CONFLICT (role, resource, action) DO NOTHING;

-- Permisos para rol ALMACEN
INSERT INTO public.role_permissions (role, resource, action)
VALUES 
  ('almacen', 'almacen', 'view'),
  ('almacen', 'almacen', 'edit'),
  ('almacen', 'comercial', 'view'),
  ('almacen', 'produccion_work_orders', 'view')
ON CONFLICT (role, resource, action) DO NOTHING;

-- Permisos para rol COMERCIAL
INSERT INTO public.role_permissions (role, resource, action)
VALUES 
  ('comercial', 'comercial', 'view'),
  ('comercial', 'comercial', 'create'),
  ('comercial', 'comercial', 'edit')
ON CONFLICT (role, resource, action) DO NOTHING;

-- 2. HABILITAR RLS EN TABLAS CRÍTICAS
-- =====================================================

-- Habilitar RLS en produccion_work_orders si no está habilitado
ALTER TABLE public.produccion_work_orders ENABLE ROW LEVEL SECURITY;

-- 3. CREAR POLÍTICAS RLS PARA produccion_work_orders
-- =====================================================

-- Eliminar políticas existentes si existen
DROP POLICY IF EXISTS "produccion_work_orders_select_policy" ON public.produccion_work_orders;
DROP POLICY IF EXISTS "produccion_work_orders_insert_policy" ON public.produccion_work_orders;
DROP POLICY IF EXISTS "produccion_work_orders_update_policy" ON public.produccion_work_orders;
DROP POLICY IF EXISTS "produccion_work_orders_delete_policy" ON public.produccion_work_orders;

-- Política SELECT: Todos los roles operacionales pueden ver
CREATE POLICY "produccion_work_orders_select_policy" ON public.produccion_work_orders
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.auth_user_id = auth.uid()
    AND profiles.role IN ('admin', 'manager', 'produccion', 'envios', 'almacen', 'comercial')
  )
);

-- Política INSERT: Admin, manager, produccion y comercial pueden crear
CREATE POLICY "produccion_work_orders_insert_policy" ON public.produccion_work_orders
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.auth_user_id = auth.uid()
    AND profiles.role IN ('admin', 'manager', 'produccion', 'comercial')
  )
);

-- Política UPDATE: Admin, manager, produccion y envios pueden actualizar
CREATE POLICY "produccion_work_orders_update_policy" ON public.produccion_work_orders
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.auth_user_id = auth.uid()
    AND profiles.role IN ('admin', 'manager', 'produccion', 'envios')
  )
);

-- Política DELETE: Solo admin y manager pueden eliminar
CREATE POLICY "produccion_work_orders_delete_policy" ON public.produccion_work_orders
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.auth_user_id = auth.uid()
    AND profiles.role IN ('admin', 'manager')
  )
);

-- 4. VERIFICACIÓN FINAL
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Permisos configurados correctamente';
  RAISE NOTICE '✅ RLS habilitado en produccion_work_orders';
  RAISE NOTICE '✅ Políticas creadas para todos los roles';
  RAISE NOTICE '';
  RAISE NOTICE '📋 Roles configurados:';
  RAISE NOTICE '  - produccion: puede ver y editar producción';
  RAISE NOTICE '  - envios: puede ver y actualizar envíos';
  RAISE NOTICE '  - almacen: puede ver almacén y comercial';
  RAISE NOTICE '  - comercial: puede gestionar pedidos comerciales';
END $$;

-- Verificar permisos insertados
SELECT role, resource, action 
FROM public.role_permissions 
WHERE role IN ('produccion', 'envios', 'almacen', 'comercial')
ORDER BY role, resource, action;
