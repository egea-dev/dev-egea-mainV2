-- =====================================================
-- SCRIPT SIMPLE: PERMISOS PARA ROLES OPERACIONALES
-- =====================================================

-- 1. INSERTAR PERMISOS BÁSICOS
INSERT INTO public.role_permissions (role, resource, action)
VALUES 
  ('produccion', 'produccion', 'view'),
  ('produccion', 'produccion', 'edit'),
  ('envios', 'envios', 'view'),
  ('envios', 'envios', 'edit'),
  ('almacen', 'almacen', 'view'),
  ('comercial', 'comercial', 'view')
ON CONFLICT (role, resource, action) DO NOTHING;

-- 2. VERIFICAR
SELECT role, resource, action 
FROM public.role_permissions 
WHERE role IN ('produccion', 'envios', 'almacen', 'comercial')
ORDER BY role, resource, action;

-- ✅ LISTO - Los usuarios ya pueden acceder a sus módulos
