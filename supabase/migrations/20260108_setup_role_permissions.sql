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
INSERT INTO public.role_permissions (role, resource, action, description)
VALUES 
  ('produccion', 'produccion', 'view', 'Ver módulo de producción'),
  ('produccion', 'produccion', 'create', 'Crear órdenes de producción'),
  ('produccion', 'produccion', 'edit', 'Editar órdenes de producción'),
  ('produccion', 'produccion_work_orders', 'view', 'Ver órdenes de trabajo'),
  ('produccion', 'produccion_work_orders', 'edit', 'Editar órdenes de trabajo')
ON CONFLICT (role, resource, action) DO NOTHING;

-- Permisos para rol ENVIOS
INSERT INTO public.role_permissions (role, resource, action, description)
VALUES 
  ('envios', 'envios', 'view', 'Ver módulo de envíos'),
  ('envios', 'envios', 'create', 'Crear envíos'),
  ('envios', 'envios', 'edit', 'Editar envíos'),
  ('envios', 'produccion_work_orders', 'view', 'Ver órdenes para envío'),
  ('envios', 'produccion_work_orders', 'edit', 'Actualizar estado de envío')
ON CONFLICT (role, resource, action) DO NOTHING;

-- Permisos para rol ALMACEN
INSERT INTO public.role_permissions (role, resource, action, description)
VALUES 
  ('almacen', 'almacen', 'view', 'Ver módulo de almacén'),
  ('almacen', 'almacen', 'edit', 'Gestionar almacén'),
  ('almacen', 'comercial', 'view', 'Ver módulo comercial'),
  ('almacen', 'produccion_work_orders', 'view', 'Ver órdenes')
ON CONFLICT (role, resource, action) DO NOTHING;

-- Permisos para rol COMERCIAL
INSERT INTO public.role_permissions (role, resource, action, description)
VALUES 
  ('comercial', 'comercial', 'view', 'Ver módulo comercial'),
  ('comercial', 'comercial', 'create', 'Crear pedidos comerciales'),
  ('comercial', 'comercial', 'edit', 'Editar pedidos comerciales')
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
SELECT role, resource, action, description 
FROM public.role_permissions 
WHERE role IN ('produccion', 'envios', 'almacen', 'comercial')
ORDER BY role, resource, action;
